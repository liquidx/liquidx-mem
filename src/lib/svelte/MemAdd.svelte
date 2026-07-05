<script lang="ts">
  import type { Mem } from "$lib/common/mems";
  import { parseText } from "$lib/common/parser";
  import { sharedUser } from "$lib/firebase-shared";
  import { addMem, getTagSuggestions } from "$lib/mem.client";
  import type { TagListItem } from "$lib/tags.server";
  import { cn } from "$lib/utils";
  import { DateTime } from "luxon";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import { createBubbler, preventDefault } from "svelte/legacy";

  const bubble = createBubbler();

  interface Props {
    onmemDidAdd?: (data: { mem: Mem }) => void;
  }

  let { onmemDidAdd }: Props = $props();
  let pending = $state(false);
  let rawInput: string = $state("");
  let suggestions: TagListItem[] = $state([]);
  let highlightedIndex = $state(0);
  let showSuggestions = $state(false);
  let tokenStartIndex = 0;
  let textareaEl: HTMLTextAreaElement | null = $state(null);
  let latestQuery = "";
  let fetchSequence = 0;

  const resetSuggestions = () => {
    suggestions = [];
    highlightedIndex = 0;
    showSuggestions = false;
    latestQuery = "";
  };

  const currentToken = (text: string, caret: number) => {
    const preceding = text.slice(0, caret);
    const match = preceding.match(/(^|[\s])([^\s]*)$/);
    const token = match ? match[2] : "";
    const start = match ? caret - token.length : caret;
    return { token, start };
  };

  const fetchSuggestions = async (token: string) => {
    if (!$sharedUser) {
      resetSuggestions();
      return;
    }

    const sequence = ++fetchSequence;
    const results = await getTagSuggestions($sharedUser, token).catch(() => []);
    if (sequence !== fetchSequence) {
      return;
    }

    suggestions = results;
    highlightedIndex = 0;
    showSuggestions = suggestions.length > 0;
  };

  const handleInput = async () => {
    if (!textareaEl) {
      resetSuggestions();
      return;
    }

    const caret = textareaEl.selectionStart ?? rawInput.length;
    const { token, start } = currentToken(rawInput, caret);
    tokenStartIndex = start;

    if (!token || !token.startsWith("#")) {
      resetSuggestions();
      return;
    }

    if (token === latestQuery && showSuggestions) {
      return;
    }

    latestQuery = token;
    await fetchSuggestions(token);
  };

  const applySuggestion = async (tag: string) => {
    if (!textareaEl) {
      return;
    }

    const caret = textareaEl.selectionStart ?? rawInput.length;
    const before = rawInput.slice(0, tokenStartIndex);
    const after = rawInput.slice(caret);

    resetSuggestions();
    rawInput = `${before}${tag} ${after}`;
    await tick();

    const newCaret = before.length + tag.length + 1;
    textareaEl.setSelectionRange(newCaret, newCaret);
    textareaEl.focus();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (showSuggestions) {
        event.preventDefault();
        resetSuggestions();
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % suggestions.length;
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const choice = suggestions[highlightedIndex];
      if (choice) {
        void applySuggestion(choice.tag);
      }
    }
  };

  const addNewMem = async () => {
    if (!$sharedUser || !rawInput) {
      return;
    }

    const mem = parseText(rawInput);
    // TODO: Probably there's a better way to get milliseconds?
    mem.new = true;
    mem.addedMs = DateTime.utc().toMillis();

    pending = true;
    const addedMem = await addMem(mem, $sharedUser);
    pending = false;
    if (addedMem) {
      onmemDidAdd?.({ mem: addedMem });
      rawInput = "";
      resetSuggestions();
    } else {
      toast.error("Failed to add mem");
    }
  };
</script>

<div class="relative flex w-full flex-col gap-3">
  <textarea
    bind:value={rawInput}
    bind:this={textareaEl}
    placeholder="text, urls, #tags"
    class="h-24 w-full border border-hairline-strong bg-surface p-3 text-[12px] leading-[1.6] text-content placeholder:text-[#8A8A94] focus:border-accent-strong focus:outline-none disabled:opacity-50"
    disabled={pending}
    oninput={handleInput}
    onkeydown={handleKeydown}
  ></textarea>
  {#if showSuggestions}
    <div
      class="absolute left-0 right-0 top-full z-20 border border-hairline bg-surface shadow-[0_16px_48px_rgba(0,0,0,.7)]"
    >
      {#each suggestions as suggestion, index (suggestion.tag)}
        <button
          type="button"
          class={cn(
            "flex w-full items-center gap-3 px-3 py-2 text-left text-[11px]",
            index === highlightedIndex ? "bg-white/[.04] text-content" : "text-body"
          )}
          onmousedown={preventDefault(bubble("mousedown"))}
          onclick={() => void applySuggestion(suggestion.tag)}
        >
          <span>{suggestion.tag}</span>
          {#if suggestion.count}
            <span class="text-[10px] text-faint">{suggestion.count}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  <button
    class={cn(
      "self-start border border-accent-strong/40 bg-accent-strong/10 px-4 py-2 text-[11px] text-accent-strong hover:bg-accent-strong/15",
      pending && "animate-pulse"
    )}
    onclick={addNewMem}
  >
    add
  </button>
</div>
