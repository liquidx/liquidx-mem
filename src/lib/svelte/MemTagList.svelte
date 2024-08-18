<script lang="ts">
  import { getTags, getSavedViews } from "$lib/mem.client.js";
  import type { TagListItem } from "$lib/tags.types";
  import { sharedUser } from "$lib/firebase-shared";
  import type { UserView } from "$lib/user.types";
  import type { MemListOptions } from "$lib/filter";
  import { cn } from "$lib/utils";

  export let currentTagFilters: MemListOptions | undefined = undefined;

  let showAll = false;
  let initialVisibleCount = 30;
  let tags: TagListItem[] = [];
  let views: UserView[] = [];
  let visibleTags: TagListItem[] = [];

  $: {
    if ($sharedUser) {
      getData();
    }
  }

  $: {
    visibleTags = showAll ? tags : tags.slice(0, initialVisibleCount);
  }

  const getData = async () => {
    if ($sharedUser) {
      tags = await getTags($sharedUser);
      const fetchedViews = await getSavedViews($sharedUser);
      if (fetchedViews && fetchedViews.length > 0) {
        views = fetchedViews;
      }
    }
  };

  const pathForView = (view: string) => {
    let hashesRemoved = view.replaceAll("#", "");
    return `/tag/${hashesRemoved}/`;
  };

  const showAllDidClick = () => {
    showAll = true;
  };

  const isSelected = (tag: string, filters_: MemListOptions | undefined) => {
    if (!filters_) {
      return false;
    }
    if (filters_.matchAllTags.includes(tag) || filters_.matchAnyTags.includes(tag)) {
      return true;
    }
    return false;
  };

  const isNew = (filters_: MemListOptions | undefined) => {
    return !filters_ || (!filters_.onlyArchived && filters_.matchAllTags.length == 0);
  };

  const isArchive = (filters_: MemListOptions | undefined) => {
    return filters_ && filters_.onlyArchived && filters_.matchAllTags.includes("#*");
  };
</script>

<section class="flex w-screen flex-row flex-wrap justify-start p-2 md:w-48 md:flex-col">
  <a
    href="/"
    class={cn(
      "block whitespace-nowrap rounded-sm px-1 py-1 font-bold hover:underline md:px-2",
      isNew(currentTagFilters) ? "bg-primary text-white" : ""
    )}
  >
    🆕 New
  </a>
  <a
    href="/tag/*"
    class={cn(
      "block whitespace-nowrap rounded-sm px-1 py-1 font-bold hover:underline md:px-2",
      isArchive(currentTagFilters) ? "bg-primary text-white" : ""
    )}>📦 Archive</a
  >
  {#each views as view}
    <a
      href={pathForView(view.tags)}
      class="block whitespace-nowrap rounded-sm px-1 py-1 hover:underline md:px-2"
    >
      ⭐️ {view.tags}
    </a>
  {/each}
  {#each visibleTags as tag (tag.tag)}
    <a
      href={pathForView(tag.tag)}
      class={cn(
        "block whitespace-nowrap rounded-sm px-1 py-1 hover:underline  md:px-2",
        isSelected(tag.tag, currentTagFilters) ? "bg-primary text-white" : ""
      )}
    >
      {tag.icon}
      {tag.tag} ({tag.count})
    </a>
  {/each}
  {#if !showAll}
    <button
      on:click|preventDefault={showAllDidClick}
      class="block whitespace-nowrap rounded-md px-1 py-1 text-left hover:underline md:px-2"
    >
      More..
    </button>
  {/if}
</section>
