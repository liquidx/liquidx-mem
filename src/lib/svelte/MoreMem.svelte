<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';

  const dispatch = createEventDispatcher();
  export let moreAvailable = false;

  function loadMoreDidClick() {
    dispatch('loadMore');
  }
</script>

<div class="w-full flex flex-row justify-between m-1">
  {#if moreAvailable}
    <Button on:click={loadMoreDidClick} class="my-4">More</Button>
  {:else}
    <div>That's it.</div>
  {/if}
</div>
