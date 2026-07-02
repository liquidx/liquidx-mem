# Authentication, Content Annotation & Media Mirroring

## Authentication

### Firebase app bootstrapping

- **`src/lib/firebase.server.ts`** — server-side Firebase Admin app bootstrapper.
  `getFirebaseApp()` reads a JSON config blob from the public env var
  `PUBLIC_MEM_FIREBASE_WEB_SECRETS` (the same web config as the client — not a
  service-account private key) and initializes (or re-fetches) an Admin app
  namespaced `"mem"` (`getApp("mem")` / `initializeApp(config, "mem")` try/catch
  singleton idiom). Called fresh at the top of every API route handler, relying on
  the Firebase SDK's internal app cache rather than any module-level singleton.
- **`src/lib/firebase-init.ts`** — the client-side counterpart: `initializeFirebase()`
  creates the browser Firebase app (`firebase/app`) using the same
  `PUBLIC_MEM_FIREBASE_WEB_SECRETS` config, for the sign-in flow.
- **`src/lib/firebase-shared.ts`** — Svelte stores (`sharedFirebaseApp`, `sharedUser`)
  sharing the client Firebase app and signed-in `User` reactively across components.

### Token verification (`src/lib/server/api.server.ts`)

There is no file literally named `auth.server.ts` — this module is the de facto
authentication layer:

```ts
getUserId(firebaseApp, request): Promise<string | undefined>
getUser(firebaseApp, request): Promise<UserRecord | undefined>
```

- **Token source**: the `Authorization: Bearer <idToken>` HTTP header. There is no
  cookie-based session — every request must carry a fresh Firebase ID token.
- **Verification**: `getAuth(firebaseApp).verifyIdToken(token)` (standard Firebase
  Admin SDK check — signature, expiry, issuer/audience). A bad/expired token throws;
  route handlers don't wrap this in try/catch, so an invalid token can surface as an
  unhandled error rather than a clean `403` in some code paths.
- `USER_NOT_FOUND` is a sentinel (`""`, from `src/lib/user.db.server.ts`) guarding
  against an empty/invalid uid.
- `getUser` additionally loads the full Firebase `UserRecord`, but no current route
  actually uses it — every route calls `getUserId` only.

### Route protection is per-route, not global

There is **no centralized auth guard**. `src/hooks.server.ts`'s `handle` hook only
wires up CORS and the shared MongoDB client — it performs no authorization. Every
individual `+server.ts` under `src/routes/_api/**` is responsible for calling
`getUserId`/`getUser` itself and returning `error(403, ...)` on failure. This pattern
is repeated near-identically across all mem/tag/prefs routes (see [api.md](./api.md)
for exact per-route behavior).

### Alternate auth path: shared write secret

`src/routes/_api/mem/add`, `mem/user/get`, and `tag/suggest` additionally accept a
**shared secret** (`secret` query param or JSON field) instead of a Firebase token,
resolved via `userForSharedSecret(db, writeSecret)` in `src/lib/user.db.server.ts`
(`findOne({ writeSecret })` against the `users` collection). This lets non-browser
clients (iOS Shortcuts, Android HTTP Shortcuts, bookmarklets — see the in-app
`/about` page) add mems and look up their `userId` without a live Firebase session.
The secret itself is managed by the user on the `/prefs` page.

### Global request handling (`src/hooks.server.ts`)

```ts
export const handle = sequence(cors, dbPrepare);
export const handleError: HandleServerError = ({ error }) => ({ message: (error as any).message });
```

1. **`cors`** runs first — short-circuits `OPTIONS` preflight with `200` + permissive
   CORS headers, and adds the same headers to any response under `/_api/`.
2. **`dbPrepare`** — lazily creates and module-caches a `MongoClient`, attaching it as
   `event.locals.mongoClient` (declared in `src/app.d.ts`'s `App.Locals`, the only
   cross-cutting request-local state in the app).

`handleError` is a minimal error normalizer — it strips everything but `.message`
before it reaches the SvelteKit error page/response.

## Content Annotation (`src/lib/server/annotator.ts`)

### Purpose & trigger

Automatically enriches a mem's `title`, `description`, and `photos` by scraping the
linked URL's Open Graph metadata. It is **not** a background job — it runs
synchronously, called explicitly from two routes:

- `_api/mem/add` — immediately after a new mem is created (or merged into an
  existing one by URL).
- `_api/mem/annotate` — a dedicated "refresh metadata" endpoint that re-runs
  annotation on an existing mem on demand.

