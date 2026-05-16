<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";

  const dispatch = createEventDispatcher();
  interface Props {
    moreAvailable?: boolean;
  }

  let { moreAvailable = false }: Props = $props();

  function loadMoreDidClick() {
    dispatch("loadMore");
  }
</script>

<div class="m-1 flex w-full flex-row justify-between">
  {#if moreAvailable}
    <Button on:click={loadMoreDidClick} class="my-4">More</Button>
  {:else}
    <div>That's it.</div>
  {/if}
</div>
