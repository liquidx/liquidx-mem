# Minimal-list decrypt-braille load-in — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make minimal-density mem titles materialize out of braille-glyph noise on initial load and on switching into minimal density, replacing the plain rise-in.

**Architecture:** A pure, unit-tested helper (`decryptText.ts`) produces per-character "cells" for a given elapsed time. A self-contained `DecryptText.svelte` component runs one `requestAnimationFrame` loop per title, driven by a `run` timestamp prop that changes only on the two intended triggers. `MainView` owns the `run` timestamp; `MemList` threads it plus a per-row stagger `delay` into `MemView`, which swaps the plain minimal title for `DecryptText` and fades its metadata in once the title resolves.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Tailwind CSS, Vitest (node env, pure-logic tests).

## Global Constraints

- Dark-only app; design tokens already exist — use `text-content` (`--color-content` = `#e6e6ea`) for locked chars and `text-tertiary` (`--color-tertiary` = `#7a7a84`) for unlocked chars. Introduce no new colors.
- Effect applies to **minimal density only**. Full and images densities are untouched.
- Triggers: initial minimal mount **with content** and switching **into** minimal density. NOT on infinite-scroll appends, search/filter refetches, or inline edits.
- `prefers-reduced-motion: reduce` → no scramble; title and metadata appear immediately (no rise-in, no movement).
- Zero horizontal layout shift: each character sits in a fixed `1ch` inline-block cell.
- Timing (single source of truth in `decryptText.ts`): `ROW_STAGGER_MS = 30`, `ROW_CAP = 12`, `MS_PER_CHAR = 9`, `GLYPH_REROLL_MS = 14`, `MAX_RUN_MS = 2200`.

## File Structure

- Create `src/lib/svelte/decryptText.ts` — glyph set, timing constants, pure `scrambleFrame` / `isResolved` helpers.
- Create `src/lib/svelte/decryptText.test.ts` — Vitest unit tests for the helpers.
- Create `src/lib/svelte/DecryptText.svelte` — the rAF-driven scramble component.
- Modify `src/lib/svelte/MemView.svelte` — minimal title branch uses `DecryptText`; metadata fades in after resolve; new `run` / `rowDelay` props.
- Modify `src/lib/svelte/MemList.svelte` — thread `run`; compute `rowDelay`; drop `animate-rise-in` for minimal only.
- Modify `src/lib/svelte/MainView.svelte` — own `minimalRun` timestamp + arming effect; pass `run` to `MemList`.

---

### Task 1: Pure scramble helper + tests

**Files:**
- Create: `src/lib/svelte/decryptText.ts`
- Test: `src/lib/svelte/decryptText.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BRAILLE_GLYPHS: string`
  - `ROW_STAGGER_MS`, `ROW_CAP`, `MS_PER_CHAR`, `GLYPH_REROLL_MS`, `MAX_RUN_MS: number`
  - `interface Cell { ch: string; locked: boolean }`
  - `scrambleFrame(text: string, elapsed: number, rng: () => number, msPerChar?: number): Cell[]`
  - `isResolved(text: string, elapsed: number, msPerChar?: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/svelte/decryptText.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scrambleFrame, isResolved, BRAILLE_GLYPHS } from "./decryptText";

// Deterministic rng that always picks the first glyph.
const firstGlyph = () => 0;

describe("scrambleFrame", () => {
  it("scrambles every non-space char before any lock-in (elapsed <= 0)", () => {
    const cells = scrambleFrame("ab c", 0, firstGlyph);
    expect(cells.map((c) => c.locked)).toEqual([false, false, true, false]);
    // spaces are preserved and marked locked
    expect(cells[2]).toEqual({ ch: " ", locked: true });
    // non-space unlocked chars show a braille glyph, not the original
    expect(cells[0].ch).toBe(BRAILLE_GLYPHS[0]);
    expect(cells[0].ch).not.toBe("a");
  });

  it("locks characters left-to-right as elapsed grows", () => {
    // msPerChar = 9 → at elapsed 20ms, floor(20/9) = 2 chars locked
    const cells = scrambleFrame("abcd", 20, firstGlyph);
    expect(cells.map((c) => c.locked)).toEqual([true, true, false, false]);
    expect(cells.slice(0, 2).map((c) => c.ch)).toEqual(["a", "b"]);
  });

  it("returns the exact original text once fully elapsed", () => {
    const cells = scrambleFrame("abcd", 1000, firstGlyph);
    expect(cells.map((c) => c.ch).join("")).toBe("abcd");
    expect(cells.every((c) => c.locked)).toBe(true);
  });
});

describe("isResolved", () => {
  it("is false mid-scramble and true once every char is locked", () => {
    expect(isResolved("abcd", 20)).toBe(false);
    expect(isResolved("abcd", 4 * 9)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/svelte/decryptText.test.ts`
