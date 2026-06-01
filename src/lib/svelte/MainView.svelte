<script lang="ts">
  import { run } from 'svelte/legacy';

  import axios from "axios";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";

  import { sharedUser } from "$lib/firebase-shared";
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import * as memModifiers from "$lib/mem.client";

  import MemList from "$lib/svelte/MemList.svelte";
  import MemAdd from "$lib/svelte/MemAdd.svelte";
  import MoreMem from "$lib/svelte/MoreMem.svelte";
  import MemTagList from "$lib/svelte/MemTagList.svelte";
  import type { MemAnnotateResponse, MemListRequest } from "$lib/request.types";
  import { stringFromListOptions, listOptionsByString, type MemListOptions } from "$lib/filter";
  import type { TagListItem } from "$lib/tags.types";
  import MemListFilters from "./MemListFilters.svelte";
  import MemSearchBox from "./MemSearchBox.svelte";

  interface Props {
    filter?: string;
    showTags?: boolean;
  }

  let { filter = "", showTags = true }: Props = $props();

  let pageSize = 30;
  let visiblePages = 1;
  let mems: Mem[] = $state([]);
  let moreMemsAvailable = true;
  let viewTags: TagListItem[] = $state([]);
  let searchQuery: string = $state("");
  let listOptions: MemListOptions = $state({
    matchAllTags: [],
    matchAnyTags: [],
    onlyArchived: false,
    onlyNew: true,
    order: "newest"
  });
  let feedHref: string | null = $state(null);




  const loadFilters = async (tagFilters: MemListOptions) => {
    if (!$sharedUser) {
      return;
    }

    const filterString = stringFromListOptions(tagFilters);
    const tagsForView: TagListItem[] = await memModifiers.getTags($sharedUser, filterString);
    if (tagsForView) {
      viewTags = tagsForView;
    }
    return [];
  };

  const loadMems = async (tagFilters: MemListOptions, searchQuery: string, append: boolean) => {
    if (!$sharedUser) {
      return;
    }

    const authToken = await $sharedUser.getIdToken();
    const headers = {
      Authorization: `Bearer ${authToken}`
    };
    const params: MemListRequest = {
      userId: $sharedUser.uid,
      isArchived: tagFilters.onlyArchived,
      order: tagFilters.order,
      matchAllTags: tagFilters.matchAllTags,
      matchAnyTags: tagFilters.matchAnyTags,
      searchQuery: searchQuery,
      pageSize: pageSize,
      page: visiblePages - 1
    };

    const result = await axios.post(`/_api/mem/list`, params, { headers });

    if (result.data) {
      const { data } = result;
      if (data.status == "OK" && data.mems) {
        if (append) {
          mems = [...mems, ...data.mems];
        } else {
          mems = data.mems;
        }
      }
    }
  };

  const loadMore = () => {
    visiblePages += 1;
    loadMems(listOptions, searchQuery, true);
    console.log("loadMore", visiblePages);
  };

  const updateVisibleMems = (mems_: Mem[], updatedMem: Mem, updatedMemId: string | undefined) => {
    console.log("updateVisibleMems", updatedMem);
    let didChange = false;
    let replacedMemId = updatedMemId || updatedMem._id;
    const replacedMems = mems_.map((mem) => {
      if (mem._id === replacedMemId) {
        didChange = true;
        console.log("didChange", mem._id, updatedMem);
        return updatedMem;
      }
      return mem;
    });

    if (didChange) {
      mems = replacedMems; // trigger reactivity
    }
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

  const memDidAdd = (_data: { mem: Mem }) => {
    loadMems(listOptions, searchQuery, false);
  };

  const tagDidClick = (tag: TagListItem) => {
    console.log("tagDidClick", tag, listOptions);

    // Toggle the tag in the filters
    if (listOptions.matchAllTags.includes(tag)) {
      listOptions.matchAllTags = listOptions.matchAllTags.filter((t) => t !== tag);
    } else {
      listOptions.matchAllTags.push(tag);
    }

    // Easiest way to update the tag filters is to nav to the right URL.
    let tagFiltersString = stringFromListOptions(listOptions);
    if (tagFiltersString) {
      goto(`/tag/${tagFiltersString}`);
    } else {
      goto("/");
    }
  };

  const searchQueryDidChange = (data: { query: string }) => {
    searchQuery = data.query;
    console.log("searchQueryDidChange", data.query);
  };

  const sortOrderDidChange = (order: string) => {
    listOptions.order = order;
    listOptions = listOptions;
    console.log("sortOrderDidChange", order);
  };
  run(() => {
    listOptions = listOptionsByString(filter);
  });
  run(() => {
    if ($sharedUser) {
      loadMems(listOptions, searchQuery, false);
      loadFilters(listOptions);
    }
  });
  run(() => {
    const allTags = listOptions.matchAllTags || [];
    const primaryTag = allTags[0];
    if (primaryTag && $sharedUser) {
      const cleanedTag = primaryTag.startsWith("#") ? primaryTag.slice(1) : primaryTag;
      feedHref = `/feed/${$sharedUser.uid}/${encodeURIComponent(cleanedTag)}.xml`;
    } else {
      feedHref = null;
    }
  });
</script>

<svelte:head>
  <title>#mem</title>
</svelte:head>

<div class="flex w-full flex-col overflow-x-hidden md:flex-row">
  {#if showTags}
    <section class="md:my-4">
      <MemSearchBox onsearchQueryDidChange={searchQueryDidChange} />
      <MemTagList currentTagFilters={listOptions} />
    </section>
  {/if}
  <main class="max-w-screen flex-grow p-2 md:max-w-xl">
    <MemAdd onmemDidAdd={memDidAdd} />
    {#if viewTags && viewTags.length > 0}
      <MemListFilters
        tags={viewTags}
        {listOptions}
        ontagDidClick={tagDidClick}
        onsortOrderDidChange={sortOrderDidChange}
      />
    {/if}
    <MemList
      {mems}
      onannotate={annotateMem}
      onarchive={archiveMem}
      onunarchive={unarchiveMem}
      ondelete={deleteMem}
      ondescriptionChanged={updateDescriptionForMem}
      onnoteChanged={updateNoteForMem}
      ontitleChanged={updateTitleForMem}
      onfileUpload={uploadFilesForMem}
      onseen={seenMem}
      onremovePhoto={removePhotoFromMem}
      onurlChanged={updateUrlForMem}
    />
    <MoreMem moreAvailable={moreMemsAvailable} onloadMore={loadMore} />
    {#if feedHref}
      <div class="mt-4 flex justify-end">
        <a class="text-sm text-primary hover:underline" href={feedHref} rel="alternate">Feed</a>
      </div>
    {/if}
  </main>
</div>
