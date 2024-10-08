<script lang="ts">
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

  export let filter: string = "";
  export let showTags = true;

  let pageSize = 30;
  let visiblePages = 1;
  let mems: Mem[] = [];
  let moreMemsAvailable = true;
  let viewTags: TagListItem[] = [];
  let searchQuery: string = "";
  let listOptions: MemListOptions = {
    matchAllTags: [],
    matchAnyTags: [],
    onlyArchived: false,
    onlyNew: true,
    order: "newest"
  };

  $: {
    listOptions = listOptionsByString(filter);
  }

  $: {
    if ($sharedUser) {
      loadMems(listOptions, searchQuery, false);
      loadFilters(listOptions);
    }
  }

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

  const annotateMem = async (e: CustomEvent) => {
    toast("Annotating...");
    let mem: Mem = e.detail.mem;
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

  const deleteMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    console.log("deleteMem", mem);
    if (mem && $sharedUser) {
      const deleteMemId = await memModifiers.deleteMem(mem, $sharedUser);
      if (deleteMemId) {
        mems = mems.filter((mem) => mem._id !== deleteMemId);
      }
    }
  };

  const removePhotoFromMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    let photo: MemPhoto = e.detail.photo;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.removePhotoFromMem(mem, photo, $sharedUser);
      console.log("removePhotoFromMem", updatedMem);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const archiveMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    console.log("archiveMem");
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const seenMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    console.log("seenMem");
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.seenMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const unarchiveMem = async (e: CustomEvent) => {
    const mem: Mem = e.detail.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
      if (updatedMem) {
        loadMems(listOptions, searchQuery, false);
      }
    }
  };

  const updateNoteForMem = async (e: CustomEvent) => {
    const mem: Mem = e.detail.mem;
    const text = e.detail.text;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "note", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateTitleForMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    let text = e.detail.text;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "title", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateUrlForMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    let text = e.detail.url;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "url", text, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const updateDescriptionForMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    let text = e.detail.text;
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

  const uploadFilesForMem = async (e: CustomEvent) => {
    let mem: Mem = e.detail.mem;
    let files = e.detail.files;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.uploadFilesForMem(mem, files, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const memDidAdd = (e: CustomEvent) => {
    //const mem = e.detail.mem;
    loadMems(listOptions, searchQuery, false);
  };

  const tagDidClick = (e: CustomEvent) => {
    const tag = e.detail.tag;
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

  const searchQueryDidChange = (e: CustomEvent) => {
    const query = e.detail.query;
    searchQuery = query;
    console.log("searchQueryDidChange", query);
  };

  const sortOrderDidChange = (e: CustomEvent) => {
    const order = e.detail;
    listOptions.order = order;
    listOptions = listOptions;
    console.log("sortOrderDidChange", order);
  };
</script>

<svelte:head>
  <title>#mem</title>
</svelte:head>

<div class="flex w-full flex-col overflow-x-hidden md:flex-row">
  {#if showTags}
    <section class="md:my-4">
      <MemSearchBox on:searchQueryDidChange={searchQueryDidChange} />
      <MemTagList currentTagFilters={listOptions} />
    </section>
  {/if}
  <main class="max-w-screen flex-grow p-2 md:max-w-xl">
    <MemAdd on:memDidAdd={memDidAdd} />
    {#if viewTags && viewTags.length > 0}
      <MemListFilters
        tags={viewTags}
        {listOptions}
        on:tagDidClick={tagDidClick}
        on:sortOrderDidChange={sortOrderDidChange}
      />
    {/if}
    <MemList
      {mems}
      on:annotate={annotateMem}
      on:archive={archiveMem}
      on:unarchive={unarchiveMem}
      on:delete={deleteMem}
      on:descriptionChanged={updateDescriptionForMem}
      on:noteChanged={updateNoteForMem}
      on:titleChanged={updateTitleForMem}
      on:fileUpload={uploadFilesForMem}
      on:seen={seenMem}
      on:removePhoto={removePhotoFromMem}
      on:urlChanged={updateUrlForMem}
    />
    <MoreMem moreAvailable={moreMemsAvailable} on:loadMore={loadMore} />
  </main>
</div>