Expected: FAIL — `Failed to resolve import "./decryptText"` / functions not defined.

- [ ] **Step 3: Write the helper**

Create `src/lib/svelte/decryptText.ts`:

```ts
// Braille glyph set (U+2800 block) used for the "decrypt" scramble noise.
export const BRAILLE_GLYPHS = "⠁⠃⠋⠙⠓⠛⠞⠟⠥⠧⠭⠯⠷⠿⠮⠾⠫⠻⠺⠵";

// Timing — single source of truth for the whole effect.
export const ROW_STAGGER_MS = 30; // per-row start offset
export const ROW_CAP = 12; // rows beyond this start together
export const MS_PER_CHAR = 9; // left-to-right lock-in speed
export const GLYPH_REROLL_MS = 14; // random-glyph repaint cadence
export const MAX_RUN_MS = 2200; // hard stop safety cap

export interface Cell {
  ch: string;
  locked: boolean;
}

/**
 * Compute the per-character frame for a title at a given elapsed time.
 * `elapsed` is milliseconds since THIS row's scramble started (i.e. already
 * has the per-row delay subtracted). `rng` returns [0,1); inject for tests.
 */
export function scrambleFrame(
  text: string,
  elapsed: number,
  rng: () => number,
  msPerChar: number = MS_PER_CHAR
): Cell[] {
  const lockedCount = Math.floor(elapsed / msPerChar);
  return Array.from(text).map((ch, i) => {
    if (ch === " ") return { ch: " ", locked: true };
    if (i < lockedCount) return { ch, locked: true };
    const glyph = BRAILLE_GLYPHS[Math.floor(rng() * BRAILLE_GLYPHS.length)];
    return { ch: glyph, locked: false };
  });
}

/** True once every non-space character has locked in. */
export function isResolved(
  text: string,
  elapsed: number,
  msPerChar: number = MS_PER_CHAR
): boolean {
  return Math.floor(elapsed / msPerChar) >= Array.from(text).length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/svelte/decryptText.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/svelte/decryptText.ts src/lib/svelte/decryptText.test.ts
git commit -m "Add pure decrypt-braille scramble helper with tests"
```

---

### Task 2: `DecryptText` component

**Files:**
- Create: `src/lib/svelte/DecryptText.svelte`

**Interfaces:**
- Consumes: `scrambleFrame`, `isResolved`, `MS_PER_CHAR`, `GLYPH_REROLL_MS`, `MAX_RUN_MS`, `type Cell` from `./decryptText`.
- Produces: a component with props
  `{ text: string; delay?: number; run: number; class?: string; onresolved?: () => void }`.
  - `run` is a start timestamp (`Date.now()`); the animation (re)starts whenever `run` changes to a new non-zero value. `run === 0` or a `run` already older than `MAX_RUN_MS` at (re)start renders final text immediately.
  - `onresolved` fires once the title has fully locked (or immediately in the no-animation cases).

- [ ] **Step 1: Write the component**

Create `src/lib/svelte/DecryptText.svelte`:

