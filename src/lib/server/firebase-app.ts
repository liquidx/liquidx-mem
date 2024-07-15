import { initializeApp, type FirebaseApp } from 'firebase/app';

import type { Bucket } from '@google-cloud/storage';
import type { Firestore } from '@google-cloud/firestore';
import { getStorage } from 'firebase/storage';
import type { QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';

// @ts-expect-error : $lib/env/private exists despite ts warning.
import { MEM_FIREBASE_ADMIN_KEY } from '$env/static/private';
let sharedApp: FirebaseApp | null = null;

export const firebaseApp = (): FirebaseApp => {
	if (!sharedApp) {
		const credential = JSON.parse(MEM_FIREBASE_ADMIN_KEY);
		sharedApp = initializeApp(credential);
	}
	return sharedApp;
};

export const getFirebaseStorageBucket = (firebaseApp: FirebaseApp): Bucket => {
	return getStorage(firebaseApp).bucket('liquidx-mem.appspot.com');
};

export const getFirestoreDb = (firebaseApp: FirestoreApp): Firestore => {
	return getFirestore(firebaseApp);
};
