<script lang="ts">
	import { getUserMemCollection } from '$lib/mem-data-collection';
	import { addMem } from '$lib/mem-data-modifiers';
	import { executeQuery, queryForAllMems } from '$lib/mem-data-queries';
	import { type Mem, memFromJson } from '$lib/common/mems';
	import { sharedUser, sharedFirestore } from '$lib/firebase-shared';
	let importMems = [] as Mem[];
	let fileInput: HTMLInputElement;

	$: {
		if ($sharedUser) {
			loadMems();
		}
	}

	const loadMems = async () => {
		if ($sharedUser && $sharedFirestore) {
			let query = queryForAllMems(getUserMemCollection($sharedFirestore, $sharedUser));
			return executeQuery(query);
		}
	};

	const download = (url: string) => {
		const a = document.createElement('a');
		a.style.display = 'none';
		a.href = url;
		a.download = 'data.json';
		document.body.appendChild(a);
		a.click();
	};

	const exportData = async () => {
		const mems = await loadMems();
		if (!mems) {
			return;
		}
		const blob = new Blob([JSON.stringify(mems, null, 2)], {
			type: 'application/json'
		});
		const url = window.URL.createObjectURL(blob);
		download(url);
		window.URL.revokeObjectURL(url);
	};

	const startImportData = () => {
		if (fileInput) {
			fileInput.click();
		}
	};

	const doImport = async () => {
		if (!$sharedUser || !$sharedFirestore) {
			return;
		}

		for (const mem of importMems) {
			if (mem.id) {
				const collection = getUserMemCollection($sharedFirestore, $sharedUser);
				await addMem(mem, collection);
			}
		}
	};

	const fileSelectionDidChange = () => {
		if (fileInput) {
			const fileList = fileInput.files;
			if (fileList && fileList.length > 0) {
				const file = fileList[0];
				const reader = new FileReader();
				reader.onload = () => {
					if (reader.result) {
						importMems = JSON.parse(reader.result.toString()).map((o: Mem) => memFromJson(o));
						console.log(importMems);
					}
				};
				reader.readAsText(file);
			}
		}
	};
</script>

<div class="data">
	<main>
		<h2>Data Tools</h2>
		<ul>
			<li>
				<button class="underline" on:click={exportData}>Export Data as JSON</button>.
			</li>
			<li>
				<button class="underline" on:click={startImportData}>Import Data from JSON</button>
				<input
					bind:this={fileInput}
					type="file"
					style="display:none"
					on:change={fileSelectionDidChange}
				/>
				{#if importMems.length}
					<button class="underline" on:click={doImport}> ... Import</button>
				{/if}
			</li>
		</ul>
	</main>
</div>
