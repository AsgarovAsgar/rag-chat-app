import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { ExtractionService } from './ingestion.extraction';
import { DocumentRow } from '../documents/documents.service';
import { ChunkingService } from './ingestion.chunking';

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

      await this.setStatus(documentId, 'ready');
      this.logger.log(`Document ${documentId} ready`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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
  }
}
