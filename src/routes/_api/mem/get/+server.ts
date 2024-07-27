import { error, json } from '@sveltejs/kit';
import type { Db } from 'mongodb';
import type { RequestHandler } from './$types';

import { getFirebaseApp } from '$lib/firebase.server.js';
import { getMem } from '$lib/mem.db.server';
import { memToJson } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { executeQuery, getDbClient } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';

export const GET: RequestHandler = async ({ request, url }) => {
	const memId = url.searchParams.get('memId') || '';

	const firebaseApp = getFirebaseApp();
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	return await executeQuery(mongo, async (db: Db) => {
		const mem = await getMem(db, userId, memId);
		return json({ mem: memToJson(mem) });
	});
};
