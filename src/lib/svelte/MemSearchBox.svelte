<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte";

  interface Props {
    onsearchQueryDidChange?: (data: { query: string }) => void;
  }

  let { onsearchQueryDidChange }: Props = $props();
  let searchQuery: string = $state("");

  const onInputDidKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      onsearchQueryDidChange?.({ query: searchQuery });
    }
  };
</script>

<Input bind:value={searchQuery} onkeyup={onInputDidKeyUp} placeholder="Search" class="w-full" />
