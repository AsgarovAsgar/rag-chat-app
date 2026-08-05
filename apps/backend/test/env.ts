import { config } from 'dotenv';
import { join } from 'node:path';

config({ path: join(__dirname, '..', '.env.test'), override: true });

const url = process.env.DATABASE_URL ?? '';
if (!/_test(\?|$)/.test(url)) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL must point at a database whose name ends in _test (got "${url}"). The suite TRUNCATEs every table.`,
  );
}
