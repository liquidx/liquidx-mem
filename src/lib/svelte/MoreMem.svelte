<script lang="ts">
  interface Props {
    moreAvailable?: boolean;
    loading?: boolean;
    onloadMore?: () => void;
  }

  let { moreAvailable = false, loading = false, onloadMore }: Props = $props();

  // Infinite scroll: a zero-height sentinel at the bottom. When it scrolls
  // within rootMargin of the viewport the observer asks the parent to load the
  // next page. Loading is driven from the observer callback (not a reactive
  // effect) so it always acts on a fresh intersection reading rather than a
  // stale one. After each load settles we re-arm the observer, which delivers a
  // fresh reading: if the sentinel is still in view it loads again to fill the
  // viewport, otherwise it waits for the next scroll.
  let sentinel: HTMLDivElement | null = $state(null);
  let observer: IntersectionObserver | null = null;

  const maybeLoad = () => {
    if (moreAvailable && !loading) {
      onloadMore?.();
    }
  };

  $effect(() => {
    if (!sentinel) {
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          maybeLoad();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinel);
    return () => {
      observer?.disconnect();
      observer = null;
    };
  });

  // Re-arm once a load finishes so the observer re-checks against the grown DOM.
  $effect(() => {
    if (!loading && observer && sentinel) {
      observer.unobserve(sentinel);
      observer.observe(sentinel);
    }
  });
</script>

<div class="border-t border-white/[.05] px-4 py-6 md:px-6">
  <div bind:this={sentinel} aria-hidden="true"></div>
  {#if loading}
    <div class="text-[10px] tracking-[.1em] text-faint">loading…</div>
  {:else if !moreAvailable}
    <div class="text-[10px] tracking-[.1em] text-faint">· end ·</div>
  {/if}
</div>
