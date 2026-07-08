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
