import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { rm } from 'node:fs/promises';

export interface DocumentRow {
  id: string;
  user_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error: string | null;
  sizeBytes: number;
  createdAt: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @InjectQueue('ingestion') private readonly ingestionQueue: Queue,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<DocumentRow> {
    const { rows } = await this.pool.query<DocumentRow>(
      `INSERT INTO documents (user_id, filename, mime_type, size_bytes, storage_path, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, file.originalname, file.mimetype, file.size, file.path],
    );

    const document = rows[0];

    await this.ingestionQueue.add('ingest-document', {
      documentId: document.id,
      userId,
    });

    return document;
  }

  async findAll(userId: string): Promise<DocumentListItem[]> {
    const { rows } = await this.pool.query<DocumentListItem>(
      `SELECT id, filename, status, error,
              size_bytes AS "sizeBytes",
              created_at AS "createdAt"
       FROM documents
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  }

  async remove(id: string, userId: string): Promise<void> {
    const { rows } = await this.pool.query<{ storage_path: string | null }>(
      `DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING storage_path`,
      [id, userId],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const storagePath = rows[0].storage_path;
    if (!storagePath) {
      return;
    }

    const { rows: stillReferenced } = await this.pool.query(
      `SELECT 1 FROM documents WHERE storage_path = $1 LIMIT 1`,
      [storagePath],
    );
    if (stillReferenced.length === 0) {
      await rm(storagePath, { force: true });
    }
  }

  async retry(id: string, userId: string): Promise<void> {
    const { rows } = await this.pool.query<{ id: string }>(
      `UPDATE documents
       SET status = 'pending', error = NULL, updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'failed'
       RETURNING id`,
      [id, userId],
    );

    if (rows.length === 0) {
      const { rows: existing } = await this.pool.query(
        `SELECT 1 FROM documents WHERE id = $1 AND user_id = $2`,
        [id, userId],
      );
      if (existing.length === 0) {
        throw new NotFoundException(`Document ${id} not found`);
      }
      throw new ConflictException('Only failed documents can be retried');
    }

    await this.ingestionQueue.add('ingest-document', {
      documentId: id,
      userId,
    });
  }
}
