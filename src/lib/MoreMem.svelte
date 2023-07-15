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
			class="px-6 py-1 rounded-xl bg-gray-700 text-gray-100 font-bold hover:bg-gray-400"
		>
			More &gt;
		</button>
	{:else}
		<div>That's it.</div>
	{/if}
</div>
