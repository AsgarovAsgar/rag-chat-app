# Frontend — RAG Chat

React 19 + TypeScript + Vite: chat UI with token-by-token streaming, inline citations, document management, and authentication.

See the [root README](../../README.md) for architecture, design decisions, and setup.

## Layout

```
src/
  api/          # fetch wrappers, auth-aware retry, query keys
  components/   # chat input, message list, citations, source chips, sidebar
  pages/        # home, conversation, documents, login, register
  hooks/        # document status subscription, current user
  store/        # zustand — ephemeral stream state only
  lib/          # citation parsing, rehype plugin, query client
```

Server state lives in TanStack Query; only the in-flight stream lives in Zustand. See *Key technical decisions* in the root README for why.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Vite dev server on port 5173, proxying `/api` to the backend |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint |
