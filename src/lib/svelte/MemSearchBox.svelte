<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let searchQuery: string = "";

  const onInputDidKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      dispatch("searchQueryDidChange", { query: searchQuery });
    }
  };
</script>

<Input bind:value={searchQuery} on:keyup={onInputDidKeyUp} placeholder="Search" class="w-full" />
