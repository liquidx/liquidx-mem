import axios from 'axios';
import type { PageLoad } from './$types';
import { getAllMems } from '$lib/server/mem';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';

export const load: PageLoad = async ({ params, request }) => {
	//const firebaseApp = getFirebaseApp();
	const firestore = getFirestoreClient(FIREBASE_PROJECT_ID);

	// TODO: Verify the user ID using a secret code
	const userId = params.feedId;
	const mems = await getAllMems(firestore, userId);
	console.log(request);
	return { mems };
};
