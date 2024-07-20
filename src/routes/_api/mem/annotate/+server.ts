import { annotateMem } from '$lib/server/annotator.js';
import { error, json } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import type { RequestHandler } from './$types';
import { USER_NOT_FOUND } from '$lib/server/firestore-user-secrets.js';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import type { Mem } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';

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

	const memSnap = await getMem(db, userId, memId);
	if (!memSnap) {
		return error(500, JSON.stringify({ error: 'Error getting mem' }));
	}

	const mem = memSnap.data() as unknown as Mem;
	const updatedMem = await annotateMem(mem);
	if (updatedMem) {
		return json({ mem: memToJson(updatedMem) });
	}
	return error(500, JSON.stringify({ error: 'Error annotating mem' }));
};
