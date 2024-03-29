<script lang="ts">
	import type { Mem } from '../../functions/core/mems';
	import { DateTime } from 'luxon';
	import { getStorage, ref, getDownloadURL } from 'firebase/storage';
	import { createEventDispatcher } from 'svelte';
	import { sharedFirebaseApp } from '$lib/firebase-shared';

	type MediaUrl = {
		url: string;
		posterUrl?: string;
		status?: string;
	};

	export let mem: Mem;

	let maxChars = 1000;
	let mediaImageUrl = '';
	let displayPhotos: MediaUrl[] = [];
	let displayVideos: MediaUrl[] = [];
	let isDragging = false;

	let titleEl: HTMLSpanElement | null = null;

	const dispatch = createEventDispatcher();

	function onArchive() {
		dispatch('archive', { mem });
	}

	function onUnarchive() {
		dispatch('unarchive', { mem });
	}

	function onAnnotate() {
		dispatch('annotate', { mem });
	}

	function onDelete() {
		dispatch('delete', { mem });
	}

	$: {
		if (mem) {
			getMediaImageUrl();
			getMediaUrls();
		}
	}

	function getPrettyDate() {
		if (!mem.addedMs) {
			return '';
		}

		const date = new Date(mem.addedMs);
		return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd hh:mm');
	}

	function getPrettyTitle() {
		if (!mem) {
			return '';
		}

		if (mem.title) {
			return mem.title;
		} else if (mem.url) {
			return mem.url.replace(/http[s]:\/\//, '');
		} else {
			return '';
		}
	}

	function getShortDescription() {
		if (!mem.description) {
			return '';
		}
		if (mem.description.length > maxChars) {
			return mem.description.substring(0, maxChars) + '...';
		}
		return mem.description;
	}

	function fileDidChange(e: Event): void {
		const target: HTMLInputElement = e.target as HTMLInputElement;
		if (!target) {
			return;
		}

		if (!target.files) {
			return;
		}

		console.log('Upload Files', target.files);
		dispatch('fileUpload', { mem, files: target.files });
		// TODO: Check if there are issues if we clear this too early?
		// target.value = '';
	}

	function ondragover(e: Event) {
		e.preventDefault();
		isDragging = true;
	}

	function ondragleave() {
		isDragging = false;
	}

	function ondrop(e: DragEvent) {
		e.preventDefault();

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) {
			return;
		}

		console.log(e.dataTransfer.files);
		isDragging = false;
		dispatch('fileUpload', { mem, files: dataTransfer.files });
	}

	function noteDidChange(e: FocusEvent): void {
		const target: HTMLElement = e.target as HTMLElement;
		if (!target) {
			return;
		}
		const noteValue = target.innerText;
		if (noteValue != mem.note) {
			dispatch('noteChanged', { mem, text: noteValue });
			target.innerText = noteValue;
		}
	}

	function descriptionDidChange(e: FocusEvent): void {
		const target: HTMLElement = e.target as HTMLElement;
		if (!target) {
			return;
		}
		const descriptionValue = target.innerText;
		if (descriptionValue != mem.description) {
			dispatch('descriptionChanged', { mem, text: descriptionValue });
		}
	}

	function startEdit() {
		if (titleEl) {
			const linkEl = titleEl.parentElement;
			if (!linkEl) {
				return;
			}
			const linkUrl = linkEl.getAttribute('href');
			linkEl.removeAttribute('href');

			titleEl.setAttribute('contenteditable', 'true');
			titleEl.focus();
			titleEl.onblur = () => {
				if (titleEl) {
					dispatch('titleChanged', { mem, text: titleEl.innerText });
					titleEl.removeAttribute('contenteditable');
					if (linkUrl) {
						linkEl.setAttribute('href', linkUrl);
					}
				}
			};
		}
	}

	async function getMediaImageUrl() {
		if (mem && mem.media && mem.media.path) {
			console.log('Getting url', mem.media.path);
			const storage = getStorage($sharedFirebaseApp);
			const storageRef = ref(storage, mem.media.path);
			try {
				const url = await getDownloadURL(storageRef);
				console.log('Got url', mem.media.path);
				mediaImageUrl = url;
			} catch (e) {
				// Silent fail
			}
		}
		return mediaImageUrl;
	}

	async function getMediaUrls() {
		if (mem && mem.photos) {
			const photos: MediaUrl[] = [];
			const storage = getStorage($sharedFirebaseApp);
			for (let photo of mem.photos) {
				if (photo.cachedMediaPath) {
					const storageRef = ref(storage, photo.cachedMediaPath);
					try {
						const url = await getDownloadURL(storageRef);
						photos.push({ url: url, status: 'cached' });
					} catch (e) {
						// Silent fail
						console.log('Error getting cached image', e);
					}
				} else {
					if (photo.mediaUrl) {
						photos.push({ url: photo.mediaUrl, status: 'live' });
					}
				}
			}
			displayPhotos = photos;
		}
		if (mem && mem.videos) {
			const videos: MediaUrl[] = [];
			const storage = getStorage($sharedFirebaseApp);
			for (let video of mem.videos) {
				if (video.cachedMediaPath) {
					const storageRef = ref(storage, video.cachedMediaPath);
					try {
						const url = await getDownloadURL(storageRef);
						videos.push({
							url: url,
							posterUrl: video.posterUrl,
							status: 'cached'
						});
					} catch (e) {
						console.log('Error getting cached video', e);
					}
				} else {
					if (video.mediaUrl) {
						videos.push({
							url: video.mediaUrl,
							posterUrl: video.posterUrl,
							status: 'live'
						});
					}
				}
			}
			displayVideos = videos;
		}
	}
