<script lang="ts">
  import type { Mem } from "$lib/common/mems";
  import { sharedUser } from "$lib/firebase-shared";
  import * as memModifiers from "$lib/mem.client";
  import type { MemListRequest } from "$lib/request.types";
  import MemView from "$lib/svelte/MemView.svelte";
  import axios from "axios";
  import { orderBy } from "lodash-es";
  import { toast } from "svelte-sonner";
  import { run } from "svelte/legacy";

  interface Props {
    filter?: string;
  }

  let { filter = "" }: Props = $props();

  let selectedMem: Mem | undefined = $state();
  let mems: Mem[] = $state([]);

  let duplicateMems: Mem[] = $state([]);

  const findDuplicatedMems = (mems_: Mem[]) => {
    let memsByUrl = {};
    duplicateMems = [];
    mems_.forEach((mem) => {
      if (mem.url) {
        const prettyUrl = mem.url.replace("^http[s]?://", "");
        if (memsByUrl[prettyUrl]) {
          duplicateMems.push(memsByUrl[prettyUrl]);
          duplicateMems.push(mem);
        } else {
          memsByUrl[prettyUrl] = mem;
        }
      }
    });
    duplicateMems = duplicatedMems;
  };

  const loadMems = async (withFilter: string, append: boolean) => {
    if (!$sharedUser) {
      return;
    }

    const authToken = await $sharedUser.getIdToken();
    const headers = {
      Authorization: `Bearer ${authToken}`
    };
    const params: MemListRequest = {
      userId: $sharedUser.uid,
      all: true
    };

    if (withFilter) {
      params.matchAllTags = withFilter.split(",").map((tag) => `#${tag}`);
    }

    const result = await axios.post(`/_api/mem/list`, params, { headers });

    if (result.data && result.data.mems) {
      mems = orderBy(
        result.data.mems,
        [(m) => (m.url ? m.url.replace("^http[s]?://", "") : m.url), "addedMs"],
        ["asc", "desc"]
      );
    }

    findDuplicatedMems(mems);
  };

  const updateVisibleMems = (mems: Mem[], updatedMem: Mem) => {
    console.log(updatedMem);
    let replacedMems = mems.map((mem) => {
      if (mem._id === updatedMem._id) {
        return updatedMem;
      }
      return mem;
    });
    mems = replacedMems;
  };

  ////
  // Actions
  ////

  const annotateMem = async (data: { mem: Mem }) => {
    toast("Annotating...");
    let mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const response: MemAnnotateResponse | undefined = await memModifiers.annotateMem(
        mem,
        $sharedUser
      );
      if (!response) {
        toast.error("Failed to annotate...");
      }
      if (response) {
        updateVisibleMems(mems, response.mem, response.mem._id);
        toast.success("Done");
      }
    }
  };

  const deleteMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    console.log("deleteMem", mem);
    if (mem && $sharedUser) {
      const deleteMemId = await memModifiers.deleteMem(mem, $sharedUser);
      if (deleteMemId) {
        mems = mems.filter((mem) => mem._id !== deleteMemId);
      }
    }
  };

  const removePhotoFromMem = async (data: { mem: Mem; photo: MemPhoto }) => {
    let mem: Mem = data.mem;
    let photo: MemPhoto = data.photo;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.removePhotoFromMem(mem, photo, $sharedUser);
      console.log("removePhotoFromMem", updatedMem);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const archiveMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    console.log("archiveMem");
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const seenMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    console.log("seenMem");
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.seenMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const unarchiveMem = async (data: { mem: Mem }) => {
    const mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const updateNoteForMem = async (data: { mem: Mem; text: string }) => {
    const mem: Mem = data.mem;
    const text = data.text;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "note", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateTitleForMem = async (data: { mem: Mem; text: string }) => {
    let mem: Mem = data.mem;
    let text = data.text;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "title", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateUrlForMem = async (data: { mem: Mem; url: string }) => {
    let mem: Mem = data.mem;
    let text = data.url;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "url", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateDescriptionForMem = async (data: { mem: Mem; text: string }) => {
    let mem: Mem = data.mem;
    let text = data.text;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(
        mem,
        "description",
        text,
        $sharedUser
      );
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const uploadFilesForMem = async (data: { mem: Mem; files: FileList }) => {
    let mem: Mem = data.mem;
    let files = data.files;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.uploadFilesForMem(mem, files, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };
  run(() => {
    if ($sharedUser) {
      loadMems(filter, false);
    }
  });
</script>

<svelte:head>
  <title>#mem</title>
</svelte:head>

<div class="flex w-full flex-col overflow-x-hidden md:flex-row">
  <main class="max-w-full flex-grow p-2">
    <h1>Duplicated</h1>
    <div>
      {#each duplicateMems as mem}
        <div>
          <a href={mem.url} target="_blank">{mem.url}</a>
          <span class="text-secondary-foreground">
            (<button
              onclick={() => {
                selectedMem = mem;
              }}>{mem._id}</button
            >)
          </span>
        </div>
      {/each}
    </div>
    <h1>All</h1>
    <div>
      {#each mems as mem}
        <div>
          <a href={mem.url} target="_blank">{mem.url}</a>
          <span class="text-secondary-foreground">
            (<button
              onclick={() => {
                selectedMem = mem;
              }}>{mem._id}</button
            >)
          </span>
        </div>
      {/each}
    </div>
  </main>
  <div class="fixed right-4 top-4 w-[480px] p-2">
    {#if selectedMem}
      <MemView
        mem={selectedMem}
        onannotate={annotateMem}
        onarchive={archiveMem}
        onunarchive={unarchiveMem}
        ondelete={deleteMem}
        onfileUpload={uploadFilesForMem}
        onseen={seenMem}
        onremovePhoto={removePhotoFromMem}
      />
    {/if}
  </div>
</div>
