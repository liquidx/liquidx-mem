# Configurable Later Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded reading list (`#look`) with user-configurable "later lists" (name + tags + auto-archive) that drive add-time archiving, dynamic main-view tabs, per-list counts, and the unseen/seen behavior.

**Architecture:** A shared `src/lib/common/lists.ts` module defines the `UserList` type, a seeded default, and pure helpers. Lists are stored per-user under the `lists` preference key. Server add/count/flag endpoints and the main view read the user's lists (falling back to the default) instead of the hardcoded `#look`/`READING_LIST_TAGS`. The standalone reading-list view is deleted.

**Tech Stack:** SvelteKit + TypeScript, Svelte 5 runes, MongoDB, Vitest (unit), Tailwind.

## Global Constraints

- Tests live in `tests/unit/*.test.ts`; import source as `../../src/lib/<name>.js`. Run a single file with `pnpm exec vitest run tests/unit/<file>`.
- Type-check with `pnpm run check`. The repo has many **pre-existing** `Cannot find module '$lib/...'` errors in server files under svelte-check — a change is "clean" if `pnpm run check` reports no errors referencing the files you touched (grep for the file name).
- Tags are stored lowercase and `#`-prefixed (e.g. `#look`). Match-any within a list; match-all across a multi-tag filter URL uses `+`, match-any uses `,` (see `src/lib/filter.ts`).
- Preferences are persisted via `POST /_api/prefs` `{ key, settings }` and read via `GET /_api/prefs?key=<key>`; settings are stored on the user document under that key.
- Commit after each task. Do not push.
- Co-author trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Shared lists module, helpers, and user type

**Files:**
- Create: `src/lib/common/lists.ts`
- Test: `tests/unit/lists.test.ts`
- Modify: `src/lib/user.types.ts`

**Interfaces:**
- Produces:
  - `interface UserList { name: string; tags: string[]; autoArchive?: boolean }`
  - `const DEFAULT_LISTS: UserList[]`
  - `listsForUser(lists: UserList[] | undefined | null): UserList[]`
  - `autoArchiveTags(lists: UserList[]): string[]`
  - `allListTags(lists: UserList[]): string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lists.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LISTS,
  allListTags,
  autoArchiveTags,
  listsForUser
} from "../../src/lib/common/lists.js";

describe("listsForUser", () => {
  it("returns DEFAULT_LISTS when none configured", () => {
    expect(listsForUser(undefined)).toEqual(DEFAULT_LISTS);
    expect(listsForUser(null)).toEqual(DEFAULT_LISTS);
    expect(listsForUser([])).toEqual(DEFAULT_LISTS);
  });

  it("returns the configured lists when present", () => {
    const lists = [{ name: "watching", tags: ["#watch"] }];
    expect(listsForUser(lists)).toBe(lists);
  });
});

describe("autoArchiveTags", () => {
  it("includes tags from lists where autoArchive is not false", () => {
    const lists = [
      { name: "reading", tags: ["#look", "#next"], autoArchive: true },
      { name: "default-on", tags: ["#go"] } // undefined defaults to on
    ];
    expect(autoArchiveTags(lists)).toEqual(["#look", "#next", "#go"]);
  });

  it("excludes tags from lists with autoArchive false", () => {
    const lists = [
      { name: "reading", tags: ["#look"], autoArchive: true },
      { name: "notes", tags: ["#note"], autoArchive: false }
    ];
    expect(autoArchiveTags(lists)).toEqual(["#look"]);
  });
});

describe("allListTags", () => {
  it("flattens every list's tags regardless of autoArchive", () => {
    const lists = [
      { name: "reading", tags: ["#look"], autoArchive: true },
      { name: "notes", tags: ["#note"], autoArchive: false }
    ];
    expect(allListTags(lists)).toEqual(["#look", "#note"]);
  });
});

describe("DEFAULT_LISTS", () => {
  it("is reading -> #look, auto-archiving", () => {
    expect(DEFAULT_LISTS).toEqual([{ name: "reading", tags: ["#look"], autoArchive: true }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/lists.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/common/lists.js`.

- [ ] **Step 3: Create the module**

