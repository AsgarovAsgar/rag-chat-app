import './env';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export default function globalSetup(): void {
  execFileSync(
    'pnpm',
    ['exec', 'node-pg-migrate', '--migration-file-language', 'sql', 'up'],
    {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    },
  );
}
