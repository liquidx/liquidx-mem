# Build, Deployment & Administrative Tooling

## Build & Deployment

### `svelte.config.js`

- Adapter: `@sveltejs/adapter-vercel`, configured with `runtime: "nodejs22.x"` and
  `regions: ["sfo1"]` (single region, no multi-region fan-out).
- Preprocessing: `vitePreprocess()`.
- No custom `kit` overrides (`alias`, `csp`, `files`, `paths`) — the default `$lib`
  aliasing is provided by SvelteKit itself.

### `vite.config.js`

(Note: the file is `vite.config.js`, not `.ts` — there is no `vite.config.ts`.)

- Built with `defineConfig` from `vitest/config`, unifying Vite and Vitest config.
- Dev server: `host: "0.0.0.0"`, `port: 12000`, `fs.allow: [".."]` (serves files from
  one directory above root — likely for shared tooling/assets outside the project).
- Plugins: `tailwindcss()` (native `@tailwindcss/vite` integration for Tailwind 4, no
  separate PostCSS config needed) and `sveltekit()`.
- `test.include`: `["src/**/*.{test,spec}.{js,ts}", "tests/unit/**/*.{test,spec}.{js,ts}"]`.
- No custom `resolve.alias`/`build.rollupOptions` — build behavior is otherwise
  default SvelteKit/Vite + Vercel adapter.

### `vercel.json`

Does **not exist**. All Vercel-specific behavior (runtime, region) is expressed via
the `adapter-vercel` options in `svelte.config.js` instead. A `.vercel/` directory
exists locally as a git-ignored build artifact, but no `vercel.json` is committed.

### `package.json` — scripts

```bash
pnpm run dev          # vite
pnpm run build        # vite build
pnpm run preview      # vite preview
pnpm run test         # vitest
pnpm run test:e2e     # playwright test
pnpm run check        # svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
pnpm run check:watch  # same, in watch mode
pnpm run lint         # prettier --check . && eslint .
pnpm run format       # prettier --write .
pnpm run tsc          # tsc --watch --project tsconfig.tool.json   (admin CLI, watch)
pnpm run tsc-once     # tsc --project tsconfig.tool.json           (admin CLI, one-shot)
```

- `engine.node: "22"`, `packageManager: "pnpm@11.1.2"` — pnpm is required.
- `version: "4.0.20260516"` — a date-stamped versioning scheme.

Notable dependencies beyond the top-level stack summary:
- `commander` + `dotenv` — power the admin CLI (`src/tool.ts`), which runs outside
  the SvelteKit/Vite runtime and loads `.env` manually.
- `bson` — used directly in `src/lib/db.ts` for `EJSON` serialize/deserialize.
- `firebase` (client SDK) + `firebase-admin` (server SDK) both present, reflecting
  the ongoing Firebase → MongoDB migration (client SDK still powers Auth; admin SDK
  still backs the legacy Firestore-based admin tools).
- `m3u8`, `m3u8-parser`, `m3u8stream` — HLS stream parsing support for the
  (currently unused) best-quality-variant selection in media mirroring.
- `he`, `iconv-lite`, `md5`, `url-regex-safe`, `lodash-es`, `luxon` — text/URL
  processing utilities used by the parser/annotation/mirroring pipeline.
- `shadcn-svelte`, `bits-ui`, `@lucide/svelte`, `mode-watcher`, `svelte-sonner`,
  `svelte-radix` — the UI component/theming stack.
- A near-empty `jest.config.js` and `@types/jest` still linger in the tsconfigs —
  leftover from before the Vitest migration; the actual test runner is Vitest.

## TypeScript Configuration

Two separate configs exist for two different compilation targets:

### `tsconfig.json`

- Extends `./.svelte-kit/tsconfig.json` (SvelteKit's generated base config —
  `$lib` aliases, `rootDirs`, etc.).
- Used for the **SvelteKit app** — covers `src/**/*.ts(x)`, `tests/**/*`, plus some
  stray legacy paths (`function/**/*.ts`, `src/router/index.ts`, `src/firebase.ts`,
  `src/main.ts`) that look like holdovers from an earlier Vue-based version of the
  app and likely don't correspond to real files anymore.
- Used by `svelte-check` (the `check`/`check:watch` scripts).

### `tsconfig.tool.json`

- Does **not** extend `.svelte-kit/tsconfig.json` — manually declares the `$lib`
  path alias instead.
- Scoped narrowly to `src/tool.ts`, `src/lib/**.ts`, `src/tools/**.ts` — the admin
  CLI and the library code it depends on, **not** Svelte components/routes.
- Purpose: compiles the admin CLI to plain Node-runnable JS (`outDir: ./dist`),
  independent of the SvelteKit/Vite build pipeline, since `src/tool.ts` is a Node CLI
  script (using `commander`/`dotenv`/`firebase-admin`) that isn't part of the
  deployed app.