Create `src/lib/common/lists.ts`:

```ts
export interface UserList {
  name: string;
  tags: string[]; // normalized "#tag" values, match-any within a list
  autoArchive?: boolean; // default true when undefined
}

// Seeded default so behavior is preserved when a user configures nothing.
export const DEFAULT_LISTS: UserList[] = [{ name: "reading", tags: ["#look"], autoArchive: true }];

// A user's lists, falling back to the seeded default when none are configured.
export const listsForUser = (lists: UserList[] | undefined | null): UserList[] =>
  lists && lists.length > 0 ? lists : DEFAULT_LISTS;

// Flattened tags of lists that pull an added mem out of the "new" inbox.
export const autoArchiveTags = (lists: UserList[]): string[] =>
  lists.filter((list) => list.autoArchive !== false).flatMap((list) => list.tags);

// Flattened tags across all lists (used for the unseen dot and "seen").
export const allListTags = (lists: UserList[]): string[] => lists.flatMap((list) => list.tags);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/lists.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Add `lists` to the user type**

In `src/lib/user.types.ts`, add the import-free type field. Change the `User` interface to include lists (keep existing fields):

```ts
import type { UserList } from "$lib/common/lists";

export interface UserView {
  tags: string;
}

export type UserWriteSecret = string;

export interface User {
  _id: string;
  username: string;
  writeSecret: UserWriteSecret;
  views: UserView[];
  lists?: UserList[];
}
```

- [ ] **Step 6: Type-check**

Run: `pnpm run check 2>&1 | grep -E "lists.ts|user.types.ts" || echo clean`
Expected: `clean`

- [ ] **Step 7: Commit**

```bash
git add src/lib/common/lists.ts tests/unit/lists.test.ts src/lib/user.types.ts
git commit -m "Add UserList model, default seed, and list helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Preferences — client helpers and Lists editor UI

**Files:**
- Modify: `src/lib/mem.client.ts` (around lines 349-376, the `getSavedViews`/`updateSavedViews` block)
- Modify: `src/routes/(web)/prefs/+page.svelte`

**Interfaces:**
- Consumes: `UserList` from Task 1.
- Produces:
  - `getLists(user: User): Promise<UserList[]>`
  - `updateLists(user: User, lists: UserList[]): Promise<void>`

- [ ] **Step 1: Replace the client view helpers with list helpers**

In `src/lib/mem.client.ts`, update the import at the top (the line importing from `./user.types`):

```ts
import type { UserWriteSecret } from "./user.types";
import type { UserList } from "./common/lists";
```

Replace the `getSavedViews` and `updateSavedViews` functions with:

```ts
export const getLists = async (user: User): Promise<UserList[]> => {
  const url = `${serverUrl}/prefs?key=lists`;
  const authToken = await user.getIdToken();
  const headers = { Authorization: `Bearer ${authToken}` };
  return axios
    .get(url, { headers })
    .then((response) => {
      if (response.status != 200 || !response.data.settings) {
        return [];
      }
      return response.data.settings as UserList[];
    })
    .catch(() => []);
};

export const updateLists = async (user: User, lists: UserList[]): Promise<void> => {
  const url = `${serverUrl}/prefs`;
  const authToken = await user.getIdToken();
  const headers = { Authorization: `Bearer ${authToken}` };
  await axios.post(url, { key: "lists", settings: lists }, { headers });
};
```

Note: keep the `getWriteSecret`/`updateSecrets` functions and any `UserView` type usage elsewhere untouched. If `UserView` is now unused in this file, remove it from the import.

- [ ] **Step 2: Rewrite the prefs page Lists section**

Replace the entire contents of `src/routes/(web)/prefs/+page.svelte` with:

