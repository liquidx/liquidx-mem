<script lang="ts">
  import { run } from 'svelte/legacy';

  import type { Mem, MemPhoto } from "$lib/common/mems";
  import MemView from "./MemView.svelte";

  interface Props {
    mems?: Mem[];
    onannotate?: (data: { mem: Mem }) => void;
    onarchive?: (data: { mem: Mem }) => void;
    ondelete?: (data: { mem: Mem }) => void;
    onseen?: (data: { mem: Mem }) => void;
    ondescriptionChanged?: (data: { mem: Mem; text: string }) => void;
    onfileUpload?: (data: { mem: Mem; files: FileList }) => void;
    onnoteChanged?: (data: { mem: Mem; text: string }) => void;
    ontitleChanged?: (data: { mem: Mem; text: string }) => void;
    onunarchive?: (data: { mem: Mem }) => void;
    onremovePhoto?: (data: { mem: Mem; photo: MemPhoto | undefined }) => void;
    onurlChanged?: (data: { mem: Mem; url: string }) => void;
  }

  let {
    mems = [],
    onannotate,
    onarchive,
    ondelete,
    onseen,
    ondescriptionChanged,
    onfileUpload,
    onnoteChanged,
    ontitleChanged,
    onunarchive,
    onremovePhoto,
    onurlChanged
  }: Props = $props();

  run(() => {
    if (mems) {
      console.log("MemList: redrawing mems");
    }
  });
</script>

<div>
  {#each mems as mem (mem._id)}
    <MemView
      {mem}
      {onannotate}
      {onarchive}
      {ondelete}
      {onseen}
      {ondescriptionChanged}
      {onfileUpload}
      {onnoteChanged}
      {ontitleChanged}
      {onunarchive}
      {onremovePhoto}
      {onurlChanged}
    />
  {/each}
</div>
