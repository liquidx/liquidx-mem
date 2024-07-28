<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { createEventDispatcher } from 'svelte';
	import type { TagListItem } from '$lib/tags.server';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ChevronsUpDownIcon } from 'lucide-svelte';
	import type { TagFilters } from '$lib/filter';
	import { cn } from '$lib/utils';

	export let tags: TagListItem[] = [];
	export let currentTagFilters: TagFilters | undefined = undefined;
	const dispatch = createEventDispatcher();

	const onTagDidClick = (tag: TagListItem) => {
		dispatch('tagDidClick', tag);
	};

	const isTagSelected = (tag: TagListItem) => {
		if (!currentTagFilters) {
			return false;
		}
		if (
			currentTagFilters.matchAllTags.includes(tag.tag) ||
			currentTagFilters.matchAnyTags.includes(tag.tag)
		) {
			return true;
		}
		return false;
	};
</script>

<Collapsible.Root class="w-full space-y-2">
	<Collapsible.Trigger>
		<Button variant="ghost">
			Filter by Tags
			<ChevronsUpDownIcon size="16" class="transform transition-transform" />
		</Button>
	</Collapsible.Trigger>
	<Collapsible.Content>
		<div class="flex flex-wrap gap-1 text-xs text-primary">
			{#each tags as tag (tag.tag)}
				<button
					class={cn(
						' rounded-sm px-2 py-1 ',
						isTagSelected(tag) ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
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