```svelte
<script lang="ts">
  import { run } from "svelte/legacy";

  import { getLists, updateLists, getWriteSecret, updateSecrets } from "$lib/mem.client.js";
  import { sharedUser } from "$lib/firebase-shared";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { DEFAULT_LISTS, type UserList } from "$lib/common/lists";
  import type { UserWriteSecret } from "$lib/user.types";

  type ListRow = { name: string; tagsText: string; autoArchive: boolean };

  let writeSecret: UserWriteSecret = $state("");
  let rows: ListRow[] = $state([]);

  const parseTags = (value: string): string[] =>
    value
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => `#${t.replace(/^#+/, "").toLowerCase()}`);

  const rowsToLists = (source: ListRow[]): UserList[] =>
    source
      .filter((row) => row.name.trim() && parseTags(row.tagsText).length > 0)
      .map((row) => ({
        name: row.name.trim(),
        tags: parseTags(row.tagsText),
        autoArchive: row.autoArchive
      }));

  const loadLists = async () => {
    if (!$sharedUser) return;
    const saved = await getLists($sharedUser);
    const lists = saved.length > 0 ? saved : DEFAULT_LISTS;
    rows = lists.map((list) => ({
      name: list.name,
      tagsText: list.tags.join(" "),
      autoArchive: list.autoArchive !== false
    }));
  };

  const saveLists = () => {
    if (!$sharedUser) return;
    updateLists($sharedUser, rowsToLists(rows));
  };

  const addRow = () => {
    rows = [...rows, { name: "", tagsText: "", autoArchive: true }];
  };

  const deleteRow = (index: number) => {
    rows = rows.filter((_, i) => i !== index);
    saveLists();
  };

  const loadWriteSecret = async () => {
    if (!$sharedUser) return;
    const savedSecret = await getWriteSecret($sharedUser);
    if (savedSecret) {
      writeSecret = savedSecret;
    }
  };

  const saveWriteSecret = () => {
    if (!$sharedUser) return;
    updateSecrets($sharedUser, writeSecret);
  };

  run(() => {
    if ($sharedUser) {
      loadWriteSecret();
      loadLists();
    }
  });
</script>

