<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount } from "svelte";
  // @ts-ignore
  import { page } from "$app/stores";

  import type { Mem } from "$lib/common/mems";
  import MemView from "$lib/svelte/MemView.svelte";
  import { sharedUser } from "$lib/firebase-shared";
  import { getMem } from "$lib/mem.client";

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
  run(() => {
    if ($sharedUser && $page.params.memId) {
      let memId = $page.params.memId;
      loadMem(memId);
    }
  });
</script>

{#if mem}
  <div class="max-w-[600px]">
    <MemView {mem} />
  </div>
{/if}
