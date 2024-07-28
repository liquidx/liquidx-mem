<script lang="ts">
	import type { Mem } from '$lib/common/mems';
	import MemView from './MemView.svelte';
	export let mems: Mem[] = [];

	$: {
		if (mems) {
			console.log('MemList: redrawing mems');
		}
	}
</script>

<div>
	{#each mems as mem (mem._id)}
		<MemView
			{mem}
			on:annotate
			on:archive
			on:delete
			on:seen
			on:descriptionChanged
			on:fileUpload
			on:noteChanged
			on:titleChanged
			on:unarchive
			on:removePhoto
			on:urlChanged
		/>
	{/each}
</div>