<div class="p-4">
  <div class="mb-4">
    <div class="font-bold">Shared Secret:</div>
    <div class="flex items-center justify-between space-x-4">
      <Input type="text" bind:value={writeSecret} />
      <Button variant="secondary" on:click={saveWriteSecret}>Save</Button>
    </div>
  </div>

  <div class="mb-4">
    <div class="font-bold">Lists</div>
    <div class="mb-1 text-sm text-faint">
      Name, tags (space or comma separated), and whether adding an item auto-archives it out of the
      new feed.
    </div>
    {#each rows as row, index (index)}
      <div class="my-1 flex items-center space-x-3">
        <Input class="w-40" type="text" placeholder="name" bind:value={row.name} onblur={saveLists} />
        <Input
          class="flex-1"
          type="text"
          placeholder="#look #next"
          bind:value={row.tagsText}
          onblur={saveLists}
        />
        <label class="flex items-center space-x-1 whitespace-nowrap text-sm">
          <input type="checkbox" bind:checked={row.autoArchive} onchange={saveLists} />
          <span>auto-archive</span>
        </label>
        <Button variant="secondary" on:click={() => deleteRow(index)}>Delete</Button>
      </div>
    {/each}
    <Button class="mt-2" variant="secondary" on:click={addRow}>Add list</Button>
  </div>
</div>
```

- [ ] **Step 3: Type-check**

Run: `pnpm run check 2>&1 | grep -E "prefs/\+page|mem.client" || echo clean`
Expected: `clean`

- [ ] **Step 4: Browser verification**

Start the dev server if not running (`pnpm run dev`). In the browser at the dev URL, sign in, go to `/prefs`. Confirm: the Lists section renders a `reading` / `#look` / auto-archive-checked row (the seeded default). Add a row `watching` / `#watch` (auto-archive checked), blur the field, reload the page, and confirm it persists. Then delete the `watching` row to clean up (leaving only `reading → #look`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mem.client.ts src/routes/\(web\)/prefs/+page.svelte
git commit -m "Add Lists preferences editor and client helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Auto-archive on add uses configured lists

**Files:**
- Modify: `src/lib/mem.db.server.ts` (the `addMem` function, ~lines 28-39)

**Interfaces:**
- Consumes: `listsForUser`, `autoArchiveTags` from Task 1; `getUserCollection` from `$lib/db`.

- [ ] **Step 1: Add imports**

In `src/lib/mem.db.server.ts`, update the db import and add the lists import:

```ts
import { getMemCollection, getUserCollection } from "$lib/db.server";
import { autoArchiveTags, listsForUser } from "$lib/common/lists";
```

- [ ] **Step 2: Make `addMem` tag-aware from configuration**

Replace the current auto-archive line (added previously) in `addMem`:

```ts
export const addMem = async (db: Db, userId: string, mem: Mem): Promise<Mem | void> => {
  mem._id = crypto.randomUUID();
  mem.userId = userId;
  // Items in an auto-archiving list are kept out of the "new" inbox (they still
  // appear in the list, which queries by tag regardless of archive state).
  const userDoc = await getUserCollection(db).findOne({ _id: userId });
  const laterTags = autoArchiveTags(listsForUser(userDoc?.lists));
  mem.new = !(mem.tags ?? []).some((tag) => laterTags.includes(tag));
  mem.addedMs = DateTime.utc().toMillis();

  const result = await getMemCollection(db).insertOne(mem);
  if (!result) {
    return;
  }
  return mem;
};
```

- [ ] **Step 3: Type-check**

Run: `pnpm run check 2>&1 | grep -E "mem.db.server.ts:3[0-9]|mem.db.server.ts:4[0-9]" || echo "no errors on the edited lines"`
Expected: `no errors on the edited lines` (ignore pre-existing `$lib` module-resolution errors on other lines).

- [ ] **Step 4: Browser verification (with cleanup)**

With `reading → #look` (auto-archive on) configured, note the `new` and `reading` counts on the home page. Add a mem `https://example.com/task3-test #look`, submit, and confirm `new` is unchanged while `reading` +1 (it was auto-archived). Then add `https://example.com/task3-noarchive #zzznew` (a tag not in any list) and confirm `new` +1 (not archived). Delete both test mems and confirm counts return to baseline.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mem.db.server.ts
git commit -m "Auto-archive added mems using configured list tags

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Per-list counts

**Files:**
- Modify: `src/routes/_api/mem/count/+server.ts`
- Modify: `src/lib/mem.client.ts` (the `MemViewCounts` type ~line 187 and `getMemCounts` ~line 189)

**Interfaces:**
- Consumes: `listsForUser` from Task 1; `getUserCollection` from `$lib/db`.
- Produces:
  - `type MemListCount = { name: string; count: number }`
  - `type MemViewCounts = { new: number; archive: number; lists: MemListCount[] }`

- [ ] **Step 1: Rewrite the count endpoint**

Replace the contents of `src/routes/_api/mem/count/+server.ts` with:

```ts
import { getDb, getMemCollection, getUserCollection } from "$lib/db.server";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { listsForUser } from "$lib/common/lists";
import { getUserId } from "$lib/server/api.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// Counts for the feed views: new (inbox), each configured list, and archive.
export const GET: RequestHandler = async ({ request, locals }) => {
  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const suppressedTags = ["#xxx"];
  const notSuppressed = { tags: { $not: { $in: suppressedTags } } };
  const collection = getMemCollection(db);

  const userDoc = await getUserCollection(db).findOne({ _id: userId });
  const lists = listsForUser(userDoc?.lists);

  const [newCount, archiveCount, ...listCounts] = await Promise.all([
    collection.countDocuments({ $and: [{ userId }, { new: true }, notSuppressed] }),
    collection.countDocuments({ $and: [{ userId }, { new: false }, notSuppressed] }),
    ...lists.map((list) =>
      collection.countDocuments({
        $and: [{ userId }, { tags: { $in: list.tags } }, notSuppressed]
      })
    )
  ]);

  return json({
    status: "OK",
    counts: {
      new: newCount,
      archive: archiveCount,
      lists: lists.map((list, i) => ({ name: list.name, count: listCounts[i] }))
    }
  });
};
```

- [ ] **Step 2: Update the client type and getter**

In `src/lib/mem.client.ts`, replace the `MemViewCounts` type definition:

```ts
export type MemListCount = { name: string; count: number };
export type MemViewCounts = { new: number; archive: number; lists: MemListCount[] };
```

Leave `getMemCounts` as-is (it already returns `response.data.counts as MemViewCounts`).

- [ ] **Step 3: Type-check**

Run: `pnpm run check 2>&1 | grep -E "count/\+server|mem.client.ts" || echo clean`
Expected: `clean` (ignore pre-existing `$lib` resolution errors if any; there should be none referencing your edits).

- [ ] **Step 4: Browser verification**

This task changes the count response shape; the main view is updated in Task 5, so the tab counts may render `undefined` until then. Verify the endpoint directly instead: with the app open and signed in, in the browser devtools console run
`fetch('/_api/mem/count', { headers: { Authorization: 'Bearer ' + (await firebase.auth().currentUser.getIdToken()) } }).then(r => r.json()).then(console.log)`
— or simply proceed; Task 5 verifies counts end-to-end. Confirm no server error in the dev log.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_api/mem/count/+server.ts src/lib/mem.client.ts
git commit -m "Return per-list counts from the count endpoint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Dynamic tabs and generalized unseen dot in the main view

**Files:**
- Modify: `src/lib/svelte/MainView.svelte`
- Modify: `src/lib/svelte/MemList.svelte`
- Modify: `src/lib/svelte/MemView.svelte`

**Interfaces:**
- Consumes: `UserList`, `DEFAULT_LISTS`, `listsForUser`, `allListTags` from Task 1; `getLists` from Task 2; `MemViewCounts` (`{ new, archive, lists }`) from Task 4.

- [ ] **Step 1: MemView — unseen dot from a prop**

In `src/lib/svelte/MemView.svelte`:

Remove the reading import:

```ts
// DELETE this line:
import { READING_LIST_TAGS } from "$lib/common/reading";
```

Add `listTags` to the `Props` interface and destructuring (default `[]`):

```ts
interface Props {
  mem: Mem;
  density?: "full" | "minimal";
  listTags?: string[];
  editing?: boolean;
  // ...existing callbacks unchanged...
}

let {
  mem,
  density = "full",
  listTags = [],
  editing = false,
  // ...existing callbacks unchanged...
}: Props = $props();
```

Change the `unseen` derived to use the prop:

```ts
const unseen = $derived((mem.tags ?? []).some((tag) => listTags.includes(tag)));
```

- [ ] **Step 2: MemList — thread the prop through**

In `src/lib/svelte/MemList.svelte`, add `listTags` to `Props` and destructuring (default `[]`), and pass it to `MemView`:

```ts
interface Props {
  mems?: Mem[];
  density?: "full" | "minimal";
  listTags?: string[];
  editingId?: string | null;
  // ...existing callbacks unchanged...
}

let {
  mems = [],
  density = "full",
  listTags = [],
  editingId = null,
  // ...existing callbacks unchanged...
}: Props = $props();
```

In the `<MemView ... />` usage, add the prop:

```svelte
<MemView
  {mem}
  {density}
  {listTags}
  editing={editingId !== null && editingId === mem._id}
  ...existing callbacks unchanged...
/>
```

- [ ] **Step 3: MainView — load lists and build dynamic tabs**

In `src/lib/svelte/MainView.svelte`:

Add imports:

```ts
import { allListTags, listsForUser, type UserList } from "$lib/common/lists";
import { getLists } from "$lib/mem.client";
```

Add state and derived values near the other `$state`/`$derived` declarations (after `counts`):

```ts
let lists: UserList[] = $state(listsForUser(null));

const listTags = $derived(allListTags(lists));

const activeFilterTags = $derived([
  ...listOptions.matchAllTags,
  ...listOptions.matchAnyTags
]);

const sameTagSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((tag) => set.has(tag));
};

const listHref = (list: UserList) =>
  `/tag/${list.tags
    .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag))
    .map(encodeURIComponent)
    .join(",")}`;

const activeList = $derived(
  listOptions.onlyArchived
    ? null
    : (lists.find((list) => sameTagSet(activeFilterTags, list.tags)) ?? null)
);
```

