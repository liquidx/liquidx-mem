# Phase 3 — External Access: API Tokens, CLI & Remote MCP

**Status:** 📋 Planned · **Depends on:** the unified-auth change (3a) is a prerequisite
for the CLI (3b) and MCP (3c).

## Goal

Let the user reach their mems from outside the browser — from scripts, other tools, and
AI assistants:

1. **A stable, token-authenticated API** covering read _and_ write (not just the few
   secret-accepting endpoints today).
2. **A CLI** that talks to the hosted API.
3. **A remote hosted MCP server** deployed with the app, so an MCP client (e.g. Claude)
   can search/add/edit mems.

## Decisions (already made)

| Question       | Decision                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| API auth model | **Dedicated API tokens** — named, revocable, per-user, hashed at rest.                     |
| MCP form       | **Remote hosted MCP** — an HTTP endpoint deployed with the app (not a local stdio server). |

## Background from the current system

- **Two auth flows exist today** (see [../spec/auth-and-features.md](../spec/auth-and-features.md)
  and [../spec/api.md](../spec/api.md)):
  1. **Firebase ID token** (`Authorization: Bearer …`), verified per-route via
     `getUserId()` in `src/lib/server/api.server.ts`.
  2. **Shared write secret** (`?secret=`/body `secret`), resolved via
     `userForSharedSecret(db, secret)` in `src/lib/user.db.server.ts`.
- **Only `mem/add`, `mem/user/get`, and `tag/suggest` accept the secret.** Everything
  else (`mem/list`, `mem/get`, `mem/edit`, `mem/flag`, `tag/list`, `prefs`) is
  Firebase-token-only, so it's unreachable headlessly today. Full table in
  [../spec/api.md](../spec/api.md).
- **Auth is per-route, not global** (`src/hooks.server.ts` only wires CORS + the Mongo
  client) — so switching endpoints to a new auth helper is a per-file change, but a
  mechanical and consistent one.
- **No MCP code exists** in the repo (greenfield).
- **Existing CLI**: `src/tool.ts` (`commander`-based, compiled via `tsconfig.tool.json`
  to `dist/`, run with `node dist/tool.js`). Today it talks to Firestore/Mongo directly,
  not to the hosted API. See [../spec/deployment.md](../spec/deployment.md).
- **Relevant known rough edges** to fix or avoid as this surface widens (from
  [../spec/api.md](../spec/api.md)): `mem/del` does no ownership check; `/_api/prefs`
  has no key allow-list (a caller can overwrite `writeSecret`); the `(feeds)` RSS routes
  have no auth at all. Exposing tokens makes these more important to tighten.

## Work breakdown

### 3a. Dedicated API tokens

- [ ] **Storage.** Per-user `apiTokens: [{ id, name, hashedToken, createdMs, lastUsedMs }]`
      (on the `users` doc, or a dedicated `apiTokens` collection). Show the raw token
      **once** at creation; store only a SHA-256 hash. Give tokens a recognizable prefix
      (e.g. `mem_…`) so they're distinguishable from a Firebase ID token in a Bearer header.
      Update `src/lib/user.types.ts`.
- [ ] **Auth helper.** Add a unified `authenticate(db, firebaseApp, request)` in
      `src/lib/server/api.server.ts`: 1. If Bearer starts with the token prefix → hash & look up via
      `userForApiToken(db, token)` (new, in `src/lib/user.db.server.ts`); bump
      `lastUsedMs`. 2. Else verify as a Firebase ID token (existing `getUserId`). 3. Else fall back to the `secret` param (existing `userForSharedSecret`).
      Existing callers keep working; new callers gain token support.
- [ ] **Adopt across endpoints.** Switch the read/write `/_api/*` handlers (`mem/list`,
      `mem/get`, `mem/edit`, `mem/flag`, `tag/list`) to `authenticate`. Keep
      `mem/add`/`mem/user/get`/`tag/suggest`'s existing secret path.
- [ ] **Harden while here.** Add the ownership check to `mem/del`, and consider a
      prefs key allow-list so tokens can't overwrite `writeSecret` (see rough edges above).
- [ ] **Token management UI.** Create/list/revoke tokens on the `/prefs` page, with
      client helpers in `src/lib/mem.client.ts`.

### 3b. CLI

- [ ] New `src/tools/api-tools.ts` command group on the existing `src/tool.ts`,
      talking to the **hosted API over HTTP** using `MEM_API_URL` + `MEM_API_TOKEN`
      (rather than direct DB access). Commands: `add`, `list`, `search`, `get`, `edit`,
      `tag`. Build/run via `pnpm run tsc-once` → `node dist/tool.js`.

### 3c. Remote hosted MCP server

- [ ] `src/routes/api/mcp/+server.ts` implementing the **Streamable HTTP** MCP transport
      (POST), built on `@modelcontextprotocol/sdk` (or Vercel's `mcp-handler` adapter,
      which targets this SvelteKit-on-Vercel setup — confirm the current API via the
      Context7 docs MCP at implementation time).
- [ ] **Auth:** MCP clients send `Authorization: Bearer <api-token>`; the handler runs
      the same `authenticate()` and scopes every operation to that user.
- [ ] **Tools exposed** (thin wrappers over existing `src/lib/mem.db.server.ts`
      functions / `_api` logic): `search_mems`, `list_mems`, `get_mem`, `add_mem`,
      `edit_mem`, `list_tags`, `reading_list`, `mark_read`. Reuse `Mem` /
      `MemListRequest` from `src/lib/request.types.ts` as the contract.

## Files

- **New:** `src/lib/server/tokens.server.ts` (hashing/verification helpers),
  `src/tools/api-tools.ts`, `src/routes/api/mcp/+server.ts`.
- **Edit:** `src/lib/server/api.server.ts` (unified `authenticate`),
  `src/lib/user.db.server.ts` (`userForApiToken`), `src/lib/user.types.ts`, the
  `/_api/*` read/write handlers, the `/prefs` page + `src/lib/mem.client.ts`,
  `src/tool.ts`, `package.json`, and `docs/spec/api.md` + `docs/spec/auth-and-features.md`
  (document the new auth path and MCP endpoint).

## Security notes

- Tokens are **bearer credentials with full account scope** — hash at rest, show once,
  make revocation immediate, and record `lastUsedMs` for auditing.
- Widening write access via tokens makes the existing `mem/del` (no ownership check) and
  `prefs` (no allow-list) gaps materially riskier — fix them as part of 3a.
- The MCP endpoint is internet-facing and authenticated only by the token — apply the
  same CORS discipline as `/_api/*` and never accept an unauthenticated call.

## Verification

- [ ] Create a token in the UI; confirm the raw value is shown once and only a hash is
      stored.
- [ ] Exercise `list`/`add`/`search` via the CLI against a local `pnpm run dev` with a
      real token; confirm 401/403 with a bad/revoked token.
- [ ] Connect an MCP client to the deployed `/api/mcp` with the token; confirm
      `search_mems`/`add_mem` work and are scoped to the authenticated user.
- [ ] Regression: existing Firebase-token browser flows still work after switching
      endpoints to `authenticate`.
- [ ] `pnpm run check` and `pnpm run lint` pass.
