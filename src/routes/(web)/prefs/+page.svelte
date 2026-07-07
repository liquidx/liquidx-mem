<script lang="ts">
  import { run } from "svelte/legacy";

  import { getLists, updateLists, getWriteSecret, updateSecrets } from "$lib/mem.client.js";
  import { sharedUser } from "$lib/firebase-shared";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { DEFAULT_LISTS, type UserList } from "$lib/common/lists";
  import type { UserWriteSecret } from "$lib/user.types";

  type ListRow = { name: string; tagsText: string; autoArchive: boolean };

  let writeSecret: UserWriteSecret = $state("");
  let rows: ListRow[] = $state([]);

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

<div class="p-4">
  <div class="mb-4">
    <div class="font-bold">Shared Secret:</div>
    <div class="flex items-center justify-between space-x-4">
      <Input type="text" bind:value={writeSecret} />
      <Button variant="secondary" on:click={saveWriteSecret}>Save</Button>
    </div>
  </div>

  <div class="mb-4">
    <div class="font-bold">Lists</div>
    <div class="mb-1 text-sm text-faint">
      Name, tags (space or comma separated), and whether adding an item auto-archives it out of the
      new feed.
    </div>
    {#each rows as row, index (index)}
      <div class="my-1 flex items-center space-x-3">
        <Input class="w-40" type="text" placeholder="name" bind:value={row.name} onblur={saveLists} />
        <Input
          class="flex-1"
          type="text"
          placeholder="#look #next"
          bind:value={row.tagsText}
          onblur={saveLists}
        />
        <label class="flex items-center space-x-1 whitespace-nowrap text-sm">
          <input type="checkbox" bind:checked={row.autoArchive} onchange={saveLists} />
          <span>auto-archive</span>
        </label>
        <Button variant="secondary" on:click={() => deleteRow(index)}>Delete</Button>
      </div>
    {/each}
    <Button class="mt-2" variant="secondary" on:click={addRow}>Add list</Button>
  </div>
</div>