Remove the now-unused reading-specific derived values `readingTag`, `isReadingView`, and update `isNewView`, `activeTag`, and `filterChipTag`. Replace the block:

```ts
const readingTag = "#look";

const isArchiveView = $derived(listOptions.onlyArchived);
const isReadingView = $derived(
  !listOptions.onlyArchived &&
    listOptions.matchAllTags.length === 1 &&
    listOptions.matchAllTags[0] === readingTag
);
const isNewView = $derived(!isArchiveView && listOptions.matchAllTags.length === 0);
const activeTag = $derived(
  !listOptions.onlyArchived && listOptions.matchAllTags.length === 1
    ? listOptions.matchAllTags[0]
    : null
);
const filterChipTag = $derived(activeTag && activeTag !== readingTag ? activeTag : null);
```

with:

```ts
const isArchiveView = $derived(listOptions.onlyArchived);
const isNewView = $derived(
  !isArchiveView &&
    listOptions.matchAllTags.length === 0 &&
    listOptions.matchAnyTags.length === 0
);
// Show a dismissable chip for an ad-hoc tag filter that is not one of the tabs.
const filterChipTag = $derived(
  !isArchiveView && !activeList && activeFilterTags.length > 0 ? activeFilterTags.join(" ") : null
);
```

Add a `loadLists` function near `loadCounts`:

```ts
const loadLists = async () => {
  if (!$sharedUser) return;
  const saved = await getLists($sharedUser);
  lists = listsForUser(saved);
};
```

Call it from the user effect. In the existing `$effect` that reloads on user/filter change, add a `loadLists()` call (untracked, alongside `reload()`):

```ts
$effect(() => {
  // Reload whenever the user or the route filter changes.
  listOptions;
  if ($sharedUser) {
    untrack(() => {
      loadLists();
      reload();
    });
  }
});
```

Replace the `tabs` derived:

```ts
const tabs = $derived([
  { key: "new", label: "new", count: counts?.new, active: isNewView, href: "/" },
  ...lists.map((list) => ({
    key: `list:${list.name}`,
    label: list.name,
    count: counts?.lists.find((entry) => entry.name === list.name)?.count,
    active: activeList?.name === list.name,
    href: listHref(list)
  })),
  { key: "archive", label: "archive", count: counts?.archive, active: isArchiveView, href: "/tag/*" }
]);
```

- [ ] **Step 4: MainView — pass listTags into MemList**

In the `<MemList ... />` usage, add the prop:

```svelte
<MemList
  {mems}
  {density}
  {listTags}
  {editingId}
  ...existing callbacks unchanged...
/>
```

- [ ] **Step 5: Type-check**

Run: `pnpm run check 2>&1 | grep -E "MainView|MemList|MemView" || echo clean`
Expected: `clean`

- [ ] **Step 6: Browser verification**

Sign in and open the home page. Confirm the tabs read `new` / `reading` / `archive` with counts, and the `reading` count matches the old value. Click `reading` → URL `/tag/look`, tab highlights active, and `#look` items show with the unseen dot. Configure a second list in `/prefs` (`watching → #watch`), return home, and confirm a `watching` tab appears between `reading` and `archive`. Remove the extra list afterward.

- [ ] **Step 7: Commit**

```bash
git add src/lib/svelte/MainView.svelte src/lib/svelte/MemList.svelte src/lib/svelte/MemView.svelte
git commit -m "Render configured lists as main-view tabs with generalized unseen dot

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: "seen" strips configured list tags

**Files:**
- Modify: `src/routes/_api/mem/flag/+server.ts`

**Interfaces:**
- Consumes: `listsForUser`, `allListTags` from Task 1; `getUserCollection` from `$lib/db`.

- [ ] **Step 1: Update imports**

In `src/routes/_api/mem/flag/+server.ts`, replace the reading import and add the user collection:

```ts
// Replace: import { READING_LIST_TAGS } from "$lib/common/reading";
import { allListTags, listsForUser } from "$lib/common/lists";
import { getDb, getUserCollection } from "$lib/db.server";
```

(The file currently imports `getDb` from `$lib/db`; combine into the single import above.)

- [ ] **Step 2: Generalize the `markRead` branch**

Replace the `if (body.markRead) { ... }` block with:

```ts
// Mark a mem as read/seen: strip the user's configured list tags so it drops
// off every later list while staying saved.
if (body.markRead) {
  const userDoc = await getUserCollection(db).findOne({ _id: userId });
  const listTags = allListTags(listsForUser(userDoc?.lists));
  if (mem.tags) {
    mem.tags = mem.tags.filter((tag) => !listTags.includes(tag));
  }
  if (mem.note) {
    for (const tag of listTags) {
      mem.note = mem.note.replaceAll(tag, "");
    }
    mem.note = mem.note.replace(/\s+/g, " ").trim();
  }
}
```

Leave the legacy `body.seen` branch (hardcoded `#look`) unchanged — the UI uses `markRead`.