```svelte
<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    scrambleFrame,
    isResolved,
    MS_PER_CHAR,
    GLYPH_REROLL_MS,
    MAX_RUN_MS,
    type Cell
  } from "./decryptText";

  interface Props {
    text: string;
    delay?: number;
    run: number;
    class?: string;
    onresolved?: () => void;
  }

  let { text, delay = 0, run, class: className = "", onresolved }: Props = $props();

  const reduceMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const finalCells = (t: string): Cell[] => Array.from(t).map((ch) => ({ ch, locked: true }));

  let cells = $state<Cell[]>(finalCells(text));
  let frame = 0;
  let lastRoll = 0;

  const stop = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const resolveNow = () => {
    stop();
    cells = finalCells(text);
    onresolved?.();
  };

  const start = (runAt: number) => {
    stop();
    // No animation: full density (run 0), reduced motion, or an append that
    // mounts long after the run started.
    if (!runAt || reduceMotion || Date.now() - runAt > MAX_RUN_MS) {
      resolveNow();
      return;
    }
    lastRoll = 0;
    const tick = () => {
      const elapsed = Date.now() - runAt - delay;
      if (isResolved(text, elapsed) || Date.now() - runAt > MAX_RUN_MS) {
        resolveNow();
        return;
      }
      const now = Date.now();
      if (now - lastRoll >= GLYPH_REROLL_MS) {
        cells = scrambleFrame(text, elapsed, Math.random);
        lastRoll = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };

  // Re-run whenever `run` changes (density switch / initial content arrival).
  // text/delay are stable per row, so restarts only happen on the two triggers.
  $effect(() => {
    run;
    start(run);
  });

  onDestroy(stop);
</script>

<span class={className}
  >{#each cells as cell}<span
      class="inline-block w-[1ch] overflow-hidden align-bottom"
      class:text-content={cell.locked}
      class:text-tertiary={!cell.locked}>{cell.ch}</span
    >{/each}</span
>
```

Note on whitespace: the `{#each}` and cell spans are written without gaps between tags so no stray whitespace is injected between the fixed `1ch` cells.

- [ ] **Step 2: Type-check**

Run: `pnpm run check`
Expected: no new errors referencing `DecryptText.svelte`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/svelte/DecryptText.svelte
git commit -m "Add DecryptText component with per-title rAF scramble loop"
```

---

### Task 3: Wire `DecryptText` into the minimal `MemView` title

**Files:**
- Modify: `src/lib/svelte/MemView.svelte` (Props block ~17-49; minimal title branch ~418-435)

**Interfaces:**
- Consumes: `DecryptText` (Task 2).
- Produces: `MemView` now accepts `run?: number` and `rowDelay?: number` props (both default 0) — `MemList` (Task 4) supplies them.

- [ ] **Step 1: Import `DecryptText` and add props**

In `src/lib/svelte/MemView.svelte`, add the import near the other component imports (after line 6's `svelte` import group / alongside existing imports):

```ts
  import DecryptText from "./DecryptText.svelte";
```

Add two fields to the `Props` interface (after `editing?: boolean;`, line 21):

```ts
    run?: number;
    rowDelay?: number;
```

Add them to the destructured `$props()` (after `editing = false,`, line 38):

```ts
    run = 0,
    rowDelay = 0,
```

- [ ] **Step 2: Add resolve state + metadata visibility**

After the `unseen` derived (line 63), add:

```ts
  // Track which `run` the title finished decrypting for. Metadata is visible
  // when the current run has resolved (or when there is no active run at all —
  // full density / reduced motion). Comparing against `run` is race-free: a new
  // run makes `resolvedRun !== run` automatically, so no reset effect is needed.
  let resolvedRun = $state(0);
  const metaVisible = $derived(density !== "minimal" || !run || resolvedRun === run);
