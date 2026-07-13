# RAG Chat Application — PRD

## 1. Problem Statement
Knowledge workers and job-seekers alike often have long documents (contracts, reports, research papers, resumes, internal docs) they need to quickly extract answers from, without reading the whole thing. While generic LLM chat tools support ad-hoc file uploads within a single session, they fall short at scale: context windows limit how much (or how many) documents can be considered at once, uploaded content isn't persisted/reused efficiently across sessions, and there's typically no structured way to trace an answer back to its exact source chunk. This product addresses that gap by embedding and indexing documents once, then retrieving only the relevant pieces per query — enabling querying across a growing document collection with verifiable citations back to source.

Secondary purpose: this is a portfolio project intended to demonstrate senior-level full-stack engineering — system design, async processing, real-time streaming UX, and retrieval/AI integration — to prospective employers.

## 2. Target User / Use Case
- **Primary persona**: a professional (or, for demo purposes, an interviewer/recruiter evaluating the project) who uploads 1 or more documents and asks natural-language questions to quickly find information without manually searching/reading.
- **Representative use cases**:
  - Upload a research paper, ask "what methodology did they use?"
  - Upload a contract, ask "what's the termination clause?"
  - Upload multiple reports, ask a question that requires synthesizing across them
- **Demo/portfolio use case**: an interviewer uploads a sample doc (e.g. a spec or article) and evaluates retrieval accuracy, citation correctness, and UX polish (streaming, latency, error handling) live.

## 3. User Stories
- As a user, I want to upload a document and see clear ingestion status (processing/ready/failed) so I know when it's ready to query.
- As a user, I want to ask a question and see the answer stream in real time, so the experience feels responsive rather than a long blocking wait.
- As a user, I want to see which document/chunk an answer was sourced from, so I can trust and verify the response.
- As a user, I want to upload and query multiple documents at once, so I'm not limited to one file at a time.
- As a user, I want my conversation history saved, so I can return to a previous thread without losing context.
- As a user, I want to know if my document failed to process (e.g. corrupted PDF), so I'm not left wondering why nothing happens.

## 4. Scope

### In scope (v1 / core)
- Single- and multi-document upload (PDF, DOCX, TXT, MD)
- Async ingestion pipeline with visible status
- Streamed chat responses grounded in uploaded documents
- Source citations per answer
- Persisted conversation history

### Stretch (v1.1+, pick 2-3 for demo differentiation)
- Hybrid search (vector + keyword)
- Reranking for retrieval precision
- Retrieval quality evaluation (RAGAS-style metrics)
- Mid-stream response cancellation
- Document management (delete/re-ingest)
- Chunk-level debug view (shows retrieved chunks + similarity scores)
- Auth (per-user document/conversation scoping)

### Explicitly out of scope
- Multi-tenant/team collaboration features
- Non-text document types (images, audio/video) beyond what's needed for text extraction
- Fine-tuned or self-hosted models (stays on OpenAI API — see architecture spec for reasoning)
- Mobile app (web-responsive only)

### Future direction: data privacy
Current architecture calls OpenAI's API for both embeddings and generation, meaning document content leaves the app's infrastructure the same way it would with any hosted LLM chat tool — privacy is not a current differentiator. A future iteration could address this by self-hosting the embedding model (e.g. `bge-small`) and/or the LLM, or using a private/enterprise LLM deployment (e.g. Azure OpenAI with a data-processing agreement), so that no document content is sent to a public third-party API. This would be a legitimate v2 direction but is a meaningful scope change (see architecture spec's self-hosted embeddings discussion) and is not part of v1.

## 5. Success Criteria
Since this is a portfolio project rather than a shipped product with real users/revenue, success is defined by demonstration quality rather than business metrics:
- Retrieval returns relevant chunks for representative test questions (spot-checked manually, or via a small RAGAS eval if built)
- End-to-end flow (upload → ingest → ask → cited streamed answer) works reliably in a live demo without errors
- Ingestion handles a reasonably large document (e.g. 50+ pages) without timing out or blocking the UI, validating the async/queue design choice
- Citations correctly map back to the actual source chunk/document
- Codebase and architecture are clean enough to walk an interviewer through confidently, with clear reasoning for each major decision (chunking strategy, sync vs async, embedding model choice, etc.)

## 6. Key UX Flows
1. **Upload flow**: user selects/drags file(s) → sees per-file progress/status → gets notified when ready (via WebSocket push) → error state shown clearly if ingestion fails
2. **Chat flow**: user types a question → sees typing/thinking indicator → response streams token-by-token → citations appear inline or as footnotes linked to source chunks
3. **History flow**: user can view/return to past conversations, tied to the documents they were run against

## 7. Related Document
See `RAG_PROJECT_SPEC.md` for full technical architecture, stack decisions, and build order.
