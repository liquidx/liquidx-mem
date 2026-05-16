<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import { initializeFirebase } from "$lib/firebase-init";
  import { sharedUser } from "$lib/firebase-shared";
  import { sharedFirebaseApp } from "$lib/firebase-shared";
  import SignIn from "$lib/svelte/SignIn.svelte";
  import { SunIcon } from "@lucide/svelte";
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";

  import "../../app.css";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  $sharedFirebaseApp = initializeFirebase();
</script>

<ModeWatcher />
<Toaster />
<div id="app">
  <div class="flex w-full flex-col overflow-x-hidden p-4 md:flex-row">
    <header class="mt-0 w-screen p-2 md:min-h-screen md:w-48">
      <div class="flex flex-row items-center justify-between">
        <h1 class="text-md py-2 font-bold text-primary">
          <a href="/">#mem</a>
        </h1>
        <div class="mx-4 md:m-2">
          <Button variant="outline" size="sm" on:click={toggleMode}
            ><SunIcon size={16}></SunIcon></Button
          >
        </div>
      </div>

      {#if $sharedUser}
        <div class="py-2">
          <ul>
            <li>
              <a href="/" class="underline">Home</a>
            </li>
            <li>
              <a href="/add" class="underline">+ Add</a>
            </li>
            <li>
              <a href="/prefs" class="underline">Preferences</a>
            </li>
            <li>
              <a href="/about" class="underline">Help & About</a>
            </li>
          </ul>
        </div>
      {/if}
      <SignIn />
    </header>
    {@render children?.()}
  </div>
</div>
