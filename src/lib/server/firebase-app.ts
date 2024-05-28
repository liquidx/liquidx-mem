import firebaseAdmin from 'firebase-admin';

import type { Bucket } from '@google-cloud/storage';
import type { Firestore } from '@google-cloud/firestore';
import type { app } from 'firebase-admin';
// import { initializeApp, type App } from 'firebase-admin';
// import { getFirestore, type Firestore } from 'firebase-admin';
// import { getStorage } from 'firebase-admin/storage';
// @ts-expect-error : $lib/env/private exists despite ts warning.
import { MEM_FIREBASE_ADMIN_KEY } from '$env/static/public';
let sharedApp: app.App | null = null;

export const firebaseApp = (): app.App => {
	if (!sharedApp) {
		sharedApp = firebaseAdmin.initializeApp({ credential: MEM_FIREBASE_ADMIN_KEY });
	}
	return sharedApp;
};

export const getFirebaseStorageBucket = (firebaseApp: app.App): Bucket => {
	return firebaseApp.storage().bucket('liquidx-mem.appspot.com');
};

export const getFirestoreDb = (firebaseApp: app.App): Firestore => {
	return firebaseApp.firestore();
};
