import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { DatabaseError, Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { RegisterDto } from './dto/register.dto';

export interface AuthUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    const passwordHash = await hash(dto.password);

    try {
      const { rows } = await this.pool.query<AuthUser>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email`,
        [dto.email, passwordHash],
      );
      return rows[0];
    } catch (err) {
      if (err instanceof DatabaseError && err.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }
}
