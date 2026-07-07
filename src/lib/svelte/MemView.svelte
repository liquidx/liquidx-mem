<script lang="ts">
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { extractTags } from "$lib/common/parser";
  import { getCachedStorageUrl } from "$lib/storage";
  import { cn } from "$lib/utils";
  import { DateTime } from "luxon";
  import { onDestroy, onMount, tick } from "svelte";

  type MediaUrl = {
    photo?: MemPhoto;
    video?: MemPhoto;
    url: string;
    posterUrl?: string;
    status?: string;
  };

  interface Props {
    mem: Mem;
    density?: "full" | "minimal";
    listTags?: string[];
    editing?: boolean;
    onrequestEdit?: (data: { mem: Mem }) => void;
    oncloseEdit?: () => void;
    onedit?: (data: { mem: Mem; updates: Partial<Mem> }) => void;
    onarchive?: (data: { mem: Mem }) => void;
    onunarchive?: (data: { mem: Mem }) => void;
    onannotate?: (data: { mem: Mem }) => void;
    ondelete?: (data: { mem: Mem }) => void;
    onseen?: (data: { mem: Mem }) => void;
    onremovePhoto?: (data: { mem: Mem; photo: MemPhoto | undefined }) => void;
    onfileUpload?: (data: { mem: Mem; files: FileList }) => void;
  }

  let {
    mem,
    density = "full",
    listTags = [],
    editing = false,
    onrequestEdit,
    oncloseEdit,
    onedit,
    onarchive,
    onunarchive,
    onannotate,
    ondelete,
    onseen,
    onremovePhoto,
    onfileUpload
  }: Props = $props();

  let isDragging = $state(false);
  let isHovered = $state(false);
  let uploadEl: HTMLInputElement | null = $state(null);
  let titleInputEl: HTMLInputElement | null = $state(null);

  // Editor draft
  let draftTitle = $state("");
  let draftUrl = $state("");
  let draftNote = $state("");
  let draftTags = $state("");
  let wasEditing = false;
  let skipCommit = false;

  const unseen = $derived((mem.tags ?? []).some((tag) => listTags.includes(tag)));

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

  const displayUrl = $derived.by(() => {
    if (!mem.url) {
      return "";
    }
    let url = mem.url.replace(/^http[s]?:\/\//, "").replace(/\/$/, "");
    if (url.length > 48) {
      url = url.slice(0, 48) + "…";
    }
    return url;
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

  const displayNote = $derived.by(() => {
    // Prefer the annotated description (e.g. Open Graph) and fall back to the
    // user's note. Tags render inline after the title, so strip them out here
    // so this line only shows prose.
    let text = mem.description || mem.note || "";
    text = text
      .replace(/#[^\s,]+/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
    return text.length > 1000 ? text.slice(0, 1000) + "…" : text;
  });

  const displayPhotos = $derived.by(() => {
    const photos: MediaUrl[] = [];
    for (const photo of mem.photos ?? []) {
      if (photo.cachedMediaPath) {
        photos.push({ url: getCachedStorageUrl(photo.cachedMediaPath), status: "cached", photo });
      } else if (photo.mediaUrl) {
        photos.push({ photo, url: photo.mediaUrl, status: "live" });
      }
    }
    if (mem.media?.path) {
      photos.push({ url: getCachedStorageUrl(mem.media.path), status: "media" });
    }
    return photos;
  });

  const displayVideos = $derived.by(() => {
    const videos: MediaUrl[] = [];
    for (const video of mem.videos ?? []) {
      if (video.cachedMediaPath) {
        videos.push({
          url: getCachedStorageUrl(video.cachedMediaPath),
          posterUrl: video.posterUrl,
          status: "cached"
        });
      } else if (video.mediaUrl) {
        videos.push({ video, url: video.mediaUrl, posterUrl: video.posterUrl, status: "live" });
      }
    }
    return videos;
  });

  ////
  // Editor
  ////

  const parseTagsString = (value: string): string[] => {
    return value
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .map((token) => `#${token.replace(/^#+/, "").toLowerCase()}`);
  };

  const initDraft = () => {
    draftTitle = mem.title ?? "";
    draftUrl = mem.url ?? "";
    draftNote = mem.note ?? "";
    draftTags = (mem.tags ?? []).join(" ");
  };

  const commitDraft = () => {
    const updates: Partial<Mem> = {};

    if (draftTitle !== (mem.title ?? "")) {
      updates.title = draftTitle;
    }
    if (draftUrl !== (mem.url ?? "")) {
      updates.url = draftUrl;
    }

    // Tags live inside the note text (the server re-extracts them from it),
    // so tag edits are folded into the note: removed tags are stripped from
    // the text, added tags appended.
    const originalTags = mem.tags ?? [];
    const newTags = parseTagsString(draftTags);
    const tagsChanged =
      newTags.length !== originalTags.length || newTags.some((t) => !originalTags.includes(t));

    let note = draftNote;
    if (tagsChanged) {
      const removed = originalTags.filter((t) => !newTags.includes(t));
      for (const tag of removed) {
        note = note.replaceAll(tag, "");
      }
      note = note.replace(/[ \t]+/g, " ").trim();
      const missing = newTags.filter((t) => !extractTags(note).includes(t));
      if (missing.length > 0) {
        note = `${note} ${missing.join(" ")}`.trim();
      }
      updates.tags = newTags;
    }
    if (note !== (mem.note ?? "")) {
      updates.note = note;
    }

    if (Object.keys(updates).length > 0) {
      onedit?.({ mem, updates });
    }
  };

  $effect(() => {
    if (editing && !wasEditing) {
      wasEditing = true;
      skipCommit = false;
      initDraft();
      tick().then(() => titleInputEl?.focus());
    } else if (!editing && wasEditing) {
      wasEditing = false;
      if (!skipCommit) {
        commitDraft();
      }
      skipCommit = false;
    }
  });

  const dismissEditor = () => {
    oncloseEdit?.();
  };

  const discardEditor = () => {
    skipCommit = true;
    oncloseEdit?.();
  };

  const editorKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      discardEditor();
      return;
    }
    if (e.key === "Enter") {
      const isTextarea = e.target instanceof HTMLTextAreaElement;
      if (!isTextarea || !e.shiftKey) {
        e.preventDefault();
        dismissEditor();
      }
    }
  };

  ////
  // Attachments
  ////

  function onUploadDidClick() {
    uploadEl?.click();
  }

  function fileDidChange(e: Event): void {
    const target: HTMLInputElement = e.target as HTMLInputElement;
    if (!target || !target.files) {
      return;
    }
    onfileUpload?.({ mem, files: target.files });
  }

  function ondragover(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.types.includes("Files")) {
      isDragging = true;
    }
  }

  function ondragleave() {
    isDragging = false;
  }

  function ondrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) {
      return;
    }
    onfileUpload?.({ mem, files: dataTransfer.files });
  }

  const shouldBypassPaste = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) {
      return false;
    }
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return true;
    }
    return active.isContentEditable;
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (!isHovered || shouldBypassPaste()) {
      return;
    }

    const files = event.clipboardData?.files;
    if (!files || files.length === 0) {
      return;
    }

    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return;
    }

    let filesForUpload: FileList = files;
    if (typeof DataTransfer !== "undefined") {
      const dataTransfer = new DataTransfer();
      images.forEach((image) => dataTransfer.items.add(image));
      filesForUpload = dataTransfer.files;
    }

    event.preventDefault();
    onfileUpload?.({ mem, files: filesForUpload });
  };

  onMount(() => {
    window.addEventListener("paste", handlePaste);
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("paste", handlePaste);
    }
  });
