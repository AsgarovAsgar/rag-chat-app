# TODO

Backlog for the RAG chat app.

**Importance:** 🔴 critical (broken or blocking) · 🟠 high (visible gap) · 🟡 medium (worth doing) · ⚪ low (nice to have)

**Time** estimates assume you're building it with guidance, including verification — not just typing. They're for the work itself; reviewing and PR overhead is on top.

| # | Task | Importance | Time |
|---|---|---|---|
| 1.1 | NUL-byte strip in ingestion | ✅ done | — |
| 2.1 | Spend protection | 🔴 blocking a public post | 15m–3h |
| 2.2 | Demo corpus check | 🟠 | 30m |
| 3.1 | Conversations CRUD | 🟠 | 3–5h |
| 3.2 | Documents page UX | 🟡 mixed, see per-item | 15m–4h each |
| 3.3 | Auto-generated titles | 🟡 | 1–2h |
| 4.1 | Query rewriting | ✅ done | — |
| 5.1 | Query routing | ⚪ optional | 3–5h |
| 5.2 | MCP server | ⚪ optional | 1–2 days |
| 6 | Old open items | ⚪ mostly | 10m–3h each |

Rough total for what remains through §4, excluding the optional §5: **1.5–2.5 focused days.**

---

## 1. Live in production — fix first

### 1.1 NUL-byte strip in ingestion
**✅ DONE — shipped in `8b803d4`, confirmed in `main`.**

Built as designed below: module-level `stripNullBytes`, private `readFormat()`, public `extractText()` wrapper in `ingestion.extraction.ts`. Design notes kept for the reasoning.

**Why it mattered:** Postgres `text` cannot store `0x00`, and PDF text layers (especially LaTeX/arXiv output) carry them. Ingestion died with `invalid byte sequence for encoding "UTF8": 0x00`, and the raw Postgres error was shown to the user in the documents list — the Lewis et al. RAG paper hit exactly this during demo seeding.

**Where:** `apps/backend/src/ingestion/ingestion.extraction.ts`

**Design (already agreed):**
- Rename the existing switch method to a private `readFormat()`.
- Add a public `extractText()` returning `stripNullBytes(await this.readFormat(path))`.
- `stripNullBytes` = `text.replace(/\0/g, '')`.
- Must run BEFORE the processor's "no usable text" check (`ingestion.processor.ts`, the `MIN_CONTENT_CHARS` guard) so an all-NUL file fails as *unusable* rather than inserting empty chunks.
- Only `0x00` needs stripping — every other control char is legal in PG text.

**No re-upload needed after deploy:** the processor doesn't delete the file on failure, and `retry` accepts `status='failed'`.

**Commit:** `fix: strip nul bytes from extracted text`

---

## 2. Before sharing the demo publicly

### 2.1 Spend protection
**🔴 Blocking for a public post · 15 min to 3 h depending on depth**

**Why:** public demo account + open registration + uploads and chat hitting a personal OpenAI key. A modestly successful post can run a real bill overnight.

Note: `@nestjs/throttler` was previously considered and declined ("i feel like we dont need it now"). **That decision was reversed 2026-08-03 and throttling is now built** — see the third bullet below. The original reasoning still explains the delay: it was declined for normal operation, and what changed is going public, which changes the traffic assumption.

