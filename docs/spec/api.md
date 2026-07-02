# API Reference

All JSON API endpoints live under `src/routes/_api/` and are served at the URL prefix
**`/_api`** (SvelteKit does not treat a leading underscore on a route directory as
private — only files starting with `_` inside a route dir are excluded from routing,
so `_api` is a normal path segment). RSS/feed endpoints live under
`src/routes/(feeds)/` and are documented at the end of this file.

## Global middleware (`src/hooks.server.ts`)

Every request passes through `sequence(cors, dbPrepare)`:

- **`cors`** — responds to `OPTIONS` preflight requests directly with `200` and
  permissive headers (`Access-Control-Allow-Origin: *`, methods
  `GET, POST, PUT, DELETE, PATCH, OPTIONS`, headers `Content-Type, Authorization`).
  For any other request whose path starts with `/_api/`, the same headers are added
  to the outgoing response.
- **`dbPrepare`** — lazily creates and module-caches a `MongoClient`
  (`getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD)`), attaching it to
  `event.locals.mongoClient` for every request. Handlers call
  `getDb(locals.mongoClient)` to get the `mem` database.
- `handleError` forwards just `error.message` (hides stack traces from clients).

**There is no global authentication check** — `hooks.server.ts` only sets up CORS and
the DB client. Every `/_api/**` handler is individually responsible for verifying auth.

## Authentication (shared helper)

`src/lib/server/api.server.ts` (there is no separate `auth.server.ts`):

- `getUserId(firebaseApp, request)` — reads `Authorization: Bearer <token>`, verifies
  it via Firebase Admin (`getAuth(firebaseApp).verifyIdToken(token)`), returns the
  decoded UID or `undefined` if missing/invalid.
- `getUser(firebaseApp, request)` — same, but also loads the full Firebase
  `UserRecord`. Not currently used by any route (all routes use `getUserId` only).

**Two-tier auth pattern**: most endpoints require a valid Firebase bearer token. A
subset (`mem/add`, `mem/user/get`, `tag/suggest`) additionally accept a **shared write
secret** (`?secret=` query param or `secret` body field) as an alternative, resolved
via `userForSharedSecret(db, secret)` — intended for token-less programmatic clients
(bookmarklets, iOS Shortcuts, Android HTTP Shortcuts). See
[auth-and-features.md](./auth-and-features.md) for details.

All permission failures return `error(403, JSON.stringify({ error: "Permission denied" }))`.

## Mem endpoints

### `POST` / `GET /_api/mem/add`

The main ingestion endpoint (uses SvelteKit's `fallback` handler and branches
internally; any other method → `405`).

- **Params**: POST body or GET query — `{ text?, image?, secret? }`.
- **Auth**: Firebase token OR `secret` (shared write secret); either resolves a `userId`. Missing both → `403`.
- **Behavior**:
  - If `text` is given: parsed via `parseText()` (extracts URL/note/tags/date — see
    [data-model.md](./data-model.md)). If parsing fails → `500 { error: "Invalid text" }`.
    If the parsed URL already matches an existing mem for the user
    (`findMemByUrl`), the two are **merged** (tags unioned, notes concatenated with
    `\n\n`, `addedMs` bumped to now) instead of creating a duplicate.
  - Else if `image` (base64) is given: decoded and uploaded to S3 at
    `users/{userId}/{yyyyMMddhhmmss}`; on failure → `500 { error: "Error uploading image" }`.
  - Else → `500 { error: "No text or image" }`.
  - New (non-duplicate) mems: `addMem` → `refreshTagCounts` →
    `annotateMem` (Open Graph enrichment) → `mirrorMediaInMem` (caches remote media to S3).
- **Returns**: `200 { mem }`.
- **Errors**: `403`, `500` (invalid text / image upload failure / no text-or-image / add failure).

### `POST /_api/mem/annotate`

- **Body**: `{ memId }` (missing → `400 { error: "No mem id" }`).
- **Auth**: Firebase token only.
- **Behavior**: Loads the mem (scoped to `userId`; not found → `500 { error: "Error getting mem" }`),
  re-runs `annotateMem` and `mirrorMediaInMem`, persists.
- **Returns**: `200 MemAnnotateResponse = { mem, memId }`.

### `POST /_api/mem/attach`