### Flow

`annotateMem(mem, verbose = false)`:

1. No-ops (returns the mem unchanged) if `mem.url` is falsy.
2. Sanitizes the URL via `removeUrlTrackingParams` (`src/lib/url.ts`).
3. Matches the URL against `ANNOTATOR_URL_CONFIG` (`src/lib/server/annotator-config.ts`),
   an ordered list of `{ pattern: RegExp, action: "fetch"|"opengraph"|"ignore", useOldTitleDescription? }`:
   ```ts
   [
     { pattern: /https:\/\/www\.instagram\.com\/accounts\/login\//, action: "ignore" },
     { pattern: /https:\/\/www\.threads\.net\/.*\/post/, action: "opengraph" },
     { pattern: /https:\/\/www\.reddit\.com\/r\/.*/, action: "opengraph", useOldTitleDescription: true }
   ]
   ```
   First match wins:
   - `"ignore"` — returns the mem unmodified (e.g. Instagram's login-wall URL, which
     would otherwise scrape garbage).
   - `"opengraph"` — runs standard Open Graph annotation. Reddit is special-cased
     with `useOldTitleDescription: true` because Reddit's OG tags tend to be
     low-quality/generic — the legacy `<title>`/meta-description are preferred instead.
   - `"fetch"` — an unimplemented stub (`// TODO implement me`); currently a no-op.
4. If no pattern matches, the **default** is `annotateWithOpenGraph` with no special
   config — every URL is scraped for Open Graph data unless explicitly configured
   otherwise.

`annotateWithOpenGraph`:
1. Calls `fetchOpenGraph(url, verbose)` (see below).
2. `og.title` → `mem.title`; `og.description` → `mem.description`. If
   `useOldTitleDescription` and legacy `oldTitle`/`oldDescription` exist, they
   **override** the OG values just set.
3. `og.images`, converted to `MemPhoto[]` via `ogImageToPhotos`, populate
   `mem.photos` **only if the mem has no existing photos** — never overwrites
   photos the mem already had.
4. Any fetch/parse error is swallowed (`.catch(() => mem)`) — annotation failures
   never break the calling request; the mem is simply returned unannotated.

`ogImageToPhotos(images, baseUrl)` resolves relative image URLs against the page URL
and copies `width`/`height` into `photo.size` when both are present numeric strings.

### The scraping mechanism (`src/lib/opengraph.ts`)

No third-party API is used — the app scrapes HTML directly:

- `fetchOpenGraph(url, verbose)` issues a raw GET via `axios`
  (`responseType: "arraybuffer"`, to allow manual charset transcoding) using a
  **spoofed Discord bot User-Agent**
  (`Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)`) — a
  deliberate trick, since many sites (Twitter/X, Instagram, etc.) serve full OG meta
  tags only to known bot/crawler user agents. A response interceptor
  (`transcodeResponse`) detects non-UTF-8 charsets in the `Content-Type` header and
  transcodes via `iconv-lite` before parsing.
- `parseOpenGraph(content)` scans the raw HTML with a **regex-based meta-tag scan**
  (no DOM parser): `/<meta\s+[^>]*?\s?(content|property)="([^"]*)"\s+(content|property)="([^"]*)"/g`,
  handling both attribute orderings, decoding entities with `he.decode`. It extracts:
  - Scalar fields: `og:title`, `og:description`, `og:site_name`, `og:type`,
    `og:locale`, `og:url`.
  - Grouped arrays: repeated `og:image`/`og:image:width`/`og:image:height`/
    `og:image:type`/`og:image:alt` tags into `OpenGraphImage[]` (similarly for
    `og:video*` → `OpenGraphVideo[]` and `og:audio*` → `OpenGraphAudio[]`).
  - Legacy fallbacks: `<meta name="description">` → `oldDescription`,
    `<title>` → `oldTitle`.
- **Note**: video/audio OG tags are parsed but **not currently consumed** by
  `annotator.ts` — only `og:image*` and title/description are mapped onto the `Mem`;
  `Mem.videos` is never populated from Open Graph data by this path.

### Fields populated by annotation

| Mem field | Source |
|---|---|
| `mem.url` | rewritten via tracking-param stripping |
| `mem.title` | `og:title`, possibly overridden by legacy `<title>` per config |
| `mem.description` | `og:description`, possibly overridden by legacy meta description per config |
| `mem.photos` | `og:image*` tags, only if the mem had no existing photos |

## Media Mirroring (`src/lib/server/mirror.ts`)

