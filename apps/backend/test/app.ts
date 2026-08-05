import './env';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Pool } from 'pg';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PG_POOL } from '../src/database/database.module';

export interface TestApp {
  app: NestExpressApplication;
  server: Server;
  pool: Pool;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer(),
    pool: app.get<Pool>(PG_POOL),
  };
}

export async function resetDatabase(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE users, documents, conversations CASCADE');
}
