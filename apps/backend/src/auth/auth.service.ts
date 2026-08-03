import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, hashSync, verify } from '@node-rs/argon2';
import { DatabaseError, Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'node:crypto';

export interface AuthUser {
  id: string;
  email: string;
}

interface UserCredentialsRow {
  id: string;
  email: string;
  password_hash: string;
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

  /**
   * Hash of a throwaway password, computed once at startup. Verified against
   * when no user matches, so "unknown email" costs the same time as
   * "wrong password".
   */
  private readonly dummyHash = hashSync(randomBytes(32).toString('hex'));

  async login(dto: LoginDto): Promise<AuthUser> {
    const { rows } = await this.pool.query<UserCredentialsRow>(
      `SELECT id, email, password_hash
     FROM users
     WHERE email = $1 AND NOT is_demo_seed`,
      [dto.email],
    );

    const user = rows[0];
    const passwordValid = await verify(
      user?.password_hash ?? this.dummyHash,
      dto.password,
    );

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { id: user.id, email: user.email };
  }

  async findById(id: string): Promise<AuthUser | undefined> {
    const { rows } = await this.pool.query<AuthUser>(
      `SELECT id, email FROM users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }
}
