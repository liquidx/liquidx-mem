<script lang="ts">
	import type { PageData } from './$types';
	import type { Mem } from '$lib/common/mems';
	import { orderBy } from 'lodash-es';

	export let data: PageData;

	let mems: Mem[];

	$: {
		mems = orderBy(data.mems, ['url'], ['asc']);
	}
</script>

<div>
	{#each mems as mem}
		<div>{mem.url}</div>
	{/each}
</div>
