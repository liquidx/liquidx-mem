<script lang="ts">
	import MainView from '$lib/MainView.svelte';

	export let data;

	let filter: string = '';

	$: {
		if (data) {
			filter = data.filter;
		}
	}
</script>

<svelte:head>
	<title>#mem - {filter}</title>
</svelte:head>

<MainView {filter} />
