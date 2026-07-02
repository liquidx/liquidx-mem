# Data Model & Database Layer

## The `Mem` entity

Defined in `src/lib/common/mems.ts` (a `common` module, so it's shared between client
and server code).

### `Mem`

| Field | Type | Purpose |
|---|---|---|
| `_id` | `string?` | Primary key — a `crypto.randomUUID()` string (not a Mongo `ObjectId`), assigned on creation |
| `raw` | `string?` | The original, unparsed text the user typed/pasted when creating the mem |
| `userId` | `string?` | Owning user's ID (Firebase UID); set server-side; scopes every query |
| `media` | `{ path?, url?, type?, width?, height? }?` | A single primary attached media item, distinct from `photos`/`videos` — populated by direct file uploads (`mem/add` image path, `mem/attach`) |
| `new` | `boolean?` | Inbox/archive flag — `true` = active/unread ("new"/inbox); `false`/absent = archived |
| `addedMs` | `number?` | Creation timestamp (epoch ms, UTC via Luxon); used for sort/pagination |
| `url` | `string?` | *Derived* — the first `http(s)` URL extracted from `raw` (tracking params stripped) |
| `note` | `string?` | *Derived* — the free text remaining after URL(s) are stripped from `raw` |
| `tags` | `string[]?` | *Derived* — hashtags (`#tag`) extracted from the note text |
| `date` | `string?` | *Derived* — a `yyyy-mm-dd` date string found within the note content itself (not the creation date) |
| `title` | `string?` | Open Graph (or legacy `<title>`) title of the linked URL |
| `description` | `string?` | Open Graph (or legacy meta description) description |
| `descriptionHtml` | `string?` | HTML-formatted variant of the description |
| `thumbnail` | `{ height?, type?, url?, width? }?` | A single representative thumbnail, distinct from `photos` |
| `authorName` / `authorUrl` | `string?` | Author attribution for the linked content |
| `twitterMedia` | `any` | Loosely-typed field for Twitter-specific media payloads |
| `photos` | `MemPhoto[]?` | All photos associated with the mem (from OG `og:image` tags or attachments) |
| `videos` | `MemVideo[]?` | All videos associated with the mem |
| `links` | `MemLink[]?` | Additional related links extracted/attached to the mem |

### `MemPhoto`

| Field | Type | Purpose |
|---|---|---|
| `mediaUrl` | `string?` | Original remote URL of the photo |
| `cachedMediaPath` | `string?` | Path to the mirrored copy in object storage, once mirrored |
| `size` | `{ w: number; h: number }?` | Pixel dimensions, if known |

### `MemVideo`

| Field | Type | Purpose |
|---|---|---|
| `mediaUrl` | `string?` | Original remote URL (may be a direct file or an HLS `.m3u8` manifest) |
| `cachedMediaPath` | `string?` | Path to the mirrored copy (not populated for HLS content — see [auth-and-features.md](./auth-and-features.md)) |
| `posterUrl` | `string?` | Poster/thumbnail image URL |
| `contentType` | `string?` | MIME type (e.g. `application/x-mpegURL` for HLS, used to decide whether to mirror) |
| `size` | `{ w: number; h: number }?` | Pixel dimensions, if known |

### `MemLink`

| Field | Type | Purpose |
|---|---|---|
| `url` | `string` | A secondary/related URL associated with the mem |
| `description` | `string?` | Human-readable description of that link |

### Helpers

- `memFromJson(json)` / `memToJson(mem)` — shallow-clone identity passthroughs used
  when (de)serializing a `Mem` across the client/server JSON boundary.

## Text → Mem parsing (`src/lib/common/parser.ts`)

Turns freeform pasted/typed text into a partial `Mem`, used by the `mem/add` endpoint
and the `mem/edit` endpoint (re-derives tags/date whenever `note` changes):

- `extractTags(text)` — regex `#[^\s,]+` (lowercased) → all hashtags.
- `extractDate(text)` — regex `[0-9]{4}-[0-9]{2}-[0-9]{2}` → a date substring.
- `extractEntities(note)` — combines both into `{ date?, tags? }`.
- `parseText(text)` — the main entry point:
  1. Sets `mem.raw = text`.
  2. Finds URL-like substrings (`url-regex-safe`), filtered to `http(s)` only.
  3. If any URL is found, the **first** becomes `mem.url` (after
     `removeUrlTrackingParams` — see below), and all matched URL occurrences are
     stripped from the text to produce `mem.note` (multiple-URL mems only keep the
     first URL as the canonical link — a known limitation).
  4. If no URL is found, `mem.note` is the full text.
  5. If a note exists, merges in `extractEntities(note)` (tags + date).

## URL sanitization (`src/lib/url.ts`)

`removeUrlTrackingParams(url)` strips a hardcoded list of tracking query params:
`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gad_source`,
`fbclid`, `gclid`, `msclkid`, `mc_cid`, `mc_eid`, `ad_id`, `campaign_id`, `nb_aname`,
`nb_platform`, plus site-specific ones: `smid` (NYTimes), `xtm` (threads.net).

