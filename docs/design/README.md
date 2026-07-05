# Handoff: Mem — Command Feed Redesign (option 3a)

## Overview
A redesign of **Mem**, a bookmarking / read-it-later web app, restyled and restructured under the **Wanderloop design system** (terminal/HUD aesthetic: monospace type, near-black surfaces, hairline structure, one orange accent). The chosen direction is **3a "Command · Refined"**: no sidebar — a single command-driven column with an omni-bar, view tabs, an expandable tag selector, a full ⇄ minimal density switch, and in-place row editing. Targets **desktop web and mobile web**.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, etc.) using its established patterns and libraries — or, if no environment exists yet, choose the most appropriate web framework and implement the designs there.

Open `Mem Redesign.dc.html` in a browser. It is a design-exploration canvas containing several iteration turns; **the spec below covers only option `3a` (anchor `#3a`, the topmost-but-one section: "COMMAND · REFINED")** — desktop frame (940px) and mobile frame (390px). Everything in 3a is interactive: tabs, tag filter, tag expander, density toggle, and the row-flip editor. Other sections (1a–2a, 4a–4c, Preferences) are earlier explorations kept for reference; 2a additionally demonstrates the drag-to-attach-image behavior described under Interactions.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-perfectly.

## Screens / Views

### 1. Desktop feed (reference frame 940×800; content column is fluid, cap ~1440px centered)
Vertical structure, top to bottom:

1. **Top bar** — flex row, space-between, padding `14px 24px`, bottom hairline `rgba(255,255,255,.06)`.
   - Left: brand `#mem` — 14px, weight 600, accent `#D98E52`.
   - Right: `alastair@liquidx.net · sign out` — 10px, `#54545E`, letter-spacing .04em.
2. **Omni-bar** — the primary control. Container padding `22px 24px 0`.
   - Field: background `#0C0C10`, 1px border `rgba(255,255,255,.14)`, padding `15px 16px`, **no border radius** (nothing in this system is rounded).
   - Contents: accent `>` prompt (weight 600) · placeholder `search, paste a url, or type #tag to filter` (14px `#8A8A94`) · blinking block caret (8×17px, accent, 1s steps) · right-aligned hint `⏎ add` (10px `#45454E`, tracking .1em).
   - Behavior: free text = search filter; a pasted URL + ⏎ = add bookmark; `#tag` token = tag filter.
3. **Control strip** — flex row, gap 16px, margin-top 14px.
   - **View tabs**: bordered segmented group (`rgba(255,255,255,.12)`), cells `new / reading / archive`, padding `7px 14px`, 11px `#C9C9D0`, each with its count in `#54545E`; internal 1px dividers. Active cell = 2px accent bar along the bottom edge.
   - **Sort**: `newest ▾` text control, 11px `#9A9AA4`.
   - Spacer (flex 1).
   - **Active filter chip** (only when a tag filter is set): `#look ✕` — 11px accent text, 1px border `rgba(217,142,82,.4)`, padding `4px 9px`; click clears.
   - **Density segmented**: cells `full / minimal`, same construction as tabs; active cell gets accent tint fill `rgba(217,142,82,.1)` + 2px accent bottom bar. This is a persistent user preference.
4. **Tag row** — flex, gap 8px, margin-top 12px. First ~8 tags as chips: `emoji #name` — 10px `#8A8A94`, 1px border `rgba(255,255,255,.1)`, padding `4px 9px`, nowrap; hover border `rgba(255,255,255,.28)`; active chip = 2px accent underline inset 6px. Last element: expander button `+28 tags ▾` (count = remaining tags) — accent text, border `rgba(217,142,82,.35)`; toggles to `less ▴`.
5. **Expanded tag selector** (when open) — margin-top 10px; 1px outer border `rgba(255,255,255,.1)`; CSS grid `repeat(5, 1fr)` with 1px gaps showing through a `rgba(255,255,255,.06)` grid background (cell backgrounds `#08080A`); **max-height 238px, vertical scroll**. Cell: `emoji · #name · count`, padding `6px 10px`, 10px type, name `#9A9AA4` (ellipsized), count `#54545E`; hover bg `#0C0C10`; active cell = 2px accent left rule. Clicking any tag sets/clears the filter (toggle).
6. **Feed** — fills remaining height, scrolls; 1px top hairline `rgba(255,255,255,.06)`, margin-top 16px.