**Why two configs**: `tsconfig.json` type-checks/builds the deployed SvelteKit web
app (relying on SvelteKit's generated ambient types), while `tsconfig.tool.json`
compiles the standalone administrative CLI into runnable JavaScript in `dist/`,
decoupled from SvelteKit so it can be run directly with `node`.

## Administrative Tools

Entry point: **`src/tool.ts`** — a `commander`-based CLI. Loads `.env` via `dotenv`.
Defines a global `-u/--user-id` option (defaulting to the maintainer's own Firebase
UID, hardcoded across the tool files). Registers two subcommand groups: `firebase`
and `mongo`. Compiled via `pnpm run tsc-once` to `dist/`, then run with
`node dist/tool.js <subcommand>`.

### `src/tools/firebase-tools.ts` — Firestore administrative commands (legacy store)

Initializes `firebase-admin` from `MEM_FIREBASE_ADMIN_KEY` and connects to Firestore
+ the Cloud Storage bucket `liquidx-mem.appspot.com`.

| Command | Purpose |
|---|---|
| `annotate <memId>` | Re-fetches a single mem from Firestore, re-runs `annotateMem`, writes it back |
| `mirror <memId>` | Re-fetches a single mem, runs `mirrorMedia` to cache its photo/video URLs, writes it back |
| `mirror-all` | Iterates all of a user's Firestore mems, mirrors any un-cached photos/videos (skips already-mirrored ones), updates each doc — the bulk media-mirroring backfill |
| `export-mems` | Dumps all mems for a user to console, optionally to a JSON file (`-o/--output`) |
| `rename-tag` | Bulk-renames a hashtag across a user's mems, updating both the `tags` array and inline `#tag` text (`-f/--from`, `-t/--to`) |

### `src/tools/mongo-tools.ts` — MongoDB administrative commands

Uses `getDbClient`/`executeQuery` from `src/lib/db.ts`, taking `dbUser`/`dbPassword`
(from `MONGO_DB_USERNAME`/`MONGO_DB_PASSWORD`) from `tool.ts`.

| Command | Purpose |
|---|---|
| `import-mems -f <file>` | Reads a JSON file of mems (e.g. from `export-mems`), converts `id` → `_id`, attaches `userId`, **deletes all existing documents in `mems`**, then bulk-inserts the new set — the Firebase→MongoDB migration tool |
| `ping` | Connectivity check (`db.command({ ping: 1 })`) |

### `src/lib/db.ts` (supporting library for the tooling, not a CLI itself)

See [data-model.md](./data-model.md) for full connection details — collections
`mems`, `users`, `tags` in a `mem` database on a DigitalOcean-managed cluster.

**Note**: `README.md`'s "Administration" section is stale — it references
`functions/tool.mjs`, `node tool.cjs get-all`, and a Vue + Firebase-Functions-based
backend that no longer matches the current SvelteKit + MongoDB architecture. The
actual current admin tooling lives entirely in `src/tool.ts` + `src/tools/*`.

## Environment Variables

There is no `.env.example` in the repo; variable names are inferred from
`README.md` and actual usage in the codebase.

| Variable | Consumed via | Purpose |
|---|---|---|
| `MEM_FIREBASE_ADMIN_KEY` | `process.env` (CLI only, via `dotenv`) | JSON service-account/web config for `firebase-admin`, used by the admin CLI (Firestore + Storage access) |
| `PUBLIC_MEM_FIREBASE_WEB_SECRETS` | `$env/static/public` | Public Firebase web app config (apiKey, authDomain, projectId, …), used both client- and server-side to init Firebase Auth |
| `MONGO_DB_USERNAME` | `$env/static/private` (app) / `process.env` (CLI) | MongoDB connection username |
| `MONGO_DB_PASSWORD` | `$env/static/private` (app) / `process.env` (CLI) | MongoDB connection password |
| `S3_ACCESS_KEY` | `$env/static/private` | S3-compatible (Wasabi) access key |
| `S3_SECRET_KEY` | `$env/static/private` | S3-compatible secret key |
| `S3_REGION` | `$env/static/private` | S3-compatible storage region |
| `S3_SERVICE_URL` | `$env/static/private` | Custom S3-compatible endpoint URL (Wasabi, not raw AWS S3) |
| `S3_BUCKET` | `$env/static/private` | Target bucket for mirrored media and uploaded attachments |
| `ANGOLIA_APP_ID` / `ANGOLIA_ADMIN_KEY` | present in `.env`, **no code references found** | Appears to be leftover/unused config for an Algolia search integration (note the typo "ANGOLIA") — dead config, not currently wired up |

Notes on consumption patterns:
- The SvelteKit app uses SvelteKit's typed `$env/static/private`/`$env/static/public`
  imports (compile-time injected), correctly split between private (Mongo, S3) and
  public (Firebase web config) variables.
- The standalone admin CLI is a plain Node script outside Vite/SvelteKit, so it uses
  `dotenv.config()` + `process.env.*` directly instead.
- `README.md` documents roughly the same variable set but is otherwise stale
  relative to the current SvelteKit-based app (still describes a Vue/Firebase-Functions setup).

## Testing

### Unit tests (`tests/unit/`, Vitest — `pnpm test`)

| File | Covers |
|---|---|
| `parser.test.ts` | `parseText` (`src/lib/common/parser.ts`) — URL/hashtag/note extraction from freeform input |
| `opengraph.test.js` | `parseOpenGraph` against static HTML fixtures |
| `opengraph.network.test.js` | `fetchOpenGraph` via a **live network request** (github.com) — a network-dependent smoke test, separate from the offline fixture-based tests |
| `fixtures/` | Static HTML snapshots for `opengraph.test.js`: `amazon.html`, `kottke.html`, `medium.html`, `mitpress.html`, `reddit.html`, `substack.html`, `x.html`, `youtube_watch.html` — one per external site/content shape the annotator needs to handle |

### E2E tests (`tests/e2e/`, Playwright — `pnpm test:e2e`)

Configured (`playwright.config.ts` runs `pnpm run build && pnpm run preview` on port
`4173`, `testDir: "tests/e2e"`) but **currently contains no test files** — the
suite is wired up but not yet populated.
