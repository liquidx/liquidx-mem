<script lang="ts">
  import { page } from "$app/state";
  import { Toaster } from "$lib/components/ui/sonner";
  import { initializeFirebase } from "$lib/firebase-init";
  import { sharedFirebaseApp, sharedUser } from "$lib/firebase-shared";
  import SignIn from "$lib/svelte/SignIn.svelte";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import { onMount } from "svelte";

  import "../../app.css";

  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();

  $sharedFirebaseApp = initializeFirebase();

  onMount(() => {
    if (!$sharedFirebaseApp) {
      return;
    }
    const auth = getAuth($sharedFirebaseApp);
    return onAuthStateChanged(auth, (signedInUser) => {
      $sharedUser = signedInUser;
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
        <button class="hover:text-ui" onclick={signOut}>sign out</button>
      {:else}
        <a href="/about" class="hover:text-ui">about</a>
      {/if}
    </div>
  </header>
  <div class="mx-auto flex w-full max-w-[1440px] flex-1 flex-col">
    {#if $sharedUser || page.url.pathname.startsWith("/about")}
      {@render children?.()}
    {:else}
      <SignIn />
    {/if}
  </div>
</div>
