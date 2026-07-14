import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface DocumentRow {
  id: string;
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

  async createFromUpload(file: Express.Multer.File): Promise<DocumentRow> {
    const { rows } = await this.pool.query<DocumentRow>(
      `INSERT INTO documents (filename, mime_type, size_bytes, storage_path, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [file.originalname, file.mimetype, file.size, file.path],
    );

    const document = rows[0];

    await this.ingestionQueue.add('ingest-document', {
      documentId: document.id,
    });

    return document;
  }

  async findAll(): Promise<DocumentListItem[]> {
    const { rows } = await this.pool.query<DocumentListItem>(
      `SELECT id, filename, status, error,
            size_bytes AS "sizeBytes",
            created_at AS "createdAt"
      FROM documents
      ORDER BY created_at DESC`,
    );
    return rows;
  }
}
