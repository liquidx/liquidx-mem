<script lang="ts">
	import { sharedUser, sharedFirestore } from '$lib/firebase-shared';
	import { getFilterCondition } from '$lib/filter';
	import type { CollectionReference, Query } from 'firebase/firestore';
	import { onSnapshot } from 'firebase/firestore';
	import { getUserMemCollection } from '$lib/mem-data-collection';
	import type { Mem } from '../lib/common/mems';
	import {
		executeQuery,
		executeQueryForTaggedMems,
		queryForArchivedMems,
		queryForNewMems
	} from '$lib/mem-data-queries';
	import { unwrapDocs } from '$lib/firebase-init';
	import * as memModifiers from '$lib/mem-data-modifiers';

	import MemList from '$lib/MemList.svelte';
	import MemAdd from '$lib/MemAdd.svelte';
	import MoreMem from '$lib/MoreMem.svelte';
	import MemTagList from '$lib/MemTagList.svelte';

	export let filter: string = '';
	export let showTags = true;

	let pageSize = 30;
	let visiblePages = 1;
	let userMemCollection: CollectionReference | null = null;
	let mems: Mem[] = [];
	let visibleMems: Mem[] = [];
	let moreMemsAvailable = true;

	// Firestore
	let unsubscribeListener: (() => void) | null = null;

	function subscribeChanges(query: Query) {
		unsubscribeChanges();
		if (query) {
			unsubscribeListener = onSnapshot(query, (snapshot) => {
				console.log('Snapshot received');
				mems = unwrapDocs(snapshot);
			});
		}
	}

	function unsubscribeChanges() {
		if (unsubscribeListener) {
			unsubscribeListener();
			unsubscribeListener = null;
		}
	}

	$: {
		if ($sharedUser && $sharedFirestore) {
			loadMems(filter);
		}
	}

	$: {
		visibleMems = mems.slice(0, visiblePages * pageSize);
		moreMemsAvailable = mems.length > visibleMems.length;
		console.log('visibleMems', visibleMems.length);
	}

	async function loadMems(withFilter: string) {
		if (!$sharedUser || !$sharedFirestore) {
			return;
		}

		console.log('loadMems', withFilter);
		userMemCollection = getUserMemCollection($sharedFirestore, $sharedUser);
		let conditions = getFilterCondition(withFilter);

		if (conditions.filterTags.length > 0) {
			// Tag filtered mems.
			// TODO: Cannot do subscribe because of the way the query is constructed.
			mems = await executeQueryForTaggedMems(
				userMemCollection,
				conditions.filterTags,
				conditions.filterStrategy,
				pageSize
			);
			visiblePages = 1;
		} else if (conditions.archivedOnly) {
			let query = queryForArchivedMems(userMemCollection);
			mems = await executeQuery(query);
			subscribeChanges(query);
			visiblePages = 1;
		} else {
			let query = queryForNewMems(userMemCollection);
			mems = await executeQuery(query);
			subscribeChanges(query);
			visiblePages = 1;
		}

		console.log('mems', mems.length);
	}

	const loadMore = () => {
		visiblePages += 1;
		console.log('loadMore', visiblePages);
	};

	////
	// Actions
	////

	const annotateMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			await memModifiers.annotateMem(mem, $sharedUser.uid);
		}
	};

	const deleteMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && userMemCollection) {
			memModifiers.deleteMem(mem, userMemCollection);
		}
	};

	const archiveMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && userMemCollection) {
			memModifiers.archiveMem(mem, userMemCollection);
		}
	};

	const unarchiveMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && userMemCollection) {
			memModifiers.unarchiveMem(mem, userMemCollection);
		}
	};

	const updateNoteForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateNoteForMem(mem, text, userMemCollection);
		}
	};

	const updateTitleForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateTitleForMem(mem, text, userMemCollection);
		}
	};

	const updateDescriptionForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateDescriptionForMem(mem, text, userMemCollection);
		}
	};

	const uploadFilesForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let files = e.detail.files;
		if (mem && $sharedUser) {
			memModifiers.uploadFilesForMem(mem, files, $sharedUser);
		}
	};
</script>

<svelte:head>
	<title>#mem</title>
</svelte:head>

<div class="flex flex-col w-full overflow-x-hidden md:flex-row">
	{#if showTags}
		<section>
			<MemTagList />
		</section>
	{/if}
	<main class="p-2 max-w-screen flex-grow md:max-w-xl">
		<MemAdd />
		<MemList
			mems={visibleMems}
			on:annotate={annotateMem}
			on:archive={archiveMem}
			on:unarchive={unarchiveMem}
			on:delete={deleteMem}
			on:descriptionChanged={updateDescriptionForMem}
			on:noteChanged={updateNoteForMem}
			on:titleChanged={updateTitleForMem}
			on:fileUpload={uploadFilesForMem}
		/>
		<MoreMem moreAvailable={moreMemsAvailable} on:loadMore={loadMore} />
	</main>
</div>