### Purpose & trigger

Downloads externally-hosted media (photo/video URLs, typically populated by the
annotator) and re-uploads them into the app's own S3-compatible storage, recording
the mirrored location back onto the mem as `cachedMediaPath`. This keeps mems viewable
even if the original source page/image disappears, and lets a CDN serve the media.

`mirrorMediaInMem(db, s3client, mem, userId)` (`src/lib/mem.db.server.ts`) wraps
`mirrorMedia(mem, s3client, "users/{userId}/media")` and persists the result via
`updateMem`. It's called from the same two routes as the annotator, immediately
after annotation:
- `_api/mem/add` — right after annotation on mem creation.
- `_api/mem/annotate` — right after re-annotation (so manual re-trigger picks up any
  newly-added un-cached media too).

### What gets mirrored

`mirrorMedia(mem, s3client, outputPath)`:
- Iterates `mem.photos`: for each photo with an unmirrored (`cachedMediaPath == null`)
  `http`-based `mediaUrl`, downloads and mirrors it.
- Iterates `mem.videos` similarly, **except** videos with
  `contentType === "application/x-mpegURL"` (HLS `.m3u8` playlists) are skipped —
  a live master playlist can't trivially be mirrored as a single static file.
- **Known structural bug**: the videos loop is nested *inside* the `if (mem.photos)`
  block, so **videos are only mirrored when the mem also has at least one photo** —
  a mem with only `videos` and no `photos` skips video mirroring entirely. This
  looks unintentional rather than a designed constraint.
- Requests run in parallel via `Promise.all`; individual failures are caught/logged
  without failing the whole mem's mirror operation.

### Path/key construction

```
{outputPath}/{source_host_with_dots_as_underscores}/{md5(sourceMediaUrl)}.{ext}
```
e.g. with `outputPath = users/<userId>/media`:
```
users/<userId>/media/pbs_twimg_com/<md5-hash>.jpg
```
This gives per-user, per-source-host namespacing, and content-addressed (URL-hash)
filenames naturally de-dupe repeated references to the same remote asset.

### Download/upload mechanics

- `writeMediaToCloudStorage` downloads via axios (`arraybuffer`) and writes the buffer
  via `writeFileToS3` (a single `PutObjectCommand`). Errors are caught/logged, not
  re-thrown — one failed media item doesn't fail the rest.
- On success, `media.cachedMediaPath` is set in place on the mem's photo/video
  object, which is what makes the "already mirrored" skip check idempotent on
  subsequent calls.

### S3/Wasabi client (`src/lib/s3.server.ts`)

```ts
getS3Client() // new S3Client({ region, endpoint, requestHandler: NodeHttpHandler({requestTimeout: 10000}), credentials })
```

Uses AWS SDK v3 (`@aws-sdk/client-s3`) but is explicitly commented as targeting
**Wasabi** (an S3-compatible provider) via a custom `S3_SERVICE_URL` endpoint, not
raw AWS S3. Config comes from private env vars: `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
`S3_REGION`, `S3_SERVICE_URL`, `S3_BUCKET`. `writeFileToS3` issues one
`PutObjectCommand({ Bucket, Key: filePath, Body: data })`.

### Serving cached media back to clients (`src/lib/storage.ts`)

```ts
STORAGE_BASE_URL = "https://liquidx-mem.b-cdn.net" // Bunny CDN
getCachedStorageUrl(path) // builds the public CDN URL for a cachedMediaPath
```
This is the counterpart used by `MemView.svelte` (and the tag-scoped RSS feed) to
render a mirrored photo/video.

### Unused/partial HLS support

`getBestStreamUrl(streamUrl)` downloads an `.m3u8` master playlist (via the `m3u8`
npm package, which ships no types — see `src/lib/server/m3u8.d.ts`'s one-line ambient
declaration), picks the highest-`bandwidth` variant, and resolves its URI. **This
function is defined but never called** anywhere in `mirror.ts` — it appears to be an
in-progress/abandoned feature for eventually mirroring the best-quality rendition of
an HLS stream instead of skipping `application/x-mpegURL` videos entirely.

### Direct image upload path (separate from mirroring)

`_api/mem/add`'s image-paste flow and `_api/mem/attach` both write directly to S3 via
`writeFileToS3`/`writeToCloudStorage` without going through `mirrorMedia` — these
handle the case where the client already has raw image bytes to upload (paste/attach),
as opposed to `mirrorMedia`'s job of fetching a *remote URL* found via annotation.
