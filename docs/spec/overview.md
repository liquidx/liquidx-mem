# liquidx-mem — System Overview

## What it is

liquidx-mem ("#mem") is a personal note-taking / bookmarking service. Users paste or
type freeform text — a URL, some tags, a short note, or a combination — and the system
stores it as a **mem**: a single record combining the raw input, any linked URL, extracted
hashtags, and (asynchronously) automatically-fetched metadata such as title, description,
and images from the linked page. Mems can also carry directly-attached photos.

The product is built around a few explicit principles (see `README.md`):

- **Frictionless capture** — a single text box parses out URLs, `#tags`, and dates from
  whatever is pasted in; the user doesn't fill out a structured form.
- **Automatic enrichment** — once a mem with a URL is saved, the server scrapes Open
  Graph metadata from the target page (title, description, images) and mirrors any
  remote media into the app's own object storage, so mems remain viewable even if the
  original page disappears.
- **Tag-based organization** — mems are organized by hashtags rather than folders;
  the UI exposes a tag sidebar, saved tag-filter "views", and per-tag RSS feeds.
- **Inbox/archive model** — new mems start in an unarchived ("new") state (an inbox),
  and are explicitly archived once processed.
- **External capture paths** — beyond the web UI, a mem can be created via a shared
  "write secret" instead of a login, which is what powers iOS Shortcuts / Android HTTP
  Shortcuts integrations described in the in-app "About" page.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | SvelteKit 2 + Svelte 5 (partially migrated to runes; some components still use `svelte/legacy` compatibility shims) |
| Language | TypeScript |
| Build tool | Vite 8 (also used to run Vitest) |
| Styling / UI | Tailwind CSS 4 (native Vite plugin) + a bespoke shadcn/ui-style component library (`bits-ui`, `tailwind-variants`) |
| Authentication | Firebase Authentication (email/password), verified server-side via `firebase-admin` |
| Primary database | MongoDB (a DigitalOcean-managed cluster, despite some leftover "Atlas"-named constants in the code) |
| Legacy database | Firebase Firestore — the app is mid-migration off Firestore; some admin tooling still targets it |
| Object storage | An S3-compatible service (Wasabi) for mirrored/attached media; a Bunny CDN endpoint serves cached media back to clients |
| Deployment | Vercel, via `@sveltejs/adapter-vercel` (Node 22 runtime, `sfo1` region) |
| Testing | Vitest (unit tests) + Playwright (e2e tests, currently unpopulated) |

## High-level architecture

```
Browser (SvelteKit client, Svelte 5 components)
   │  Firebase ID token (Authorization: Bearer …)  — or —  shared "write secret"
   ▼
SvelteKit server routes
   ├── /_api/**            JSON API (mem CRUD, tags, prefs)   — see api.md
   └── (feeds)/**          RSS/Atom feed endpoints            — see api.md
   │
   ├── src/lib/server/api.server.ts     Firebase token verification
   ├── src/lib/mem.db.server.ts         Mem CRUD + query logic (MongoDB)
   ├── src/lib/tags.server.ts           Tag-count index maintenance
   ├── src/lib/server/annotator.ts      Open Graph enrichment of new/edited mems
   ├── src/lib/server/mirror.ts         Mirrors remote photo/video URLs into S3
   └── src/lib/s3.server.ts             S3-compatible (Wasabi) client
   │
   ▼
MongoDB ("mem" database: mems / users / tags collections)
S3-compatible object storage (Wasabi) ← served back to clients via Bunny CDN
Firebase Authentication (identity only — session/user records live in Firebase Auth,
    app-specific user data lives in the Mongo `users` collection)
```

Two important architectural facts run through the whole system and are called out in
more detail in the linked docs:

1. **Auth is enforced per-route, not globally.** `src/hooks.server.ts` only wires up
   CORS headers and a shared MongoDB client (`event.locals.mongoClient`) for every
   request — it does not check authentication. Every `/_api/**/+server.ts` handler is
   individually responsible for calling `getUserId()`/`getUser()` and returning `403`
   if it fails. See [auth-and-features.md](./auth-and-features.md).
2. **The frontend has no server-side data loading.** The `(web)` route group has no
   `+page.server.ts` files; every page fetches its data client-side after mount (gated
   on a Svelte store holding the signed-in Firebase user), calling the JSON API under
   `/_api/**`. See [frontend.md](./frontend.md).

## Documentation map

- [data-model.md](./data-model.md) — the `Mem` entity and its related types, the
  MongoDB collections (`mems`, `users`, `tags`), and the database access layer.
- [api.md](./api.md) — every `/_api/**` JSON endpoint and the `(feeds)` RSS endpoints.
- [frontend.md](./frontend.md) — web app routes/pages and the main Svelte components.
- [auth-and-features.md](./auth-and-features.md) — authentication, automatic content
  annotation (Open Graph scraping), and media mirroring to object storage.
- [deployment.md](./deployment.md) — build/deploy configuration, environment
  variables, administrative CLI tooling, and testing setup.

## Known rough edges (as of this writing)

Documenting the system "as implemented" surfaced several inconsistencies/bugs worth
being aware of when working in this codebase (each is detailed in its relevant doc):

- `mem/del` does not check mem ownership before deleting.
- `getAllMems` passes a malformed Mongo options object (sort/limit not nested
  correctly), so its sort order silently doesn't apply.
- The RSS route `/feed/[feedId].xml` has the same malformed-sort issue and performs
  no authentication (user ID is taken directly from the URL).
- The `(feeds)/feed/[feedId]` HTML debug page references `locals.dbClient`, which is
  never set (only `locals.mongoClient` is) — this page's `load()` will throw.
- `src/lib/svelte/OrganizeView.svelte` (behind `/organize`) has several apparent
  copy-paste bugs (undefined variables, missing imports) and does not appear to be
  linked from primary navigation.
- `README.md`'s "Administration" section describes an old Vue + Firebase Functions
  setup and is stale relative to the current SvelteKit + MongoDB + `src/tool.ts` CLI.
