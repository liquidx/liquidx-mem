<script lang="ts">
	import type { Mem } from '../../functions/core/mems';
	import MemView from './MemView.svelte';
	export let mems: Mem[] = [];
</script>

<div>
	{#each mems as mem (mem.id)}
		<MemView
			{mem}
			on:annotate
			on:archive
			on:delete
			on:descriptionChanged
			on:fileUpload
			on:noteChanged
			on:titleChanged
			on:unarchive
		/>
	{/each}
</div>
