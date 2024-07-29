<script lang="ts">
	import axios from 'axios';
	import { toast } from 'svelte-sonner';

	import { sharedUser } from '$lib/firebase-shared';
	import type { Mem } from '$lib/common/mems';
	import * as memModifiers from '$lib/mem.client';

	import MemView from '$lib/svelte/MemView.svelte';
	import type { MemListRequest } from '$lib/request.types';
	import { orderBy } from 'lodash-es';

	export let filter: string = '';

	let selectedMem: Mem | undefined;
	let mems: Mem[] = [];

	let duplicateMems: Mem[] = [];

	$: {
		if ($sharedUser) {
			loadMems(filter, false);
		}
	}

	const findDuplicatedMems = (mems_: Mem[]) => {
		let memsByUrl = {};
		duplicateMems = [];
		mems_.forEach((mem) => {
			if (mem.url) {
				const prettyUrl = mem.url.replace('^http[s]?://', '');
				if (memsByUrl[prettyUrl]) {
					duplicateMems.push(memsByUrl[prettyUrl]);
					duplicateMems.push(mem);
				} else {
					memsByUrl[prettyUrl] = mem;
				}
			}
		});
		duplicateMems = duplicatedMems;
	};

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
			params.matchAllTags = withFilter.split(',').map((tag) => `#${tag}`);
		}

		const result = await axios.post(`/_api/mem/list`, params, { headers });

		if (result.data && result.data.mems) {
			mems = orderBy(
				result.data.mems,
				[(m) => (m.url ? m.url.replace('^http[s]?://', '') : m.url), 'addedMs'],
				['asc', 'desc']
			);
		}

		findDuplicatedMems(mems);
	};

	const updateVisibleMems = (mems: Mem[], updatedMem: Mem) => {
		console.log(updatedMem);
		let replacedMems = mems.map((mem) => {
			if (mem._id === updatedMem._id) {
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
		toast('Annotating...');
		let mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			const response: MemAnnotateResponse | undefined = await memModifiers.annotateMem(
				mem,
				$sharedUser
			);
			if (!response) {
				toast.error('Failed to annotate...');
			}
			if (response) {
				updateVisibleMems(mems, response.mem, response.mem._id);
				toast.success('Done');
			}
		}
	};

	const deleteMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		console.log('deleteMem', mem);
		if (mem && $sharedUser) {
			const deleteMemId = await memModifiers.deleteMem(mem, $sharedUser);
			if (deleteMemId) {
				mems = mems.filter((mem) => mem._id !== deleteMemId);
			}
		}
	};

	const removePhotoFromMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let photo: MemPhoto = e.detail.photo;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.removePhotoFromMem(mem, photo, $sharedUser);
			console.log('removePhotoFromMem', updatedMem);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};

	const archiveMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		console.log('archiveMem');
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
			if (updatedMem) {
				loadMems(listOptions, searchQuery, false);
			}
		}
	};

	const seenMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		console.log('seenMem');
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.seenMem(mem, $sharedUser);
			if (updatedMem) {
				loadMems(listOptions, searchQuery, false);
			}
		}
	};

	const unarchiveMem = async (e: CustomEvent) => {
		const mem: Mem = e.detail.mem;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
			if (updatedMem) {
				loadMems(listOptions, searchQuery, false);
			}
		}
	};

	const updateNoteForMem = async (e: FocusEvent) => {
		const mem: Mem = e.detail.mem;
		const text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updatePropertyForMem(mem, 'note', text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};

	const updateTitleForMem = async (e: FocusEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updatePropertyForMem(mem, 'title', text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};

	const updateUrlForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.url;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updatePropertyForMem(mem, 'url', text, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};

	const updateDescriptionForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let text = e.detail.text;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.updatePropertyForMem(
				mem,
				'description',
				text,
				$sharedUser
			);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};

	const uploadFilesForMem = async (e: CustomEvent) => {
		let mem: Mem = e.detail.mem;
		let files = e.detail.files;
		if (mem && $sharedUser) {
			const updatedMem = await memModifiers.uploadFilesForMem(mem, files, $sharedUser);
			if (updatedMem) {
				updateVisibleMems(mems, updatedMem, mem._id);
			}
		}
	};
</script>

<svelte:head>
	<title>#mem</title>
</svelte:head>

<div class="flex flex-col w-full overflow-x-hidden md:flex-row">
	<main class="p-2 max-w-full flex-grow">
		<h1>Duplicated</h1>
		<div>
			{#each duplicateMems as mem}
				<div>
					<a href={mem.url} target="_blank">{mem.url}</a>
					<span class="text-secondary-foreground">
						(<button
							on:click={() => {
								selectedMem = mem;
							}}>{mem._id}</button
						>)
					</span>
				</div>
			{/each}
		</div>
		<h1>All</h1>
		<div>
			{#each mems as mem}
				<div>
					<a href={mem.url} target="_blank">{mem.url}</a>
					<span class="text-secondary-foreground">
						(<button
							on:click={() => {
								selectedMem = mem;
							}}>{mem._id}</button
						>)
					</span>
				</div>
			{/each}
		</div>
	</main>
	<div class="fixed top-4 right-4 p-2 w-[480px]">
		{#if selectedMem}
			<MemView
				mem={selectedMem}
				on:annotate={annotateMem}
				on:archive={archiveMem}
				on:unarchive={unarchiveMem}
				on:delete={deleteMem}
				on:descriptionChanged={updateDescriptionForMem}
				on:noteChanged={updateNoteForMem}
				on:titleChanged={updateTitleForMem}
				on:fileUpload={uploadFilesForMem}
				on:seen={seenMem}
				on:removePhoto={removePhotoFromMem}
				on:urlChanged={updateUrlForMem}
			/>
		{/if}
	</div>
</div>
