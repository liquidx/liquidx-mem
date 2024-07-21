<script lang="ts">
	import { DateTime } from 'luxon';
	import { parseText } from '$lib/common/parser';
	import { sharedUser } from '$lib/firebase-shared';
	import { addMem } from '$lib/mem.client';
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';

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
		class="p-3 m-0.5 rounded-xl bg-input text-input-foreground w-full h-16"
	/>
	<Button class="my-2" on:click={addNewMem}>Add</Button>
</div>
