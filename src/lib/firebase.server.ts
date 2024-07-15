import { initializeApp, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

// @ts-expect-error $env actually exists
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from '$env/static/public';

export const getFirebaseApp = (): App => {
	const config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);

	let app = getApp('mem');
	if (!app) {
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
