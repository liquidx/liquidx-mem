<script lang="ts">
  import { DEFAULT_LISTS, type UserList } from "$lib/common/lists";
  import { sharedUser } from "$lib/firebase-shared";
  import { getLists, getWriteSecret, updateLists, updateSecrets } from "$lib/mem.client.js";
  import type { UserWriteSecret } from "$lib/user.types";
  import { cn } from "$lib/utils";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
  import { run } from "svelte/legacy";

  type ListRow = { name: string; tagsText: string; autoArchive: boolean };

  let writeSecret: UserWriteSecret = $state("");
  let rows: ListRow[] = $state([]);

  const inputClass =
    "w-full border border-hairline-strong bg-base px-2.5 py-2 text-[12px] text-content placeholder:text-dim focus:border-accent-strong focus:outline-none md:py-[7px]";
  const microLabel = "mb-1.5 block text-[9px] uppercase tracking-[.14em] text-faint";

  const parseTags = (value: string): string[] =>
    value
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => `#${t.replace(/^#+/, "").toLowerCase()}`);

  const rowsToLists = (source: ListRow[]): UserList[] =>
    source
      .filter((row) => row.name.trim() && parseTags(row.tagsText).length > 0)
      .map((row) => ({
        name: row.name.trim(),
        tags: parseTags(row.tagsText),
        autoArchive: row.autoArchive
      }));

  const loadLists = async () => {
    if (!$sharedUser) return;
    const saved = await getLists($sharedUser);
    const lists = saved.length > 0 ? saved : DEFAULT_LISTS;
    rows = lists.map((list) => ({
      name: list.name,
      tagsText: list.tags.join(" "),
      autoArchive: list.autoArchive !== false
    }));
  };

  const saveLists = () => {
    if (!$sharedUser) return;
    updateLists($sharedUser, rowsToLists(rows));
  };

  const addRow = () => {
    rows = [...rows, { name: "", tagsText: "", autoArchive: true }];
  };

  const deleteRow = (index: number) => {
    rows = rows.filter((_, i) => i !== index);
    saveLists();
  };

  // Reorder a list; the stored order drives the tab order in the main view.
  const moveRow = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    rows = next;
    saveLists();
  };

  const toggleArchive = (index: number) => {
    rows[index].autoArchive = !rows[index].autoArchive;
    saveLists();
  };

  const loadWriteSecret = async () => {
    if (!$sharedUser) return;
    const savedSecret = await getWriteSecret($sharedUser);
    if (savedSecret) {
      writeSecret = savedSecret;
    }
  };

  const saveWriteSecret = () => {
    if (!$sharedUser) return;
    updateSecrets($sharedUser, writeSecret);
  };

  run(() => {
    if ($sharedUser) {
      loadWriteSecret();
      loadLists();
    }
  });
</script>

<svelte:head>
  <title>#mem · settings</title>
</svelte:head>

