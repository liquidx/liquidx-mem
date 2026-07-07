# Configurable "Later Lists" — Design

## Summary

Replace the hardcoded reading list (`#look`) with user-configurable **later lists**.
Each list has a name, one or more tags, and an auto-archive flag. Configured
lists:

1. Drive **add-time archiving** — a newly added mem whose tags intersect any
   auto-archiving list's tags is marked `new: false` (kept out of the "new"
   inbox but still reachable via the list).
2. Render as **tabs** in the main view between `new` and `archive`.
3. Get **per-list counts**.
4. Participate in the **unseen dot** and **"seen"** behavior.

The standalone Reading List view (`/reading`, `ReadingListView.svelte`, header
links) is retired; everything runs through the main mem list.

## Goals

- Users define named lists (e.g. `reading → #look`, `watching → #watch`,
  `visit → #go`) in preferences.
- Each list optionally auto-archives its items on add (default on). Lists with
  auto-archive off still show as tabs but leave items in the home feed.
- Preserve today's behavior with a seeded default (`reading → #look`) when a
  user has configured nothing.
- Retire the separate reading-list feature.

## Non-goals

- Migrating the existing dormant `views` preference (left untouched).
- Auto-archiving on *edit* or on URL-merge of an existing mem. Archiving happens
  only when a new mem is created (matches current behavior).
- Per-list customization beyond name / tags / auto-archive.

## Data model

New shared module `src/lib/common/lists.ts` (replaces `src/lib/common/reading.ts`):

```ts
export interface UserList {
  name: string;
  tags: string[];        // normalized "#tag" values, match-any within a list
  autoArchive?: boolean; // default true when undefined
}

export const DEFAULT_LISTS: UserList[] = [{ name: "reading", tags: ["#look"], autoArchive: true }];

// A user's lists, falling back to the seeded default when none are configured.
export const listsForUser = (lists: UserList[] | undefined | null): UserList[] =>
  lists && lists.length > 0 ? lists : DEFAULT_LISTS;

// Flattened tags of lists that should pull an added mem out of the "new" inbox.
export const autoArchiveTags = (lists: UserList[]): string[] =>
  lists.filter((l) => l.autoArchive !== false).flatMap((l) => l.tags);

// Flattened tags across all lists (for unseen dot / seen).
export const allListTags = (lists: UserList[]): string[] => lists.flatMap((l) => l.tags);
```

Persistence: per-user preference under key `"lists"`, stored on the user
document (same mechanism as `writeSecret`). `User.lists?: UserList[]` added to
`src/lib/user.types.ts`.

## Components & changes

### 1. Preferences (`src/routes/(web)/prefs/+page.svelte`, `mem.client.ts`)

- Replace the unused "Views" section with a **Lists** editor. Each row: a
  **name** text input, a **tags** text input (space/comma separated, normalized
  to lowercase `#tag`), and an **auto-archive** checkbox (default checked).
  Add / delete rows.
- New client helpers `getLists(user): Promise<UserList[]>` and
  `updateLists(user, lists)` calling `/prefs` with `key: "lists"`.
- Remove `getSavedViews` / `updateSavedViews` (dead after this).
- Tag input parsing: split on `/[\s,]+/`, drop empties, prefix `#`, lowercase.

### 2. Add-time archiving (`src/lib/mem.db.server.ts` `addMem`)

Load the user's lists, compute `autoArchiveTags`, and set:

```ts
const lists = listsForUser((await getUserCollection(db).findOne({ _id: userId }))?.lists);
const laterTags = autoArchiveTags(lists);
mem.new = !(mem.tags ?? []).some((t) => laterTags.includes(t));
```

Replaces the current hardcoded `!(mem.tags ?? []).includes("#look")`.

### 3. Counts (`src/routes/_api/mem/count/+server.ts`, `mem.client.ts`)

Load `listsForUser(user.lists)` and return:

```ts
export type MemListCount = { name: string; count: number };
export type MemViewCounts = { new: number; archive: number; lists: MemListCount[] };
```

- `new`: `{ new: true, notSuppressed }`
- `archive`: `{ new: false, notSuppressed }`
- each list: `{ tags: { $in: list.tags }, notSuppressed }` (ignores `new`, in
  configured order).

### 4. Main view (`src/lib/svelte/MainView.svelte`)

- Load the user's lists (default-seeded) into state.
- Build tabs: `new` (href `/`) → one tab per list (label = `list.name`, href =
  filter URL of its tags) → `archive` (href `/tag/*`), with counts.
- List tab href: bare tags joined by `,` (match-any), e.g. `/tag/look` or
  `/tag/look,next`.
- Active detection: a list tab is active when the current filter's tag set
  (`matchAllTags ∪ matchAnyTags`) equals the list's tag set and not archived.
- Remove `readingTag` / `isReadingView` / `filterChipTag`-reading special-casing;
  derive the filter chip and RSS link from the generic active filter.
- Pass `allListTags(lists)` down to `MemList` for the unseen dot.
- `seen` handler continues to call `markReadMem` (server strips list tags).

### 5. Unseen dot (`MemList.svelte`, `MemView.svelte`)

- Add a `listTags: string[]` prop threaded `MainView → MemList → MemView`.
- `MemView.unseen` = mem has any tag in `listTags` (replaces the
  `READING_LIST_TAGS` import).

### 6. "seen" (`src/routes/_api/mem/flag/+server.ts`)

- `markRead` strips the user's configured list tags (load `listsForUser`,
  `allListTags`) from `mem.tags` and `mem.note`, instead of the hardcoded
  `READING_LIST_TAGS`.
- The legacy `seen` branch (hardcoded `#look` add/remove) is left as-is or
  removed if unused; `markRead` is the path the UI uses.

### 7. Retire reading list

- Delete `src/routes/(web)/reading/` and `src/lib/svelte/ReadingListView.svelte`.
- Remove the "reading list" links in `src/routes/(web)/+layout.svelte` (desktop
  nav + mobile menu popover).
- Delete `src/lib/common/reading.ts` once no imports remain.

## Behavior notes / edge cases

- **No lists configured** → `DEFAULT_LISTS` (`reading → #look`, auto-archive on),
  preserving current behavior end to end.
- **Auto-archive off** → the list's tags are excluded from `autoArchiveTags`, so
  adding such a mem keeps `new: true`; it still appears in the list tab and gets
  the unseen dot / seen behavior.
- **Match-any within a list** → a mem with any one of a list's tags belongs to
  the list (count `$in`, filter URL comma-joined).
- **RSS feed link** — only shown for single-tag filters (`matchAllTags[0]`);
  multi-tag list views won't offer an RSS link (acceptable).

## Verification

- Unit-level: `autoArchiveTags` / `allListTags` / `listsForUser` pure helpers.
- End-to-end (browser, with cleanup): configure `watching → #watch`
  (auto-archive on) and a non-archiving `notes → #note`; add a `#watch` mem
  (lands in watching, not new) and a `#note` mem (stays in new AND shows in
  notes); confirm tab counts; mark one "seen" and confirm it leaves the list;
  delete test mems.
- Confirm `/reading` 404s and the header no longer links it.
