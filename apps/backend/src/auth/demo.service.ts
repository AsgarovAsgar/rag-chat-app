import { Inject, Injectable, Logger } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { Pool, PoolClient } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { PG_POOL } from '../database/database.module';
import { AuthUser } from './auth.service';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async cloneCorpus(
    client: PoolClient,
    seedUserId: string,
    userId: string,
  ): Promise<void> {
    const { rows: sources } = await client.query<{
      id: string;
      filename: string;
      mime_type: string;
      size_bytes: number;
      status: string;
      storage_path: string | null;
    }>(
      `SELECT id, filename, mime_type, size_bytes, status, storage_path
       FROM documents
       WHERE user_id = $1 AND status = 'ready'
       ORDER BY created_at`,
      [seedUserId],
    );

    for (const source of sources) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO documents (
           filename, mime_type, size_bytes, status, storage_path, user_id
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          source.filename,
          source.mime_type,
          source.size_bytes,
          source.status,
          source.storage_path,
          userId,
        ],
      );

      await client.query(
        `INSERT INTO chunks (
           document_id, chunk_index, content, embedding, metadata, user_id
         )
         SELECT $1, chunk_index, content, embedding, metadata, $2
         FROM chunks
         WHERE document_id = $3`,
        [rows[0].id, userId, source.id],
      );
    }
  }

  async createSandbox(): Promise<AuthUser> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: seedRows } = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE is_demo_seed`,
      );
      const seed = seedRows[0];

      const email = `demo-${randomUUID()}@demo.invalid`;
      const passwordHash = await hash(randomBytes(32).toString('hex'));

      const { rows: userRows } = await client.query<AuthUser>(
        `INSERT INTO users (email, password_hash, is_demo)
         VALUES ($1, $2, true)
         RETURNING id, email`,
        [email, passwordHash],
      );
      const user = userRows[0];

      if (seed) {
        await this.cloneCorpus(client, seed.id, user.id);
      } else {
        this.logger.warn('No demo seed tenant found — sandbox starts empty');
      }

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
