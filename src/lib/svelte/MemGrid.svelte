<script lang="ts">
  import type { Mem } from "$lib/common/mems";

  import MemTile from "./MemTile.svelte";

  interface Props {
    mems?: Mem[];
    listTags?: string[];
    onrequestEdit?: (data: { mem: Mem }) => void;
    onarchive?: (data: { mem: Mem }) => void;
    onunarchive?: (data: { mem: Mem }) => void;
    onseen?: (data: { mem: Mem }) => void;
    ondelete?: (data: { mem: Mem }) => void;
  }

  let {
    mems = [],
    listTags = [],
    onrequestEdit,
    onarchive,
    onunarchive,
    onseen,
    ondelete
  }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-x-4 gap-y-6 px-4 py-4 sm:grid-cols-3 md:px-6 lg:grid-cols-4">
  {#each mems as mem, index (mem._id)}
    <div class="animate-rise-in" style={`animation-delay: ${Math.min(index, 10) * 55}ms`}>
      <MemTile
        {mem}
        {listTags}
        {onrequestEdit}
        {onarchive}
        {onunarchive}
        {onseen}
        {ondelete}
      />
    </div>
  {/each}
</div>
