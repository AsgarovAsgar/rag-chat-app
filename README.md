# RAG Chat

A full-stack Retrieval-Augmented Generation (RAG) chat application: upload your documents, ask questions, and get **streamed answers with inline citations** grounded in the document content.

<!-- TODO: add screenshot here -->
<!-- ![RAG Chat screenshot](docs/screenshot.png) -->

## Features

- **Document ingestion pipeline** — upload PDF / DOCX / Markdown; files are extracted, chunked, embedded, and indexed asynchronously in a background queue, with live status in the UI
- **Streamed chat** — answers stream token-by-token over Server-Sent Events, with an optimistic UI (your message and a thinking indicator appear instantly)
- **Inline citations** — answers include `[n]` markers rendered as superscripts; numbered source chips show only the chunks actually cited, with similarity score and excerpt on click
- **Conversation history** — conversations persist with their sources; chat history is fed back into the prompt for follow-up questions
- **Grounded answers** — the model is instructed to answer only from retrieved context and say "I don't know" otherwise

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query (server state), Zustand (stream state), React Router 7, Tailwind CSS 4 + shadcn/ui |
| Backend | NestJS 11, TypeScript |
| Vector search | PostgreSQL + pgvector (HNSW index, cosine distance) |
| Background jobs | BullMQ + Redis |
| AI | OpenAI `text-embedding-3-small` (embeddings), `gpt-4o-mini` (generation) |
| Tooling | pnpm workspaces monorepo, raw SQL migrations via node-pg-migrate, Docker Compose |

## Architecture

**Ingestion** (async, queue-based):

```mermaid
flowchart LR
    A[Upload] --> B[(documents: pending)]
    B --> C[BullMQ queue]
    C --> D[Extract<br/>pdf-parse / mammoth]
    D --> E[Chunk<br/>paragraph-aware, ~800 tokens + overlap]
    E --> F[Embed<br/>batched OpenAI calls]
    F --> G[(chunks: vector 1536<br/>HNSW cosine index)]
    G --> H[(documents: ready)]
```

**Query** (streamed):

```mermaid
flowchart LR
    Q[POST /chat] --> E[Embed question]
    E --> R[pgvector top-5<br/>cosine similarity]
    R --> P["Prompt with [n]-labeled chunks<br/>+ last 10 messages"]
    P --> S[gpt-4o-mini stream]
    S --> SSE[SSE: sources → tokens → done]
    SSE --> DB[(persist message + sources)]
```

## Key technical decisions

- **SSE over POST instead of WebSockets for chat streaming.** SSE is testable with `curl -N`, needs no connection lifecycle management, and fits a request/response flow. Since `EventSource` only supports GET, the frontend consumes the stream with `fetch` + `ReadableStream` and a manual event-frame parser.
- **Cancellation that persists partial answers.** Closing the request aborts the OpenAI stream via `AbortController`, and the partial response is still saved to the conversation.
- **`ORDER BY` on bare distance** so Postgres actually uses the HNSW index — ordering by a derived similarity expression would force a sequential scan.
- **Idempotent ingestion.** Chunk storage runs in a single transaction with DELETE-then-INSERT, so re-processing a document can never duplicate or half-write chunks.
- **Server state vs. client state split on the frontend.** TanStack Query owns everything persisted (conversations, messages, documents); Zustand owns only the ephemeral stream (pending message, streaming text, sources). The handoff on `done` — refetch messages, then clear the stream — makes the streamed answer settle into history without a flash.
- **Citations map to chunks, not documents.** `[n]` markers in the answer refer to specific retrieved chunks, and only cited chunks render as source chips — an answer of "I don't know" shows no sources.
- **Raw SQL migrations, no ORM.** Vector columns, HNSW indexes, and similarity queries are first-class SQL; an ORM would only get in the way.

## Getting started

Prerequisites: Node 20+, pnpm, Docker, an OpenAI API key.

```bash
# 1. Infrastructure (Postgres with pgvector + Redis)
docker compose up -d

# 2. Dependencies
pnpm install

# 3. Backend environment — create apps/backend/.env
#    DATABASE_URL=postgres://rag:rag@localhost:5432/rag
#    REDIS_HOST=localhost
#    REDIS_PORT=6379
#    OPENAI_API_KEY=sk-...

# 4. Database migrations
cd apps/backend && pnpm migrate up

# 5. Run backend (http://localhost:3000)
pnpm --filter backend start:dev

# 6. Run frontend (http://localhost:5173, proxies /api to the backend)
pnpm --filter frontend dev
```

## API

| Endpoint | Description |
|---|---|
| `POST /documents` | Upload a file; returns immediately, ingestion runs in the background |
| `GET /documents` | List documents with ingestion status |
| `POST /retrieval/search` | Raw similarity search (top-K chunks for a query) |
| `POST /chat` | Ask a question; streams `sources`, `token`, `done` / `error` SSE events |
| `GET /conversations` | List conversations |
| `GET /conversations/:id/messages` | Messages of a conversation, including cited sources |

## Project structure

```
apps/
  backend/    # NestJS: ingestion, embeddings, retrieval, chat (SSE), migrations
  frontend/   # React: chat UI, streaming, citations, document management
docker/       # Postgres init (pgvector extension)
```

## Roadmap

- WebSocket push for document ingestion status (replacing polling)
- Stop-generation button (abort mid-stream, keep the partial answer)
- Document management: delete with vector cleanup, re-ingest
- Query rewriting for follow-up questions