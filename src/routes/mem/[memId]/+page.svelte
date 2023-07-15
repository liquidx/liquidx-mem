<script lang="ts">
	import type { Mem } from '../../../../functions/core/mems';
	import MemView from '$lib/MemView.svelte';
	import { sharedUser, sharedFirestore } from '$lib/firebase-shared';
	import { executeQueryForMem } from '$lib/mem-data-queries';
	import { getUserMemCollection } from '$lib/mem-data-collection';

	export let data;

	let mem: Mem | undefined;

	$: {
		if ($sharedUser && $sharedFirestore && data.memId) {
			loadMem();
		}
	}

	const loadMem = async () => {
		if ($sharedUser && $sharedFirestore && data.memId) {
			let collection = getUserMemCollection($sharedFirestore, $sharedUser);
			mem = await executeQueryForMem(collection, data.memId);
		}
	};
</script>

{#if mem}
	<MemView {mem} />
{/if}
