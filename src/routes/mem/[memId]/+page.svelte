<script lang="ts">
	import { onMount } from 'svelte';
	// @ts-ignore
	import { page } from '$app/stores';

	import type { Mem } from '$lib/common/mems';
	import MemView from '$lib/svelte/MemView.svelte';
	import { sharedUser, sharedFirestore } from '$lib/firebase-shared';
	import { executeQueryForMem } from '$lib/mem-data-queries';
	import { getUserMemCollection } from '$lib/mem-data-collection';

	let mem: Mem | undefined;

	onMount(() => {
		let memId = $page.params.memId;
		loadMem(memId);
	});

	$: {
		if ($sharedUser && $sharedFirestore && $page.params.memId) {
			let memId = $page.params.memId;
			loadMem(memId);
		}
	}

	const loadMem = async (memId: string) => {
		if ($sharedUser && $sharedFirestore && memId) {
			let collection = getUserMemCollection($sharedFirestore, $sharedUser);
			mem = await executeQueryForMem(collection, memId);
		}
	};
</script>

{#if mem}
	<MemView {mem} />
{/if}
