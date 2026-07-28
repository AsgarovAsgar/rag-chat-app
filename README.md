# RAG Chat

[![CI](https://github.com/AsgarovAsgar/rag-chat-app/actions/workflows/ci.yml/badge.svg)](https://github.com/AsgarovAsgar/rag-chat-app/actions/workflows/ci.yml)

A full-stack, multi-user Retrieval-Augmented Generation (RAG) chat application: upload your documents, ask questions, and get **streamed answers with inline citations** grounded in the document content.

**[Live demo → chat.comospace.dev](https://chat.comospace.dev/)**

Sign in with **`demo@example.com`** / **`demo1234`**. The account is pre-loaded with four documents — this project's own spec, the original RAG paper, the pgvector README, and RFC 7519 (JWT) — so there's something to ask about immediately.

<!-- TODO: add screenshot here -->
<!-- ![RAG Chat screenshot](docs/screenshot.png) -->

### Questions worth trying

| Question | What it shows |
|---|---|
| *What is retrieval-augmented generation, and how does it differ from a purely parametric model?* | A grounded answer from the original RAG paper, with citations you can open and verify against the source |
| *Which distance operators does pgvector provide, and which one is cosine similarity?* | The same question routed to a different document entirely — retrieval picks the right source without being told which to look in |
| *What are the registered claim names in a JWT?* | A precise, checkable list pulled out of a 30-page RFC |
| *What was in scope for v1 of this project, and what was listed as a stretch goal?* | This app answering questions about its own planning document — auth was a stretch goal, and it shipped |
| *What is the company's parental leave policy?* | "I don't know", with **no sources** — the model answers only from retrieved context and declines rather than inventing one |

## Features

- **Document ingestion pipeline** — upload PDF / DOCX / TXT / Markdown; files are extracted, chunked, embedded, and indexed asynchronously in a background queue, with live status pushed to the UI over a WebSocket
- **Streamed chat** — answers stream token-by-token over Server-Sent Events, with an optimistic UI (your message and a thinking indicator appear instantly) and a stop button that aborts mid-stream while keeping the partial answer
- **Inline citations** — answers include `[n]` markers rendered as superscripts; numbered source chips show only the chunks actually cited, with similarity score and excerpt on click
- **Conversation history** — conversations persist with their sources; chat history is fed back into the prompt for follow-up questions
- **Grounded answers** — the model is instructed to answer only from retrieved context and say "I don't know" otherwise
- **Accounts and per-user isolation** — email/password registration, argon2id password hashing, and a cookie session; every document, chunk, conversation, and status event belongs to exactly one user
- **Document management** — delete a document (with its chunks and stored file) or retry a failed ingestion

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query (server state), Zustand (stream state), React Router 7, Tailwind CSS 4 + shadcn/ui |
| Backend | NestJS 11, TypeScript |
| Vector search | PostgreSQL + pgvector (HNSW index, cosine distance) |
| Background jobs | BullMQ + Redis |
| Realtime | Socket.IO (per-user rooms for ingestion status) |
| Auth | JWT access cookie + rotating refresh tokens, argon2id hashing |
| AI | OpenAI `text-embedding-3-small` (embeddings), `gpt-4o-mini` (generation) |
| Tooling | pnpm workspaces monorepo, raw SQL migrations via node-pg-migrate, Docker Compose, GitHub Actions CI |

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
    H -.->|socket.io<br/>user room| I[UI status]
```

**Query** (streamed):

```mermaid
flowchart LR
    Q[POST /api/chat] --> E[Embed question]
    E --> R[pgvector top-5<br/>cosine, owner-scoped]
    R --> P["Prompt with [n]-labeled chunks<br/>+ last 10 messages"]
    P --> S[gpt-4o-mini stream]
    S --> SSE[SSE: sources → tokens → done]
    SSE --> DB[(persist message + sources)]
```

**Session** (cookie-based):

```mermaid
flowchart LR
    L[POST /api/auth/login] --> C["access_token (15m, path /)<br/>refresh_token (30d, path /api/auth)"]
    C --> G[Guard verifies access token<br/>on every non-@Public route]
    G -->|401| RF[POST /api/auth/refresh]
    RF --> RT[Rotate: spend token,<br/>mint successor in same family]
    RT --> C
```

## Key technical decisions

- **SSE over POST instead of WebSockets for chat streaming.** SSE is testable with `curl -N`, needs no connection lifecycle management, and fits a request/response flow. Since `EventSource` only supports GET, the frontend consumes the stream with `fetch` + `ReadableStream` and a manual event-frame parser. WebSockets are used only where the server genuinely pushes unprompted — ingestion status.
- **Cancellation that persists partial answers.** Closing the request aborts the OpenAI stream via `AbortController`, and the partial response is still saved to the conversation.
- **`ORDER BY` on bare distance** so Postgres actually uses the HNSW index — ordering by a derived similarity expression would force a sequential scan.
- **`hnsw.iterative_scan = strict_order` for filtered search.** Retrieval filters by owner and by `status = 'ready'`, and those filters are applied *after* the index returns candidates — so a plain HNSW scan can return fewer than top-K rows. Iterative scan lets the index keep pulling until K survivors are found, without giving up ordering.
- **Ownership enforced in SQL, not in the service layer.** `user_id` is a `NOT NULL` column on documents, chunks, and conversations, and every read carries a `WHERE user_id = $n`. A missed check produces a 404, not another tenant's data — there is no code path that fetches a row first and authorizes it afterwards.
- **Auth in httpOnly cookies, not `localStorage`.** Tokens are unreachable from JavaScript, so an XSS bug cannot exfiltrate a session. The short-lived access token is scoped to `/`; the long-lived refresh token is scoped to `/api/auth`, so it is never sent on ordinary API calls.
- **Refresh-token rotation with reuse detection.** Each refresh spends its token and mints a successor in the same family. Re-presenting a spent token means it leaked, so the whole family is revoked — with a 30-second grace window, because concurrent tabs racing on the same token is a client race, not theft. On the frontend, a single-flight promise in `apiFetch` collapses parallel 401s into one refresh.
- **Idempotent ingestion.** Chunk storage runs in a single transaction with DELETE-then-INSERT, so re-processing a document can never duplicate or half-write chunks.
- **Server state vs. client state split on the frontend.** TanStack Query owns everything persisted (conversations, messages, documents); Zustand owns only the ephemeral stream (pending message, streaming text, sources). The handoff on `done` — refetch messages, then clear the stream — makes the streamed answer settle into history without a flash.
- **Citations map to chunks, not documents.** `[n]` markers in the answer refer to specific retrieved chunks, and only cited chunks render as source chips — an answer of "I don't know" shows no sources.
- **Raw SQL migrations, no ORM.** Vector columns, HNSW indexes, and similarity queries are first-class SQL; an ORM would only get in the way.
- **One deployable image.** The backend serves the built frontend as static files and runs migrations on boot, so the whole app ships as a single container with Postgres and Redis as the only external dependencies.

## Getting started

Prerequisites: Node 20+, pnpm, Docker, an OpenAI API key.

```bash
# 1. Infrastructure (Postgres with pgvector + Redis)
docker compose up -d

# 2. Dependencies
pnpm install

# 3. Backend environment — create apps/backend/.env (see Environment below)
#    DATABASE_URL=postgres://rag:rag@localhost:5432/rag
#    JWT_SECRET=any-long-random-string
#    OPENAI_API_KEY=sk-...

# 4. Database migrations
cd apps/backend && pnpm migrate up

# 5. Run backend (http://localhost:3000)
pnpm --filter backend start:dev

# 6. Run frontend (http://localhost:5173, proxies /api to the backend)
pnpm --filter frontend dev
```

Open the frontend, register an account, and upload a document to get started.

### Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string; the app refuses to boot without it |
| `JWT_SECRET` | yes | — | Signs the 15-minute access token; also refuses to boot without it |
| `OPENAI_API_KEY` | yes | — | Embeddings and generation |
| `REDIS_HOST` | no | `localhost` | BullMQ connection |
| `REDIS_PORT` | no | `6379` | |
| `REDIS_PASSWORD` | no | — | Required by most managed Redis providers |
| `PORT` | no | `3000` | HTTP port |
| `UPLOAD_DIR` | no | `./uploads` | Where uploads land before ingestion; must be writable and, in production, persistent |
| `NODE_ENV` | no | — | Set to `production` when deploying — it flips the `Secure` flag on the auth cookies |

### Production image

The backend serves the frontend build and runs migrations on boot, so the whole app is one container:

```bash
docker build -t rag-chat .
docker run -p 3000:3000 --env-file apps/backend/.env -e NODE_ENV=production rag-chat
```

## API

All routes are served under the `/api` prefix and require the session cookie unless marked public.

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Create an account (public) |
| `POST /api/auth/login` | Log in; sets the access and refresh cookies (public) |
| `POST /api/auth/refresh` | Rotate the refresh token and re-issue both cookies (public) |
| `POST /api/auth/logout` | Revoke the session family and clear cookies (public) |
| `GET /api/auth/me` | Current user |
| `POST /api/documents` | Upload a file; returns immediately, ingestion runs in the background |
| `GET /api/documents` | List your documents with ingestion status |
| `DELETE /api/documents/:id` | Delete a document with its chunks and stored file |
| `POST /api/documents/:id/retry` | Re-queue a failed ingestion |
| `POST /api/retrieval/search` | Raw similarity search (top-K chunks for a query) |
| `POST /api/chat` | Ask a question; streams `sources`, `token`, `done` / `error` SSE events |
| `GET /api/conversations` | List your conversations |
| `GET /api/conversations/:id/messages` | Messages of a conversation, including cited sources |

Ingestion progress is pushed over Socket.IO as `document:status` events, delivered only to the owning user's room.

## Project structure

```
apps/
  backend/            # NestJS: auth, ingestion, embeddings, retrieval, chat (SSE), websocket events
    migrations/       # raw SQL migrations (node-pg-migrate)
  frontend/           # React: chat UI, streaming, citations, document management, auth pages
docs/                 # PRD and project spec, written before implementation
docker/               # Postgres init (pgvector extension)
.github/workflows/    # CI: lint + build, both apps
Dockerfile            # production image (frontend build served by the backend)
```

The original planning documents are kept as a record of the intent the project started from: [PRD](docs/RAG_PRD.md) (problem, personas, scope) and [project spec](docs/RAG_PROJECT_SPEC.md) (stack choices, build order, stretch goals).

## Roadmap

- Query rewriting for follow-up questions
- Backend integration tests and frontend unit tests in CI
- Per-document filtering at query time ("ask only this file")
