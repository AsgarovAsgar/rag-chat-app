# RAG Chat Application — Project Spec

## Purpose
Portfolio project demonstrating senior-level frontend + full-stack engineering: a Retrieval-Augmented Generation (RAG) chat system where users upload documents and ask questions answered from their content, with source citations and streamed responses.

## Tech Stack
- **Frontend**: React, TypeScript, TanStack Query (server state), Zustand (client/UI state)
- **Backend**: NestJS, TypeScript
- **Database**: Postgres + pgvector extension
- **Queue**: BullMQ + Redis (async ingestion)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Generation**: OpenAI/Anthropic chat completions API (streamed)
- **Repo structure**: Monorepo, plain npm/yarn/pnpm workspaces (no Nx/Turborepo needed at this scale)

## Repo Layout
```
rag-app/
  package.json          # root workspace config (add later, once both apps exist)
  apps/
    frontend/            # React app, own package.json
    backend/              # NestJS app, own package.json
  packages/
    shared-types/          # optional — shared WS event types / DTOs
  docker-compose.yml      # Postgres (pgvector) + Redis
  README.md
```

## Build Order
Backend first, then frontend — de-risk the hard part (ingestion, chunking, retrieval quality) before building UI against it.

1. NestJS scaffold + Docker Compose (Postgres/pgvector + Redis) running locally
2. Ingestion pipeline (upload → extract → chunk → embed → store), tested via curl/Postman
3. Retrieval endpoint (query → embed → top-K similarity search), validate chunk quality manually
4. Chat endpoint (retrieval + LLM call, streamed via SSE/WS), tested via curl
5. React frontend wired against the working backend

## Architecture: Ingestion Pipeline
`Upload → Extract text → Chunk → Embed → Store in pgvector`

- **Extraction**: `pdf-parse` (PDF), `mammoth` (DOCX), plain read for TXT/MD. All Node-native — no Python/FastAPI needed for this project.
- **Chunking**: Recursive character/paragraph-aware splitting (split on paragraph → sentence → word boundaries as needed), NOT naive fixed-size. Target ~300–800 tokens per chunk, ~10–15% overlap.
- **Embedding**: OpenAI `text-embedding-3-small` via direct API call from NestJS. Must use the SAME model for both document chunks and user queries at retrieval time.
- **Storage**: One row per chunk in Postgres — `embedding vector(1536)`, `content text`, `document_id`, `metadata jsonb` (page number, source, chunk index).
- **Async via BullMQ**: Upload endpoint saves file + creates `document` row (`status: pending`) → enqueues job → returns immediately → worker processes (extract/chunk/embed/store) → updates `status: ready` (or `failed`) → push status update to frontend over WebSocket (reuse existing WS hook w/ reconnection logic).

## Architecture: pgvector
- Index type: **HNSW** (better recall/speed tradeoff than IVFFlat, no retraining needed as data grows)
- Distance metric: **cosine similarity** (`vector_cosine_ops`) — standard for text embeddings

## Architecture: Retrieval & Generation
- Query → embed with `text-embedding-3-small` → pgvector cosine similarity search → top-K chunks → assemble into prompt context → LLM call (streamed) → response streamed to frontend over WebSocket, token by token
- Stretch: hybrid search (vector + keyword/BM25), reranking (e.g. Cohere rerank API)

## Feature Set

### Core (must-have)
- Document upload (PDF/DOCX/TXT/MD)
- Async ingestion pipeline with visible status (processing/ready/failed)
- Chat interface with streamed responses
- Source citations (which doc/chunk an answer came from)
- Multi-document support
- Persisted conversation history

### Stretch (differentiators — pick 2–3)
- Hybrid search (vector + keyword/BM25)
- Reranking (cross-encoder or Cohere rerank API)
- Retrieval quality eval (RAGAS or similar — even a small script showing precision/faithfulness)
- Streaming with cancellation (AbortController + WS)
- Document management (delete doc → clean up chunks/vectors, re-ingest)
- Chunk-level debug view (dev panel showing retrieved chunks + similarity scores — great for interview demos)
- Auth (scopes docs/conversations per user; also demonstrates SSR/session handling)

**Recommended stretch picks**: source citations + chunk-level debug view (cheap, high demo value) plus hybrid search or reranking (shows retrieval depth) plus auth (patches a known interview gap around SSR/session handling).

## Explicitly Out of Scope (for now)
- No FastAPI/Python — everything stays TypeScript end-to-end (Node has adequate libraries for extraction/chunking; OpenAI API handles embeddings/generation)
- No self-hosted embedding/reranking models (would require Python ML ecosystem)
- No Nx/Turborepo (plain workspaces sufficient at 2-app scale)

## Open Decisions / Next Steps
- [ ] NestJS module structure (ingestion, retrieval, chat, queue modules)
- [ ] Exact pgvector schema + migration setup
- [ ] Root `package.json` + workspace config (once both apps scaffolded)
- [ ] Auth strategy (JWT? session-based? — ties into SSR story)
