# CLAUDE.md

Working notes for this repo — conventions, commands, and traps that cost time to rediscover.
Product requirements live in [docs/RAG_PROJECT_SPEC.md](docs/RAG_PROJECT_SPEC.md); the roadmap is [docs/TODO.md](docs/TODO.md).

## Stack

pnpm workspaces monorepo (`apps/backend`, `apps/frontend`), pnpm 10.8.0 pinned via `packageManager`.

- **Backend** — NestJS, Postgres + pgvector (HNSW, cosine), BullMQ + Redis, OpenAI `text-embedding-3-small`, raw SQL via `node-pg-migrate`.
- **Frontend** — React 19, Vite, TypeScript, TanStack Query (server state), Zustand (streaming state), shadcn on base-ui, react-router.

The root `package.json` has no scripts — everything runs through `pnpm --filter`.

## Commands

```bash
docker compose up -d                          # Postgres + Redis; required for backend dev and tests
pnpm --filter backend start:dev               # API on :3000
pnpm --filter frontend dev                    # Vite on :5173, proxies /api and /socket.io
pnpm --filter backend migrate up              # apply migrations
pnpm --filter backend test:e2e                # integration suite (needs Docker up)
```

Typechecking differs per app and the difference matters:

```bash
pnpm --filter backend exec tsc -p tsconfig.build.json --noEmit
pnpm --filter frontend exec tsc -b
```

**The frontend root `tsconfig.json` is Vite solution-style** (`"files": []` plus project references), so a plain `tsc --noEmit` there checks nothing and exits 0. Use `tsc -b`, or `-p tsconfig.app.json`.

There is no `psql` on the host — reach the database through the container:

```bash
docker compose exec -T postgres psql -U rag -d rag
```

Local credentials are `rag/rag/rag`. Production SQL runs only in the Railway dashboard → Postgres service → Data tab; the app container cannot reach the database directly.

## Testing

Backend integration tests live in `apps/backend/test/`, run against a **real Postgres and Redis** — no mocks for infrastructure.

- `test/env.ts` refuses to run unless `DATABASE_URL` ends in `_test`. The suite `TRUNCATE`s, so pointing it at the dev database would wipe it. Create the test DB once with `docker compose exec -T postgres createdb -U rag rag_test`.
- `apps/backend/.env.test` is committed deliberately — it holds no secrets.
- `maxWorkers: 1` is required: a shared database plus truncation means parallel workers corrupt each other.
- **Externals are stubbed by absence, not mocks.** The OpenAI key is junk and never reached, because ownership checks throw first. Redis must genuinely run — `@Processor` instantiates a BullMQ worker at module init. Don't add `overrideProvider` mocks; a positive retrieval assertion would hit the real embeddings API, which is why the ownership matrix asserts only 401/404.
- The positive control in `ownership.e2e-spec.ts` runs first on purpose. Without it, every 404 assertion would also pass against a completely broken app.
- Jest exits *before* `globalSetup` when no tests match, so a "no tests found" run proves nothing about migrations.

`src/app.setup.ts` exports `configureApp()` so tests and `main.ts` share one bootstrap. `enableShutdownHooks()` stays in `main.ts` — registering signal handlers per test app leaks listeners across the suite.

## Traps

**`cookie` is pinned to v1 on purpose.** v2 is ESM-only and works in production only via Node 22.12's `require(ESM)` interop, which Jest's CommonJS runtime does not implement — upgrading it breaks the entire test suite with `SyntaxError: Unexpected token 'export'` before a single test runs. Note this is a *different package* from `cookie-parser` (which has no v2).

**Migrations are immutable once run.** `CREATE EXTENSION` belongs inside the migration that needs it, not in `docker/postgres-init` — that directory only runs for Docker Compose, so a fresh non-compose database would be missing the extension.

**Delete `dist/` and `tsconfig.build.tsbuildinfo` together.** A stale tsbuildinfo with no `dist` makes `nest build` exit 0 while emitting nothing.

**Tenant filters must sit on the indexed relation.** HNSW returns its `ef_search` nearest candidates *globally* and the `WHERE` runs afterwards, so filtering through a join silently returns fewer rows than `topK` for small tenants — and degrades as other tenants upload. Hence the denormalized `chunks.user_id` and `SET LOCAL hnsw.iterative_scan = strict_order` (which requires an explicit transaction; `SET LOCAL` outside one is a no-op, and a typo in a GUC name is silently accepted).

**Scope ownership in the `WHERE` clause**, not by fetching then comparing. Return 404 rather than 403 for another tenant's row — 403 is an id-enumeration oracle.

**pnpm is strict about phantom dependencies.** A package imported directly must be declared, even if a dependency already pulls it in transitively. `multer` and `cookie` both hit this.

**A guard on an endpoint that authenticates with the refresh cookie breaks recovery.** `/auth/refresh` and `/auth/logout` must stay `@Public()`.

## Conventions

- Conventional-commit messages; PRs merge as merge commits, so junk messages persist in history.
- Branch per round (`feat/`, `fix/`, `test/`, `refactor/`, `ci/`, `docs/`).
- Production deploys from the `release` branch, never `main`:
  ```bash
  git switch release && git merge --ff-only main && git push
  ```
  Then an annotated tag and a GitHub Release. Railway auto-deploys on that push.
