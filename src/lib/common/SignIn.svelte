<script lang="ts">
	import {
		getAuth,
		onAuthStateChanged,
		signInWithEmailAndPassword,
		type Unsubscribe
	} from 'firebase/auth';
	import { sharedUser, sharedFirebaseApp } from '$lib/firebase-shared';

	let email = '';
	let password = '';
	let authUnsubscribe: Unsubscribe | null = null;

	function signIn() {
		const firebaseApp = $sharedFirebaseApp;
		if (firebaseApp) {
			const auth = getAuth(firebaseApp);
			signInWithEmailAndPassword(auth, email, password)
				.then((result) => {
					$sharedUser = result.user;
					console.log('Signed in!', result.user);
				})
				.catch((error) => {
					console.log(error);
				});
		}
	}

	function signOut() {
		const firebaseApp = $sharedFirebaseApp;
		if (firebaseApp) {
			const auth = getAuth(firebaseApp);
			auth.signOut();
		}
	}

	$: {
		if ($sharedFirebaseApp) {
			if (!authUnsubscribe) {
				const auth = getAuth($sharedFirebaseApp);
				authUnsubscribe = onAuthStateChanged(auth, (signedInUser) => {
					console.log('User signed in');
					$sharedUser = signedInUser;
				});
			}
		}
	}
</script>

<div class="text-sm">
	{#if $sharedUser}
		<div class="mb-2">
			<h3 class="">Signed in as {$sharedUser.email}</h3>
			<div><button class="underline" on:click={signOut}>Sign out.</button></div>
		</div>
	{:else}
		<div class="mb-2">
			<label for="email" class="block mb-2">Username</label>
			<input
				class="border rounded-lg px-2 py-1"
				id="email"
				bind:value={email}
				placeholder="your@email.com"
			/>
		</div>
		<div class="mb-2">
			<label for="password" class="block mb-2">Password</label>
			<input
				class="border rounded-lg px-2 py-1"
				id="password"
				type="password"
				bind:value={password}
			/>
		</div>
		<button class="py-2 px-4 text-xs bg-black rounded-lg text-white" on:click={signIn}
			>Sign In</button
		>
	{/if}
</div>
