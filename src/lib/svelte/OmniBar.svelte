<script lang="ts">
  import type { Mem } from "$lib/common/mems";
  import { parseText } from "$lib/common/parser";
  import { sharedUser } from "$lib/firebase-shared";
  import { addMem, getTagSuggestions } from "$lib/mem.client";
  import type { TagListItem } from "$lib/tags.types";
  import { cn } from "$lib/utils";
  import HashIcon from "@lucide/svelte/icons/hash";
  import LinkIcon from "@lucide/svelte/icons/link";
  import SearchIcon from "@lucide/svelte/icons/search";
  import { DateTime } from "luxon";
  import { onMount, tick, untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import urlRegexSafe from "url-regex-safe";

  interface Props {
    // The active tag filter as a "#a #b" string, reflected into the input.
    query?: string;
    onmemDidAdd?: (data: { mem: Mem }) => void;
    onsearch?: (data: { query: string }) => void;
    ontagFilter?: (tags: string[]) => void;
  }

  let { query = "", onmemDidAdd, onsearch, ontagFilter }: Props = $props();

  let pending = $state(false);
  let rawInput = $state("");
  let focused = $state(false);
  let placeholder = $state("search, paste a url, or type #tag to filter");
  let suggestions: TagListItem[] = $state([]);
  let highlightedIndex = $state(0);
  let showSuggestions = $state(false);
  let tokenStartIndex = 0;
  let inputEl: HTMLInputElement | null = $state(null);
  let latestQuery = "";
  let fetchSequence = 0;

  const containsUrl = (text: string) => {
    const matches = text.match(urlRegexSafe()) || [];
    return matches.some((m) => m.startsWith("http://") || m.startsWith("https://"));
  };

  // Every whitespace-separated "#token" in the text (a lone "#" is ignored).
  const extractHashtags = (text: string): string[] =>
    text
      .trim()
      .split(/\s+/)
      .filter((token) => token.startsWith("#") && token.length > 1);

  // True when the input is made up entirely of one or more #tags (and no URL),
  // e.g. "#a" or "#a #b". "#a hello" is not a tag filter — it's a search.
  const isTagFilter = $derived.by(() => {
    const trimmed = rawInput.trim();
    if (!trimmed || containsUrl(rawInput)) {
      return false;
    }
    return trimmed.split(/\s+/).every((token) => token.startsWith("#") && token.length > 1);
  });

  type Mode = "idle" | "add" | "filter" | "search";
  const mode: Mode = $derived.by(() => {
    if (!rawInput.trim()) {
      return "idle";
    }
    if (containsUrl(rawInput)) {
      return "add";
    }
    return isTagFilter ? "filter" : "search";
  });

  const modeLabel = $derived(
    mode === "add" ? "ADD" : mode === "filter" ? "FILTER" : mode === "search" ? "SEARCH" : ""
  );

  onMount(() => {
    if (window.innerWidth < 720) {
      placeholder = "search / paste / #tag";
    }
  });

  // Mirror the active tag filter into the box, but never clobber what the user
  // is actively typing.
  $effect(() => {
    const incoming = query;
    untrack(() => {
      if (!focused && rawInput !== incoming) {
        rawInput = incoming;
      }
    });
  });

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
    if (!inputEl) {
      resetSuggestions();
      return;
    }

    if (!rawInput.trim()) {
      // Clearing the bar clears an active search.
      onsearch?.({ query: "" });
    }

    const caret = inputEl.selectionStart ?? rawInput.length;
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
    if (!inputEl) {
      return;
    }

    const caret = inputEl.selectionStart ?? rawInput.length;
    const before = rawInput.slice(0, tokenStartIndex);
    const after = rawInput.slice(caret);

    resetSuggestions();
    rawInput = `${before}${tag} ${after}`;
    await tick();

    const newCaret = before.length + tag.length + 1;
    inputEl.setSelectionRange(newCaret, newCaret);
    inputEl.focus();
  };

  // Picking a suggestion filters immediately, combining any complete #tags
  // already typed before the current token with the chosen one.
  const selectSuggestion = (tag: string) => {
    const before = rawInput.slice(0, tokenStartIndex);
    const resolved = extractHashtags(`${before}${tag}`);
    const tags = resolved.length ? resolved : [tag];
    resetSuggestions();
    // Show the resolved tags in the box rather than the half-typed token.
    rawInput = tags.join(" ");
    ontagFilter?.(tags);
  };

  const submit = async () => {
    const text = rawInput.trim();

    if (containsUrl(text)) {
      if (!$sharedUser) {
        return;
      }
      const mem = parseText(rawInput);
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
        toast.error("failed to add");
      }
      return;
    }

    if (isTagFilter) {
      ontagFilter?.(extractHashtags(text));
      resetSuggestions();
      return;
    }

    onsearch?.({ query: text });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (showSuggestions) {
        event.preventDefault();
        resetSuggestions();
      }
      return;
    }

    if (showSuggestions && suggestions.length > 0) {
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

      if (event.key === "Enter") {
        event.preventDefault();
        const choice = suggestions[highlightedIndex];
        if (choice) {
          selectSuggestion(choice.tag);
        }
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const choice = suggestions[highlightedIndex];
        if (choice) {
          void applySuggestion(choice.tag);
        }
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };
</script>

<div class="relative">
  <div
    class={cn(
      "flex flex-row items-center gap-3 border bg-surface px-4 py-[15px]",
      focused ? "border-accent-strong/60" : "border-hairline-strong"
    )}
  >
    {#if mode === "add"}
      <LinkIcon class="h-[15px] w-[15px] shrink-0 text-accent-strong" />
    {:else if mode === "filter"}
      <HashIcon class="h-[15px] w-[15px] shrink-0 text-accent-strong" />
    {:else if mode === "search"}
      <SearchIcon class="h-[15px] w-[15px] shrink-0 text-accent-strong" />
    {:else}
      <span class="select-none text-[14px] font-semibold text-accent-strong">&gt;</span>
    {/if}
    <div class="relative flex flex-1 flex-row items-center">
      <input
        bind:value={rawInput}
        bind:this={inputEl}
        placeholder={focused ? placeholder : ""}
        disabled={pending}
        class="w-full bg-transparent text-[14px] text-content caret-accent-strong placeholder:text-[#8A8A94] focus:outline-none disabled:opacity-50"
        oninput={handleInput}
        onkeydown={handleKeydown}
        onfocus={() => (focused = true)}
        onblur={() => {
          focused = false;
          resetSuggestions();
        }}
      />
      {#if !focused && !rawInput}
        <div class="pointer-events-none absolute inset-0 flex flex-row items-center gap-2">
          <span class="truncate text-[14px] text-[#8A8A94]">{placeholder}</span>
          <span class="blinking-caret h-[17px] w-2 shrink-0 bg-accent-strong"></span>
        </div>
      {/if}
    </div>
    {#if modeLabel}
      <span class="select-none whitespace-nowrap text-[10px] tracking-[.1em] text-dim"
        >{modeLabel} ⏎</span
      >
    {/if}
  </div>
  {#if showSuggestions}
    <div
      class="absolute left-0 right-0 top-full z-20 border border-hairline bg-surface shadow-[0_16px_48px_rgba(0,0,0,.7)]"
    >
      {#each suggestions as suggestion, index (suggestion.tag)}
        <button
          type="button"
          class={cn(
            "flex w-full items-center gap-3 px-4 py-2 text-left text-[11px]",
            index === highlightedIndex ? "bg-white/[.04] text-content" : "text-body"
          )}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => selectSuggestion(suggestion.tag)}
        >
          <span>{suggestion.icon ?? ""} {suggestion.tag}</span>
          {#if suggestion.count}
            <span class="text-[10px] text-faint">{suggestion.count}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
