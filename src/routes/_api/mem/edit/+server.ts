import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import type { Mem } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { firestoreUpdate } from '$lib/server/firestore-update.js';
import { extractEntities } from '$lib/common/parser.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';
	const updates = body['updates'];

	console.log('edit:', body);

	if (!updates) {
		return error(400, JSON.stringify({ error: 'No mem' }));
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

	let mem = memSnap.data() as unknown as Mem;
	if (!mem) {
		return error(404, JSON.stringify({ error: 'Mem not found' }));
	}

	// Update the mem with the new data in the request.
	for (const key in updates) {
		mem[key as keyof Mem] = updates[key];
	}

	// Post processing of any edits to note.
	if (mem.note) {
		mem = Object.assign(mem, extractEntities(mem.note));
	}

	const result = await firestoreUpdate(db, userId, memId, mem);
	if (!result) {
		return error(500, JSON.stringify({ error: 'Error updating mem' }));
	}

	return json({ mem: memToJson(mem) });
};
