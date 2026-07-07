<script lang="ts">
  import { page } from "$app/state";
  import * as Popover from "$lib/components/ui/popover";
  import { Toaster } from "$lib/components/ui/sonner";
  import { initializeFirebase } from "$lib/firebase-init.svelte";
  import { sharedAuthState, sharedFirebaseApp, sharedUser } from "$lib/firebase-shared";
  import AppSkeleton from "$lib/svelte/AppSkeleton.svelte";
  import SignIn from "$lib/svelte/SignIn.svelte";
  import { Menu } from "@lucide/svelte";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import { onMount } from "svelte";

  import "../../app.css";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  let menuOpen = $state(false);

  $sharedFirebaseApp = initializeFirebase();

  onMount(() => {
    if (!$sharedFirebaseApp) {
      $sharedAuthState = "signed-out";
      return;
    }
    const auth = getAuth($sharedFirebaseApp);
    return onAuthStateChanged(auth, (signedInUser) => {
      $sharedUser = signedInUser;
      $sharedAuthState = signedInUser ? "signed-in" : "signed-out";
    });
  });

  function signOut() {
    if ($sharedFirebaseApp) {
      getAuth($sharedFirebaseApp).signOut();
    }
  }
</script>

<Toaster />
<div id="app" class="flex min-h-screen flex-col bg-base font-mono">
  <header
    class="flex flex-row items-center justify-between border-b border-white/[.06] px-4 py-[14px] md:px-6"
  >
    <h1 class="text-[14px] font-semibold tracking-[.02em] text-accent-strong">
      <a href="/">#mem</a>
    </h1>
    <div class="flex flex-row items-center gap-4 text-[10px] tracking-[.04em] text-faint">
      {#if $sharedUser}
        <nav class="hidden flex-row gap-4 md:flex">
          <a href="/add" class="hover:text-ui">add</a>
          <a href="/prefs" class="hover:text-ui">prefs</a>
          <a href="/about" class="hover:text-ui">about</a>
        </nav>
        <span class="hidden sm:inline">{$sharedUser.email}</span>
        <span class="hidden sm:inline" aria-hidden="true">·</span>
        <button class="hidden hover:text-ui md:inline" onclick={signOut}>sign out</button>

        <Popover.Root bind:open={menuOpen}>
          <Popover.Trigger
            class="flex items-center text-faint hover:text-ui md:hidden"
            aria-label="Menu"
          >
            <Menu size={16} />
          </Popover.Trigger>
          <Popover.Content
            align="end"
            class="flex w-44 flex-col gap-1 p-2 text-[10px] tracking-[.04em] text-faint"
          >
            <nav class="flex flex-col">
              <a href="/add" class="px-2 py-1.5 hover:text-ui" onclick={() => (menuOpen = false)}
                >add</a
              >
              <a href="/prefs" class="px-2 py-1.5 hover:text-ui" onclick={() => (menuOpen = false)}
                >prefs</a
              >
              <a href="/about" class="px-2 py-1.5 hover:text-ui" onclick={() => (menuOpen = false)}
                >about</a
              >
            </nav>
            <div class="my-1 border-t border-white/[.06]"></div>
            <span class="truncate px-2 text-dim">{$sharedUser.email}</span>
            <button
              class="px-2 py-1.5 text-left hover:text-ui"
              onclick={() => {
                menuOpen = false;
                signOut();
              }}>sign out</button
            >
          </Popover.Content>
        </Popover.Root>
      {:else if $sharedAuthState === "pending"}
        <div class="hidden animate-pulse flex-row gap-4 md:flex" aria-hidden="true">
          {#each { length: 4 } as _, i (i)}
            <div class="h-[10px] w-12 bg-white/[.08]"></div>
          {/each}
        </div>
      {:else}
        <a href="/about" class="hover:text-ui">about</a>
      {/if}
    </div>
  </header>
  <div class="mx-auto flex w-full max-w-[1440px] flex-1 flex-col">
    {#if $sharedUser || page.url.pathname.startsWith("/about")}
      {@render children?.()}
    {:else if $sharedAuthState === "pending"}
      <AppSkeleton />
    {:else}
      <SignIn />
    {/if}
  </div>
</div>
