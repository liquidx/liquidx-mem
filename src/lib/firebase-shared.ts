import { writable, type Writable } from 'svelte/store';
import type { FirebaseApp } from 'firebase/app';
import type { User } from 'firebase/auth';

export const sharedFirebaseApp: Writable<FirebaseApp | undefined> = writable(undefined);
export const sharedUser: Writable<User | null> = writable(null);
