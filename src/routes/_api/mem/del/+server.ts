import { error, json } from '@sveltejs/kit';
import type { Db } from 'mongodb';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import { getFirebaseApp } from '$lib/firebase.server.js';
import { refreshTagCounts } from '$lib/server/tags.server.js';
import { deleteMem } from '$lib/mem.db.server';
import { executeQuery, getDbClient } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No mem id' }));
	}

	const firebaseApp = getFirebaseApp();
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	return await executeQuery(mongo, async (db: Db) => {
		const result = await deleteMem(db, memId);
		if (result) {
			await refreshTagCounts(db, userId);
			return json({ memId });
		}

		console.log('Failed to delete mem: ', memId);
		return error(500, JSON.stringify({ error: 'Error deleting mem' }));
	});
};