## User model

### `User` (`src/lib/user.types.ts`)

| Field | Type | Purpose |
|---|---|---|
| `_id` | `string` | User ID — matches the Firebase Auth UID |
| `username` | `string` | Display/login username |
| `writeSecret` | `string` | Shared secret enabling token-less write access (bookmarklets, Shortcuts) |
| `views` | `UserView[]` | User's saved/custom filter views (each `{ tags: string }`) |

The `/_api/prefs` endpoint reads/writes arbitrary keyed fields directly on the user
document (`$set: { [key]: settings }`), so in practice the `users` collection stores
ad hoc preference keys beyond the strict `User` interface, with no allow-list —
any top-level field (including `writeSecret`) can be overwritten via this endpoint.

`src/lib/user.db.server.ts`:
- `USER_NOT_FOUND = ""` — sentinel for "no user" comparisons.
- `userForSharedSecret(db, writeSecret)` — `findOne({ writeSecret })` on `users`;
  backs the secret-based auth path (see [auth-and-features.md](./auth-and-features.md)).

## Tag model

### Types (`src/lib/tags.types.ts`)

| Type | Fields | Purpose |
|---|---|---|
| `TagCount` | `tag, icon, count` | A single tag with usage count and display icon |
| `TagIndex` | `userId, counts: TagCount[]` | Per-user document shape stored in the `tags` collection |
| `TagListItem` | `{ tag, count, icon? }` | Lighter-weight variant used in list/UI contexts |

Note: `src/lib/tags.server.ts` internally redeclares a differently-shaped `TagIndex`
(a plain `{ [tag]: number }` map) — the two `TagIndex` names are unrelated shapes that
happen to share a name, worth being careful about when touching this code.

### `src/lib/tags.server.ts`

- `computeTagCounts(mems)` — tallies tag occurrences across a list of mems, returns
  tags sorted descending by count (icon left empty).
- `refreshTagCounts(db, userId)` — reads only the `tags` projection for all of a
  user's mems, computes counts via `computeTagCounts`, and upserts into the `tags`
  collection: `findOneAndUpdate({ userId }, { $set: { counts } }, { upsert: true })`.
  This is the maintenance job that keeps the cached tag index in sync with `mems`; it
  is **not** kept live by any DB trigger — it must be explicitly invoked (which the
  `mem/add`, `mem/edit`, `mem/del`, `mem/media-remove`, and `tag/generate` endpoints
  all do after their mutations).

### `src/lib/tags.ts`

- `iconForTag(tag)` — a hardcoded mapping of specific hashtags (e.g. `#art` → 🎨,
  `#japan`/`#japanese` → 🇯🇵, `#ml`/`#llm`/`#stablediffusion` → 🧠) to a display emoji,
  falling back to a generic 🏷️. Purely presentational.

## Filter string syntax (`src/lib/filter.ts`)

Both the frontend (`/tag/[filter]` route) and the `tag/list` API endpoint parse a
compact "filter string" into query options:

- Empty string → `onlyNew: true` (default inbox view)
- `"*"` → `onlyArchived: true`
- `tag1+tag2` (plus-separated) → match-**all** these tags (each lowercased, `#`-prefixed)
- `tag1,tag2` (comma-separated) → match-**any** of these tags

`listOptionsByString(filterString)` parses into `MemListOptions`;
`stringFromListOptions(options)` serializes back to the compact string form for URLs.

## Request/response contracts (`src/lib/request.types.ts`)

