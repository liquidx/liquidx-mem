<script lang="ts">
  // @ts-ignore
  import { page } from "$app/stores";
  import type { Mem } from "$lib/common/mems";
  import { sharedUser } from "$lib/firebase-shared";
  import { getMem } from "$lib/mem.client";
  import MemView from "$lib/svelte/MemView.svelte";
  import { onMount } from "svelte";

  let mem: Mem | undefined = $state();

  onMount(() => {
    let memId = $page.params.memId;
    loadMem(memId);
  });

  const loadMem = async (memId: string) => {
    if ($sharedUser && memId) {
      mem = await getMem(memId, $sharedUser);
    }
  };

  $effect(() => {
    if ($sharedUser && $page.params.memId) {
      let memId = $page.params.memId;
      loadMem(memId);
    }
  });
</script>

<svelte:head>
  <title>#mem</title>
</svelte:head>

{#if mem}
  <div class="mx-4 mt-[22px] w-full max-w-[640px] border border-hairline md:mx-6">
    <MemView {mem} />
  </div>
{/if}
