import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp } from '$lib/firebase.server.js';
import { getMem } from '$lib/mem.db.server';
import { memToJson } from '$lib/common/mems';
import type { MemPhoto } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { refreshTagCounts } from '$lib/server/tags.server.js';
import { executeQuery, getDbClient } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';
import { updateMem } from '$lib/mem.db.server';

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
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	return await executeQuery(mongo, async (db: Db) => {
		const mem = await getMem(db, userId, memId);
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

		const result = await updateMem(db, mem);
		if (!result) {
			return error(500, JSON.stringify({ error: 'Error updating mem' }));
		}

		await refreshTagCounts(db, userId);
		const resultMem = Object.assign({}, mem, { id: memId });
		return json({ mem: memToJson(resultMem) });
	});
};
