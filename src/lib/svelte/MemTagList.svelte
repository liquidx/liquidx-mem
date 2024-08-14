<script lang="ts">
  import { getTags, getSavedViews } from '$lib/mem.client.js';
  import type { TagListItem } from '$lib/tags.types';
  import { sharedUser } from '$lib/firebase-shared';
  import type { UserView } from '$lib/user.types';
  import type { MemListOptions } from '$lib/filter';
  import { cn } from '$lib/utils';

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
    let hashesRemoved = view.replaceAll('#', '');
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
    return filters_ && filters_.onlyArchived && filters_.matchAllTags.includes('#*');
  };
</script>

<section class="w-screen p-2 md:w-48 flex flex-row flex-wrap md:flex-col justify-start">
  <a
    href="/"
    class={cn(
      'block md:px-2 px-1 py-1 whitespace-nowrap hover:underline font-bold rounded-sm',
      isNew(currentTagFilters) ? 'bg-primary text-white' : ''
    )}
  >
    🆕 New
  </a>
  <a
    href="/tag/*"
    class={cn(
      'block md:px-2 px-1 py-1 whitespace-nowrap hover:underline font-bold rounded-sm',
      isArchive(currentTagFilters) ? 'bg-primary text-white' : ''
    )}>📦 Archive</a
  >
  {#each views as view}
    <a
      href={pathForView(view.tags)}
      class="block md:px-2 px-1 py-1 whitespace-nowrap hover:underline rounded-sm"
    >
      ⭐️ {view.tags}
    </a>
  {/each}
  {#each visibleTags as tag (tag.tag)}
    <a
      href={pathForView(tag.tag)}
      class={cn(
        'block md:px-2 px-1 py-1 whitespace-nowrap hover:underline  rounded-sm',
        isSelected(tag.tag, currentTagFilters) ? 'bg-primary text-white' : ''
      )}
    >
      {tag.icon}
      {tag.tag} ({tag.count})
    </a>
  {/each}
  {#if !showAll}
    <button
      on:click|preventDefault={showAllDidClick}
      class="block md:px-2 px-1 py-1 whitespace-nowrap hover:underline text-left rounded-md"
    >
      More..
    </button>
  {/if}
</section>
