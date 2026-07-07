# Minimal list decrypt-braille load-in — Design

Date: 2026-07-08
Status: Approved (design)

## Goal

Apply the "decrypt / braille" text-materialization effect from
`docs/design/mem-5d-decrypt-braille.html` to the **minimal** density of the mem
list. When the minimal list first mounts, or when the user switches into minimal
density, each row's title resolves out of braille-glyph noise instead of the
current plain opacity/translate rise-in.

## Reference effect (what we are reproducing)

From the mockup:

- Each title starts as braille noise drawn from the glyph set
  `⠁⠃⠋⠙⠓⠛⠞⠟⠥⠧⠭⠯⠷⠿⠮⠾⠫⠻⠺⠵`.
- Rows stagger in: row `i` starts at `~33 + i*30` ms.
- Within a title, characters "lock in" left-to-right at ~9 ms/char. Characters
  not yet locked keep re-rolling to a random braille glyph (~14 ms cadence).
- Spaces are preserved (never scrambled).
- Locked characters render at full content color (`#e6e6ea`); un-locked
  characters render dimmed (`~#7a7a84`, the app's `text-tertiary`).
- Each character sits in a fixed `1ch` inline-block cell so glyph re-rolling
  causes **zero layout shift**.
- Once a title is fully locked, that row's secondary content (domain, tags,
  unseen dot) fades in over ~85 ms.
- The whole run self-terminates after ~2.2 s.

The app's design tokens already match the mockup exactly (`--text-primary
#e6e6ea`, `--text-faint #54545e`, `--accent-hue #d98e52`,
`--accent-muted-hue #a06b42`), so no new colors are introduced.

## Scope

- **Density:** minimal only. Full and images densities are unchanged.
- **Triggers:** initial mount of the minimal list **and** switching into minimal
  density from full/images. NOT on infinite-scroll appends, search/filter
  refetches, or inline edits (those appear normally).
- **Reduced motion:** when `prefers-reduced-motion: reduce`, skip the scramble
  entirely and fall back to the existing `animate-rise-in` (or instant text).

## Approach: reusable `DecryptText` component (approach A)

A small, self-contained Svelte component owns the entire effect. It runs a single
`requestAnimationFrame` loop per title (not a shared global interval), which is
lighter than the reference's per-tick full re-render and keeps animation state
out of `MemView`.

### `src/lib/svelte/DecryptText.svelte`

Props:

| Prop        | Type      | Purpose                                                        |
| ----------- | --------- | ------------------------------------------------------------- |
| `text`      | `string`  | The final resolved title text.                                |
| `delay`     | `number`  | Start offset in ms (the per-row stagger).                     |
| `runKey`    | `unknown` | Changing this value re-triggers the animation (see below).    |
| `class`     | `string`  | Passthrough classes for the wrapper span.                     |

Behavior:

- Renders `text` as a sequence of `<span>` cells, each `inline-block`,
  `width: 1ch`, `overflow: hidden`, `vertical-align: bottom`.
- The animation starts only when `runKey` **changes** to a value this instance
  has not yet consumed. A fresh mount whose `runKey` already equals the
  last-consumed run renders final text immediately (this is what keeps
  infinite-scroll appends from scrambling — see "Appends" below).
- When it starts, run an rAF loop:
  - `elapsed = now - start`; per-character locked count is
    `floor((elapsed - delay) / MS_PER_CHAR)` (clamped at 0). `delay` already
    carries the per-row stagger, so no separate base offset is needed.
  - Locked chars show the real character at content color; unlocked non-space
    chars show a random braille glyph at the dimmed color; spaces stay spaces.
  - Loop ends when every char is locked (or a hard `MAX_RUN_MS` cap is hit),
    then renders the final text and cancels the frame.
- `prefers-reduced-motion: reduce` (checked via `window.matchMedia`): render
  final `text` immediately, no loop.
- `onDestroy` cancels any pending frame.
- Timing constants (module-level): `MS_PER_CHAR = 9`, `GLYPH_REROLL_MS = 14`
  (the rAF loop only repaints a cell when this cadence elapses, to keep the
  re-roll from tying to raw frame rate), `MAX_RUN_MS = 2200`.

Emits an `onresolved` callback (or exposes a bindable `resolved` boolean) so the
row can fade its metadata in after the title locks.

### `MemView.svelte` (minimal branch only)

