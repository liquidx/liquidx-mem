# Frontend: Pages & Components

## Architecture note

The `(web)` route group has **no server-side data loading** — there is no
`+page.server.ts` anywhere under `src/routes/(web)/`. Every page fetches data
client-side after mount, gated on a Svelte store (`$sharedUser`) holding the signed-in
Firebase user, calling the JSON API under `/_api/**` (see [api.md](./api.md)) via
`axios` with a Firebase ID token bearer header. Individual `+page.ts`/`+layout.js`
files only set `export const prerender = true/false`.

## Routes under `src/routes/(web)/`

### Root layout (`+layout.svelte` / `+layout.js`)

Applies to every page below. `+layout.js` sets `prerender = true` (the shell has no
dynamic data). `+layout.svelte`:

- Initializes the client Firebase app (`initializeFirebase()`) into the
  `$sharedFirebaseApp` store.
- Renders `<ModeWatcher />` (light/dark mode) and `<Toaster />` (toast notifications).
- Renders a persistent header/sidebar (`md:w-48` column on desktop, full-width row on
  mobile): app title/logo, dark/light toggle, and — only once `$sharedUser` is set —
  nav links **Home** (`/`), **+ Add** (`/add`), **Preferences** (`/prefs`), **Help &
  About** (`/about`), plus the `<SignIn />` widget (always rendered).
- Renders `{@render children?.()}` for the routed page.

### `/` — Home / main feed

Renders `<MainView filter="" />` (the default "new"/inbox view). No load function.

### `/add` — Add mem page

Renders `<MemAdd />` full-page, no list — a dedicated capture page (useful for
deep-linking from share-sheet/shortcut integrations).

### `/about` — Help & About

