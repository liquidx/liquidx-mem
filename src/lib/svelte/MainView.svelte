<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { type MemListOptions, listOptionsByString, stringFromListOptions } from "$lib/filter";
  import { sharedUser } from "$lib/firebase-shared";
  import * as memModifiers from "$lib/mem.client";
  import type { MemViewCounts } from "$lib/mem.client";
  import type { MemAnnotateResponse, MemListRequest } from "$lib/request.types";
  import MemList from "$lib/svelte/MemList.svelte";
  import MoreMem from "$lib/svelte/MoreMem.svelte";
  import OmniBar from "$lib/svelte/OmniBar.svelte";
  import TagRow from "$lib/svelte/TagRow.svelte";
  import type { TagListItem } from "$lib/tags.types";
  import { cn } from "$lib/utils";
  import ArrowDownWideNarrowIcon from "@lucide/svelte/icons/arrow-down-wide-narrow";
  import ArrowUpNarrowWideIcon from "@lucide/svelte/icons/arrow-up-narrow-wide";
  import axios from "axios";
  import { onMount, untrack } from "svelte";
  import { toast } from "svelte-sonner";

  type Density = "full" | "minimal";

  interface Props {
    filter?: string;
    showTags?: boolean;
  }

  let { filter = "", showTags = true }: Props = $props();

  let pageSize = 30;
  let visiblePages = 1;
  let mems: Mem[] = $state([]);
  let moreMemsAvailable = $state(true);
  let viewTags: TagListItem[] = $state([]);
  let searchQuery: string = $state("");
  let counts: MemViewCounts | null = $state(null);
  let density: Density = $state("full");
  let editingId: string | null = $state(null);
  // Sort order is UI state that persists across route/filter changes, so it
  // lives outside the route-derived listOptions (mutating a $derived isn't
  // reactive, which is why the button used to not flip).
  let order: MemListOptions["order"] = $state("newest");

  let listOptions: MemListOptions = $derived(listOptionsByString(filter));

  const readingTag = "#look";

  const isArchiveView = $derived(listOptions.onlyArchived);
  const isReadingView = $derived(
    !listOptions.onlyArchived &&
      listOptions.matchAllTags.length === 1 &&
      listOptions.matchAllTags[0] === readingTag
  );
  const isNewView = $derived(!isArchiveView && listOptions.matchAllTags.length === 0);
  const activeTag = $derived(
    !listOptions.onlyArchived && listOptions.matchAllTags.length === 1
      ? listOptions.matchAllTags[0]
      : null
  );
  const filterChipTag = $derived(activeTag && activeTag !== readingTag ? activeTag : null);

  // The active tag filter as a "#a #b" string, mirrored into the OmniBar so a
  // /tag/... URL keeps its tags visible in the box. Archive (#*) isn't a real
  // tag query, so it stays blank.
  const omniQuery = $derived.by(() => {
    if (listOptions.onlyArchived) {
      return "";
    }
    const tags = listOptions.matchAllTags.length
      ? listOptions.matchAllTags
      : listOptions.matchAnyTags;
    return tags.join(" ");
  });

  const feedHref = $derived.by(() => {
    const primaryTag = listOptions.matchAllTags[0];
    if (primaryTag && $sharedUser) {
      const cleanedTag = primaryTag.startsWith("#") ? primaryTag.slice(1) : primaryTag;
      return `/feed/${$sharedUser.uid}/${encodeURIComponent(cleanedTag)}.xml`;
    }
    return null;
  });

  onMount(() => {
    const savedDensity = localStorage.getItem("mem-density");
    if (savedDensity === "full" || savedDensity === "minimal") {
      density = savedDensity;
    }
  });

  const setDensity = (value: Density) => {
    density = value;
    localStorage.setItem("mem-density", value);
  };

  const loadFilters = async (tagFilters: MemListOptions) => {
    if (!$sharedUser) {
      return;
    }

    const filterString = stringFromListOptions(tagFilters);
    const tagsForView: TagListItem[] = await memModifiers.getTags($sharedUser, filterString);
    if (tagsForView) {
      viewTags = tagsForView;
    }
  };

  const loadCounts = async () => {
    if (!$sharedUser) {
      return;
    }
    const result = await memModifiers.getMemCounts($sharedUser);
    if (result) {
      counts = result;
    }
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
      order,
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
        moreMemsAvailable = data.mems.length >= pageSize;
      }
    }
  };

  const reload = () => {
    visiblePages = 1;
    loadMems(listOptions, searchQuery, false);
    loadFilters(listOptions);
    loadCounts();
  };

  const loadMore = () => {
    visiblePages += 1;
    loadMems(listOptions, searchQuery, true);
  };

  const updateVisibleMems = (mems_: Mem[], updatedMem: Mem, updatedMemId: string | undefined) => {
    let didChange = false;
    let replacedMemId = updatedMemId || updatedMem._id;
    const replacedMems = mems_.map((mem) => {
      if (mem._id === replacedMemId) {
        didChange = true;
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
    toast("annotating…");
    let mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const response: MemAnnotateResponse | undefined = await memModifiers.annotateMem(
        mem,
        $sharedUser
      );
      if (!response) {
        toast.error("failed to annotate");
      }
      if (response) {
        updateVisibleMems(mems, response.mem, response.mem._id);
        toast.success("done");
      }
    }
  };

  const deleteMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const deleteMemId = await memModifiers.deleteMem(mem, $sharedUser);
      if (deleteMemId) {
        mems = mems.filter((mem) => mem._id !== deleteMemId);
        loadCounts();
      }
    }
  };

  const removePhotoFromMem = async (data: { mem: Mem; photo: MemPhoto }) => {
    let mem: Mem = data.mem;
    let photo: MemPhoto = data.photo;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.removePhotoFromMem(mem, photo, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
      }
    }
  };

  const archiveMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
      if (updatedMem) {
        reload();
      }
    }
  };

  const seenMem = async (data: { mem: Mem }) => {
    let mem: Mem = data.mem;
    if (mem && $sharedUser) {
      // "seen" strips all reading-list tags (#look/#next/#try), matching the
      // Reading List's mark-as-read behavior.
      const updatedMem = await memModifiers.markReadMem(mem, $sharedUser);
      if (updatedMem) {
        reload();
      }
    }
  };

  const unarchiveMem = async (data: { mem: Mem }) => {
    const mem: Mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
      if (updatedMem) {
        reload();
      }
    }
  };

  const editMem = async (data: { mem: Mem; updates: Partial<Mem> }) => {
    const { mem, updates } = data;
    if (Object.keys(updates).length === 0) {
      return;
    }
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updateMemProperties(mem, updates, $sharedUser);
      if (updatedMem) {
        updateVisibleMems(mems, updatedMem, mem._id);
        if (updates.tags) {
          loadFilters(listOptions);
          loadCounts();
        }
      } else {
        toast.error("failed to save");
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
    reload();
  };

  const tagDidToggle = (tag: string) => {
    const cleaned = tag.startsWith("#") ? tag.slice(1) : tag;
    if (activeTag === tag) {
      goto("/");
    } else {
      goto(`/tag/${encodeURIComponent(cleaned)}`);
    }
  };

  // Multiple tags map to a match-all filter: /tag/a+b (bare tags joined by "+",
  // matching stringFromListOptions/listOptionsByString).
  const applyTagFilter = (tags: string[]) => {
    const cleaned = tags
      .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag).trim())
      .filter(Boolean);
    if (cleaned.length === 0) {
      goto("/");
      return;
    }
    goto(`/tag/${cleaned.map(encodeURIComponent).join("+")}`);
  };

  const searchQueryDidChange = (data: { query: string }) => {
    if (searchQuery === data.query) {
      return;
    }
    searchQuery = data.query;
    visiblePages = 1;
    loadMems(listOptions, searchQuery, false);
  };

  const toggleSortOrder = () => {
    order = order === "newest" ? "oldest" : "newest";
    visiblePages = 1;
    loadMems(listOptions, searchQuery, false);
  };

  const requestEdit = (data: { mem: Mem }) => {
    editingId = data.mem._id ?? null;
  };

  const closeEdit = () => {
    editingId = null;
  };

  $effect(() => {
    // Reload whenever the user or the route filter changes.
    listOptions;
    if ($sharedUser) {
      untrack(() => reload());
    }
  });

  const densities: Density[] = ["full", "minimal"];

  const tabs = $derived([
    { key: "new", label: "new", count: counts?.new, active: isNewView, href: "/" },
    {
      key: "reading",
      label: "reading",
      count: counts?.reading,
      active: isReadingView,
      href: "/tag/look"
    },
    {
      key: "archive",
      label: "archive",
      count: counts?.archive,
      active: isArchiveView,
      href: "/tag/*"
    }
  ]);
