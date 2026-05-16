<script lang="ts">
  import { run } from 'svelte/legacy';

  // @ts-ignore
  import { page } from "$app/stores";
  import MainView from "$lib/svelte/MainView.svelte";

  let filter: string = $state("");

  run(() => {
    if ($page && $page.params && $page.params.filter) {
      filter = $page.params.filter;
    }
  });
</script>

<svelte:head>
  <title>#mem - {filter}</title>
</svelte:head>

<MainView {filter} />
