<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let moreAvailable = false;

	function loadMoreDidClick() {
		dispatch('loadMore');
	}
</script>

<div class="w-full flex flex-row justify-between m-1">
	{#if moreAvailable}
		<button
			on:click={loadMoreDidClick}
			class="px-4 py-2 my-4 rounded-xl text-gray-600 font-bold hover:shadow-lg border border-gray-200 shadow-sm"
		>
			More
		</button>
	{:else}
		<div>That's it.</div>
	{/if}
</div>