- [ ] **Step 3: Type-check**

Run: `pnpm run check 2>&1 | grep -E "flag/\+server" || echo clean`
Expected: `clean` (ignore pre-existing `$lib` resolution errors not referencing your edited lines).

- [ ] **Step 4: Browser verification (with cleanup)**

Add a test mem `https://example.com/task6-seen #look` (it auto-archives into reading). Open the reading tab (`/tag/look`), find it, and click **seen**. Confirm it disappears from the reading list and the `reading` count drops by one. Delete the test mem to clean up.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_api/mem/flag/+server.ts
git commit -m "Strip configured list tags on 'seen' instead of hardcoded reading tags

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Retire the standalone reading list

**Files:**
- Delete: `src/routes/(web)/reading/` (directory: `+page.svelte`)
- Delete: `src/lib/svelte/ReadingListView.svelte`
- Delete: `src/lib/common/reading.ts`
- Modify: `src/routes/(web)/+layout.svelte` (remove the two "reading list" links)

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "ReadingListView\|common/reading\|READING_LIST_TAGS\|/reading" src --include=*.svelte --include=*.ts`
Expected: only the two `href="/reading"` links in `src/routes/(web)/+layout.svelte` (and possibly the files about to be deleted). If anything else references `READING_LIST_TAGS` or `ReadingListView`, stop — an earlier task missed a spot; fix it before deleting.

- [ ] **Step 2: Remove the header links**

In `src/routes/(web)/+layout.svelte`, delete the desktop nav link (~line 55):

```svelte
<a href="/reading" class="hover:text-ui">reading list</a>
```

and the mobile menu link (~line 79):

```svelte
<a href="/reading" ... onclick={() => (menuOpen = false)}>reading list</a>
```

(Remove each `<a>` element entirely; leave the surrounding nav markup intact.)

- [ ] **Step 3: Delete the retired files**

```bash
git rm -r src/routes/\(web\)/reading
git rm src/lib/svelte/ReadingListView.svelte
git rm src/lib/common/reading.ts
```

- [ ] **Step 4: Type-check**

Run: `pnpm run check 2>&1 | grep -E "reading|ReadingListView|\+layout" || echo clean`
Expected: `clean`

- [ ] **Step 5: Browser verification**

Reload the app. Confirm the header no longer shows a "reading list" link (desktop and mobile menu). Navigate to `/reading` directly and confirm it 404s. Confirm the main view still works (new/reading/archive tabs).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Retire the standalone reading list view

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Data model (`UserList`, `DEFAULT_LISTS`, helpers, `lists` pref, `User.lists`) → Task 1.
- Preferences UI + client helpers → Task 2.
- Add-time archiving via `autoArchive` flag → Task 3.
- Per-list counts → Task 4.
- Dynamic tabs + generalized unseen dot → Task 5.
- Generalized "seen" → Task 6.
- Retire reading list (route, view, header links, `reading.ts`) → Task 7.
- Auto-archive off keeps items in "new" but shows tab/dot → Tasks 3 (excluded from `autoArchiveTags`) + 4/5 (still counted/tabbed via `allListTags`).

**Type consistency:** `UserList { name; tags; autoArchive? }`, `listsForUser`, `autoArchiveTags`, `allListTags` are defined in Task 1 and consumed with the same signatures in Tasks 2-6. `MemViewCounts { new; archive; lists: {name;count}[] }` defined in Task 4, consumed in Task 5. `listTags` prop name consistent across MainView → MemList → MemView in Task 5.

**Placeholder scan:** No TBD/TODO; every code step shows full code; verification steps give exact commands.
