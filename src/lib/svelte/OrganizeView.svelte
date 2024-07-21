<script lang="ts">
	import axios from 'axios';

	import { sharedUser } from '$lib/firebase-shared';
	import type { Mem } from '$lib/common/mems';
	import * as memModifiers from '$lib/mem.client';

	import MemView from '$lib/svelte/MemView.svelte';
	import type { MemListRequest } from '$lib/request.types';
	import { orderBy } from 'lodash-es';

	export let filter: string = '';

	let selectedMem: Mem | undefined;
	let mems: Mem[] = [];

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
			all: true
		};

		if (withFilter) {
			params.allOfTags = withFilter.split(',').map((tag) => `#${tag}`);
		}

		const result = await axios.post(`/_api/mem/list`, params, { headers });

		if (result.data && result.data.mems) {
			mems = orderBy(result.data.mems, ['url', 'addedMs'], ['asc', 'desc']);
		}
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
	<main class="p-2 max-w-full flex-grow">
		{#each mems as mem}
			<div>
				<a href={mem.url} target="_blank">{mem.url}</a>
				<span class="text-secondary-foreground">
					(<button
						on:click={() => {
							selectedMem = mem;
						}}>{mem.id}</button
					>)
				</span>
			</div>
		{/each}
	</main>
	<div class="fixed top-4 right-4 p-2 w-[480px]">
		{#if selectedMem}
			<MemView
				mem={selectedMem}
				on:delete={deleteMem}
				on:archive={archiveMem}
				on:noteChanged={updateNoteForMem}
				on:descriptionChanged={updateDescriptionForMem}
				on:titleChanged={updateTitleForMem}
			/>
		{/if}
	</div>
</div>
