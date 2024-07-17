import { initializeApp, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';
import { Firestore as FirestoreClient } from '@google-cloud/firestore';

// @ts-expect-error $env actually exists
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from '$env/static/public';
// @ts-expect-error $env actually exists
import { MEM_FIREBASE_ADMIN_KEY } from '$env/static/private';

export const FIREBASE_PROJECT_ID = 'liquidx-mem';

export const getFirebaseApp = (): App => {
	const config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);

	let app;
	try {
		app = getApp('mem');
	} catch (e) {
		app = initializeApp(config, 'mem');
	}
	return app;
};

export const getFirestoreDb = (firebaseApp: App): Firestore => {
	return getFirestore(firebaseApp);
};

export const getFirebaseStorageBucket = (firebaseApp: App): Bucket => {
	return getStorage(firebaseApp).bucket('liquidx-mem.appspot.com');
};

export const getFirestoreClient = (projectId: string): FirestoreClient => {
	const credentials = JSON.parse(MEM_FIREBASE_ADMIN_KEY);
	return new FirestoreClient({ credentials, projectId });
};
