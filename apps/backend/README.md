# Backend — RAG Chat

NestJS API: authentication and sessions, document ingestion, embeddings, vector retrieval, chat streamed over SSE, and WebSocket status events.

See the [root README](../../README.md) for architecture, design decisions, the API reference, and the environment variables this app requires.

## Layout

```
src/
  auth/         # registration, login, JWT guard, refresh-token rotation
  documents/    # upload, list, delete, retry
  ingestion/    # BullMQ processor: extraction, chunking, embedding
  embeddings/   # OpenAI embedding calls
  retrieval/    # pgvector similarity search
  chat/         # SSE streaming, conversations, citations
  events/       # socket.io gateway for ingestion status
  database/     # pg connection pool
migrations/     # raw SQL, applied with node-pg-migrate
```

## Commands

| Command | Description |
|---|---|
| `pnpm start:dev` | Run in watch mode on port 3000 |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run the compiled build |
| `pnpm lint` | ESLint, read-only |
| `pnpm lint:fix` | ESLint with autofix |
| `pnpm migrate up` | Apply pending migrations |
| `pnpm migrate down` | Roll back the last migration |
