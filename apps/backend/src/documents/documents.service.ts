import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

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

@Injectable()
export class DocumentsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createFromUpload(file: Express.Multer.File): Promise<DocumentRow> {
    const { rows } = await this.pool.query<DocumentRow>(
      `INSERT INTO documents (filename, mime_type, size_bytes, storage_path, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [file.originalname, file.mimetype, file.size, file.path],
    );
    return rows[0];
  }
}
