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

		const authToken = await $sharedUser.getIdToken();
		const headers = {
			Authorization: `Bearer ${authToken}`
		};
		const params = {
			userId: $sharedUser.uid,
			isArchived: withFilter === '*',
			pageSize: pageSize,
			page: visiblePages - 1
		};

		const result = (await axios.post(`/_api/mem/list`, params, { headers })) as {
			data?: MemListResponse;
		};

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
			memModifiers.deleteMem(mem, $sharedUser);
			loadMems(filter, false);
		}
	};

	const archiveMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && userMemCollection) {
			memModifiers.archiveMem(mem, $sharedUser);
		}
	};

	const unarchiveMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && userMemCollection) {
			memModifiers.unarchiveMem(mem, $sharedUser);
		}
	};

	const updateNoteForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateNoteForMem(mem, text, $sharedUser);
		}
	};

	const updateTitleForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateTitleForMem(mem, text, $sharedUser);
		}
	};

	const updateDescriptionForMem = (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && userMemCollection) {
			memModifiers.updateDescriptionForMem(mem, text, $sharedUser);
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
