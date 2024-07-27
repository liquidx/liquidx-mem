import { initializeApp, getApp, type App } from 'firebase-admin/app';

// @ts-expect-error $env actually exists
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from '$env/static/public';

export const FIREBASE_PROJECT_ID = 'liquidx-mem';

export const getFirebaseApp = (): App => {
	const config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);

	let app;
	try {
		app = getApp('mem');
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (e) {
		app = initializeApp(config, 'mem');
	}
	return app;
};
