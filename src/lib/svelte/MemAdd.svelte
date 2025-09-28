<script lang="ts">
  import { DateTime } from "luxon";
  import { toast } from "svelte-sonner";

  import { parseText } from "$lib/common/parser";
  import { sharedUser } from "$lib/firebase-shared";
  import { addMem, getTagSuggestions } from "$lib/mem.client";
  import type { TagListItem } from "$lib/tags.server";
  import { createEventDispatcher, tick } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils";

  let pending = false;
  let rawInput: string = "";
  let suggestions: TagListItem[] = [];
  let highlightedIndex = 0;
  let showSuggestions = false;
  let tokenStartIndex = 0;
  let textareaEl: HTMLTextAreaElement | null = null;
  let latestQuery = "";
  let fetchSequence = 0;
  const dispatch = createEventDispatcher();

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
      dispatch("memDidAdd", { mem: addedMem });
      rawInput = "";
      resetSuggestions();
    } else {
      toast.error("Failed to add mem");
    }
  };
</script>

<div class="relative flex w-full flex-col px-0 py-1 md:px-1">
  <textarea
    bind:value={rawInput}
    bind:this={textareaEl}
    placeholder="Enter text, urls, #tags here."
    class="text-input-foreground m-0.5 h-16 w-full rounded-xl bg-input p-3"
    disabled={pending}
    on:input={handleInput}
    on:keydown={handleKeydown}
  />
  {#if showSuggestions}
    <div
      class="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-popover shadow-lg"
    >
      {#each suggestions as suggestion, index (suggestion.tag)}
        <button
          type="button"
          class={cn(
            "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
            index === highlightedIndex ? "bg-accent text-accent-foreground" : "text-foreground"
          )}
          on:mousedown|preventDefault
          on:click={() => void applySuggestion(suggestion.tag)}
        >
          <span class="font-mono">{suggestion.tag}</span>
          {#if suggestion.count}
            <span class="text-xs text-muted-foreground">{suggestion.count}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  <Button class={cn("my-2", pending ? "animate-pulse" : "")} on:click={addNewMem}>Add</Button>
</div>
