<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ChevronsUpDownIcon } from 'lucide-svelte';

  import * as Collapsible from '$lib/components/ui/collapsible';
  import Button from '$lib/components/ui/button/button.svelte';

  import type { TagListItem } from '$lib/tags.server';
  import type { MemListOptions } from '$lib/filter';
  import { cn } from '$lib/utils';

  export let tags: TagListItem[] = [];
  export let listOptions: MemListOptions | undefined = undefined;
  let sortOrder = 'newest';

  const dispatch = createEventDispatcher();

  const sortOrders = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' }
  ];

  const onTagDidClick = (tag: TagListItem) => {
    dispatch('tagDidClick', tag);
  };

  const isTagSelected = (tag: TagListItem) => {
    if (!listOptions) {
      return false;
    }
    if (listOptions.matchAllTags.includes(tag.tag) || listOptions.matchAnyTags.includes(tag.tag)) {
      return true;
    }
    return false;
  };

  const sortOrderDidChange = () => {
    console.log('sortOrderDidChange', sortOrder);
    dispatch('sortOrderDidChange', sortOrder);
  };
</script>

<div class="w-64 bg-secondary py-2 mx-1 my-2 px-2 rounded-xl ring-0">
  <select class="w-full bg-transparent" bind:value={sortOrder} on:change={sortOrderDidChange}>
    {#each sortOrders as { value, label }}
      <option {value}>{label}</option>
    {/each}
  </select>
</div>

<Collapsible.Root class="w-full space-y-2">
  <Collapsible.Trigger>
    <div class="w-64 bg-secondary mx-1 rounded-xl items-start flex">
      <Button variant="ghost" class="pl-3 pr-2 w-full justify-start">
        <div class=" flex flex-row items-center w-full justify-between">
          <span>Filter by tags</span>
          <ChevronsUpDownIcon size="16" class="transform transition-transform" />
        </div>
      </Button>
    </div>
  </Collapsible.Trigger>
  <Collapsible.Content>
    <div class="flex flex-wrap gap-1 text-xs text-primary">
      {#each tags as tag (tag.tag)}
        <button
          class={cn(
            ' rounded-sm px-2 py-1 ',
            isTagSelected(tag)
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-muted'
          )}
          on:click={() => onTagDidClick(tag)}
        >
          {tag.tag}
          <span class={isTagSelected(tag) ? 'text-gray-200' : 'text-muted-foreground'}
            >{tag.count}</span
          >
        </button>
      {/each}
    </div>
  </Collapsible.Content>
</Collapsible.Root>
