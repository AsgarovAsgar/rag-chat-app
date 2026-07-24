import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { ExtractionService } from './ingestion.extraction';
import { DocumentRow } from '../documents/documents.service';
import { ChunkingService } from './ingestion.chunking';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { DocumentsGateway } from '../events/documents.gateway';

export interface IngestionJobData {
  documentId: string;
}

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly extractionService: ExtractionService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly documentsGateway: DocumentsGateway,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Ingesting document ${documentId}`);

    try {
      await this.setStatus(documentId, 'processing');

      // extract → chunk → embed → store chunks
      // 1. extract
      const { rows } = await this.pool.query<DocumentRow>(
        `SELECT * FROM documents WHERE id = $1`,
        [documentId],
      );
      const document = rows[0];
      if (!document?.storage_path) {
        throw new Error(
          `Document ${documentId} not found or has no stored file`,
        );
      }

      const text = await this.extractionService.extractText(
        document.storage_path,
      );
      this.logger.log(
        `Extracted ${text.length} chars from ${document.filename}`,
      );

      // 2. chunk
      const chunks = this.chunkingService.chunk(text);
      if (chunks.length === 0) {
        throw new Error(`No text content extracted from ${document.filename}`);
      }
      this.logger.log(
        `Split into ${chunks.length} chunks (avg ${Math.round(text.length / chunks.length)} chars)`,
      );

      // 3. embed
      const vectors = await this.embeddingsService.embed(
        chunks.map((c) => c.text),
      );
      this.logger.log(
        `Embedded ${vectors.length} chunks (${vectors[0].length} dims)`,
      );

      // 4. store chunks + mark ready atomically
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM chunks WHERE document_id = $1', [
          documentId,
        ]);
        for (let i = 0; i < chunks.length; i++) {
          await client.query(
            `INSERT INTO chunks (document_id, chunk_index, content, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
            [
              documentId,
              chunks[i].index,
              chunks[i].text,
              JSON.stringify(vectors[i]),
            ],
          );
        }
        await client.query(
          `UPDATE documents SET status = 'ready', error = NULL, updated_at = now()
     WHERE id = $1`,
          [documentId],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      this.documentsGateway.emitDocumentStatus({
        id: documentId,
        status: 'ready',
        error: null,
      });
      this.logger.log(
        `Stored ${chunks.length} chunks; document ${documentId} ready`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ingestion failed for doc ${documentId}: ${message}`);
      await this.setStatus(documentId, 'failed', message);
      throw err;
    }
  }

  private async setStatus(
    id: string,
    status: 'processing' | 'ready' | 'failed',
    error?: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE documents SET status = $2, error = $3, updated_at = now() WHERE id = $1`,
      [id, status, error ?? null],
    );
    this.documentsGateway.emitDocumentStatus({
      id,
      status,
      error: error ?? null,
    });
  }
}
