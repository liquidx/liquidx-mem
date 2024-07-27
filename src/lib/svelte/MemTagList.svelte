<script lang="ts">
	import { getTags, getSavedViews } from '$lib/mem.client.js';
	import type { TagListItem } from '$lib/common/tags';
	import { sharedUser } from '$lib/firebase-shared';
	import type { UserView } from '$lib/user.types';

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
			console.log('fetchedViews', fetchedViews);
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
</script>

<section class="w-screen p-2 md:w-48 flex flex-row flex-wrap md:flex-col justify-start">
	<a href="/" class="block md:px-2 px-1 py-0.5 whitespace-nowrap hover:underline font-bold"
		>🆕 New
	</a>
	<a href="/tag/*" class="block md:px-2 px-1 py-0.5 whitespace-nowrap hover:underline font-bold"
		>📦 Archive</a
	>
	{#each views as view}
		<a
			href={pathForView(view.tags)}
			class="block md:px-2 px-1 py-0.5 whitespace-nowrap hover:underline"
		>
			⭐️ {view.tags}
		</a>
	{/each}
	{#each visibleTags as tag (tag.tag)}
		<a
			href={pathForView(tag.tag)}
			class="block md:px-2 px-1 py-0.5 whitespace-nowrap hover:underline"
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