</script>

<svelte:head>
  <title>#mem</title>
</svelte:head>

<div class="flex w-full flex-1 flex-col">
  <div class="px-4 pt-[22px] md:px-6">
    <OmniBar
      query={omniQuery}
      onmemDidAdd={memDidAdd}
      onsearch={searchQueryDidChange}
      ontagFilter={applyTagFilter}
    />

    <div class="mt-[14px] flex flex-row flex-wrap items-center gap-x-4 gap-y-3">
      <div class="flex flex-1 flex-row border border-white/[.12] md:flex-initial">
        {#each tabs as tab, i (tab.key)}
          <a
            href={tab.href}
            class={cn(
              "relative flex-1 whitespace-nowrap px-3 py-[7px] text-center text-[11px] text-ui md:flex-initial md:px-[14px]",
              i > 0 && "border-l border-white/[.12]"
            )}
          >
            {tab.label}
            {#if tab.count !== undefined}
              <span class="ml-1 text-faint">{tab.count}</span>
            {/if}
            {#if tab.active}
              <span class="absolute inset-x-0 bottom-0 h-[2px] bg-accent-strong"></span>
            {/if}
          </a>
        {/each}
      </div>

      <div class="hidden flex-1 md:block"></div>

      {#if filterChipTag}
        <button
          class="border border-accent-strong/40 px-[9px] py-1 text-[11px] text-accent-strong"
          onclick={() => goto("/")}
        >
          {filterChipTag} ✕
        </button>
      {/if}
    </div>

    {#if showTags}
      <TagRow tags={viewTags} {activeTag} ontagToggle={tagDidToggle} />
    {/if}

    <div class="mt-[14px] flex flex-row items-center gap-x-4">
      <div class="flex flex-row border border-white/[.12]">
        {#each densities as value, i (value)}
          <button
            class={cn(
              "relative px-3 py-[7px] text-[11px] text-ui md:px-[14px]",
              i > 0 && "border-l border-white/[.12]",
              density === value && "bg-accent-strong/10"
            )}
            onclick={() => setDensity(value)}
          >
            <span class="hidden md:inline">{value}</span>
            <span class="md:hidden">{value === "minimal" ? "min" : value}</span>
            {#if density === value}
              <span class="absolute inset-x-0 bottom-0 h-[2px] bg-accent-strong"></span>
            {/if}
          </button>
        {/each}
      </div>

      <button
        class="flex flex-row items-center gap-1.5 border border-white/[.12] px-3 py-[7px] text-[11px] text-ui md:px-[14px]"
        onclick={toggleSortOrder}
      >
        {#if order === "newest"}
          <ArrowDownWideNarrowIcon class="h-[13px] w-[13px]" />
        {:else}
          <ArrowUpNarrowWideIcon class="h-[13px] w-[13px]" />
        {/if}
        {order}
      </button>
    </div>
  </div>

  <main class="mt-4 flex-1 border-t border-white/[.06]">
    {#if mems.length === 0}
      <div class="px-4 py-10 text-center text-[12px] text-faint md:px-6">
        no items
        {#if filterChipTag || searchQuery || isReadingView}
          ·
          <button class="text-accent-strong hover:underline" onclick={() => goto("/")}>
            clear filter
          </button>
        {/if}
      </div>
    {:else}
      <MemList
        {mems}
        {density}
        {editingId}
        onrequestEdit={requestEdit}
        oncloseEdit={closeEdit}
        onedit={editMem}
        onannotate={annotateMem}
        onarchive={archiveMem}
        onunarchive={unarchiveMem}
        ondelete={deleteMem}
        onfileUpload={uploadFilesForMem}
        onseen={seenMem}
        onremovePhoto={removePhotoFromMem}
      />
      <MoreMem moreAvailable={moreMemsAvailable} onloadMore={loadMore} />
    {/if}
    {#if feedHref}
      <div class="flex justify-end px-4 pb-6 md:px-6">
        <a
          class="text-[10px] tracking-[.04em] text-faint hover:text-accent-strong"
          href={feedHref}
          rel="alternate"
        >
          rss feed
        </a>
      </div>
    {/if}
  </main>
</div>