- [x] **🔴 ~15 min** — OpenAI dashboard hard spend limit. **DONE 2026-08-03: project spend limit $10.00/month, enforcing ("requests will start to fail when limit is reached"), at $0.02 when set.** Two follow-ups if not already handled: confirm the backend's `OPENAI_API_KEY` belongs to *this* project (a key from another project or a legacy org-level key isn't covered by a project cap), and set a notification threshold below $10 so you hear about it before the demo breaks.
- [ ] **🟠 ~1 h** — Per-user upload cap / total document count cap. Cheapest code-level lever; uploads are the expensive path (embeddings on every chunk).
- [x] **🟡 ~2–3 h** — Throttle on chat + upload + demo endpoints. **BUILT 2026-08-03** (uncommitted at time of writing). `@nestjs/throttler@6.5.0` properly installed this time — recorded in both `apps/backend/package.json` and `pnpm-lock.yaml`, unlike the earlier orphan. Shape: global permissive default `ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] })` + `APP_GUARD` in `app.module.ts`, with per-route `@Throttle` overrides — `/auth/demo` 3/hour, `/chat` 10/min, `/documents` upload 10/hour. `documents/:id/retry` left on the global default (owner-scoped, already gated).
  - **`ttl` is MILLISECONDS in v6+.** Old docs show bare seconds; `ttl: 60` would mean 60ms and silently throttle nothing.
  - **Guard order matters and is correct as built:** `AppModule`'s own providers resolve before imported modules', so `ThrottlerGuard` runs before `AuthModule`'s `JwtAuthGuard` (`auth.module.ts:27`) — a flood is rejected before it costs a JWT verification.
  - **`app.set('trust proxy', 1)` in `main.ts` is load-bearing.** Behind Railway's proxy every request appears to come from the proxy IP, so without it all users share one bucket and the limits throttle the whole userbase collectively — worse than no throttle. Requires `NestFactory.create<NestExpressApplication>(AppModule)`.
  - [ ] **Verify the proxy actually works** — hit a throttled route from two networks (cellular vs wifi) and confirm they don't share a counter. Not yet done.
  - [ ] **🟡 ~30 min** — Frontend 429 handling. `apiFetch` treats non-2xx generically; a 429 on the demo button should say "try again in a minute", not a generic auth error.
  - **Not covered:** WebSockets (`ThrottlerGuard` is HTTP-only, `EventsModule` gateway is untouched). Storage is in-memory — per-process, resets on deploy, fine for one Railway instance; a second instance would need the Redis adapter (Redis is already wired for BullMQ).

### 2.2 Demo corpus check
**🔴 Critical · ~45 min**

