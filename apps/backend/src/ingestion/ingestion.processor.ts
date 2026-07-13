import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface IngestionJobData {
  documentId: string;
}

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`Ingesting document ${documentId}`);

    try {
      await this.setStatus(documentId, 'processing');

      // TODO: extract → chunk → embed → store chunks

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