Static content describing the product and linking to the iOS Shortcuts ("Add to Mem
Shortcut", "Add Photo to Mem Shortcut") and mentioning Android's HTTP Shortcuts app.

### `/mem/[memId]` — Single mem detail page

`+page.ts` sets `prerender = false`. On mount and reactively whenever `$sharedUser` or
the route param changes, fetches `getMem(memId, $sharedUser)` and renders a single
`<MemView mem={mem} />`. No action callbacks are wired up on this route, so the
archive/delete/annotate/etc. buttons render but do nothing here.

### `/organize` — Organize / duplicate-finder page

Renders `<OrganizeView />`. Not linked from primary navigation; see the component
notes below — it appears to have several unresolved bugs.

### `/prefs` — Preferences page

Manages two user-scoped settings against `/_api/prefs`:

1. **Shared Secret** (`writeSecret`) — loaded via `getWriteSecret`, saved via
   `updateSecrets` on clicking "Save". Used for third-party "add mem" integrations.
2. **Saved Views** (`views: UserView[]`, each `{ tags: string }`) — loaded via
   `getSavedViews`; add/delete rows immediately persist via `updateSavedViews`.

Both loads trigger reactively once `$sharedUser` becomes available.

### `/tag/[filter]` — Filtered/tagged feed

`+page.ts` sets `prerender = false`. Reads `filter` from the route param, sets page
title `#mem - {filter}`, and renders `<MainView {filter} />` — the same component as
the home page, parameterized by the tag filter string (see filter syntax in
[data-model.md](./data-model.md), e.g. `/tag/work+urgent` = match-all,
`/tag/work,personal` = match-any, `/tag/*` = archive).

## Main Svelte components (`src/lib/svelte/`)

### `MainView.svelte` — the core feed controller

Used by `/` and `/tag/[filter]`. The largest/most central component.

- **Props**: `filter?: string`, `showTags?: boolean` (default `true`).
- **State**: `mems: Mem[]`, `viewTags: TagListItem[]` (scoped to the current filter),
  `searchQuery`, `listOptions` (derived from `filter`), pagination (`pageSize = 30`,
  `visiblePages`), a computed RSS `feedHref` for the primary matched tag.
- **Data loading**: `loadMems()` POSTs to `/_api/mem/list`; `loadFilters()` calls
  `/_api/tag/list` for the tag sidebar chips. Both run reactively on `$sharedUser`/
  `listOptions` changes; `loadMore()` increments `visiblePages` and appends results.
- **Mutations**: wraps nearly every `mem.client.ts` mutator (`annotateMem`,
  `deleteMem`, `archiveMem`/`unarchiveMem`, `seenMem`, `removePhotoFromMem`,
  `updatePropertyForMem`, `uploadFilesForMem`). Most mutations patch the specific
  `Mem` in place locally rather than refetching; archive/unarchive/seen trigger a
  full `loadMems` refetch instead (since they change list membership).
- **Interactions**: clicking a tag chip toggles it and navigates via `goto()` to a new
  `/tag/...` URL (the URL is the source of truth for filter state); search box
  triggers on Enter; a sort-order dropdown changes `order`.
- **Renders**: `MemSearchBox`, `MemTagList` (sidebar, if `showTags`), `MemAdd`
  (compose box), `MemListFilters` (tag-chip filter + sort), `MemList`, `MoreMem`, and
  a link to the RSS feed for the primary tag when applicable.
- **Known limitation**: `moreMemsAvailable` is declared but never actually updated
  from API responses — it stays `true` permanently, so the "More" pagination button
  always shows regardless of whether more pages truly exist.

### `MemAdd.svelte` — compose/add-mem box

- **Props**: `onmemDidAdd?: (data: { mem: Mem }) => void`.
- An auto-height `<textarea>` + "Add" button.
- **Hashtag autocomplete**: as the user types, detects the whitespace-delimited token
  under the caret; if it starts with `#`, debounces (`fetchSequence` counter to
  discard stale responses) a call to `/_api/tag/suggest` and shows a dropdown.
  Arrow keys navigate, Enter/Tab/click apply the suggestion, Escape dismisses.
- **Submit**: runs `parseText(rawInput)` to build a structured `Mem`, stamps
  `new: true`/`addedMs`, disables the textarea while pending, calls `addMem` (→
  `/_api/mem/add`). Clears on success and calls `onmemDidAdd`; shows an error toast
  on failure.

### `MemList.svelte` — pure list renderer

Purely presentational — `{#each mems as mem (mem._id)}` rendering a `MemView` per
mem, forwarding every callback prop straight through. No local state or data loading.

### `MemView.svelte` — single mem card

The richest presentational component; one editable "card" per mem.

- **Props**: `mem: Mem` plus the full callback set (`onarchive`, `onunarchive`,
  `onannotate`, `ondelete`, `onseen`, `onremovePhoto`, `onfileUpload`,
  `onnoteChanged`, `ondescriptionChanged`, `ontitleChanged`, `onurlChanged`).
- **Displays**: editable note (auto-resizing textarea), title (linked to `mem.url`
  if present), editable description (truncated for display), attached photos/videos
  (resolved via the Bunny CDN URL builder `getCachedStorageUrl`, or the raw
  `mediaUrl`/`posterUrl` if not yet mirrored), any `mem.links`, a formatted date, the
  raw `_id` linking to `/mem/[memId]`, and a popover for viewing/editing the raw URL.
- **Key interactions**: inline edit of note/description on blur; inline
  `contenteditable` title editing; URL editing via popover; **file upload** via a
  hidden file input, drag-and-drop onto the card, and **paste-to-upload** (a
  window-level paste listener scoped to the currently-hovered card, skipping when
  focus is in an editable field); a photo "Remove" button; and an action row
  (Archive/Unarchive, Seen, Annotate, Delete, Upload).
- Stateless about persistence — everything is delegated to callback props.

### `MemListFilters.svelte` — tag-chip filter + sort control

Renders a sort-order `<select>` (Newest/Oldest) and a collapsible "Filter by tags"
section of clickable chips, highlighting currently-selected tags per `listOptions`.

### `MemSearchBox.svelte` — search input

A single input bound to local state, firing `onsearchQueryDidChange` only on Enter
(not live-as-you-type).

### `MemTagList.svelte` — left sidebar navigation

Independently loads its own data on mount (`/_api/tag/list` for all tag counts,
`/_api/prefs` for saved views). Renders: "🆕 New" (`/`), "📦 Archive" (`/tag/*`), the
user's saved Views (⭐️), then all tags (with counts and an `iconForTag` emoji),
showing only the first 30 by default with a "More.." expander.

### `MoreMem.svelte` — pagination footer

Trivial: a "More" button when `moreAvailable`, else "That's it." text.

### `OrganizeView.svelte` — duplicate-finder utility (behind `/organize`)

Loads **all** mems for the user, sorts by normalized URL then `addedMs`, and computes
`duplicateMems` — mems sharing the same URL. Renders a "Duplicated" list, an "All"
list, and a side panel showing the full `MemView` for whichever mem is selected.

**This component has several apparent bugs**, documented here as-is since this is a
snapshot of the current implementation, not a recommendation:
- `findDuplicatedMems` assigns `duplicateMems = duplicatedMems`, but `duplicatedMems`
  is never defined anywhere in the file.
- References `MemAnnotateResponse` and `MemPhoto` types without importing either.
- The URL-normalization regex is a literal string (`"^http[s]?://"`), not a real
  `RegExp`, so the intended scheme-stripping is a no-op.
- `archiveMem`/`seenMem`/`unarchiveMem` reference `listOptions`/`searchQuery`, which
  are never defined in this component (only `filter` exists) — looks like code
  copy-pasted from `MainView.svelte` without being adapted.
- It is not linked from primary navigation (`+layout.svelte`) or `MemTagList`, and
  likely does not function correctly as currently written.

### `SignIn.svelte` — Firebase auth widget

Rendered in the root layout header. Subscribes once to Firebase's
`onAuthStateChanged`, writing the result into `$sharedUser`. Shows "Signed in as
{email}" + Sign out when authenticated, or email/password inputs + Sign In when not.
This is the sole gatekeeper for the app — every other component's data loading is
gated on `$sharedUser` being truthy.

## `src/lib/components/ui/` — shadcn/ui-style component library

A bespoke Tailwind + `tailwind-variants` component set (Svelte 5 idioms, `data-slot`
attributes), providing the building blocks used throughout `src/lib/svelte/`:

| Component | Notes |
|---|---|
| Badge | `Badge` + `badgeVariants` |
| Button | variants `default/outline/secondary/ghost/destructive/link`, sizes `default/xs/sm/lg/icon/…`; renders `<a>` if `href` given |
| Collapsible | Root/Trigger/Content — used by `MemListFilters` |
| Input | Used by `MemSearchBox`, `/prefs`, `MemView`'s URL popover |
| Label | Present in the library, not used in explored pages (`SignIn` uses plain `<label>`) |
| Popover | Root/Trigger/Content/etc. — used by `MemView`'s URL editor |
| Select | Full Radix-style primitive; not currently used (native `<select>` is used instead in `MemListFilters`) |
| Separator | Present, not observed in active use |
| Sonner | Wraps `svelte-sonner`'s `Toaster`, mounted once in the root layout; used for success/error feedback |
| Textarea | Standard styled textarea (distinct from the third-party auto-resizing textarea used by `MemView`, at `src/lib/thirdparty/autoresize-textarea/`) |

## Client-side state management patterns

1. **Global Svelte stores for auth/session state** — `src/lib/firebase-shared.ts`
   defines `sharedFirebaseApp` and `sharedUser` (`writable` stores), imported directly
   (not via context) by nearly every component that needs the current user or makes
   an authenticated API call. No `setContext`/`getContext` usage was found.
2. **URL as the source of truth for filter/view state** — `MainView` derives its
   `MemListOptions` from the route's `filter` param; changing a filter navigates via
   `goto()` to a new `/tag/...` URL rather than mutating a store, keeping filter state
   shareable/bookmarkable.
3. **Svelte 5 runes mixed with legacy shims** — components use `$state`/`$props`
   (Svelte 5 runes) for local state, but several (`MainView`, `MemView`,
   `OrganizeView`, `/prefs`, `/mem/[memId]`) still import `run` (and occasionally
   `preventDefault`, `createBubbler`) from `svelte/legacy` to emulate old-style
   reactive `$:` statements — a partial Svelte-4-to-5 migration state. `MemAdd.svelte`
   is fully rune-idiomatic with no legacy imports.
4. **Callback props instead of events/dispatchers** — all parent/child communication
   uses plain callback props (`onarchive`, `onnoteChanged`, etc.) rather than
   `createEventDispatcher` or DOM CustomEvents, consistent with Svelte 5's
   recommended pattern.
5. **No centralized mem-list store** — each view (`MainView`, `OrganizeView`, the
   single-mem page) independently fetches and holds its own local `Mem[]` state and
   manages optimistic in-place updates itself (the `updateVisibleMems` pattern is
   duplicated near-verbatim between `MainView` and `OrganizeView`).
6. **Debounce/race-guarding for autocomplete** — `MemAdd` uses a manually
   incremented `fetchSequence` counter to discard stale async tag-suggestion
   responses, rather than a store or `AbortController`.