**Feed row — full density** (padding `13px 24px`; separated by 1px hairlines `rgba(255,255,255,.05)` *between* rows):
- Grid of: date column (44px, 10px `#54545E`, `MM-DD`) · unseen dot column (8px accent circle with glow `0 0 8px rgba(217,142,82,.55)` only if unseen; empty space otherwise) · main column (flex 1) · edit pencil (13px icon, `#54545E`, hover accent).
- Main column: title (13px `#E6E6EA`) with tags inline after it (10px `#A06B42`) → URL line (11px `#A06B42`; scheme stripped, trailing slash removed, truncated to 48 chars + `…`) → note/description (12px `#9A9AA4`, line-height 1.6, max-width 560px; omitted when empty) → thumbnail (max-width 420px × 120px; 1px hairline border; **no caption**) when the bookmark has an image → action row (10px `#7A7A84`, gap 16px): `archive · annotate · upload · delete` (delete in muted red, hover `#D06A6A`).
- Row hover: background `rgba(255,255,255,.025)`.

**Feed row — minimal density**:
- **No separators between rows.**
- One line: date column · dot · title, followed by the **domain in muted text** (10px `#54545E`, e.g. `webgpufundamentals.org`), then tags (10px `#A06B42`). Nothing else (no url line, note, thumbnail, or actions). Same hover + pencil.

