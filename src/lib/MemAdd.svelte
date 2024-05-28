<script lang="ts">
	import { DateTime } from 'luxon';
	import { parseText } from '$lib/common/parser';
	import { sharedFirestore, sharedUser } from './firebase-shared';
	import { getUserMemCollection } from '$lib/mem-data-collection';
	import { addMem } from '$lib/mem-data-modifiers';

	let rawInput: string = '';

	const addNewMem = async () => {
		if (!$sharedFirestore || !$sharedUser || !rawInput) {
			return;
		}

		const mem = parseText(rawInput);
		// TODO: Probably there's a better way to get milliseconds?
		mem.new = true;
		mem.addedMs = DateTime.utc().toMillis();

		let collection = getUserMemCollection($sharedFirestore, $sharedUser);
		await addMem(mem, collection);
		rawInput = '';
	};
</script>

<div class="flex flex-col w-full py-1 px-0 md:px-1 m-1">
	<textarea
		bind:value={rawInput}
		placeholder="Enter text, urls, #tags here."
		class="p-2 m-0.5 rounded-md border border-gray-200 w-full h-16"
	/>
	<input
		type="button"
		class="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 m-1 p-2 text-gray-700"
		value="Add"
		on:click={addNewMem}
	/>
</div>