- **Body**: `{ mem: memId, image: { mimetype, filename, body (base64) } }` (only a
  single `image` field is actually supported despite the internal loop structure).
- **Auth**: Firebase token only.
- **Behavior**: Loads mem (not found → `404 "Mem not found"`, a plain string unlike
  most other routes). Writes the decoded image to S3 at
  `users/{userId}/attachments/{yyyyMMddhhmmss}/{filename}.{ext}`, pushes
  `{ cachedMediaPath, mediaUrl }` onto `mem.photos`, persists.
- **Returns**: `200 { mem }`. Errors: `403`, `404`, `500 "Unable to update mem"`.

### `POST /_api/mem/del`

- **Body**: `{ memId }` (missing → `400 { error: "No mem id" }`).
- **Auth**: Firebase token only.
- **Behavior**: **Does not verify the mem belongs to the authenticated user** —
  `deleteMem(db, memId)` deletes by `_id` with no `userId` filter, so any
  authenticated user who knows/guesses a mem ID can delete it. `refreshTagCounts` is
  run for the *deleting* user, not necessarily the mem's owner.
- **Returns**: `200 { memId }` even if no document actually matched (Mongo's
  `DeleteResult` is truthy regardless of `deletedCount`).

### `POST /_api/mem/edit`

- **Body**: `{ memId, updates: Partial<Mem> }` (missing `updates` → `400 { error: "No mem" }`).
- **Auth**: Firebase token only.
- **Behavior**: Loads mem scoped to user (not found → `404 { error: "Mem not found" }`).
  Applies every key in `updates` directly onto the mem (`mem[key] = updates[key]` —
  **no allow-list/validation**, arbitrary field overwrite). If the resulting
  `mem.note` is truthy, re-derives `tags`/`date` via `extractEntities(note)` and
  merges them in — this runs *after* applying `updates`, so it can override any
  `tags` explicitly passed in `updates`. Persists directly via `findOneAndUpdate`.
- **Returns**: `200 { mem }`; calls `refreshTagCounts` if `updates.tags` or `updates.note` was set.

### `POST /_api/mem/flag`

- **Body**: `MemFlagRequest = { memId, new?, seen? }` (missing `memId` → `400 { error: "No mem id" }`).
- **Auth**: Firebase token only.
- **Behavior**: Loads mem scoped to user (not found → `404 { error: "Mem not found" }`).
  - `new !== undefined` → sets `mem.new` directly (toggles archived/active — `new: false` = archived).
  - `seen !== undefined` → toggles a `#look` "read later" tag: truthy strips `#look`
    from `tags` and `note`; falsy appends `#look` to `tags` and `" #look"` to `note`
    (note: if `mem.note` was `undefined`, this produces the literal string
    `"undefined #look"` — a latent bug).
- **Returns**: `200 { mem }`.

### `GET /_api/mem/get`

- **Query**: `?memId=`.
- **Auth**: Firebase token only.
- **Behavior**: `getMem(db, userId, memId)`, scoped to the authenticated user.
- **Returns**: `200 { mem }`. Errors: `403`, `404 { error: "Mem not found" }`.

### `POST /_api/mem/list`

The main list/search/pagination endpoint.

- **Body**: `MemListRequest` — `{ userId, secretWord?, isArchived?, all?, order?, matchAllTags?, matchAnyTags?, searchQuery?, pageSize?, page? }`.
  `userId` is required (missing → `500 "Missing user"` — a 500, not a 400).
