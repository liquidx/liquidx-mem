<script lang="ts">
  import { sharedFirebaseApp, sharedUser } from "$lib/firebase-shared";
  import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

  let email = $state("");
  let password = $state("");
  let failed = $state(false);

  function signIn() {
    const firebaseApp = $sharedFirebaseApp;
    if (firebaseApp) {
      const auth = getAuth(firebaseApp);
      signInWithEmailAndPassword(auth, email, password)
        .then((result) => {
          $sharedUser = result.user;
          failed = false;
        })
        .catch((error) => {
          console.log(error);
          failed = true;
        });
    }
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      signIn();
    }
  };
</script>

<div class="mx-auto mt-20 w-full max-w-[360px] px-4 md:px-6">
  <div class="border border-hairline bg-surface p-6">
    <h2 class="text-[9px] font-semibold uppercase tracking-[.16em] text-accent-strong">sign in</h2>
    <div class="mt-5 flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-[9px] uppercase tracking-[.14em] text-faint">email</span>
        <input
          class="border border-hairline-strong bg-base px-3 py-2 text-[12px] text-content focus:border-accent-strong focus:outline-none"
          id="email"
          bind:value={email}
          onkeydown={onKeydown}
          placeholder="your@email.com"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-[9px] uppercase tracking-[.14em] text-faint">password</span>
        <input
          class="border border-hairline-strong bg-base px-3 py-2 text-[12px] text-content focus:border-accent-strong focus:outline-none"
          id="password"
          type="password"
          bind:value={password}
          onkeydown={onKeydown}
        />
      </label>
      {#if failed}
        <div class="text-[10px] text-danger">▪ sign in failed</div>
      {/if}
      <button
        class="border border-accent-strong/40 bg-accent-strong/10 px-4 py-2 text-[11px] text-accent-strong hover:bg-accent-strong/15"
        onclick={signIn}
      >
        sign in
      </button>
    </div>
  </div>
</div>
