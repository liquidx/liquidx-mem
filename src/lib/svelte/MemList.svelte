<script lang="ts">
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { cn } from "$lib/utils";

  import MemView from "./MemView.svelte";
  import { ROW_STAGGER_MS, ROW_CAP } from "./decryptText";

  interface Props {
    mems?: Mem[];
    density?: "full" | "minimal";
    run?: number;
    listTags?: string[];
    editingId?: string | null;
    onrequestEdit?: (data: { mem: Mem }) => void;
    oncloseEdit?: () => void;
    onedit?: (data: { mem: Mem; updates: Partial<Mem> }) => void;
    onannotate?: (data: { mem: Mem }) => void;
    onarchive?: (data: { mem: Mem }) => void;
    ondelete?: (data: { mem: Mem }) => void;
    onseen?: (data: { mem: Mem }) => void;
    onfileUpload?: (data: { mem: Mem; files: FileList }) => void;
    onunarchive?: (data: { mem: Mem }) => void;
    onremovePhoto?: (data: { mem: Mem; photo: MemPhoto | undefined; photoIndex: number }) => void;
  }

  let {
    mems = [],
    density = "full",
    run = 0,
    listTags = [],
    editingId = null,
    onrequestEdit,
    oncloseEdit,
    onedit,
    onannotate,
    onarchive,
    ondelete,
    onseen,
    onfileUpload,
    onunarchive,
    onremovePhoto
  }: Props = $props();
</script>

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
        editing={editingId !== null && editingId === mem._id}
        {onrequestEdit}
        {oncloseEdit}
        {onedit}
        {onannotate}
        {onarchive}
        {ondelete}
        {onseen}
        {onfileUpload}
        {onunarchive}
        {onremovePhoto}
      />
    </div>
  {/each}
</div>
