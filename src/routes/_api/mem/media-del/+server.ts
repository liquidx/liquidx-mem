import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import type { Mem, MemPhoto } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { firestoreUpdate } from '$lib/server/firestore-update.js';
import { refreshTagCounts } from '$lib/server/tags.server.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';
	const mediaUrl = body['mediaUrl'] || '';

	console.log('/_api/mem/media-edit:', body);

	if (!mediaUrl) {
		return error(400, JSON.stringify({ error: 'No mediaUrl' }));
	}

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No memId' }));
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
	if (!mem) {
		return error(404, JSON.stringify({ error: 'Mem not found' }));
	}

	// Iterate through the media to remove the item that has the mediaURl
	if (mem.photos) {
		for (let i = 0; i < mem.photos.length; i++) {
			const photo: MemPhoto = mem.photos[i];
			if (photo.mediaUrl === mediaUrl) {
				mem.photos.splice(i, 1);
				break;
			}
		}
	}

	const result = await firestoreUpdate(db, userId, memId, mem);
	if (!result) {
		return error(500, JSON.stringify({ error: 'Error updating mem' }));
	}

	await refreshTagCounts(db, userId);
	const resultMem = Object.assign({}, mem, { id: memId });
	return json({ mem: memToJson(resultMem) });
};
