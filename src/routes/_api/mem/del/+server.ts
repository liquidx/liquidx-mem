import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { firestoreDelete } from '$lib/server/firestore-del.js';
import { refreshTagCounts } from '$lib/server/tags.server.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No mem id' }));
	}

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const result = await firestoreDelete(db, userId, memId);
	if (result) {
		await refreshTagCounts(db, userId);
		return json({ memId });
	}
	return error(500, JSON.stringify({ error: 'Error deleting mem' }));
};
