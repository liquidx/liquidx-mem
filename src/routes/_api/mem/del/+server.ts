import { error, json } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import type { RequestHandler } from './$types';
import { USER_NOT_FOUND } from '$lib/server/firestore-user-secrets.js';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { firestoreDelete } from '$lib/server/firestore-del.js';

export const POST: RequestHandler = async ({ request }) => {
	let memId: string = '';
	if (request.method === 'POST') {
		const body = await request.json();
		memId = body['memId'] || '';
	}

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No mem id' }));
	}

	// Check auth
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token) {
		console.log('Error: No token');
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);
	let userId = '';
	if (token) {
		const decodedToken = await getAuth(firebaseApp).verifyIdToken(token);
		if (!decodedToken) {
			return error(403, JSON.stringify({ error: 'Permission denied' }));
		}
		userId = decodedToken.uid;
	}

	if (!userId || userId === USER_NOT_FOUND) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const result = await firestoreDelete(db, userId, memId);
	if (result) {
		return json({ status: 'OK' });
	}
	return error(500, JSON.stringify({ error: 'Error deleting mem' }));
};