**Row-flip editor** (click the row's ✎): the row is replaced in place by a form — the feed expands, nothing floats or is covered.
- Container: padding `16px 24px 18px`, background tint `rgba(217,142,82,.045)`, 2px accent rule on the left edge.
- Header row: `EDITING` label (9px, tracking .16em, accent) · spacer · hint `⏎ done` (9px `#45454E`) · **✕ dismiss button top-right** (13px icon, `#54545E`, hover accent) — exactly where the ✎ was.
- Fields: two-column grid (gap 12px) TITLE + URL, then NOTE (textarea, 48px min), then TAGS — labels 9px uppercase tracking .14em `#54545E`; inputs background `#08080A`, 1px border `rgba(255,255,255,.16)`, focus border accent, mono font, no radius. Title input 12px `#E6E6EA`; url/tags 11px `#A06B42`; note 11px `#9A9AA4`.
- **No save button.** Edits apply as the user types (or on dismiss — implementation's choice, but the UI must not show a save affordance). `✕` or `⏎` dismisses; `esc` discards changes. Title field autofocuses.
- Tags are edited as a space-separated string of `#tokens`; parse by splitting on whitespace/commas and stripping leading `#`.

### 2. Mobile feed (reference frame 390px wide)
Same system, collapsed to one column:
1. Top bar: `#mem` left, theme glyph right; bottom hairline.
2. Omni-bar (placeholder `search / paste / #tag`), padding 12px.
3. Row: view tabs segmented (flex 1) + density segmented (`full / min`) side by side, margin-top 12px.
4. Tag chips: first ~8, wrapping flex row (not horizontally scrolled), + `+28 ▾` expander → expanded selector = 2-column grid, max-height 200px, vertical scroll, cells padding `5px 9px`, 10px type.
5. Feed rows: date column 34px (9px type) · title 12px with muted domain after it in minimal · tags line 10px `#A06B42` · note (full density only). Minimal = no separators; full = hairline separators.
- Row editing on mobile was not mocked; recommended: same row-flip pattern, fields stacked single-column.

## Interactions & Behavior
- **Tabs** filter items by list (`new` / `reading` / `archive`); counts always visible.
- **Tag filter**: clicking any tag (chip or selector cell) toggles it as the single active filter; active state shown on the chip/cell + a dismissible filter chip in the control strip. Filtering applies within the current tab. Empty result state: `no items · clear filter` (12px `#54545E`, accent link).
- **Tag expander**: `+N tags ▾` ⇄ `less ▴`; selector is vertically scrollable; expanding pushes the feed down (no overlay).
- **Density**: `full ⇄ minimal` as described; persist per user.
- **Row-flip edit**: as specced above; only one row editable at a time; opening another row's editor dismisses (commits) the previous one.
- **Image attachments** (behavior demonstrated in section 2a of the design file): dragging an image file over a row shows a 1px dashed accent overlay `RELEASE TO ATTACH IMAGE` (uppercase, 11px, tracking .1em, tint `rgba(217,142,82,.07)`); dropping attaches it as the row's thumbnail. Thumbnails carry an 18×18 `✕` button (top-right, dark bg `rgba(8,8,10,.85)`, red hairline border) to delete. Rows without an image reserve blank space in full density (no placeholder box, no drop hint).
- **Hover** (desktop only): rows/nav lift to `rgba(255,255,255,.025–.04)`; never a color change. Keyboard focus = 1px accent outline/border.
- **Motion**: sharp and mechanical, no bounce. Caret blink `1s steps(1)`. Optional on-load: rows fade up 7px, staggered 60ms (`riseIn .5s ease`). Editor open/close can be instant.

## State Management
- `items[]`: `{ id, title, url, tags[], note, addedAt, list: 'new'|'reading'|'archive', unseen: bool, thumbnail: url|null }`
- `view`: active tab; `filterTag`: string|null; `query`: omni-bar text
- `density`: `'full'|'minimal'` (persisted, per user)
- `tagsExpanded`: bool
- `editingId`: id|null + draft fields (title, url, note, tagsString); commit on dismiss/⏎, discard on esc
- `dragOverId`: id|null (attach affordance)
- Derived: visible items = items ∩ tab ∩ tag filter ∩ query; per-tag counts for the selector.

## Design Tokens
Colors (dark theme):
- `base` `#08080A` — app background; `surface` `#0C0C10` — inputs, popovers
- `accent` `#D98E52` = `oklch(0.73 0.13 55)` — Mem's brand orange retuned to the Wanderloop family lightness/chroma. Used sparingly: prompt, active markers, unseen dots, EDITING state, primary affordances. Glow: `0 0 8px rgba(217,142,82,.55)`; tint fill: `rgba(217,142,82,.1)`
- `accent-muted` `#A06B42` — urls, tag text on rows
- Text: primary `#E6E6EA` · secondary `#9A9AA4` · tertiary `#7A7A84` · faint `#54545E` · dim `#45454E` · UI `#C9C9D0`
- `danger` `#D06A6A` (delete)
- Hairlines: `rgba(255,255,255,.05)` faint · `.09–.12` default · `.14–.16` strong
Typography:
- Single family: **Spline Sans Mono** (Google Fonts), fallback `ui-monospace, monospace`; weights 400/600
- Scale: 9px micro-labels (tracking .14–.16em, UPPERCASE) · 10px meta/chips · 11px body-small/controls · 12–13px content · 14px omni-bar · 15px brand
- Casing rule: UPPERCASE + tracking for labels/states; lowercase for values, names, controls
Other:
- **Border radius: 0 everywhere** (only the 8–9px status dots are circles)
- No drop shadows except popover (`0 16px 48px rgba(0,0,0,.7)`) and accent glows
- Spacing rhythm: 24px horizontal page padding (16px mobile), 12–16px vertical gaps, 13px row padding

## Assets
- **Icons**: Tabler Icons (MIT), stroke 1.5, square linecap, miter joins. Used: inbox/book/archive (tabs, if iconified), pencil (edit), ✕ (dismiss/delete). Icons are restricted to navigation + inline edit affordances; all other states are drawn with dots, ticks, and text.
- **Tag emoji** are user data (each tag has an emoji), rendered as text — no image assets.
- Thumbnails are user-attached images; no placeholder art is shipped (blank space is reserved instead).

## Files
- `Mem Redesign.dc.html` — the interactive design canvas. **Section `#3a` is the spec**; section `#2a` demonstrates drag-to-attach; sections `#1a/#1b/#1c/#4a/#4b/#4c` and the Preferences frames are earlier explorations for context.
- `DESIGN_SYSTEM.md` — the Wanderloop design-system guideline (Mem edition): principles, tokens, type, iconography rules, component recipes, motion, platform rules. Follow it for anything not covered by the screen spec above.
- `Wanderloop Design System.dc.html` — visual reference for the family design system (note: it shows the flagship's purple accent; Mem substitutes `#D98E52`).
- `support.js` — runtime for the design files only (not part of the design; do not port).
- `screenshots/` — captures of 3a:
  - `01-3a.png` desktop, full density
  - `02-3a.png` desktop, minimal density + expanded tag selector
  - `03-3a.png` desktop, row-flip editor open
  - `04-3a.png` mobile, full density
  - `05-3a.png` mobile, expanded tag selector
