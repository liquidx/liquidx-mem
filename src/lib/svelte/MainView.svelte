<script lang="ts">
	import axios from 'axios';

	import { sharedUser } from '$lib/firebase-shared';
	import type { Mem } from '$lib/common/mems';
	import * as memModifiers from '$lib/mem.client';

	import MemList from '$lib/svelte/MemList.svelte';
	import MemAdd from '$lib/svelte/MemAdd.svelte';
	import MoreMem from '$lib/svelte/MoreMem.svelte';
	import MemTagList from '$lib/svelte/MemTagList.svelte';
	import type { MemListRequest } from '$lib/request.types';

	export let filter: string = '';
	export let showTags = true;

	let pageSize = 30;
	let visiblePages = 1;
	let mems: Mem[] = [];
	let moreMemsAvailable = true;

	// Firestore

	$: {
		if ($sharedUser) {
			loadMems(filter, false);
		}
	}

	const loadMems = async (withFilter: string, append: boolean) => {
		if (!$sharedUser) {
			return;
		}

		const authToken = await $sharedUser.getIdToken();
		const headers = {
			Authorization: `Bearer ${authToken}`
		};
		const params: MemListRequest = {
			userId: $sharedUser.uid,
			isArchived: withFilter === '*',
			pageSize: pageSize,
			page: visiblePages - 1
		};

		if (withFilter) {
			params.allOfTags = withFilter.split(',').map((tag) => `#${tag}`);
		}

		const result = await axios.post(`/_api/mem/list`, params, { headers });

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

	const updateVisibleMems = (mems: Mem[], updatedMem: Mem) => {
		console.log(updatedMem);
		let replacedMems = mems.map((mem) => {
			if (mem.id === updatedMem.id) {
				return updatedMem;
			}
			return mem;
		});
		mems = replacedMems;
	};

	////
	// Actions
	////

	const annotateMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.annotateMem(mem, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem);
			}
		}
	};

	const deleteMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		console.log('deleteMem', mem);
		if (mem && $sharedUser) {
			const deleteMemId = await memModifiers.deleteMem(mem, $sharedUser);
			if (deleteMemId) {
				mems = mems.filter((mem) => mem.id !== deleteMemId);
			}
		}
	};

	const archiveMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
			if (updatedMem) {
				loadMems(filter, false);
			}
		}
	};

	const unarchiveMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
			if (updatedMem) {
				loadMems(filter, false);
			}
		}
	};

	const updateNoteForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updateNoteForMem(mem, text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem);
			}
		}
	};

	const updateTitleForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updateTitleForMem(mem, text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem);
			}
		}
	};

	const updateDescriptionForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updateDescriptionForMem(mem, text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem);
			}
		}
	};

	const uploadFilesForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let files = e.detail.files;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.uploadFilesForMem(mem, files, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem);
			}
		}
	};

	const memDidAdd = (e: CustomEvent) => {
		//const mem = e.detail.mem;
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
			{mems}
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