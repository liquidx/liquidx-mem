<script>
	import { ModeWatcher, setMode } from 'mode-watcher';

	import { sharedUser } from '$lib/firebase-shared';
	import { sharedFirebaseApp } from '$lib/firebase-shared';
	import { initializeFirebase } from '$lib/firebase-init';
	import SignIn from '$lib/svelte/SignIn.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	import '../../app.css';
	import { onMount } from 'svelte';

	$sharedFirebaseApp = initializeFirebase();

	onMount(() => {
		setMode('light');
	});
</script>

<ModeWatcher />
<Toaster />
<div id="app">
	<div class="p-4 flex flex-col w-full overflow-x-hidden md:flex-row">
		<header class="mt-0 p-2 w-screen md:min-h-screen md:w-48">
			<h1 class="text-md py-2 font-bold text-primary">
				<a href="/">#mem</a>
			</h1>

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
		<slot />
	</div>
</div>
