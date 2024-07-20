import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import type { Mem } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';
	const updates = body['updates'];

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

	const mem = memSnap.data() as unknown as Mem;

	// TODO: Update the mem with the new data in the request.
	for (const key in updates) {
		mem[key as keyof Mem] = updates[key];
	}

	if (mem) {
		return json({ mem: memToJson(mem) });
	}
	return error(500, JSON.stringify({ error: 'Error annotating mem' }));
};