Rewritten 2026-08-03 for the per-visitor sandbox model (PR #37). The old shared-account framing is gone: visitors no longer share one login, so "anyone can delete the seed docs" is no longer the risk. `POST /auth/demo` clones the seed corpus into a fresh throwaway tenant per visitor, and a partial unique index (`users_demo_seed_idx`) allows at most one seed row.

The seed account **is** an ordinary loginable account — the `AND NOT is_demo_seed` login filter was built (`d70f217`) and deliberately reverted (`bb68aec`) because it locked you out of your own seed and made every corpus update a SQL statement. Accepted consequence: that password is effectively the key to the template every visitor copies. Don't re-add the filter, and don't try to neuter the row by setting `password_hash = 'x'` — `verify()` throws on a malformed argon2 hash, so that 500s rather than 401s.

The risk inverted: instead of visitors damaging a shared corpus, the failure is **the seed not existing in prod at all**.

- [ ] **🔴 ~15 min** — **Provision the seed tenant in prod.** This is the outstanding item from the cloning round. `demo.service.ts:85` treats a missing seed as a *warning*, not an error — no seed means every visitor gets a silently empty sandbox and a demo that answers nothing. It fails soft, so it will not show up as an error anywhere; you have to look. Verify with `SELECT id FROM users WHERE is_demo_seed`.
- [ ] **🟠 ~15 min** — Confirm the 4 seed docs are attached to that row and `status = 'ready'` — the clone's `WHERE status = 'ready'` filter means a stuck or failed seed doc is skipped silently and the sandbox comes up short.
- [ ] **🟡 ~15 min** — Click through https://chat.comospace.dev via the demo button and confirm a fresh sandbox actually returns answers end to end. Re-verify the README's "questions worth trying" against a sandbox, not against your own account.
- [ ] **⚪ ~30 min extra** — Screenshot for `README.md:9` — still an open TODO, and it's what a reviewer sees before clicking anything

**Consider promoting to a real error:** if a missing seed should fail loudly instead of handing out empty sandboxes, that's a one-line change at `demo.service.ts:87`. Worth deciding once prod is seeded.

---

## 3. Product gaps

### 3.1 Conversations CRUD (delete + rename)
**🟠 High · ~3–5 h total** (backend ~1 h, frontend ~2–3 h, verification ~1 h)

The frontend is the bulk of it — the backend is two endpoints copied from an existing pattern.

**Why:** documents have full CRUD (delete, retry, status badges) but conversations have none. `ConversationsController` is `GET` list + `GET :id/messages` and nothing else. The sidebar accumulates junk permanently — including test conversations from earlier sessions. Most visible product hole in the app, and it unblocks the DB cleanup item in §6.

**Scaffolding already present:** `apps/frontend/src/components/nav-projects.tsx` was deliberately kept for exactly this pattern — `SidebarMenuAction showOnHover` + `DropdownMenu` with a destructive item, already wired for `isMobile` placement. See memory `sidebar-nav-scaffolding-kept`. Strip the Projects/View/Share specifics and reuse the structure. Note the base-ui gotchas: `render=` not `asChild`, and `DropdownMenuLabel` throws unless wrapped in `DropdownMenuGroup`.

**Verified facts:**
- `messages.conversation_id` is `ON DELETE CASCADE` (`migrations/1784031048268_add-conversations.sql:10`) — deleting a conversation drops its messages with no extra work.
- `conversations.user_id` is `ON DELETE CASCADE` (`migrations/1785159640308_add-ownership.sql:3`).
- Scoping precedent to copy: `documents.service.ts` uses `DELETE ... WHERE id = $1 AND user_id = $2 RETURNING`, 0 rows → `NotFoundException`.

**Backend** (`conversations.controller.ts` + `chat.service.ts`) — **~1 h**:
- [ ] **🟠 ~30 min** — `DELETE /conversations/:id` — `@HttpCode(204)`, `@Param('id', ParseUUIDPipe)`, single scoped `DELETE ... WHERE id = $1 AND user_id = $2 RETURNING id`, 0 rows → 404. **404 not 403** on another tenant's row (403 is an id-enumeration oracle).
- [ ] **🟡 ~30 min** — `PATCH /conversations/:id` — `UpdateConversationDto` with `@IsString()` + length bounds; scoped `UPDATE ... WHERE id = $1 AND user_id = $2 RETURNING`. DTO param must stay a **value import** or `ValidationPipe` silently skips validation.
- [ ] **~0** — Both are covered by the global `APP_GUARD` — no `@Public()`, no per-controller `@UseGuards` needed.

**Frontend** — **~2–3 h**:
- [ ] **🟠 ~30 min** — `api/conversations.ts` — `deleteConversation`, `renameConversation`, both via `apiFetch`. Delete returns 204, so don't call `res.json()`.
- [ ] **🟠 ~1 h** — `AppSidebar.tsx:62-68` — add the action dropdown to the conversation row.
- [ ] **~15 min** — Mutations invalidate `queryKeys.conversations`.
- [ ] **🔴 ~30 min** — **Deleting the active conversation must navigate away** (`useMatch('/c/:conversationId')` already gives `activeId`) — otherwise `ConversationPage` sits on a 404'd id. Skipping this ships a visible bug.
- [ ] **🟡 ~30 min** — **Deleting mid-stream:** check what happens if the deleted conversation is the one currently streaming (`streamConversationId` in the store). Simplest correct answer is to disable the delete action while that row is streaming.
- [ ] **🟡 ~1 h** — Rename UX: inline edit in the row, or a small dialog. Delete confirm — reuse whatever §3.2 settles on rather than a second `window.confirm`.

**Related bug found while reading — 🟡 ~15 min:** `ConversationRow` in `chat.service.ts:11` types `title` as `string`, but `Conversation` in `api/conversations.ts:6` types it `string | null` and the sidebar renders `c.title ?? 'Untitled'`. One of the two is lying — check whether the INSERT at `chat.service.ts:88` can write NULL, and make the backend type honest. Do this before the rename work, which touches `title` directly.

### 3.2 Documents page UX
**Where:** `apps/frontend/src/pages/DocumentsPage.tsx`, `apps/frontend/src/components/DocumentUpload.tsx`

The page works — table, status badges, delete, retry, live WS status updates. These are the rough edges, ordered by how likely a visitor is to hit them. **Cherry-pick; this is not one task.** The first three are ~2 h combined and cover most of the real-world pain.

- [ ] **🟠 ~1 h** — **Failed-document errors are hidden in a `title` tooltip** (`DocumentsPage.tsx:84`). The whole point of the ingestion error work was a message naming the cause ("Only N characters of text extracted from X — is it a scanned PDF with no text layer?") and right now you only see it by hovering a badge. Not discoverable, and invisible on touch. Show it inline on failed rows, or make the badge a popover.
- [ ] **🟠 ~1 h** — **Upload errors vanish.** `mutation.isError` renders next to the button (`DocumentUpload.tsx:28`), but any new upload resets the mutation, so the message can disappear before it's read. Worth a toast, or a dismissible inline alert. (A toast component is reusable across §3.1 too.)
- [ ] **🟡 ~2 h** — **No upload progress.** Button flips to "Uploading…" and that's it. A large PDF over a slow connection looks frozen. Indeterminate bar is ~30 min; real percentage needs swapping `fetch` for `XMLHttpRequest`, which is the rest of the time.
- [ ] **🟡 ~2–3 h** — **No drag-and-drop.** For a document-centric app this is the expected interaction; the hidden-input + button is the minimum version. Most demo-visible item in this section.
- [ ] **🟡 ~1 h** — **Single file only.** `e.target.files?.[0]` takes the first file and silently drops the rest, and the input has no `multiple`. Either allow multiple (needs per-file mutation state) or make the constraint visible (~10 min).
- [ ] **🟡 ~30 min** — **`pending` and `processing` look identical** — both `secondary` (`DocumentsPage.tsx:21-22`). A spinner on `processing` would make the pipeline feel alive, which is the interesting part of this app. Good value for the time.
- [ ] **🟡 ~45 min** — **No client-side file validation.** `accept` filters the picker but nothing checks type or size before the request, so an oversized file uploads fully and then fails server-side. Backend limit is 50 MB.
- [ ] **⚪ ~45 min** — **`window.confirm` for delete** (`DocumentsPage.tsx:109`). Works, but it's the one place the UI drops out of the design system. Shared with §3.1's delete confirm — build once.
- [ ] **🟡 ~1–2 h** — **Table isn't responsive.** `table-fixed` with five columns and a `truncate` on filename — check on mobile first (~10 min); the fix is a card layout or fewer columns at narrow widths. Time is uncertain because I haven't verified it's actually broken.
- [ ] **⚪ ~1 h** — **No chunk count.** Was deliberately not selected in the CRUD round. Reconsider: it's the one column that shows retrieval actually happened, and it makes a zero-chunk document self-evident. Needs a `COUNT` join in `documents.service.ts`.
- [ ] **⚪ ~10 min** — **Cosmetic:** stray indentation at `DocumentsPage.tsx:52`; `Uploaded` shows date only, no time.

### 3.3 Auto-generated conversation titles
**🟡 Medium · ~1–2 h**

**Why:** related to the above — check what `title` currently holds. If it's the raw first message, a short LLM-generated title is a small, visible polish win and pairs naturally with rename. Cheap because the OpenAI client is already wired in `chat.service.ts`; the design question is whether to generate inline (adds latency) or fire-and-forget after the first exchange.

---

## 4. Retrieval quality

### 4.1 Query rewriting for follow-up questions
**✅ DONE 2026-08-04** — branch `feat/query-rewriting`, 2 commits.

`rewriteQuery()` in `chat.service.ts` resolves the latest message against the last 6 turns via `gpt-4o-mini` at `temperature: 0`, and `chat()` retrieves on the result. Retrieval-only: `dto.message` is still what is stored and what the answer prompt sees.

- **Skipped entirely on turn 1** (`history.length === 0`) — nothing to resolve, and it is the demo's most common path.
- **Fails soft in four ways** — empty history, empty response, thrown error, or a 3 s `AbortSignal.timeout` — all returning the original message. The call sits *inside* the existing try/catch around `search`, because after `flushHeaders()` an uncaught throw is a dead stream with no `done` and no `error`, not a 500.
- **Ordering is load-bearing:** `loadHistory` runs before the user-message INSERT, so `history` excludes the current turn; the rewrite runs *after* `flushHeaders` and the `conversation` event, so its latency lands while the user already sees their message and a thinking indicator.
- **Prompt is dedented to column 0.** The transcript interpolates as multiple lines, so an indented template literal would scramble the `User:`/`Assistant:` structure the rewriter depends on to resolve references.
- **Verified:** turn 1 logs nothing; `"How is that different from pgvector?"` → `"How is the retriever in the RAG paper different from pgvector?"` with sources spanning both documents; an already-standalone question round-tripped unchanged (the over-rewriting regression check).
- **Not taken:** a regex pre-filter to skip the call on messages with no pronoun. Costs one wasted round-trip (~300–600 ms) per standalone follow-up. Rejected as English-only heuristic complexity in a 30-line method — revisit if the latency is ever perceptible.

### 4.2 Per-document retrieval cap — ✅ SHIPPED
Built at `topK = 5` with `MAX_PER_DOCUMENT = 3` and `CANDIDATE_POOL = 30` (`de27e25`, in `main`) — a `rank_in_document` CTE in `retrieval.service.ts` stops one document's cluster from taking every slot on a comparative question. Composes with §4.1 but does not overlap it: the cap fixes *ranking*, the rewrite fixes *the query text*. (This section previously read "DESIGNED, DECLINED" — that was stale.)

---

## 5. Agentic layer (post-worthy, optional)

Context: this maps onto the IBM RAG/Agentic AI curriculum without paying for it, implemented in your own TS stack rather than Python notebooks. Both are **⚪ optional** — nothing here fixes a gap, they're for the learning and the second post.

### 5.1 Query routing
**⚪ Optional · ~3–5 h**

Decide per message: retrieve, answer directly, or ask for clarification. Small, self-contained, genuinely agentic. Now a natural follow-on from the shipped §4.1: `rewriteQuery()` already establishes the pre-retrieval interception point, the fail-soft pattern, and the cheap-model call — routing slots in beside it, so this is closer to 2 h than 5.

### 5.2 MCP server over the document corpus
**⚪ Optional · ~1–2 days**

Expose `search` and `fetch` tools so Claude Desktop / Claude Code can query the corpus. Current, few people have shipped one in TypeScript, and it covers the same ground as the MCP course. Biggest item on this list — it's a new deployable surface with its own auth story (the existing cookie-based session doesn't transfer to an MCP client), not just an endpoint.

