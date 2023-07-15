<script lang="ts">
	import { getViews, getWriteSecret, updateViews, updateWriteSecret } from '$lib/prefs';
	import { sharedFirestore, sharedUser } from '$lib/firebase-shared';

	let writeSecret = '';
	let views: string[] = [];
	let newView = '';

	$: {
		if ($sharedUser && $sharedFirestore) {
			loadWriteSecret();
			loadViews();
		}
	}

	const loadViews = async () => {
		if (!$sharedUser || !$sharedFirestore) {
			return;
		}

		let result = await getViews($sharedFirestore, $sharedUser);
		if (result) {
			views = result;
			console.log('views', views);
		}
	};

	const saveViews = () => {
		console.log('saveViews');
		if (!$sharedFirestore || !$sharedUser) {
			return;
		}
		updateViews($sharedFirestore, $sharedUser, views);
	};

	const addView = () => {
		views.push(newView);
		newView = '';
		saveViews();
	};

	const deleteView = (e: MouseEvent) => {
		if (e.target) {
			let target = e.target as HTMLElement;
			let index = target.dataset.index;
			if (index === undefined) {
				return;
			}
			views.splice(parseInt(index), 1);
			saveViews();
		}
	};

	const loadWriteSecret = async () => {
		if (!$sharedUser || !$sharedFirestore) {
			return;
		}

		let result = await getWriteSecret($sharedFirestore, $sharedUser);
		if (result) {
			writeSecret = result;
		}
	};

	const saveWriteSecret = () => {
		if (!$sharedFirestore || !$sharedUser) {
			return;
		}
		updateWriteSecret($sharedFirestore, $sharedUser, writeSecret);
	};
</script>

<div class="p-4">
	<div class="mb-4">
		<div class="font-bold">Shared Secret:</div>
		<div>
			<input type="text" bind:value={writeSecret} class="my-1 px-2 py-1 border border-gray-200" />
			<button class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400" on:click={saveWriteSecret}>
				Save
			</button>
		</div>
	</div>

	<div class="mb-4">
		<div class="font-bold">Views</div>
		{#each views as view, index}
			<div>
				<input type="text" value={view} class="my-1 px-2 py-1 border border-gray-200" />
				<button
					class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400"
					data-index={index}
					on:click={deleteView}
				>
					Delete
				</button>
			</div>
		{/each}
	</div>
	<div class="flex flex-row">
		<input type="text" bind:value={newView} class="my-1 px-2 py-1 border border-gray-200" />
		<button class="mx-2 px-2 py-1 bg-gray-200 active:bg-gray-400" on:click={addView}>Add</button>
	</div>
</div>