</script>

{#if editing}
  <div
    class="relative border-l-2 border-accent-strong bg-accent-strong/[.045] px-4 pb-[18px] pt-4 md:px-6"
  >
    <div class="flex flex-row items-center">
      <span class="text-[9px] font-semibold uppercase tracking-[.16em] text-accent-strong">
        editing
      </span>
      <div class="flex-1"></div>
      <span class="mr-3 text-[9px] tracking-[.1em] text-dim">⏎ done</span>
      <button
        class="text-faint hover:text-accent-strong"
        aria-label="close editor"
        onclick={dismissEditor}
      >
        <svg
          width="13"
          height="13"
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
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="mt-3 flex flex-col gap-3" onkeydown={editorKeydown}>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-[9px] uppercase tracking-[.14em] text-faint">title</span>
          <input
            bind:this={titleInputEl}
            bind:value={draftTitle}
            class="border border-hairline-strong bg-base px-2.5 py-[7px] text-[12px] text-content focus:border-accent-strong focus:outline-none"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[9px] uppercase tracking-[.14em] text-faint">url</span>
          <input
            bind:value={draftUrl}
            class="border border-hairline-strong bg-base px-2.5 py-[7px] text-[11px] text-accent-muted focus:border-accent-strong focus:outline-none"
          />
        </label>
      </div>
      <label class="flex flex-col gap-1">
        <span class="text-[9px] uppercase tracking-[.14em] text-faint">note</span>
        <textarea
          bind:value={draftNote}
          class="min-h-[48px] border border-hairline-strong bg-base px-2.5 py-[7px] text-[11px] leading-[1.6] text-body focus:border-accent-strong focus:outline-none"
        ></textarea>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[9px] uppercase tracking-[.14em] text-faint">tags</span>
        <input
          bind:value={draftTags}
          class="border border-hairline-strong bg-base px-2.5 py-[7px] text-[11px] text-accent-muted focus:border-accent-strong focus:outline-none"
        />
      </label>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={cn(
      "group relative grid grid-cols-[34px_16px_1fr_20px] px-4 hover:bg-white/[.025] md:grid-cols-[44px_16px_1fr_20px] md:px-6",
      density === "full" ? "py-[13px]" : "py-[5px]"
    )}
    {ondragover}
    {ondragleave}
    {ondrop}
    onmouseenter={() => (isHovered = true)}
    onmouseleave={() => (isHovered = false)}
  >
    <a
      href={`/mem/${mem._id}`}
      class="pt-[2px] text-[9px] text-faint hover:text-tertiary md:text-[10px]"
    >
      {displayDate}
    </a>

    <div class="pt-[5px]">
      {#if unseen}
        <span
          class="block h-2 w-2 rounded-full bg-accent-strong shadow-[0_0_8px_rgba(217,142,82,.55)]"
        ></span>
      {/if}
    </div>

    <div class="min-w-0 max-w-[640px]">
      <div class="text-[12px] text-content md:text-[13px]">
        {#if mem.url}
          <a href={mem.url} target="_blank" rel="noreferrer" class="hover:underline">
            {displayTitle}
          </a>
        {:else}
          {displayTitle}
        {/if}
        {#if density === "minimal" && displayDomain}
          <span class="ml-1 text-[10px] text-faint">{displayDomain}</span>
        {/if}
        {#if mem.tags && mem.tags.length > 0}
          <span class="ml-1 whitespace-nowrap text-[10px] text-accent-muted">
            {mem.tags.join(" ")}
          </span>
        {/if}
      </div>

      {#if density === "full"}
        {#if displayUrl}
          <div class="mt-[2px] text-[11px] text-accent-muted">
            <a href={mem.url} target="_blank" rel="noreferrer" class="hover:underline">
              {displayUrl}
            </a>
          </div>
        {/if}

        {#if displayNote}
          <div class="mt-1 text-[12px] leading-[1.6] text-body">
            {displayNote}
          </div>
        {/if}

        {#each displayPhotos as photo, photoIndex (`${photoIndex}-${photo.url}`)}
          <div class="relative mt-2 inline-block max-w-[420px]">
            <img
              src={photo.url}
              alt=""
              title={photo.status}
              class="max-h-[120px] max-w-full border border-hairline object-cover"
            />
            {#if photo.photo}
              <button
                class="absolute right-0 top-0 flex h-[18px] w-[18px] items-center justify-center border border-danger/50 bg-[rgba(8,8,10,.85)] text-[10px] text-danger"
                aria-label="remove image"
                onclick={() => onremovePhoto?.({ mem, photo: photo.photo })}
              >
                ✕
              </button>
            {/if}
          </div>
        {/each}

        {#each displayVideos as video, videoIndex (`${videoIndex}-${video.url}`)}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            src={video.url}
            poster={video.posterUrl}
            title={video.status}
            class="mt-2 max-w-[420px] border border-hairline"
            playsinline
            controls
            loop
          ></video>
        {/each}

        <div class="mt-2 flex flex-row gap-4 text-[10px] text-tertiary">
          {#if mem.new}
            <button class="hover:text-content" onclick={() => onarchive?.({ mem })}>archive</button>
          {:else}
            <button class="hover:text-content" onclick={() => onunarchive?.({ mem })}>
              unarchive
            </button>
          {/if}
          {#if unseen}
            <button class="hover:text-content" onclick={() => onseen?.({ mem })}>seen</button>
          {/if}
          <button class="hover:text-content" onclick={() => onannotate?.({ mem })}>annotate</button>
          <button class="hover:text-content" onclick={onUploadDidClick}>upload</button>
          <button class="text-danger/70 hover:text-danger" onclick={() => ondelete?.({ mem })}>
            delete
          </button>
        </div>
      {/if}
    </div>

    <button
      class="justify-self-end self-start pt-[2px] text-faint opacity-0 hover:text-accent-strong focus:opacity-100 group-hover:opacity-100"
      aria-label="edit"
      onclick={() => onrequestEdit?.({ mem })}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="square"
        stroke-linejoin="miter"
      >
        <path d="M4 20h4L18.5 9.5a2.828 2.828 0 1 0-4-4L4 16v4" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    </button>

    {#if isDragging}
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center border border-dashed border-accent-strong bg-accent-strong/[.07]"
      >
        <span class="text-[11px] uppercase tracking-[.1em] text-accent-strong">
          release to attach image
        </span>
      </div>
    {/if}

    <form enctype="multipart/form-data" class="hidden">
      <input
        type="file"
        multiple
        name="images[]"
        accept="image/*"
        bind:this={uploadEl}
        onchange={fileDidChange}
      />
    </form>
  </div>
{/if}