**Explicitly not doing:** multi-agent orchestration (unnecessary at this scale, hard to demo), multimodal ingestion (big lift, high API cost).

---

## 6. Old open items

- [ ] **🟡 ~2–3 h** — Frontend review item 2, residual autoscroll yank. `StreamingMessage`'s sentinel `scrollIntoView`s every token, so scrolling up mid-stream yanks you back down. `BottomScrollButton` gives a way *down*, not a way to *stay up*. Coupling note: the button's `atBottom` stays fresh during streams only because the sentinel yanks fire scroll events — any near-bottom guard on the sentinel must add a `ResizeObserver` content-growth recheck to the button. Estimate is wide because a previous attempt at this was abandoned undiagnosed.
- [ ] **⚪ ~10 min** — Frontend review item 4: `nav-main.tsx` is dead. (`nav-projects.tsx` is deliberately kept, see 3.1 — delete `nav-main` only.)
- [ ] **⚪ ~15 min** — Frontend review item 10: `aria-expanded` on `SourceChips`.
- [ ] **⚪ ~15 min** — DB cleanup: junk test conversations from earlier sessions. Blocked on 3.1 (no delete UI exists). Trivial once the UI ships.
- [ ] **⚪ ~15 min** — Cosmetic, previously skipped: `new QueryClient` missing parens in `lib/queryClient.ts`; `apiFetch` param named `input` while typed `string`; repeated `fetch(input, init)` instead of a hoisted thunk.
- [ ] **🟡 ~15 min** — Tag + GitHub Release for the auth deploy (`v0.2.0`) if not already done.
