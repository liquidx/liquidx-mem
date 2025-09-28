<script lang="ts">
  import { DateTime } from "luxon";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Popover from "$lib/components/ui/popover";

  import AutoResizeTextarea from "$lib/thirdparty/autoresize-textarea/AutoresizeTextarea.svelte";
  import { getCachedStorageUrl } from "$lib/storage";
  import { ArchiveIcon, EyeIcon, ImageUpIcon, PenLineIcon, Trash2Icon } from "lucide-svelte";

  type MediaUrl = {
    photo?: MemPhoto;
    video?: MemPhoto;
    url: string;
    posterUrl?: string;
    status?: string;
  };

  export let mem: Mem;

  let maxChars = 1000;
  let mediaImageUrl = "";
  let displayPhotos: MediaUrl[] = [];
  let displayVideos: MediaUrl[] = [];
  let isDragging = false;
  let isHovered = false;

  let titleEl: HTMLSpanElement | null = null;
  let uploadEl: HTMLInputElement | null = null;

  const dispatch = createEventDispatcher();

  function onArchive() {
    console.log("onArchive");
    dispatch("archive", { mem });
  }

  function onUnarchive() {
    dispatch("unarchive", { mem });
  }

  function onAnnotate() {
    dispatch("annotate", { mem });
  }

  function onDelete() {
    dispatch("delete", { mem });
  }

  function onSeen() {
    dispatch("seen", { mem });
  }

  function onUploadDidClick() {
    if (uploadEl) {
      uploadEl.click();
    }
  }

  function onRemovePhoto(photo: MemPhoto | undefined) {
    console.log("onRemovePhoto", photo);
    dispatch("removePhoto", { mem, photo });
  }

  $: {
    if (mem) {
      getMediaImageUrl();
      getMediaUrls();
    }
  }

  function getPrettyDate(mem_: Mem) {
    if (!mem_.addedMs) {
      return "";
    }

    const date = new Date(mem_.addedMs);
    return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd hh:mm");
  }

  function getPrettyTitle(mem_: Mem) {
    if (!mem_) {
      return "";
    }

    if (mem_.title) {
      return mem_.title;
    } else if (mem_.url) {
      return mem_.url.replace(/http[s]:\/\//, "");
    } else {
      return "";
    }
  }

  function getShortDescription(mem_: Mem) {
    if (!mem_.description) {
      return "";
    }
    if (mem_.description.length > maxChars) {
      return mem_.description.substring(0, maxChars) + "...";
    }
    return mem_.description;
  }

  function fileDidChange(e: Event): void {
    const target: HTMLInputElement = e.target as HTMLInputElement;
    if (!target) {
      return;
    }

    if (!target.files) {
      return;
    }

    console.log("fileDidChange for mem", mem);
    dispatch("fileUpload", { mem, files: target.files });
    // TODO: Check if there are issues if we clear this too early?
    // target.value = '';
  }

  function ondragover(e: Event) {
    e.preventDefault();
    isDragging = true;
  }

  function ondragleave() {
    isDragging = false;
  }

  function ondrop(e: DragEvent) {
    e.preventDefault();

    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) {
      return;
    }

    console.log(e.dataTransfer.files);
    isDragging = false;
    dispatch("fileUpload", { mem, files: dataTransfer.files });
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
    if (!isHovered) {
      return;
    }

    if (shouldBypassPaste()) {
      return;
    }

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    const types: string[] = [];
    for (let i = 0; i < clipboardData.types.length; i += 1) {
      const type = clipboardData.types[i];
      if (type) {
        types.push(type);
      }
    }

    const items = [];
    for (let i = 0; i < clipboardData.items.length; i += 1) {
      const item = clipboardData.items[i];
      if (item) {
        items.push({ kind: item.kind, type: item.type });
      }
    }

    const files = clipboardData.files;
    const fileSummaries = files
      ? Array.from(files).map((file) => ({ name: file.name, type: file.type, size: file.size }))
      : [];

    console.log("MemView paste", {
      memId: mem._id,
      clipboardTypes: types,
      clipboardItems: items,
      clipboardFiles: fileSummaries
    });

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
    dispatch("fileUpload", { mem, files: filesForUpload });
  };

  onMount(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("paste", handlePaste);
  });

  onDestroy(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.removeEventListener("paste", handlePaste);
  });

  const noteDidChange = async (e: FocusEvent) => {
    console.log("noteDidChange", e);
    const target: HTMLInputElement = e.target as HTMLInputElement;
    if (!target) {
      return;
    }
    const noteValue = target.value;
    console.log("noteDidChange", noteValue);
    if (noteValue != mem.note) {
      dispatch("noteChanged", { mem, text: noteValue });
      target.innerText = noteValue;
    }
  };

  function descriptionDidChange(e: FocusEvent): void {
    console.log("descriptionDidChange", e);
    const target: HTMLTextAreaElement = e.target as HTMLTextAreaElement;
    if (!target) {
      return;
    }
    const descriptionValue = target.value;
    if (descriptionValue != mem.description) {
      dispatch("descriptionChanged", { mem, text: descriptionValue });
    }
  }

  function startEdit() {
    if (titleEl) {
      const linkEl = titleEl.parentElement;
      if (!linkEl) {
        return;
      }
      const linkUrl = linkEl.getAttribute("href");
      linkEl.removeAttribute("href");

      titleEl.setAttribute("contenteditable", "true");
      titleEl.focus();
      titleEl.onblur = () => {
        if (titleEl) {
          dispatch("titleChanged", { mem, text: titleEl.innerText });
          titleEl.removeAttribute("contenteditable");
          if (linkUrl) {
            linkEl.setAttribute("href", linkUrl);
          }
        }
      };
    }
  }

  async function getMediaImageUrl() {
    if (mem && mem.media && mem.media.path) {
      console.log("Getting url", mem.media.path);
      try {
        console.log("Got url", mem.media.path);
        mediaImageUrl = getCachedStorageUrl(mem.media.path);
      } catch (e) {
        // Silent fail
      }
    } else {
      mediaImageUrl = "";
    }
  }

  const onUrlDidKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      if (target) {
        console.log("onUrlKeyUp", target.value);
        dispatch("urlChanged", { mem, url: target.value });
      }
    }
  };

  async function getMediaUrls() {
    if (!mem) {
      displayPhotos = [];
      displayVideos = [];
      return;
    }

    if (mem.photos) {
      const photos: MediaUrl[] = [];
      for (let photo of mem.photos) {
        if (photo.cachedMediaPath) {
          photos.push({
            url: getCachedStorageUrl(photo.cachedMediaPath),
            status: "cached",
            photo: photo
          });
        } else {
          if (photo.mediaUrl) {
            photos.push({ photo: photo, url: photo.mediaUrl, status: "live" });
          }
        }
      }
      displayPhotos = photos;
    } else {
      displayPhotos = [];
    }

    if (mem.videos) {
      const videos: MediaUrl[] = [];
      for (let video of mem.videos) {
        if (video.cachedMediaPath) {
          try {
            const url = getCachedStorageUrl(video.cachedMediaPath);
            videos.push({
              url: url,
              posterUrl: video.posterUrl,
              status: "cached"
            });
          } catch (e) {
            console.log("Error getting cached video", e);
          }
        } else {
          if (video.mediaUrl) {
            videos.push({
              video: video,
              url: video.mediaUrl,
              posterUrl: video.posterUrl,
              status: "live"
            });
          }
        }
      }
      displayVideos = videos;
    } else {
      displayVideos = [];
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class={"mem my-4 flex flex-col rounded-xl px-4 py-4 text-muted-foreground hover:bg-neutral-900  md:mx-2 md:px-6" +
    (isDragging ? " bg-yellow-100" : "bg-card")}
  on:dragover={ondragover}
  on:dragleave={ondragleave}
  on:drop={ondrop}
  on:mouseenter={() => (isHovered = true)}
  on:mouseleave={() => (isHovered = false)}
>
  <div>
    <AutoResizeTextarea
      class="my-2 h-8 min-h-[1rem] w-full rounded-xl bg-input px-4 py-2"
      maxRows={4}
      on:change={() => {
        console.log("chage");
      }}
      on:blur={noteDidChange}
      value={mem.note}
    />

    {#if mem.url}
      <div class="max-h-48 overflow-clip px-1 py-1 text-lg">
        <a href={mem.url} target="_blank" class="font-bold">
          <span class="title-text" bind:this={titleEl}>{getPrettyTitle(mem)}</span>
        </a>
        <button class="text-primary hover:text-secondary" on:click={startEdit}>
          <PenLineIcon class="align-middle" size="16" />
        </button>
      </div>
    {/if}

    <AutoResizeTextarea
      class="my-2 h-8 w-full rounded-xl bg-input px-4 py-2"
      minRows={2}
      maxRows={10}
      on:blur={descriptionDidChange}
      value={getShortDescription(mem)}
    />

    {#if displayVideos}
      <div class="videos">
        {#each displayVideos as video (video.url)}
          <!-- svelte-ignore a11y-media-has-caption -->
          <video src={video.url} title={video.status} class="my-4" playsinline controls loop />
        {/each}
      </div>
    {/if}

    {#if displayPhotos}
      <div class="photos">
        {#each displayPhotos as photo}
          <div>
            <img src={photo.url} alt={photo.status} title={photo.status} class="mt-4 rounded-md" />
            <button
              class="w-full text-right text-xs text-muted-foreground"
              on:click={() => onRemovePhoto(photo.photo)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    {/if}

    {#if mem.media}
      <div class="photos">
        <img src={mediaImageUrl} alt="" />
      </div>
    {/if}

    {#if mem.links}
      <ul class="my-2 py-2">
        {#each mem.links as link (link.url)}
          <li>
            <a href={link.url} target="_blank" class="text-primary-foreground">
              {#if link.description}
                {link.description}
              {:else}
                {link.url}
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="my-2 text-xs text-muted-foreground" title={mem._id}>
      <div>{getPrettyDate(mem)}</div>
      <div>
        <a href={`/mem/${mem._id}`} class="hover:text-secondary-foreground">{mem._id}</a>
      </div>

      <Popover.Root>
        <Popover.Trigger
          ><div class="max-h-48 overflow-y-clip">
            <button class="overflow-x-clip text-left hover:text-secondary-foreground"
              >{mem.url} (edit)</button
            >
          </div>
        </Popover.Trigger>
        <Popover.Content>
          <Input type="text" value={mem.url} on:keyup={onUrlDidKeyUp} />
        </Popover.Content>
      </Popover.Root>
    </div>
  </div>

  <div class="flex flex-row flex-wrap gap-1 md:gap-2">
    {#if mem.new}
      <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onArchive}>
        <ArchiveIcon class="align-middle" size="12" />
        Archive
      </Button>
    {/if}

    {#if !mem.new}
      <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onUnarchive}>
        <ArchiveIcon class="align-middle" size="12" />
        Unarchive
      </Button>
    {/if}

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onSeen}>
      <EyeIcon class="align-middle" size="12" />
      Seen
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onAnnotate}>
      <PenLineIcon class="align-middle" size="12" />
      Annotate
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onDelete}>
      <Trash2Icon class="align-middle" size="12" />
      Delete
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onUploadDidClick}>
      <ImageUpIcon class="align-middle" size="12" />
      Upload
    </Button>

    <form enctype="multipart/form-data">
      <input
        type="file"
        class="hidden"
        multiple
        name="images[]"
        id="fileInput"
        accept="image/*"
        bind:this={uploadEl}
        on:change={fileDidChange}
      />
    </form>
  </div>
</div>
