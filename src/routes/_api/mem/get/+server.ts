import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import type { Mem } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';

export const GET: RequestHandler = async ({ request, url }) => {
	const memId = url.searchParams.get('memId') || '';

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
	if (!mem) {
		return error(404, JSON.stringify({ error: 'Mem not found' }));
	}

	const resultMem = Object.assign({}, mem, { id: memId });
	return json({ mem: memToJson(resultMem) });
};
