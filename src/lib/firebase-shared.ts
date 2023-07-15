import { writable, type Writable } from 'svelte/store'
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export const sharedFirebaseApp: Writable<FirebaseApp | undefined> = writable(undefined);
export const sharedFirestore: Writable<Firestore | null> = writable(null);
export const sharedUser: Writable<User | null> = writable(null);
