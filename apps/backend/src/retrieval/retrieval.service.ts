import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { EmbeddingsService } from '../embeddings/embeddings.service';

/** Chunks sent to the model. Kept at 5 so prompt size and cost are unchanged. */
const DEFAULT_TOP_K = 5;

/** Nearest neighbours pulled from the HNSW index before capping. Must be large
 *  enough that several documents are represented, or the cap has nothing to
 *  choose between. Never reaches the model. */
const CANDIDATE_POOL = 30;

/** Max chunks any single document may contribute. Stops one document's cluster
 *  from taking every slot on a comparative question. */
const MAX_PER_DOCUMENT = 3;

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

@Injectable()
export class RetrievalService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async search(
    query: string,
    userId: string,
    topK = DEFAULT_TOP_K,
  ): Promise<SearchResult[]> {
    const [queryVector] = await this.embeddingsService.embed([query]);
    const vectorParam = JSON.stringify(queryVector);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL hnsw.iterative_scan = strict_order');

      const { rows } = await client.query<SearchResult>(
        `WITH candidates AS (
           SELECT
             c.id AS "chunkId",
             c.document_id AS "documentId",
             d.filename,
             c.chunk_index AS "chunkIndex",
             c.content,
             c.embedding <=> $1::vector AS distance,
             ROW_NUMBER() OVER (
               PARTITION BY c.document_id
               ORDER BY c.embedding <=> $1::vector
             ) AS rank_in_document
           FROM chunks c
           JOIN documents d ON d.id = c.document_id
           WHERE c.user_id = $2 AND d.status = 'ready'
           ORDER BY c.embedding <=> $1::vector
           LIMIT $3
         )
         SELECT
           "chunkId",
           "documentId",
           filename,
           "chunkIndex",
           content,
           1 - distance AS similarity
         FROM candidates
         WHERE rank_in_document <= $4
         ORDER BY distance
         LIMIT $5`,
        [vectorParam, userId, CANDIDATE_POOL, MAX_PER_DOCUMENT, topK],
      );

      await client.query('COMMIT');
      return rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
