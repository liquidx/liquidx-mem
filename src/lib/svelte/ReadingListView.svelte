<script lang="ts">
  import type { Mem, MemPhoto } from "$lib/common/mems";
  import { READING_LIST_TAGS } from "$lib/common/reading";
  import { sharedUser } from "$lib/firebase-shared";
  import * as memModifiers from "$lib/mem.client";
  import type { MemListRequest } from "$lib/request.types";
  import MemList from "$lib/svelte/MemList.svelte";
  import MemSearchBox from "$lib/svelte/MemSearchBox.svelte";
  import MemTagList from "$lib/svelte/MemTagList.svelte";
  import { iconForTag } from "$lib/tags";
  import axios from "axios";
  import { toast } from "svelte-sonner";

  // Tags that are never useful as a "topic" grouping.
  const SUPPRESSED_TAGS = ["#xxx"];
  // Load enough that the whole reading list can be grouped client-side.
  const pageSize = 500;

  let mems: Mem[] = $state([]);
  let searchQuery: string = $state("");
  let collapsed: Record<string, boolean> = $state({});

  interface TopicGroup {
    tag: string;
    label: string;
    icon: string;
    mems: Mem[];
  }

  const loadMems = async () => {
    if (!$sharedUser) {
      return;
    }

    const authToken = await $sharedUser.getIdToken();
    const headers = { Authorization: `Bearer ${authToken}` };
    const params: MemListRequest = {
      userId: $sharedUser.uid,
      order: "newest",
      matchAnyTags: READING_LIST_TAGS,
      pageSize,
      page: 0
    };

    const result = await axios.post(`/_api/mem/list`, params, { headers });
    if (result.data && result.data.status == "OK" && result.data.mems) {
      mems = result.data.mems;
    }
  };

  // The "topic" tags on a mem: everything other than the reading-list markers
  // and tags we never want to group by.
  const topicalTags = (mem: Mem): string[] =>
    (mem.tags || []).filter(
      (tag) => !READING_LIST_TAGS.includes(tag) && !SUPPRESSED_TAGS.includes(tag)
    );

  const matchesSearch = (mem: Mem, query: string): boolean => {
    if (!query) {
      return true;
    }
    const q = query.toLowerCase();
    return [mem.title, mem.note, mem.description, mem.url].some(
      (field) => field && field.toLowerCase().includes(q)
    );
  };

  let filteredMems = $derived(mems.filter((mem) => matchesSearch(mem, searchQuery)));

  // Group the (filtered) mems by topic tag. A mem with several topic tags
  // appears under each of them; one with none lands in "Other".
  let groups = $derived.by((): TopicGroup[] => {
    const byTag = new Map<string, Mem[]>();
    const other: Mem[] = [];

    for (const mem of filteredMems) {
      const topics = topicalTags(mem);
      if (topics.length === 0) {
        other.push(mem);
        continue;
      }
      for (const tag of topics) {
        const list = byTag.get(tag);
        if (list) {
          list.push(mem);
        } else {
          byTag.set(tag, [mem]);
        }
      }
    }

    const topicGroups: TopicGroup[] = [...byTag.entries()]
      .map(([tag, groupMems]) => ({
        tag,
        label: tag,
        icon: iconForTag(tag),
        mems: groupMems
      }))
      .sort((a, b) => b.mems.length - a.mems.length || a.tag.localeCompare(b.tag));

    if (other.length > 0) {
      topicGroups.push({ tag: "#__other", label: "Other", icon: "🗂️", mems: other });
    }

    return topicGroups;
  });

  ////
  // Actions
  ////

  const removeFromList = (memId: string | undefined) => {
    if (!memId) {
      return;
    }
    mems = mems.filter((mem) => mem._id !== memId);
  };

  const replaceInList = (updatedMem: Mem, originalMemId: string | undefined) => {
    const replacedId = originalMemId || updatedMem._id;
    mems = mems.map((mem) => (mem._id === replacedId ? updatedMem : mem));
  };

  const toggleGroup = (tag: string) => {
    collapsed = { ...collapsed, [tag]: !collapsed[tag] };
  };

  // In the reading list, "Seen" means "I've read this": strip the reading-list
  // tags so it drops off the list while staying saved.
  const markReadMem = async (data: { mem: Mem }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.markReadMem(mem, $sharedUser);
      if (updatedMem) {
        removeFromList(mem._id);
        toast.success("Marked as read");
      } else {
        toast.error("Failed to mark as read");
      }
    }
  };

  const annotateMem = async (data: { mem: Mem }) => {
    toast("Annotating...");
    const mem = data.mem;
    if (mem && $sharedUser) {
      const response = await memModifiers.annotateMem(mem, $sharedUser);
      if (response) {
        replaceInList(response.mem, response.mem._id);
        toast.success("Done");
      } else {
        toast.error("Failed to annotate...");
      }
    }
  };

  const deleteMem = async (data: { mem: Mem }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const deletedMemId = await memModifiers.deleteMem(mem, $sharedUser);
      if (deletedMemId) {
        removeFromList(deletedMemId);
      }
    }
  };

  const archiveMem = async (data: { mem: Mem }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.archiveMem(mem, $sharedUser);
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const unarchiveMem = async (data: { mem: Mem }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.unarchiveMem(mem, $sharedUser);
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const updateNoteForMem = async (data: { mem: Mem; text: string }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(
        mem,
        "note",
        data.text,
        $sharedUser
      );
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const updateTitleForMem = async (data: { mem: Mem; text: string }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(
        mem,
        "title",
        data.text,
        $sharedUser
      );
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const updateUrlForMem = async (data: { mem: Mem; url: string }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(mem, "url", data.url, $sharedUser);
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const updateDescriptionForMem = async (data: { mem: Mem; text: string }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.updatePropertyForMem(
        mem,
        "description",
        data.text,
        $sharedUser
      );
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const uploadFilesForMem = async (data: { mem: Mem; files: FileList }) => {
    const mem = data.mem;
    if (mem && $sharedUser) {
      const updatedMem = await memModifiers.uploadFilesForMem(mem, data.files, $sharedUser);
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const removePhotoFromMem = async (data: { mem: Mem; photo: MemPhoto | undefined }) => {
    const mem = data.mem;
    if (mem && data.photo && $sharedUser) {
      const updatedMem = await memModifiers.removePhotoFromMem(mem, data.photo, $sharedUser);
      if (updatedMem) {
        replaceInList(updatedMem, mem._id);
      }
    }
  };

  const searchQueryDidChange = (data: { query: string }) => {
    searchQuery = data.query;
  };

  $effect(() => {
    if ($sharedUser) {
      loadMems();
    }
  });
</script>

<svelte:head>
  <title>#mem - Reading List</title>
</svelte:head>

<div class="flex w-full flex-col overflow-x-hidden md:flex-row">
  <section class="md:my-4">
    <MemSearchBox onsearchQueryDidChange={searchQueryDidChange} />
    <MemTagList currentTagFilters={undefined} />
  </section>
  <main class="max-w-screen flex-grow p-2 md:max-w-xl">
    <h1 class="px-2 py-2 text-xl font-bold">📖 Reading List</h1>
    {#if filteredMems.length === 0}
      <p class="px-2 py-4 text-muted-foreground">
        Nothing to read. Tag mems with {READING_LIST_TAGS.join(", ")} to add them here.
      </p>
    {/if}
    {#each groups as group (group.tag)}
      <section class="my-2">
        <button
          class="flex w-full flex-row items-center gap-2 rounded-sm px-2 py-2 text-left font-bold hover:bg-neutral-900"
          onclick={() => toggleGroup(group.tag)}
        >
          <span>{collapsed[group.tag] ? "▸" : "▾"}</span>
          <span>{group.icon}</span>
          <span>{group.label}</span>
          <span class="text-muted-foreground">({group.mems.length})</span>
        </button>
        {#if !collapsed[group.tag]}
          <MemList
            mems={group.mems}
            onannotate={annotateMem}
            onarchive={archiveMem}
            onunarchive={unarchiveMem}
            ondelete={deleteMem}
            ondescriptionChanged={updateDescriptionForMem}
            onnoteChanged={updateNoteForMem}
            ontitleChanged={updateTitleForMem}
            onfileUpload={uploadFilesForMem}
            onseen={markReadMem}
            onremovePhoto={removePhotoFromMem}
            onurlChanged={updateUrlForMem}
          />
        {/if}
      </section>
    {/each}
  </main>
</div>