</script>

<div
	class={'mem flex flex-col border-l-2 m-0.5 py-2 px-6 hover:border-l-gray-800' +
		(isDragging ? ' border-l-green-400' : '')}
	on:dragover={ondragover}
	on:dragleave={ondragleave}
	on:drop={ondrop}
>
	<div class="grow">
		<div
			class="p-2 bg-gray-50 border border-gray-200 min-h-[1rem]"
			contenteditable="true"
			on:blur={noteDidChange}
		>
			{mem.note}
		</div>

		{#if mem.url}
			<div class="text-lg px-1 py-1">
				<a href={mem.url} target="_blank" class="font-bold">
					<span class="title-text" bind:this={titleEl}>{getPrettyTitle()}</span>
				</a>
				<button class="text-gray-500 hover:text-gray-800" on:click={startEdit}>
					<span class="material-icons mx-2 text-sm">&#xe3c9;</span>
				</button>
			</div>
		{/if}

		{#if mem.description}
			<div
				class="my-2 p-4 text-gray-400 bg-gray-50 rounded-xl"
				contenteditable="true"
				on:blur={descriptionDidChange}
			>
				{getShortDescription()}
			</div>
		{:else}
			<div
				class="my-2 p-4 text-gray-400 bg-gray-50 rounded-xl"
				contenteditable="true"
				on:blur={descriptionDidChange}
			>
				No description
			</div>
		{/if}

		{#if displayVideos}
			<div class="videos">
				{#each displayVideos as video (video.url)}
					<!-- svelte-ignore a11y-media-has-caption -->
					<video src={video.url} title={video.status} class="my-4" playsinline controls loop />
				{/each}
			</div>
		{/if}

		{#if displayPhotos}
			<div class="photos">
				{#each displayPhotos as photo (photo.url)}
					<img src={photo.url} alt={photo.status} title={photo.status} class="my-4" />
				{/each}
			</div>
		{/if}

		{#if mem.media}
			<div class="photos">
				<img src={mediaImageUrl} alt="" />
			</div>
		{/if}

		{#if mem.links}
			<ul class="my-2 py-2">
				{#each mem.links as link (link.url)}
					<li>
						<a href={link.url} target="_blank" class="text-gray-500">
							{#if link.description}
								{link.description}
							{:else}
								{link.url}
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="my-2 text-gray-400" title={mem.id}>
			<div>{getPrettyDate()}</div>
			<div class="text-gray-200">
				<a href={`/mem/${mem.id}`}>{mem.id}</a>
			</div>
		</div>
	</div>

	<div class="text-gray-400 flex flex-row flex-nowrap gap-1">
		{#if mem.new}
			<button class="pr-2 py-1 hover:text-gray-500" on:click={onArchive}>
				<span class="material-icons text-sm align-middle">&#xe149;</span>
				Archive
			</button>
		{/if}

		{#if !mem.new}
			<button class="pr-2 py-1 hover:text-gray-500" on:click={onUnarchive}>
				<span class="material-icons text-sm align-middle">&#xe169;</span>
				Unarchive
			</button>
		{/if}

		<button class="pr-2 py-1 hover:text-gray-500" on:click={onAnnotate}>
			<span class="material-icons text-sm align-middle">&#xf071;</span>
			Annotate
		</button>

		<button class="pr-2 py-1 hover:text-red-400" on:click={onDelete}>
			<span class="material-icons text-sm align-middle">&#xE872;</span>
			Delete
		</button>

		<div class="pr-2 py-1 hover:text-gray-500">
			<form enctype="multipart/form-data">
				<input
					type="file"
					class="hidden"
					multiple
					name="images[]"
					id="fileInput"
					accept="image/*"
					on:change={fileDidChange}
				/>
				<label for="fileInput">
					<span class="material-icons text-sm align-middle">&#xf071;</span>
					Upload
				</label>
			</form>
		</div>
	</div>
</div>
