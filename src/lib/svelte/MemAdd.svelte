<script lang="ts">
	import { DateTime } from 'luxon';
	import { parseText } from '$lib/common/parser';
	import { sharedUser } from '$lib/firebase-shared';
	import { addMem } from '$lib/mem.client';
	import { createEventDispatcher } from 'svelte';

	let rawInput: string = '';
	const dispatch = createEventDispatcher();

	const addNewMem = async () => {
		if (!$sharedUser || !rawInput) {
			return;
		}

		const mem = parseText(rawInput);
		// TODO: Probably there's a better way to get milliseconds?
		mem.new = true;
		mem.addedMs = DateTime.utc().toMillis();

		const addedMem = await addMem(mem, $sharedUser);
		if (addedMem) {
			dispatch('memDidAdd', { mem: addedMem });
		}
		rawInput = '';
	};
</script>

<div class="flex flex-col w-full py-1 px-0 md:px-1">
	<textarea
		bind:value={rawInput}
		placeholder="Enter text, urls, #tags here."
		class="p-2 m-0.5 rounded-xl border border-gray-200 w-full h-16"
	/>
	<input
		type="button"
		class="rounded-xl bg-gray-200 hover:bg-gray-300 active:bg-gray-400 my-2 p-2 text-gray-600"
		value="Add"
		on:click={addNewMem}
	/>
</div>
