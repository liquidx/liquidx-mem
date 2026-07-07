# Image Grid View for MemList

## Goal

Add a third view mode, **images**, alongside the existing `full` and `minimal`
densities. It presents mems as a responsive grid of image tiles (a "wall of
images") rather than a vertical list of rows. Reference design:
`docs/design/mem-6a-image-grid.html`.

## Approach

New, lean components selected in `MainView` by density — `MemList`/`MemView`
are left untouched (avoids overloading them):

- `MainView` gains `"images"` as a third `Density` value and grid branch.
- `MemGrid.svelte` — responsive grid layout, renders one `MemTile` per mem.
- `MemTile.svelte` — a single tile: image (or text fallback), status square,
  caption, and hover action overlay.

## Data flow

- `MainView`: `Density = "full" | "minimal" | "images"`; add `"images"` to the
  `densities` array (toggle grows a third segment). Persist to `localStorage`
  as today.
- `<main>`: `{#if density === "images"} <MemGrid …/> {:else} <MemList …/> {/if}`.
  `MoreMem` (load-more) stays below both.
- `MemGrid` receives the same callbacks `MemList` gets (`onarchive`,
  `onunarchive`, `onseen`, `ondelete`, `onrequestEdit`, `listTags`, `editingId`)
  and forwards them to `MemTile`.

## `MemTile` anatomy

- **Image area**: fixed ~4:3 aspect ratio, subtle border. Image source resolved
  in priority **photos → media → og:image thumbnail**, reusing `MemView`'s URL
  logic (`getCachedStorageUrl` for cached paths, `mem.thumbnail.url` for og).
- **Text tile fallback**: when no image resolves, render a bordered box with the
  description/title/url text plus a faint `text only` marker.
- **Status square**: accent square, top-right, shown when the mem is **unseen**
  (`mem.tags` intersects `listTags`) — reuses `MemView`'s `unseen` derivation.
- **Caption** below the tile: title (click opens `mem.url` in a new tab), then
  `domain · date` via existing `displayDomain` / `displayDate` logic. Title
  clamps to 2 lines.
- **Hover overlay** actions: archive/unarchive, mark-seen (only when unseen),
  edit, delete. Delete is two-step (click → "confirm?") so a compact tile can't
  fire a destructive action by accident.

## Edit behavior

Clicking **edit** calls the existing `onrequestEdit({ mem })`, setting
`editingId` in `MainView`. When density is `"images"` and `editingId` is set,
`MainView` renders the full `MemView` (density `full`, `editing`) in a **modal
overlay** over the grid, wired to all existing handlers (`onedit`,
`onannotate`, `onfileUpload`, `onremovePhoto`, `oncloseEdit`). Closing clears
`editingId`. This reuses the whole editor rather than rebuilding it in a tile.

## Layout & motion

- Responsive columns via Tailwind: 2 (mobile) → 3 → 4 (wide).
- Staggered `animate-rise-in` per tile (capped delay), same pattern as `MemList`.
- Empty state handled by `MainView` as today (grid renders only when
  `mems.length > 0`).

## Edge cases

- Broken/failed image (`onerror`) → fall back to the text tile.
- Mem with no `url` → title `(untitled)`, no domain, tile still opens edit.
- Long titles clamp to 2 lines.

## Testing

- Unit-test the image-resolution helper (photos vs media vs thumbnail vs none).
- Unit-test the unseen/status logic.
