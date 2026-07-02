# Phase 2 — Email Digests & Resurfacing

**Status:** 📋 Planned · **Depends on:** nothing (independent of Phases 1/3)

## Goal

Email the user about their own saved content on a schedule, so mems don't rot
unseen in the inbox/archive:

1. **Daily — newly saved.** A summary of mems added that day (since the last daily
   digest).
2. **Weekly — resurface old.** An "on this day" selection of mems from prior years,
   plus a few random older mems, to rediscover forgotten saves.
3. **Reading-list reminder.** A periodic nudge of what's in the reading list
   (`#look`/`#next`/`#try`) so it doesn't pile up. Reuses Phase 1's
   `READING_LIST_TAGS` and the `matchAnyTags` filter.

All three are opt-in per user and default off.

## Decisions (already made)

| Question         | Decision                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| Email provider   | **Resend** (`resend` npm package). New dependency; simple HTML-email API.       |
| Which digests    | **All three** — daily newly-saved, weekly resurface-old, reading-list reminder. |
| Delivery cadence | Daily digest = daily cron; weekly resurface + reading reminder = weekly cron.   |

## Background from the current system

- **No email or cron infrastructure exists today.** There is no `resend`/`nodemailer`
  dependency and no `vercel.json` (Vercel behavior is expressed via
  `@sveltejs/adapter-vercel` options in `svelte.config.js`, region `sfo1`). See
  [../spec/deployment.md](../spec/deployment.md).
- **The user's email is not stored in Mongo.** The `users` collection holds
  `{ _id, username, writeSecret, views }` (see [../spec/data-model.md](../spec/data-model.md));
  `_id` is the Firebase UID. The email lives in Firebase Auth — reachable server-side
  via `getUser(firebaseApp, request)` / the Admin SDK's `getAuth(app).getUser(uid)`
  (`src/lib/firebase.server.ts`, `src/lib/server/api.server.ts`).
- **Prefs are a generic per-user KV store** on the `users` document with no allow-list
  (`/_api/prefs`, see [../spec/api.md](../spec/api.md)) — digest settings can live
  under a new key without schema changes.
- **RSS feed routes** in `src/routes/(feeds)/` already turn mems into presentation
  markup (title/description/image resolution, Bunny CDN URLs via `src/lib/storage.ts`)
  — a good model for the digest HTML builder. See [../spec/api.md](../spec/api.md).
- **Env vars** use SvelteKit `$env/static/private` in the app and `process.env` in the
  CLI (see [../spec/deployment.md](../spec/deployment.md)).

## Work breakdown

### 1. Email transport

- [ ] Add the `resend` dependency.
- [ ] New env vars: `RESEND_API_KEY`, `DIGEST_FROM_EMAIL` (and `CRON_SECRET`, below),
      imported via `$env/static/private`. Document them in
      [../spec/deployment.md](../spec/deployment.md)'s env-var table.
- [ ] `src/lib/server/email.server.ts` — a thin Resend wrapper:
      `sendEmail({ to, subject, html })`. Keep provider details isolated here.

### 2. Recipient resolution

- [ ] Helper to map a Firebase UID → email via the Admin SDK
      (`getAuth(firebaseApp).getUser(uid).email`), reusing `getFirebaseApp()`.
- [ ] Iterate opted-in users from the Mongo `users` collection (their `_id` is the UID)
      to drive the send loop.

### 3. Query helpers (`src/lib/mem.db.server.ts`)

- [ ] `getMemsAddedBetween(db, userId, startMs, endMs)` — daily "newly saved" (filter
      on `addedMs`).
- [ ] `getMemsOnThisDay(db, userId)` — mems whose `addedMs`/`date` falls on today's
      month-day in prior years, plus a small random sample of older mems.
- [ ] Reading-list reminder reuses `getMems` with `matchAnyTags: READING_LIST_TAGS`
      (`src/lib/common/reading.ts`).
- [ ] Note: `getAllMems` has a known malformed-options sort bug (see
      [../spec/data-model.md](../spec/data-model.md)) — write these helpers to sort
      correctly rather than copying that pattern.

### 4. Digest composition (`src/lib/server/digest.ts`)

- [ ] Per-user HTML builder that assembles only the enabled sections, reusing the
      mem→HTML formatting approach from the `(feeds)` routes (title/description/image
      fallbacks, CDN image URLs).
- [ ] Each mem links back to its `/mem/[memId]` page.

### 5. Preferences + UI

- [ ] Store settings under a prefs key (e.g. `digest`):
      `{ daily, weekly, readingReminder, lastSentMs }`, via the existing `/_api/prefs`
      endpoint and `getSavedViews`-style client helpers in `src/lib/mem.client.ts`.
- [ ] Add toggles to the `/prefs` (a.k.a. `/organize`) page.

### 6. Cron endpoints + schedule

- [ ] `src/routes/api/cron/daily/+server.ts` and `.../weekly/+server.ts` (kept out of
      `/_api`, which has its own per-route auth). Each verifies
      `Authorization: Bearer ${CRON_SECRET}` — Vercel sends this header automatically
      when `CRON_SECRET` is set — then loops opted-in users and sends.
- [ ] `vercel.json` (new file) with a `crons` array pointing at `/api/cron/daily` and
      `/api/cron/weekly` (schedules in UTC, tuned to the user's `sfo1` morning).

## Files

- **New:** `src/lib/server/email.server.ts`, `src/lib/server/digest.ts`,
  `src/routes/api/cron/daily/+server.ts`, `src/routes/api/cron/weekly/+server.ts`,
  `vercel.json`.
- **Edit:** `src/lib/mem.db.server.ts` (query helpers), `package.json` (dependency +
  cron notes), the `/prefs` page and `src/lib/mem.client.ts` (settings UI/helpers),
  `docs/spec/deployment.md` (env vars).

## Constraints & risks

- **Vercel Hobby** allows only daily-granularity crons and at most 2 cron jobs; finer
  or additional schedules need Pro. Two jobs (daily + weekly) fit within Hobby.
- **Cron endpoints must be authenticated** by `CRON_SECRET` — they iterate all users
  and send mail, so an open endpoint is both a spam and a data-leak risk.
- **Idempotency:** track `lastSentMs` so a re-fired/retried cron doesn't double-send.

## Verification

- [ ] Trigger the cron endpoints locally with the `CRON_SECRET` bearer header against a
      test user; assert Resend receives the expected HTML (use a dev/sandbox sender).
- [ ] Unit-test `getMemsAddedBetween` and `getMemsOnThisDay` (date-boundary cases) in
      `tests/unit/` (Vitest, `pnpm test`).
- [ ] Confirm the `/prefs` toggles gate sending (all-off ⇒ no email).
- [ ] `pnpm run check` and `pnpm run lint` pass.
