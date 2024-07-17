<script lang="ts">
	import axios from 'axios';

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
	import type { MemListResponse } from './request.types';

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
			loadMems(filter, false);
			//loadMemsWithFirebase(filter);
		}
	}

	$: {
		visibleMems = mems;
	}

	const loadMems = async (withFilter: string, append: boolean) => {
		if (!$sharedUser) {
			return;
		}

		const result = (await axios.post(`/_api/mem/list`, {
			userId: $sharedUser.uid,
			isArchived: withFilter === '*',
			pageSize: pageSize,
			page: visiblePages - 1
		})) as { data?: MemListResponse };

		if (result.data) {
			const { data } = result;
			if (data.status == 'OK' && data.mems) {
				if (append) {
					mems = [...mems, ...data.mems];
				} else {
					mems = data.mems;
				}
			}
		}
	};

	async function loadMemsWithFirebase(withFilter: string) {
		if (!$sharedUser || !$sharedFirestore) {
			return;
		}

		console.log('loadMemsWithFirebase', withFilter);
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
		loadMems(filter, true);
		console.log('loadMore', visiblePages);
	};

	////
	// Actions
	////

	const annotateMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			await memModifiers.annotateMem(mem, $sharedUser);
		}
	};

	const deleteMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		console.log('deleteMem', mem);
		if (mem && $sharedUser) {
			memModifiers.deleteMem(mem, userMemCollection, $sharedUser);
			loadMems(filter, false);
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

	const memDidAdd = (e: CustomEvent) => {
		loadMems(filter, false);
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
		<MemAdd on:memDidAdd={memDidAdd} />
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
