import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { EmbeddingsService } from '../embeddings/embeddings.service';

const DEFAULT_TOP_K = 5;

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
        `SELECT
           c.id AS "chunkId",
           c.document_id AS "documentId",
           d.filename,
           c.chunk_index AS "chunkIndex",
           c.content,
           1 - (c.embedding <=> $1::vector) AS similarity
         FROM chunks c
         JOIN documents d ON d.id = c.document_id
         WHERE c.user_id = $2 AND d.status = 'ready'
         ORDER BY c.embedding <=> $1::vector
         LIMIT $3`,
        [vectorParam, userId, topK],
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
