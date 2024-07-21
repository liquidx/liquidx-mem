<script lang="ts">
	import type { PageData } from './$types';
	import type { Mem } from '$lib/common/mems';
	export let data: PageData;

	let mems: Mem[] = data.mems || [];
</script>

<div>
	{#each mems as mem}
		<div>{mem.url}</div>
	{/each}
</div>
