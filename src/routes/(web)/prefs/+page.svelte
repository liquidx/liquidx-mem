<script lang="ts">
	import { getSavedViews, updateSavedViews, getSecrets, updateSecrets } from '$lib/mem.client.js';
	import { sharedUser } from '$lib/firebase-shared';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let writeSecret: string = '';
	let views: string[] = [];
	let newView = '';

	$: {
		if ($sharedUser) {
			loadWriteSecret();
			loadViews();
		}
	}

	const loadViews = async () => {
		if (!$sharedUser) {
			return;
		}

		let settings = await getSavedViews($sharedUser);
		if (settings) {
			views = settings.views;
			console.log('views', views);
		}
	};

	const saveViews = () => {
		console.log('saveViews');
		if (!$sharedUser) {
			return;
		}
		updateSavedViews($sharedUser, { views: views });
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
		if (!$sharedUser) {
			return;
		}

		let settings = await getSecrets($sharedUser);
		if (settings && settings.writeSecret) {
			writeSecret = settings.writeSecret;
		}
	};

	const saveWriteSecret = () => {
		if (!$sharedUser) {
			return;
		}
		updateSecrets($sharedUser, { writeSecret });
	};
</script>

<div class="p-4">
	<div class="mb-4">
		<div class="font-bold">Shared Secret:</div>
		<div class="flex items-center justify-between space-x-4">
			<Input type="text" bind:value={writeSecret} />
			<Button variant="secondary" on:click={saveWriteSecret}>Save</Button>
		</div>
	</div>

	<div class="mb-4">
		<div class="font-bold">Views</div>
		{#each views as view, index}
			<div class="flex items-center justify-between space-x-4 my-1">
				<Input type="text" value={view} />
				<Button variant="secondary" data-index={index} on:click={deleteView}>Delete</Button>
			</div>
		{/each}
	</div>
	<div class="flex items-center justify-between space-x-4">
		<Input type="text" bind:value={newView} />
		<Button variant="secondary" on:click={addView}>Add</Button>
	</div>
</div>
