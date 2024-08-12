<script lang="ts">
  import { DateTime } from 'luxon';
  import { createEventDispatcher } from 'svelte';
  import Archive from 'lucide-svelte/icons/archive';
  import PenLine from 'lucide-svelte/icons/pen-line';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import ImageUp from 'lucide-svelte/icons/image-up';
  import Eye from 'lucide-svelte/icons/eye';

  import type { Mem, MemPhoto } from '$lib/common/mems';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Popover from '$lib/components/ui/popover';

  import AutoResizeTextarea from '$lib/thirdparty/autoresize-textarea/AutoresizeTextarea.svelte';
  import { getCachedStorageUrl } from '$lib/storage';

  type MediaUrl = {
    photo?: MemPhoto;
    video?: MemPhoto;
    url: string;
    posterUrl?: string;
    status?: string;
  };

  export let mem: Mem;

  let maxChars = 1000;
  let mediaImageUrl = '';
  let displayPhotos: MediaUrl[] = [];
  let displayVideos: MediaUrl[] = [];
  let isDragging = false;

  let titleEl: HTMLSpanElement | null = null;
  let uploadEl: HTMLInputElement | null = null;

  const dispatch = createEventDispatcher();

  function onArchive() {
    console.log('onArchive');
    dispatch('archive', { mem });
  }

  function onUnarchive() {
    dispatch('unarchive', { mem });
  }

  function onAnnotate() {
    dispatch('annotate', { mem });
  }

  function onDelete() {
    dispatch('delete', { mem });
  }

  function onSeen() {
    dispatch('seen', { mem });
  }

  function onUploadDidClick() {
    if (uploadEl) {
      uploadEl.click();
    }
  }

  function onRemovePhoto(photo: MemPhoto | undefined) {
    console.log('onRemovePhoto', photo);
    dispatch('removePhoto', { mem, photo });
  }

  $: {
    if (mem) {
      getMediaImageUrl();
      getMediaUrls();
    }
  }

  function getPrettyDate(mem_: Mem) {
    if (!mem_.addedMs) {
      return '';
    }

    const date = new Date(mem_.addedMs);
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd hh:mm');
  }

  function getPrettyTitle(mem_: Mem) {
    if (!mem_) {
      return '';
    }

    if (mem_.title) {
      return mem_.title;
    } else if (mem_.url) {
      return mem_.url.replace(/http[s]:\/\//, '');
    } else {
      return '';
    }
  }

  function getShortDescription(mem_: Mem) {
    if (!mem_.description) {
      return '';
    }
    if (mem_.description.length > maxChars) {
      return mem_.description.substring(0, maxChars) + '...';
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

    console.log('fileDidChange for mem', mem);
    dispatch('fileUpload', { mem, files: target.files });
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
    dispatch('fileUpload', { mem, files: dataTransfer.files });
  }

  const noteDidChange = async (e: CustomEvent) => {
    console.log('noteDidChange', e);
    const target: HTMLInputElement = e.target as HTMLInputElement;
    if (!target) {
      return;
    }
    const noteValue = target.value;
    console.log('noteDidChange', noteValue);
    if (noteValue != mem.note) {
      dispatch('noteChanged', { mem, text: noteValue });
      target.innerText = noteValue;
    }
  };

  function descriptionDidChange(e: CustomEvent): void {
    console.log('descriptionDidChange', e);
    const target: HTMLTextAreaElement = e.target as HTMLTextAreaElement;
    if (!target) {
      return;
    }
    const descriptionValue = target.value;
    if (descriptionValue != mem.description) {
      dispatch('descriptionChanged', { mem, text: descriptionValue });
    }
  }

  function startEdit() {
    if (titleEl) {
      const linkEl = titleEl.parentElement;
      if (!linkEl) {
        return;
      }
      const linkUrl = linkEl.getAttribute('href');
      linkEl.removeAttribute('href');

      titleEl.setAttribute('contenteditable', 'true');
      titleEl.focus();
      titleEl.onblur = () => {
        if (titleEl) {
          dispatch('titleChanged', { mem, text: titleEl.innerText });
          titleEl.removeAttribute('contenteditable');
          if (linkUrl) {
            linkEl.setAttribute('href', linkUrl);
          }
        }
      };
    }
  }

  async function getMediaImageUrl() {
    if (mem && mem.media && mem.media.path) {
      console.log('Getting url', mem.media.path);
      try {
        console.log('Got url', mem.media.path);
        mediaImageUrl = getCachedStorageUrl(mem.media.path);
      } catch (e) {
        // Silent fail
      }
    } else {
      mediaImageUrl = '';
    }
  }

  const onUrlDidKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      if (target) {
        console.log('onUrlKeyUp', target.value);
        dispatch('urlChanged', { mem, url: target.value });
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
            status: 'cached',
            photo: photo
          });
        } else {
          if (photo.mediaUrl) {
            photos.push({ photo: photo, url: photo.mediaUrl, status: 'live' });
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
              status: 'cached'
            });
          } catch (e) {
            console.log('Error getting cached video', e);
          }
        } else {
          if (video.mediaUrl) {
            videos.push({
              video: video,
              url: video.mediaUrl,
              posterUrl: video.posterUrl,
              status: 'live'
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
  class={'mem flex flex-col rounded-xl my-4 md:mx-2 py-4 px-4 md:px-6  text-muted-foreground ' +
    (isDragging ? ' bg-yellow-100' : 'bg-muted')}
  on:dragover={ondragover}
  on:dragleave={ondragleave}
  on:drop={ondrop}
>
  <div>
    <AutoResizeTextarea
      class="my-2 py-2 rounded-xl bg-input px-4 min-h-[1rem] h-8 w-full"
      maxRows={4}
      on:change={() => {
        console.log('chage');
      }}
      on:blur={noteDidChange}
      value={mem.note}
    />

    {#if mem.url}
      <div class="text-lg px-1 py-1 max-h-48 overflow-clip">
        <a href={mem.url} target="_blank" class="font-bold">
          <span class="title-text" bind:this={titleEl}>{getPrettyTitle(mem)}</span>
        </a>
        <button class="text-primary hover:text-secondary" on:click={startEdit}>
          <PenLine class="align-middle" size="16" />
        </button>
      </div>
    {/if}

    <AutoResizeTextarea
      class="my-2 py-2 rounded-xl bg-input px-4 h-8 w-full"
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
              class="text-xs text-right text-muted-foreground w-full"
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

    <div class="my-2 text-muted-foreground text-xs" title={mem._id}>
      <div>{getPrettyDate(mem)}</div>
      <div>
        <a href={`/mem/${mem._id}`} class="hover:text-secondary-foreground">{mem._id}</a>
      </div>

      <Popover.Root>
        <Popover.Trigger
          ><div class="max-h-48 overflow-y-clip">
            <button class="text-left overflow-x-clip hover:text-secondary-foreground"
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
        <Archive class="align-middle" size="12" />
        Archive
      </Button>
    {/if}

    {#if !mem.new}
      <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onUnarchive}>
        <Archive class="align-middle" size="12" />
        Unarchive
      </Button>
    {/if}

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onSeen}>
      <Eye class="align-middle" size="12" />
      Seen
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onAnnotate}>
      <PenLine class="align-middle" size="12" />
      Annotate
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onDelete}>
      <Trash2 class="align-middle" size="12" />
      Delete
    </Button>

    <Button class="flex flex-row gap-2" variant="outline" size="sm" on:click={onUploadDidClick}>
      <ImageUp class="align-middle" size="12" />
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