{#snippet reorder(index: number)}
  <div class="flex gap-1 md:flex-col md:gap-0">
    <button
      type="button"
      class="flex text-faint transition-colors hover:text-accent-strong disabled:opacity-25 disabled:hover:text-faint"
      aria-label="move up"
      disabled={index === 0}
      onclick={() => moveRow(index, -1)}
    >
      <ChevronUpIcon size={15} />
    </button>
    <button
      type="button"
      class="flex text-faint transition-colors hover:text-accent-strong disabled:opacity-25 disabled:hover:text-faint"
      aria-label="move down"
      disabled={index === rows.length - 1}
      onclick={() => moveRow(index, 1)}
    >
      <ChevronDownIcon size={15} />
    </button>
  </div>
{/snippet}

{#snippet archiveToggle(row: ListRow, index: number)}
  <button
    type="button"
    role="switch"
    aria-checked={row.autoArchive}
    class="flex items-center gap-2.5"
    onclick={() => toggleArchive(index)}
  >
    <span
      class={cn(
        "relative block h-5 w-10 border transition-colors",
        row.autoArchive ? "border-accent-strong bg-accent-strong/10" : "border-hairline-strong"
      )}
    >
      <span
        class={cn(
          "absolute top-1/2 block h-3 w-3 -translate-y-1/2 transition-all",
          row.autoArchive
            ? "left-[23px] bg-accent-strong shadow-[0_0_8px_rgba(217,142,82,.55)]"
            : "left-[3px] bg-faint"
        )}
      ></span>
    </span>
    <span class="text-[9px] uppercase tracking-[.14em] text-faint">auto-archive</span>
  </button>
{/snippet}

{#snippet removeButton(index: number)}
  <button
    type="button"
    class="text-faint transition-colors hover:text-danger"
    aria-label="remove list"
    onclick={() => deleteRow(index)}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
      stroke-linejoin="miter"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  </button>
{/snippet}

<div class="px-4 pt-[22px] md:px-6">
  <div class="mx-auto max-w-[760px] pb-20">
    <!-- Screen title -->
    <div class="flex items-center gap-3">
      <span class="select-none text-[15px] font-semibold text-accent-strong">&gt;</span>
      <h2 class="text-[15px] font-semibold tracking-[.03em] text-content">settings</h2>
    </div>

    <!-- Lists section -->
    <section class="mt-8">
      <div class="flex items-center gap-3">
        <span class="whitespace-nowrap text-[10px] uppercase tracking-[.16em] text-faint">
          lists
        </span>
        <span class="text-[10px] tabular-nums text-dim">{rows.length}</span>
        <span class="h-px flex-1 bg-hairline"></span>
        <span class="hidden whitespace-nowrap text-[10px] tracking-[.04em] text-dim sm:block">
          later lists for saved items
        </span>
      </div>

      <div class="mt-4 flex flex-col gap-3">
        {#each rows as row, index (index)}
          <div class="border border-hairline bg-surface p-4">
            <!-- Desktop: everything on one row. Mobile: fields stack, controls drop to a footer. -->
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-3">
              <div class="hidden md:block md:pb-[3px]">{@render reorder(index)}</div>

              <label class="md:w-[170px]">
                <span class={microLabel}>name</span>
                <input
                  type="text"
                  placeholder="reading"
                  class={inputClass}
                  bind:value={row.name}
                  onblur={saveLists}
                />
              </label>

              <label class="md:flex-1">
                <span class={microLabel}>tags</span>
                <input
                  type="text"
                  placeholder="#look #next"
                  class={cn(inputClass, "text-accent-muted")}
                  bind:value={row.tagsText}
                  onblur={saveLists}
                />
              </label>

              <div class="hidden items-center gap-4 md:flex md:h-[31px]">
                {@render archiveToggle(row, index)}
                {@render removeButton(index)}
              </div>
            </div>

            <!-- Mobile-only footer -->
            <div
              class="mt-3 flex items-center justify-between border-t border-hairline pt-3 md:hidden"
            >
              <div class="flex items-center gap-4">
                {@render reorder(index)}
                {@render archiveToggle(row, index)}
              </div>
              {@render removeButton(index)}
            </div>
          </div>
        {/each}

        {#if rows.length === 0}
          <div
            class="border border-dashed border-hairline px-4 py-6 text-center text-[11px] text-faint"
          >
            no lists · add one to group saved items
          </div>
        {/if}

        <button
          type="button"
          class="self-start border border-hairline-strong px-3 py-[7px] text-[11px] text-ui transition-colors hover:bg-white/[.02]"
          onclick={addRow}
        >
          + add list
        </button>
      </div>
    </section>

    <!-- Shared secret section -->
    <section class="mt-10">
      <div class="flex items-center gap-3">
        <span class="whitespace-nowrap text-[10px] uppercase tracking-[.16em] text-faint">
          shared secret
        </span>
        <span class="h-px flex-1 bg-hairline"></span>
        <span class="hidden whitespace-nowrap text-[10px] tracking-[.04em] text-dim sm:block">
          token for the write api
        </span>
      </div>

      <div class="mt-4">
        <input
          type="text"
          placeholder="paste a secret to enable write access"
          class={cn(inputClass, "font-mono")}
          bind:value={writeSecret}
          onblur={saveWriteSecret}
        />
        <p class="mt-2 text-[10px] tracking-[.04em] text-dim">
          saved automatically when you finish editing
        </p>
      </div>
    </section>
  </div>
</div>
