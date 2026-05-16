<script lang="ts">
  import type { PageData } from "./$types";
  import type { Mem } from "$lib/common/mems";
  import { orderBy } from "lodash-es";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let mems: Mem[] = $derived(orderBy(data.mems, ["url"], ["asc"]));

  
</script>

<div>
  {#each mems as mem}
    <div>{mem.url}</div>
  {/each}
</div>
