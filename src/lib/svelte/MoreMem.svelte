<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";

  interface Props {
    moreAvailable?: boolean;
    onloadMore?: () => void;
  }

  let { moreAvailable = false, onloadMore }: Props = $props();

  function loadMoreDidClick() {
    onloadMore?.();
  }
</script>

<div class="m-1 flex w-full flex-row justify-between">
  {#if moreAvailable}
    <Button onclick={loadMoreDidClick} class="my-4">More</Button>
  {:else}
    <div>That's it.</div>
  {/if}
</div>
