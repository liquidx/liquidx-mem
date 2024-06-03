<script lang="ts">
	import { getTags, getSavedViews } from '$lib/mem-tags';
	import type { TagListItem } from './common/tags';
	import { sharedFirestore, sharedUser } from './firebase-shared';

	let showAll = false;
	let initialVisibleCount = 30;
	let tags: TagListItem[] = [];
	let views: string[] = [];
	let visibleTags: TagListItem[] = [];

	$: {
		if ($sharedFirestore && $sharedUser) {
			getData();
		}
	}

	$: {
		visibleTags = showAll ? tags : tags.slice(0, initialVisibleCount);
	}

	const getData = async () => {
		if ($sharedFirestore && $sharedUser) {
			tags = await getTags($sharedFirestore, $sharedUser);
			let result = await getSavedViews($sharedFirestore, $sharedUser);
			if (result) {
				views = result;
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
</script>

<section
	class="w-screen p-2 md:w-48 text-gray-500 flex flex-row flex-wrap md:flex-col justify-start"
>
	<a href="/" class="block p-0.5 whitespace-nowrap hover:underline">New </a>
	<a href="/tag/*" class="block p-0.5 whitespace-nowrap hover:underline">Archive</a>
	{#each views as view}
		<a href={pathForView(view)} class="block p-0.5 whitespace-nowrap hover:underline">
			{view}
		</a>
	{/each}
	{#each visibleTags as tag (tag.tag)}
		<a href={pathForView(tag.tag)} class="block p-0.5 whitespace-nowrap hover:underline">
			{tag.icon}
			{tag.tag} ({tag.count})
		</a>
	{/each}
	{#if !showAll}
		<button
			on:click|preventDefault={showAllDidClick}
			class="block p-0.5 whitespace-nowrap hover:underline"
		>
			More..
		</button>
	{/if}
</section>
