<script lang="ts">
  import { goto } from "$app/navigation";
  import { type UserList, allListTags, listsForUser } from "$lib/common/lists";
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { type MemListOptions, listOptionsByString, stringFromListOptions } from "$lib/filter";
  import { sharedUser } from "$lib/firebase-shared";
  import * as memModifiers from "$lib/mem.client";
  import { getLists } from "$lib/mem.client";
  import type { MemViewCounts } from "$lib/mem.client";
  import type { MemAnnotateResponse, MemListRequest } from "$lib/request.types";
  import MemGrid from "$lib/svelte/MemGrid.svelte";
  import MemList from "$lib/svelte/MemList.svelte";
  import MemView from "$lib/svelte/MemView.svelte";
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

  type Density = "full" | "minimal" | "images";

  interface Props {
    filter?: string;
    showTags?: boolean;
  }

  let { filter = "", showTags = true }: Props = $props();

  let pageSize = 30;
  let visiblePages = 1;
  let mems: Mem[] = $state([]);
  let moreMemsAvailable = $state(true);
  // Guards infinite-scroll paging so overlapping fetches can't fire.
  let loading = $state(false);
  let viewTags: TagListItem[] = $state([]);
  let searchQuery: string = $state("");
  let counts: MemViewCounts | null = $state(null);
  let density: Density = $state("full");
  let editingId: string | null = $state(null);
  // Timestamp that (re)starts the minimal-list decrypt animation. It bumps once
  // when the minimal list first has content and once each time the user switches
  // INTO minimal density — never on appends, search refetches, or edits.
  let minimalRun = $state(0);
  let minimalArmed = false;
  $effect(() => {
    const hasContent = mems.length > 0;
    if (density === "minimal") {
      if (hasContent && !minimalArmed) {
        minimalRun = Date.now();
        minimalArmed = true;
      }
    } else {
      minimalArmed = false;
    }
  });
  // Sort order is UI state that persists across route/filter changes, so it
  // lives outside the route-derived listOptions (mutating a $derived isn't
  // reactive, which is why the button used to not flip).
  let order: MemListOptions["order"] = $state("newest");

  let listOptions: MemListOptions = $derived(listOptionsByString(filter));

  let lists: UserList[] = $state(listsForUser(null));

  const listTags = $derived(allListTags(lists));

  const activeFilterTags = $derived([...listOptions.matchAllTags, ...listOptions.matchAnyTags]);

  const sameTagSet = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const set = new Set(b);
    return a.every((tag) => set.has(tag));
  };

  const listHref = (list: UserList) =>
    `/tag/${list.tags
      .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag))
      .map(encodeURIComponent)
      .join(",")}`;

  const activeList = $derived(
    listOptions.onlyArchived
      ? null
      : (lists.find((list) => sameTagSet(activeFilterTags, list.tags)) ?? null)
  );

  // The tags currently applied as an AND (match-all) restrict, used to highlight
  // the active chips in TagRow. Archive (#*) and OR (match-any) views don't map
  // to togglable chips, so they highlight nothing.
  const activeTags = $derived(
    !listOptions.onlyArchived && listOptions.matchAnyTags.length === 0
      ? listOptions.matchAllTags
      : []
  );

  const isArchiveView = $derived(listOptions.onlyArchived);
  const isNewView = $derived(
    !isArchiveView && listOptions.matchAllTags.length === 0 && listOptions.matchAnyTags.length === 0
  );
  // Show a dismissable chip for an ad-hoc tag filter that is not one of the tabs.
  const filterChipTag = $derived(
    !isArchiveView && !activeList && activeFilterTags.length > 0 ? activeFilterTags.join(" ") : null
  );

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
    if (savedDensity === "full" || savedDensity === "minimal" || savedDensity === "images") {
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

  const loadLists = async () => {
    if (!$sharedUser) return;
    const saved = await getLists($sharedUser);
    lists = listsForUser(saved);
  };

  const loadMems = async (tagFilters: MemListOptions, searchQuery: string, append: boolean) => {
    if (!$sharedUser) {
      return;
    }

    // Set synchronously (before the first await) so the infinite-scroll effect
    // and loadMore see the guard immediately and can't kick off a second fetch.
    loading = true;
    try {
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
    } finally {
      loading = false;
    }
  };

  const reload = () => {
    visiblePages = 1;
    loadMems(listOptions, searchQuery, false);
    loadFilters(listOptions);
    loadCounts();
  };

  const loadMore = () => {
    if (loading || !moreMemsAvailable) {
      return;
    }
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

  const removePhotoFromMem = async (data: { mem: Mem; photo: MemPhoto; photoIndex: number }) => {
    let mem: Mem = data.mem;
    let photo: MemPhoto = data.photo;
    let photoIndex = data.photoIndex;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.removePhotoFromMem(mem, photo, photoIndex, $sharedUser);
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
      // "seen" strips the user's configured list tags server-side, so the mem
      // leaves every later list it belonged to.
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

  // Clicking a tag toggles it into the current match-all (AND) restrict rather
  // than replacing it: #look + click #map -> /tag/look+map. Clicking an active
  // tag removes just that tag; removing the last one returns to the new view.
  const tagDidToggle = (tag: string) => {
    const normalize = (t: string) => (t.startsWith("#") ? t : `#${t}`).toLowerCase();
    const clicked = normalize(tag);

    // Only combine within a plain tag view. Archive (*) and OR (match-any) views
    // don't compose with an AND restrict, so clicking a tag starts fresh there.
    const canCombine = !listOptions.onlyArchived && listOptions.matchAnyTags.length === 0;
    const current = canCombine ? listOptions.matchAllTags.map(normalize) : [];

    const next = current.includes(clicked)
      ? current.filter((t) => t !== clicked)
      : [...current, clicked];

    if (next.length === 0) {
      goto("/");
    } else {
      goto(`/tag/${next.map((t) => encodeURIComponent(t.slice(1))).join("+")}`);
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
      untrack(() => {
        loadLists();
        reload();
      });
    }
  });

  const densities: Density[] = ["full", "minimal", "images"];

  // In the images grid there is no inline editor, so edits open the full
  // MemView in a modal overlay. Resolve the mem being edited from its id.
  const editingMem = $derived(
    editingId ? (mems.find((mem) => mem._id === editingId) ?? null) : null
  );

  const tabs = $derived([
    { key: "new", label: "new", count: counts?.new, active: isNewView, href: "/" },
    ...lists.map((list) => ({
      key: `list:${list.name}`,
      label: list.name,
      count: counts?.lists.find((entry) => entry.name === list.name)?.count,
      active: activeList?.name === list.name,
      href: listHref(list)
    })),
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
      <div class="flex flex-row flex-wrap">
        {#each tabs as tab (tab.key)}
          <a
            href={tab.href}
            class="relative -ml-px -mt-px whitespace-nowrap border border-white/[.12] px-3 py-[7px] text-center text-[11px] text-ui md:px-[14px]"
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
      <TagRow tags={viewTags} {activeTags} ontagToggle={tagDidToggle} />
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
            <span class="md:hidden">
              {value === "minimal" ? "min" : value === "images" ? "img" : value}
            </span>
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
        {#if filterChipTag || searchQuery || activeList}
          ·
          <button class="text-accent-strong hover:underline" onclick={() => goto("/")}>
            clear filter
          </button>
        {/if}
      </div>
    {:else if density === "images"}
      <MemGrid
        {mems}
        {listTags}
        onrequestEdit={requestEdit}
        onarchive={archiveMem}
        onunarchive={unarchiveMem}
        ondelete={deleteMem}
        onseen={seenMem}
      />
      <MoreMem moreAvailable={moreMemsAvailable} {loading} onloadMore={loadMore} />
    {:else}
      <MemList
        {mems}
        {density}
        run={minimalRun}
        {listTags}
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
      <MoreMem moreAvailable={moreMemsAvailable} {loading} onloadMore={loadMore} />
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

{#if density === "images" && editingMem}
  <!-- Grid mode has no inline editor; edit opens the full MemView in a modal. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm"
    onclick={closeEdit}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="w-full max-w-[640px] border border-hairline bg-[#08080a]"
      onclick={(event) => event.stopPropagation()}
    >
      <MemView
        mem={editingMem}
        density="full"
        {listTags}
        editing={true}
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
    </div>
  </div>
{/if}