- **Auth**: Firebase token required; the authenticated `userId` **must equal**
  `body.userId`, else `403 { error: "Permission denied" }` ("Currently all users are
  private" — no shared/public mem lists exist).
- **Behavior**: Delegates to `getMems` (see [data-model.md](./data-model.md) for the
  full filter/sort/pagination/text-search logic).
- **Returns**: `200 MemListResponse = { status: "OK", mems }`.

### `POST /_api/mem/media-remove`

- **Body**: `{ memId, mediaUrl }` (missing either → `400`).
- **Auth**: Firebase token only.
- **Behavior**: Loads mem scoped to user (not found → `404 { error: "Mem not found" }`).
  Filters `mem.photos` to drop any entry matching `mediaUrl` (does **not** touch
  `mem.videos` or `mem.media`). Persists, then unconditionally calls
  `refreshTagCounts` (arguably unnecessary since tags aren't touched here).
- **Returns**: `200 { mem }`.

### `POST` / `GET /_api/mem/user/get`

- **Params**: `{ secret }` (body or query). Missing → `400 { error: "Missing secret parameter" }`.
- **Auth**: **Secret-based only** — no Firebase token path.
- **Behavior**: `userForSharedSecret(db, secret)`.
- **Returns**: `200 { userId }`. Errors: `400`, `404 { error: "User not found for secret" }`.
- **Purpose**: Lets a client holding only a write secret resolve which `userId` to use
  for subsequent `mem/add`/`mem/list` calls.

## Preferences endpoint

### `GET` / `POST /_api/prefs`

Generic per-user key/value settings storage, backed directly by top-level fields on
the `users` document — **no allow-list** on which keys can be read or written (a
caller could overwrite `writeSecret` itself via this endpoint).

- **GET** `?key=` — missing → `400 "Missing key"` (plain string). Auth via Firebase
  token. Returns `200 SettingsReadResponse = { key, settings: user[key] }`.
- **POST** body `SettingsWriteRequest = { key, settings }` — Auth via Firebase token.
  `findOneAndUpdate({ _id: userId }, { $set: { [key]: settings } })`. Returns
  `200 { key, settings }` (echoes input, not the persisted document).
- Errors (both): `403` (no auth), `500 "Error: No user"` (no user document found).

## Tag endpoints

### `POST /_api/tag/generate`

- **Body**: `{ userId }` (missing → `500 "Missing user"`).
- **Auth**: Firebase token; authenticated `userId` must match body `userId`, else `403`.
- **Behavior**: Forces `refreshTagCounts(db, userId)` (full recompute + upsert).
- **Returns**: `200 { counts }` — note: `counts` here is actually the *whole* upserted
  Mongo document from `findOneAndUpdate`, not just the counts array — a minor shape quirk.

### `GET /_api/tag/list`

- **Query**: `?userId=&filter=` (missing `userId` → `500 "Missing user"`).
- **Auth**: Firebase token; authenticated `userId` must match, else `403`.
- **Behavior**:
  - No `filter` → returns the precomputed cached tag index (`tags` collection); missing → `500 "Error: No tags"`.
  - `filter` present → parsed via `listOptionsByString` (see
    [data-model.md](./data-model.md)'s filter-string syntax), fetches matching mems
    (projection `{ tags: 1, _id: 1 }` only) via `getMems`, and recomputes counts
    **live**, scoped to that filtered subset — distinct from the cached global index.
- **Returns**: `200 { counts }` in both cases.
- **Purpose**: Powers the tag sidebar/cloud — global counts by default, or
  co-occurring counts within an active tag filter.

### `GET /_api/tag/suggest`

- **Query**: `?secret=&query=&limit=`.
- **Auth**: Firebase token OR shared `secret` (dual-auth, same pattern as `mem/add`); missing both → `403`.
- **Behavior**: Loads the cached tag index; missing/malformed → `{ suggestions: [] }`
  (not an error). `limit` defaults to `10`, capped at `25`. Prefix-matches `query`
  against tags (handling optional `#` prefix on either side), sorted by count desc
  then alphabetically, sliced to `limit`.
- **Returns**: `200 { suggestions: [{ tag, count, icon }] }`.
- **Purpose**: Autocomplete/typeahead for tag entry — usable by both the logged-in
  web UI and secret-based external clients.

## Endpoint summary table

| Path | Methods | Auth | Notes |
|---|---|---|---|
| `/_api/mem/add` | fallback (GET/POST) | token OR secret | create/merge mem from text or image |
| `/_api/mem/annotate` | POST | token | re-run OG annotation + media mirror |
| `/_api/mem/attach` | POST | token | attach base64 image to mem's photos |
| `/_api/mem/del` | POST | token | delete by ID (no ownership check) |
| `/_api/mem/edit` | POST | token | arbitrary field patch + re-extract entities from note |
| `/_api/mem/flag` | POST | token | toggle `new`/archived and `#look` "seen" state |
| `/_api/mem/get` | GET | token | fetch single mem by ID |
| `/_api/mem/list` | POST | token (userId must match) | filtered/paginated/searchable mem list |
| `/_api/mem/media-remove` | POST | token | remove a photo by mediaUrl |
| `/_api/mem/user/get` | fallback (GET/POST) | secret only | resolve userId from shared write secret |
| `/_api/prefs` | GET, POST | token | generic per-user KV settings, no allow-list |
| `/_api/tag/generate` | POST | token (userId must match) | force full tag-count recompute |
| `/_api/tag/list` | GET | token (userId must match) | cached or filter-scoped tag counts |
| `/_api/tag/suggest` | GET | token OR secret | tag autocomplete |

## RSS/feed endpoints (`src/routes/(feeds)/`)

### `GET /feed/[feedId].xml`

- **Params**: path param `feedId`, used **directly as the `userId`** — there is a
  `// TODO: Verify the user ID using a secret code` comment; **no authentication
  exists** on this route. Anyone who knows/guesses a user ID can fetch their full
  "look queue" as RSS.
- **Behavior**: `getAllMems(db, userId, { maxResults: 100, lookQueue: true })` — mems
  tagged `#look`. The intended `addedMs` sort does **not** actually apply (same
  malformed-options bug as `getAllMems`, see [data-model.md](./data-model.md)); only
  the 100-item limit takes effect. Hand-built minimal RSS 2.0 XML (`guid`, `title`,
  `link`, `description`, `pubDate`), fields escaped via `htmlEscape`.
- **Returns**: raw XML string with **no explicit `Content-Type`** header set (unlike
  the route below).

### `GET /feed/[userId]/[feedId].xml`

- **Params**: path params `userId` and `feedId` (a tag, with or without leading `#`).
  Missing either → `400 "Missing feed parameters"`. Same lack of authentication.
- **Behavior**: Normalizes `feedId` to a `#`-prefixed tag, builds a
  `MemListRequest { userId, matchAllTags: [tag], order: "newest", pageSize: 100, page: 0, all: true }`
  via `getMems`. Produces a richer RSS 2.0 + Media RSS (`xmlns:media`) document —
  per-item title falls back `mem.title` → `mem.note` → tag name; description built
  from `mem.description` → `mem.note` → `mem.url` (CDATA-wrapped, with an inline
  `<img>` if an image is found); image resolution prefers the first photo's
  `cachedMediaPath` (via the Bunny CDN URL builder in `src/lib/storage.ts`) or raw
  `mediaUrl`, falling back to `mem.media`. Emits both `<enclosure>` and
  `<media:content>` for the image.
- **Returns**: `200`, `Content-Type: application/rss+xml; charset=utf-8` (correctly
  set, unlike the sibling route above).
- **Purpose**: A modern, tag-scoped, media-aware per-user RSS feed. Still has no
  authentication — relies solely on URL obscurity.

### `/feed/[feedId]` (HTML debug page, not a JSON/XML API)

- `+page.server.ts`'s `load()` treats `params.feedId` as `userId` (unauthenticated)
  and calls `getDb(locals.dbClient)` — **`locals.dbClient` is never set** (only
  `locals.mongoClient` is, in `hooks.server.ts`), so this page's `load()` will throw
  if actually visited. Appears to be dead/broken code, likely superseded by the
  `.xml` routes above.
- `+page.svelte` (if reached) would just render each mem's URL in a bare `<div>` list.

## Key shared implementation files

- `src/lib/server/api.server.ts` — auth helpers (`getUserId`, `getUser`)
- `src/lib/user.db.server.ts` — `userForSharedSecret`, `USER_NOT_FOUND`
- `src/lib/mem.db.server.ts` — all mem CRUD/query helpers
- `src/lib/tags.server.ts` — tag count computation/caching
- `src/lib/server/annotator.ts` (+ `annotator-config.ts`) — Open Graph enrichment
- `src/lib/server/mirror.ts`, `src/lib/s3.server.ts` — media caching to S3/Wasabi
- `src/lib/common/parser.ts` — text→mem parsing, tag/date extraction
- `src/lib/filter.ts` — tag filter string parsing
- `src/lib/request.types.ts` — shared request/response TypeScript shapes
- `src/hooks.server.ts` — CORS + Mongo client setup for all `/_api/*` routes
- `src/lib/db.ts` — Mongo collection accessors
