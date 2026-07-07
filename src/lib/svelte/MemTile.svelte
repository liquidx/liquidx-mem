<script lang="ts">
  import type { Mem } from "$lib/common/mems";
  import { cn } from "$lib/utils";
  import { DateTime } from "luxon";
  import { isUnseen, resolveTileImage } from "./memTile";

  interface Props {
    mem: Mem;
    listTags?: string[];
    onrequestEdit?: (data: { mem: Mem }) => void;
    onarchive?: (data: { mem: Mem }) => void;
    onunarchive?: (data: { mem: Mem }) => void;
    onseen?: (data: { mem: Mem }) => void;
    ondelete?: (data: { mem: Mem }) => void;
  }

  let {
    mem,
    listTags = [],
    onrequestEdit,
    onarchive,
    onunarchive,
    onseen,
    ondelete
  }: Props = $props();

  // Whether the tile image failed to load; when true we render the text tile.
  let imageFailed = $state(false);
  // Delete is two-step so a compact tile can't fire it accidentally.
  let confirmingDelete = $state(false);

  const tileImage = $derived(resolveTileImage(mem));
  const showImage = $derived(tileImage !== null && !imageFailed);
  const unseen = $derived(isUnseen(mem, listTags));

  const displayDate = $derived(
    mem.addedMs ? DateTime.fromJSDate(new Date(mem.addedMs)).toFormat("MM-dd") : ""
  );

  const displayTitle = $derived.by(() => {
    if (mem.title) {
      return mem.title;
    }
    if (mem.url) {
      return mem.url.replace(/^http[s]?:\/\//, "").replace(/\/$/, "");
    }
    return "(untitled)";
  });

  const displayDomain = $derived.by(() => {
    if (!mem.url) {
      return "";
    }
    try {
      return new URL(mem.url).hostname;
    } catch {
      return "";
    }
  });

  // Prose for the text tile: annotated description or note, tags/whitespace
  // stripped, trimmed to a tile-sized snippet.
  const displayNote = $derived.by(() => {
    let text = mem.description || mem.note || "";
    text = text
      .replace(/#[^\s,]+/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    return text.length > 240 ? text.slice(0, 240) + "…" : text;
  });

  const requestEdit = () => onrequestEdit?.({ mem });

  const deleteClicked = () => {
    if (!confirmingDelete) {
      confirmingDelete = true;
      return;
    }
    confirmingDelete = false;
    ondelete?.({ mem });
  };

  // Reset the delete confirmation whenever the pointer leaves the tile.
  const resetConfirm = () => (confirmingDelete = false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="group/tile flex flex-col" onmouseleave={resetConfirm}>
  <div class="relative aspect-[4/3] overflow-hidden border border-hairline bg-white/[.02]">
    {#if showImage && tileImage}
      <a
        href={mem.url}
        target="_blank"
        rel="noreferrer"
        class="block h-full w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-strong"
      >
        <img
          src={tileImage.url}
          alt={displayTitle}
          loading="lazy"
          class="h-full w-full object-cover"
          onerror={() => (imageFailed = true)}
        />
      </a>
    {:else}
      <!-- Text tile: fills a missing image with the mem's own text. -->
      <button
        type="button"
        onclick={requestEdit}
        class="flex h-full w-full flex-col justify-between p-3 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-strong"
      >
        <div class="line-clamp-5 text-[11px] leading-[1.5] text-body">
          {displayNote || displayTitle}
        </div>
        <div class="text-[10px] text-faint">text only</div>
      </button>
    {/if}

    {#if unseen}
      <span
        class="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 bg-accent-strong shadow-[0_0_8px_rgba(217,142,82,.55)]"
      ></span>
    {/if}

    <!-- Hover action overlay -->
    <div
      class="absolute inset-x-0 bottom-0 flex translate-y-1 flex-row items-center gap-3 bg-gradient-to-t from-[rgba(8,8,10,.92)] to-transparent px-2.5 pb-2 pt-6 text-[10px] text-tertiary opacity-0 transition-all duration-150 group-hover/tile:translate-y-0 group-hover/tile:opacity-100"
    >
      {#if mem.new}
        <button class="hover:text-content" onclick={() => onarchive?.({ mem })}>archive</button>
      {:else}
        <button class="hover:text-content" onclick={() => onunarchive?.({ mem })}>unarchive</button>
      {/if}
      {#if unseen}
        <button class="hover:text-content" onclick={() => onseen?.({ mem })}>seen</button>
      {/if}
      <button class="hover:text-content" onclick={requestEdit}>edit</button>
      <button
        class={cn("ml-auto", confirmingDelete ? "text-danger" : "text-danger/70 hover:text-danger")}
        onclick={deleteClicked}
      >
        {confirmingDelete ? "confirm?" : "delete"}
      </button>
    </div>
  </div>

  <!-- Caption -->
  <div class="mt-[7px]">
    <div class="line-clamp-2 text-[12px] leading-[1.35] text-content">
      {#if mem.url}
        <a href={mem.url} target="_blank" rel="noreferrer" class="hover:underline">{displayTitle}</a>
      {:else}
        {displayTitle}
      {/if}
    </div>
    <div class="mt-[3px] flex flex-row items-center gap-2 text-[10px]">
      {#if displayDomain}
        <span class="truncate text-accent-muted">{displayDomain}</span>
      {/if}
      {#if displayDate}
        <span class="shrink-0 text-faint">{displayDate}</span>
      {/if}
    </div>
  </div>
</div>
