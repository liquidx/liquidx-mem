import type { FirebaseApp } from "firebase/app";
import type { User } from "firebase/auth";
import { type Writable, writable } from "svelte/store";

export type AuthState = "pending" | "signed-in" | "signed-out";

export const sharedFirebaseApp: Writable<FirebaseApp | undefined> = writable(undefined);
export const sharedUser: Writable<User | null> = writable(null);
export const sharedAuthState: Writable<AuthState> = writable("pending");