| Type | Shape | Used by |
|---|---|---|
| `MemListRequest` | `{ userId, secretWord?, isArchived?, all?, order?, matchAllTags?, matchAnyTags?, searchQuery?, pageSize?, page? }` | `mem/list` |
| `MemListResponse` | `{ status, mems? }` | `mem/list` |
| `MemAddResponse` | `{ mem?, error? }` | `mem/add` |
| `SettingsWriteRequest` / `SettingsReadResponse` | `{ key, settings }` | `prefs` |
| `MemAnnotateResponse` | `{ mem, memId }` | `mem/annotate` |
| `MemFlagRequest` | `{ new?, seen? }` | `mem/flag` (note: `seen` has no directly corresponding persisted `Mem` field — it's translated into a `#look` tag toggle instead) |

## MongoDB connection & collections (`src/lib/db.ts`)

- **Database**: `mem`, on a DigitalOcean-managed MongoDB cluster
  (`db-mongodb-sfo2-liquidx-bdf6d203.mongo.ondigitalocean.com`, replica set
  `db-mongodb-sfo2-liquidx`, TLS enabled, `authSource=admin`). A separate set of
  MongoDB Atlas constants (`cluster0.uakqn3b.mongodb.net`) also exists in the file but
  is unused dead code — the DigitalOcean URL builder is what's actually wired up.
- **Collections**: `mems`, `users`, `tags`.
- Key exports: `getDbUrl`, `getDbName`, `getMemCollection`/`getUserCollection`/`getTagCollection`,
  `getDbClient` (creates+connects a `MongoClient`), `getDb(client)` (the function most
  route handlers use, via `locals.mongoClient` set in `hooks.server.ts`),
  `executeQuery` (one-off script helper that always closes the client afterward), and
  `toJSON` (round-trips a document through BSON `EJSON` to produce a JSON-safe object).
- **No index-creation code exists in the application** — the `$text` search index
  used by `getMems`'s search branch must be provisioned directly on the cluster,
  outside of app code (see `CLAUDE.md`'s note on manual full-text index setup).

## Mem CRUD & query operations (`src/lib/mem.db.server.ts`)

- **`addMem(db, userId, mem)`** — assigns `_id = crypto.randomUUID()`, sets `userId`,
  marks `new: true`, stamps `addedMs` (Luxon UTC now), inserts, and returns the
  fully-populated mem.
- **`updateMem(db, mem)`** — `findOneAndUpdate({ _id: mem._id }, { $set: mem }, { returnDocument: "after" })`;
  a full-document `$set` (callers pass already-merged documents, not partial diffs).
- **`deleteMem(db, memId)`** — deletes by `_id` **only** (no `userId` check at this
  layer — see the `mem/del` endpoint in [api.md](./api.md) for the resulting gap).
- **`getMem(db, userId, memId)`** — `findOne({ _id: memId, userId })`, scoped to owner.
- **`findMemByUrl(db, userId, url)`** — `findOne({ userId, url })`, used for
  de-duplication when adding a mem whose URL already exists.
- **`getMems(db, userId, request?, projection?)`** — the main paginated/filterable
  list query, always scoped to `{ userId }`:
  - Filter precedence (first match wins): `isArchived` → `{ new: false }`; else
    non-empty `matchAllTags` → `{ tags: { $all: matchAllTags } }`; else non-empty
    `matchAnyTags` → `{ tags: { $in: matchAnyTags } }`; else, if not `request.all`,
    → `{ new: true }` (default "inbox" view).
  - A hardcoded suppressed-tags list (`["#xxx"]`) is always excluded unless the
    caller explicitly requested that tag via `matchAllTags`.
  - Sort: `{ addedMs: 1 | -1 }` based on `request.order` (`"oldest"` vs. default `"newest"`).
  - Pagination: `pageSize` → `limit`; `page` (default 0) → `skip = page * pageSize`.
  - If `request.searchQuery` is set, switches to a Mongo **aggregation pipeline**:
    `$match: { $text: { $search } }` → `$sort` → `$match` (same conditions, minus the
    `new` condition) → `$skip` → `$limit`. Requires the out-of-band text index
    mentioned above. Errors are caught/logged, returning `[]`.
- **`getAllMems(db, userId, queryOptions?)`** — marked `// TODO: merge with getMems`,
  a simpler/older variant; supports `lookQueue` (adds `{ tags: { $in: ["#look"] } }`)
  and `maxResults`. **Known bug**: the options object passed to `.find()` sets
  `addedMs`/`limit` as bare top-level keys instead of nesting them under `sort`/`limit`
  correctly (unlike `getMems`), so the intended sort order silently doesn't apply.
- **`mirrorMediaInMem(db, s3client, mem, userId)`** — calls `mirrorMedia(mem, s3client, "users/{userId}/media")`
  (see [auth-and-features.md](./auth-and-features.md)) then persists the result via `updateMem`.

## Collections & relationships summary

| Collection | Shape | Keyed by | Populated/maintained by |
|---|---|---|---|
| `mems` | `Mem` | `_id` (UUID string), scoped by `userId` | `addMem`, `updateMem`, `mirrorMediaInMem`, the annotator |
| `users` | `User` (+ ad hoc pref keys) | `_id` (Firebase UID) | Firebase Auth (identity), `/prefs` endpoint (settings), `writeSecret` |
| `tags` | `TagIndex` (`{ userId, counts: TagCount[] }`) | `userId` | `refreshTagCounts` (derived/cached from `mems.tags`; must be explicitly regenerated) |

## Known inconsistencies (documented as-is)

1. Two unrelated `TagIndex` type shapes exist (`tags.types.ts` vs. the internal one
   in `tags.server.ts`).
2. `getAllMems`'s Mongo options object is malformed compared to `getMems` (sort/limit
   not properly nested), so its sort silently has no effect.
3. `MemFlagRequest.seen` has no directly corresponding persisted `Mem` field — it's
   implemented as a `#look` tag toggle in the `mem/flag` handler instead.
4. The client's `updateSecrets` writes to pref key `"secrets"` while `getWriteSecret`
   reads pref key `"writeSecret"` — likely an inconsistency/bug in `mem.client.ts`.
5. No text-index creation exists in application code; the `$text` search in `getMems`
   depends entirely on an out-of-band index configured on the MongoDB cluster.
