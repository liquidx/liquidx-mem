<script lang="ts">
  import { DateTime } from "luxon";
  import { toast } from "svelte-sonner";

  import { parseText } from "$lib/common/parser";
  import { sharedUser } from "$lib/firebase-shared";
  import { addMem } from "$lib/mem.client";
  import { createEventDispatcher } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils";

  let pending = false;
  let rawInput: string = "";
  const dispatch = createEventDispatcher();

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
    } else {
      toast.error("Failed to add mem");
    }
  };
</script>

<div class="flex w-full flex-col px-0 py-1 md:px-1">
  <textarea
    bind:value={rawInput}
    placeholder="Enter text, urls, #tags here."
    class="text-input-foreground m-0.5 h-16 w-full rounded-xl bg-input p-3"
    disabled={pending}
  />
  <Button class={cn("my-2", pending ? "animate-pulse" : "")} on:click={addNewMem}>Add</Button>
</div>