```

- [ ] **Step 3: Swap the minimal title + fade metadata**

Replace the minimal title/metadata block (current lines 419-434):

```svelte
      <div class="text-[12px] text-content md:text-[13px]">
        {#if mem.url}
          <a href={mem.url} target="_blank" rel="noreferrer" class="hover:underline">
            {displayTitle}
          </a>
        {:else}
          {displayTitle}
        {/if}
        {#if density === "minimal" && displayDomain}
          <span class="ml-1 text-[10px] text-faint">{displayDomain}</span>
        {/if}
        {#if mem.tags && mem.tags.length > 0}
          <span class="ml-1 whitespace-nowrap text-[10px] text-accent-muted">
            {mem.tags.join(" ")}
          </span>
        {/if}
      </div>
```

with:

```svelte
      <div class="text-[12px] text-content md:text-[13px]">
        {#if mem.url}
          <a href={mem.url} target="_blank" rel="noreferrer" class="hover:underline">
            {#if density === "minimal" && run}
              <DecryptText
                text={displayTitle}
                {run}
                delay={rowDelay}
                onresolved={() => (resolvedRun = run)}
              />
            {:else}
              {displayTitle}
            {/if}
          </a>
        {:else if density === "minimal" && run}
          <DecryptText
            text={displayTitle}
            {run}
            delay={rowDelay}
            onresolved={() => (resolvedRun = run)}
          />
        {:else}
          {displayTitle}
        {/if}
        {#if density === "minimal" && displayDomain}
          <span
            class="ml-1 text-[10px] text-faint transition-opacity duration-200"
            style={`opacity:${metaVisible ? 1 : 0}`}>{displayDomain}</span
          >
        {/if}
        {#if mem.tags && mem.tags.length > 0}
          <span
            class="ml-1 whitespace-nowrap text-[10px] text-accent-muted transition-opacity duration-200"
            style={density === "minimal" ? `opacity:${metaVisible ? 1 : 0}` : ""}
          >
            {mem.tags.join(" ")}
          </span>
        {/if}
      </div>
```

- [ ] **Step 4: Fade the unseen dot in minimal**

Replace the unseen dot block (current lines 411-415):

```svelte
      {#if unseen}
        <span
          class="block h-2 w-2 rounded-full bg-accent-strong shadow-[0_0_8px_rgba(217,142,82,.55)]"
        ></span>
      {/if}
```

with:

```svelte
      {#if unseen}
        <span
          class="block h-2 w-2 rounded-full bg-accent-strong shadow-[0_0_8px_rgba(217,142,82,.55)] transition-opacity duration-200"
          style={density === "minimal" ? `opacity:${metaVisible ? 1 : 0}` : ""}
        ></span>
      {/if}
```

- [ ] **Step 5: Type-check**

Run: `pnpm run check`
Expected: no new errors in `MemView.svelte`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/svelte/MemView.svelte
git commit -m "Render minimal MemView title via DecryptText, fade metadata after resolve"
```

---

### Task 4: Thread `run` and per-row `delay` through `MemList`

**Files:**
- Modify: `src/lib/svelte/MemList.svelte` (Props ~7-39; each-loop ~42-63)

**Interfaces:**
- Consumes: `ROW_STAGGER_MS`, `ROW_CAP` from `./decryptText`; `MemView`'s `run` / `rowDelay` props (Task 3).
- Produces: `MemList` now accepts `run?: number` (default 0) — `MainView` (Task 5) supplies it.

- [ ] **Step 1: Import timing constants + add `run` prop**

In `src/lib/svelte/MemList.svelte`, add after the existing imports (line 5):

```ts
  import { ROW_STAGGER_MS, ROW_CAP } from "./decryptText";
```

Add `run?: number;` to the `Props` interface (after `density?: ...`, line 9) and `run = 0,` to the destructured props (after `density = "full",`, line 26).

- [ ] **Step 2: Drop rise-in for minimal and pass run/delay**

Replace the wrapper `<div>` and `MemView` opening (current lines 42-48):

```svelte
<div class={cn(density === "full" && "divide-y divide-white/[.05]")}>
  {#each mems as mem, index (mem._id)}
    <div class="animate-rise-in" style={`animation-delay: ${Math.min(index, 10) * 60}ms`}>
      <MemView
        {mem}
        {density}
        {listTags}
```

with:

```svelte
<div class={cn(density === "full" && "divide-y divide-white/[.05]")}>
  {#each mems as mem, index (mem._id)}
    <div
      class={cn(density !== "minimal" && "animate-rise-in")}
      style={density === "minimal"
        ? undefined
        : `animation-delay: ${Math.min(index, 10) * 60}ms`}
    >
      <MemView
        {mem}
        {density}
        {run}
        rowDelay={Math.min(index, ROW_CAP) * ROW_STAGGER_MS}
        {listTags}
```

(The rest of the `MemView` prop list and the closing tags are unchanged.)

- [ ] **Step 3: Type-check**

Run: `pnpm run check`
Expected: no new errors in `MemList.svelte`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/svelte/MemList.svelte
git commit -m "Thread decrypt run timestamp and row stagger through MemList"
```

---

### Task 5: Own the `run` trigger in `MainView`

**Files:**
- Modify: `src/lib/svelte/MainView.svelte` (state near line 43; setDensity ~120-123; MemList usage ~526-529)

**Interfaces:**
- Consumes: `MemList`'s `run` prop (Task 4).
- Produces: nothing downstream.

- [ ] **Step 1: Add `minimalRun` state + arming effect**

In `src/lib/svelte/MainView.svelte`, near the `density` state (line 43), add:

```ts
  // Timestamp that (re)starts the minimal-list decrypt animation. It bumps once
  // when the minimal list first has content and once each time the user switches
  // INTO minimal density — never on appends, search refetches, or edits.
  let minimalRun = $state(0);
  let minimalArmed = false;
  $effect(() => {
    const hasContent = mems.length > 0;
    if (density === "minimal") {
      if (hasContent && !minimalArmed) {
        minimalRun = Date.now();
        minimalArmed = true;
      }
    } else {
      minimalArmed = false;
    }
  });
```

(Place this after `mems` is declared so the effect can read it. If `mems` is declared later in the file, move this block below that declaration.)

- [ ] **Step 2: Re-arm on explicit density switch into minimal**

The effect above already fires when `density` flips to `"minimal"` while content is present. No change to `setDensity` is required — leave lines 120-123 as-is. (Switching away sets `minimalArmed = false`; switching back with content bumps `minimalRun`.)

- [ ] **Step 3: Pass `run` to `MemList`**

In the non-images branch, add `run={minimalRun}` to the `MemList` props (after `{density}`, line 528):

```svelte
      <MemList
        {mems}
        {density}
        run={minimalRun}
        {listTags}
        {editingId}
```

(The remaining `MemList` props are unchanged.)

- [ ] **Step 4: Type-check + full unit suite**

Run: `pnpm run check`
Expected: no new errors.

Run: `pnpm exec vitest run`
Expected: PASS, including the 4 `decryptText` tests.

- [ ] **Step 5: Manual browser verification**

Start an agent dev server on a dedicated port (per CLAUDE.md):

```bash
pnpm exec vite --port 5199 --strictPort
```

Open `http://localhost:5199`, sign in, then verify:
1. Switch to **minimal** density → titles decrypt out of braille noise with a visible top-to-bottom row stagger; domain/tags/unseen-dot fade in just after each title resolves.
2. No horizontal jitter while glyphs re-roll (fixed `1ch` cells).
3. Titles are still clickable links to the target URL.
4. Scroll to trigger infinite-scroll append → appended rows appear **without** scrambling.
5. Switch full → minimal again → the effect replays.
6. Type in search / apply a tag filter while in minimal → results appear **without** a fresh full-list scramble.
7. Enable OS "reduce motion" and reload → minimal titles appear instantly, no scramble, no movement.

Stop the server (leave the developer's 12000 untouched):

```bash
lsof -ti :5199 | xargs kill
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/svelte/MainView.svelte
git commit -m "Trigger minimal-list decrypt run on initial content and density switch"
```

---

## Self-Review notes

- **Spec coverage:** minimal-only (Tasks 3-5 gate on `density === "minimal"`); triggers = initial content + density switch (Task 5 arming effect); no append/search/edit re-trigger (append rows mount past `MAX_RUN_MS`, armed flag blocks search/edit); reduced motion (Task 2 `reduceMotion`); 1ch cells (Task 2 markup); metadata fade after resolve (Task 3); timing constants centralized (Task 1). All covered.
- **Type consistency:** `run: number` and `rowDelay: number` used identically across `DecryptText` (`delay`), `MemView`, `MemList`; `scrambleFrame`/`isResolved` signatures match between Task 1 definition and Task 2 usage.
- **No new colors:** only `text-content` / `text-tertiary` tokens used.
