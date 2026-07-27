import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { REFRESH_REUSE_GRACE_MS, REFRESH_TOKEN_TTL_MS } from './auth.constants';

interface SessionRow {
  id: string;
  user_id: string;
  family_id: string;
  used_at: string | null;
  expires_at: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Starts a new session family. Called on login. */
  async issue(userId: string): Promise<string> {
    await this.pool.query(`DELETE FROM sessions WHERE expires_at < now()`);
    return this.insert(userId, null);
  }

  /** Spends a refresh token and mints its successor in the same family. */
  async rotate(
    token: string,
  ): Promise<{ userId: string; refreshToken: string }> {
    const tokenHash = hashToken(token);

    const { rows } = await this.pool.query<SessionRow>(
      `UPDATE sessions
          SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING id, user_id, family_id, used_at, expires_at`,
      [tokenHash],
    );

    const session = rows[0] ?? (await this.resolveSpentToken(tokenHash));

    return {
      userId: session.user_id,
      refreshToken: await this.insert(session.user_id, session.family_id),
    };
  }

  async revokeFamily(token: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM sessions
        WHERE family_id = (SELECT family_id FROM sessions WHERE token_hash = $1)`,
      [hashToken(token)],
    );
  }

  private async insert(
    userId: string,
    familyId: string | null,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.pool.query(
      `INSERT INTO sessions (user_id, family_id, token_hash, expires_at)
       VALUES ($1, COALESCE($2::uuid, gen_random_uuid()), $3, now() + $4::interval)`,
      [
        userId,
        familyId,
        hashToken(token),
        `${REFRESH_TOKEN_TTL_MS} milliseconds`,
      ],
    );

    return token;
  }

  /** Reached only when the conditional UPDATE matched nothing. */
  private async resolveSpentToken(tokenHash: string): Promise<SessionRow> {
    const { rows } = await this.pool.query<SessionRow>(
      `SELECT id, user_id, family_id, used_at, expires_at
         FROM sessions WHERE token_hash = $1`,
      [tokenHash],
    );
    const session = rows[0];

    if (!session || new Date(session.expires_at) <= new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Not expired and the UPDATE still failed, so used_at is necessarily set.
    const usedAgo = Date.now() - new Date(session.used_at!).getTime();

    if (usedAgo > REFRESH_REUSE_GRACE_MS) {
      this.logger.warn(
        `Refresh token reuse for user ${session.user_id} — revoking family`,
      );
      await this.pool.query(`DELETE FROM sessions WHERE family_id = $1`, [
        session.family_id,
      ]);
      throw new UnauthorizedException('Session expired');
    }

    return session;
  }
}
