import { error, json } from '@sveltejs/kit';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';

// TODO: Call on tag edits and creates.
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const requestUserId = body.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	if (requestUserId != userId) {
		// Currently all users are private.
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const tags = await db.collection('users').doc(userId).collection('index').doc('tags').get();
	if (!tags) {
		return error(500, 'Error: No tags');
	}

	const tagCounts = tags.data();

	return json({ counts: tagCounts.counts });
};