- In the minimal title block (`MemView.svelte:418-435`), when
  `density === "minimal"` and animation is active, render the title through
  `<DecryptText text={displayTitle} delay={rowDelay} runKey={runKey} />`
  instead of the plain `{displayTitle}`. The full-density branch is untouched.
- The domain / tags / unseen-dot get a class that fades opacity 0→1 keyed off the
  title's `resolved` state (mirrors the reference's `secO`). Before resolve they
  sit at opacity 0; after resolve they transition in over ~0.25 s.
- The `<a href={mem.url}>` wrapper stays; `DecryptText` renders inside it so the
  link target is unchanged and the resolved title is a normal clickable link.

### `MemList.svelte`

- Currently every row is wrapped in
  `<div class="animate-rise-in" style="animation-delay: …">`
  (`MemList.svelte:44`). For minimal density we drop `animate-rise-in` (the
  decrypt effect replaces it) and instead pass a `rowDelay` and a shared `runKey`
  down to `MemView`.
- `rowDelay = Math.min(index, ROW_CAP) * ROW_STAGGER_MS` with
  `ROW_STAGGER_MS = 30`, `ROW_CAP = 12` (rows past the cap start together, so a
  long list doesn't take seconds to finish).
- Full density keeps `animate-rise-in` exactly as today.

### Re-trigger mechanism (`runKey`)

The animation must replay on "initial mount + density switch" but NOT on every
reactive update (scroll append, edit, hover).

- `MainView.svelte` owns density (`density` state, `setDensity`,
  `MainView.svelte:43/121`). It also owns the mems list.
- Introduce a `minimalRunKey` derived value that changes only when:
  (a) the list transitions **into** `minimal` density, or (b) the minimal list
  first mounts with mems. Simplest implementation: a counter incremented inside
  `setDensity` when the new value is `minimal`, plus initial assignment when the
  first page of mems arrives while already in minimal.
- `runKey` is threaded `MainView → MemList → MemView → DecryptText`. Because it
  only changes on those two events, appends and edits re-render rows without
  restarting the scramble (already-mounted rows keep their resolved text; newly
  appended rows mount already-resolved because their `delay`/loop compares
  against a start time in the past — see "Appends" below).

### Appends during infinite scroll

New rows appended after the initial run should NOT scramble. `runKey` does not
change on append, so — per the start rule above — an appended row mounts with a
`runKey` equal to the run already consumed globally and therefore renders its
final text immediately. The loop restarts only when `runKey` changes, which
happens only on the two intended triggers (initial minimal mount, switch into
minimal).

## Timing constants (single source of truth)

Defined at the top of `DecryptText.svelte` / passed from `MemList.svelte`:

```
ROW_STAGGER_MS = 30    // per-row start offset
ROW_CAP        = 12    // rows beyond this start together
MS_PER_CHAR    = 9     // left-to-right lock-in speed
GLYPH_REROLL_MS= 14    // random-glyph repaint cadence
MAX_RUN_MS     = 2200  // hard stop safety cap
SECONDARY_FADE = 250   // ms metadata opacity transition after resolve
```

## Non-goals / YAGNI

- No effect on full or images density.
- No user-facing setting/toggle for the effect.
- No "replay" button (the mockup's replay is a demo affordance).
- No scramble on the metadata itself — it only fades in.
- No virtualization changes.

## Testing

- **Unit (Vitest):** a pure helper `scrambleFrame(text, elapsedForRow, rng)`
  extracted from the component, tested for: (1) `elapsed <= 0` → all non-space
  chars replaced, spaces preserved; (2) partial elapsed → correct left-to-right
  locked prefix; (3) `elapsed` past full lock → returns exact original text;
  (4) reduced-motion path returns original text. Injecting `rng` keeps it
  deterministic.
- **Manual / browser:** load minimal list → titles decrypt with row stagger;
  switch full→minimal → replays; scroll to append → appended rows do NOT
  scramble; toggle OS reduced-motion → falls back to rise-in; confirm no
  horizontal jitter (1ch cells) and that titles remain clickable links.

## Files touched

- `src/lib/svelte/DecryptText.svelte` (new)
- `src/lib/svelte/decryptText.ts` (new — pure `scrambleFrame` helper + glyph set)
- `src/lib/svelte/decryptText.test.ts` (new)
- `src/lib/svelte/MemView.svelte` (minimal title branch + metadata fade)
- `src/lib/svelte/MemList.svelte` (pass `rowDelay` / `runKey`, drop rise-in for minimal)
- `src/lib/svelte/MainView.svelte` (own `minimalRunKey`, thread it down)
