<script lang="ts">
  import type { TagListItem } from "$lib/tags.types";
  import { cn } from "$lib/utils";

  interface Props {
    tags?: TagListItem[];
    activeTag?: string | null;
    ontagToggle?: (tag: string) => void;
  }

  let { tags = [], activeTag = null, ontagToggle }: Props = $props();

  const chipCount = 8;
  let expanded = $state(false);

  const chips = $derived(tags.slice(0, chipCount));
  const remaining = $derived(Math.max(tags.length - chipCount, 0));

  const isActive = (tag: TagListItem) => activeTag === tag.tag;
</script>

{#if tags.length > 0}
  <div class="mt-3 flex flex-row flex-wrap items-center gap-2">
    {#each chips as tag (tag.tag)}
      <button
        class={cn(
          "relative whitespace-nowrap border px-[9px] py-1 text-[10px] text-[#8A8A94]",
          "border-hairline hover:border-white/[.28]"
        )}
        onclick={() => ontagToggle?.(tag.tag)}
      >
        {tag.icon}
        {tag.tag}
        {#if isActive(tag)}
          <span class="absolute inset-x-[6px] bottom-0 h-[2px] bg-accent-strong"></span>
        {/if}
      </button>
    {/each}
    {#if remaining > 0}
      <button
        class="whitespace-nowrap border border-accent-strong/35 px-[9px] py-1 text-[10px] text-accent-strong"
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? "less ▴" : `+${remaining} tags ▾`}
      </button>
    {/if}
  </div>

  {#if expanded}
    <div class="mt-[10px] border border-hairline">
      <div
        class="grid max-h-[200px] grid-cols-2 gap-px overflow-y-auto bg-white/[.06] md:max-h-[238px] md:grid-cols-5"
      >
        {#each tags as tag (tag.tag)}
          <button
            class={cn(
              "relative flex min-w-0 flex-row items-center gap-1.5 bg-base px-[10px] py-[6px] text-left text-[10px] hover:bg-surface"
            )}
            onclick={() => ontagToggle?.(tag.tag)}
          >
            {#if isActive(tag)}
              <span class="absolute bottom-0 left-0 top-0 w-[2px] bg-accent-strong"></span>
            {/if}
            <span class="shrink-0">{tag.icon}</span>
            <span class="min-w-0 flex-1 truncate text-body">{tag.tag}</span>
            <span class="shrink-0 text-faint">{tag.count}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/if}
