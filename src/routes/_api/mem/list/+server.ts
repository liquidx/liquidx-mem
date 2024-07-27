import { executeQuery, getDbClient } from '$lib/db';
import { error, json } from '@sveltejs/kit';
import { type Db } from 'mongodb';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import type { MemListRequest, MemListResponse } from '$lib/request.types';
import { getUserId } from '$lib/server/api.server.js';
import { getMems } from '$lib/mem.db.server';

import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';


export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json()) as MemListRequest;
	const requestUserId = body.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);
	const firebaseApp = getFirebaseApp();

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	if (requestUserId != userId) {
		// Currently all users are private.
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	return await executeQuery(mongo, async (db: Db) => {
		const mems = await getMems(db, userId, body);

		const response: MemListResponse = { status: 'OK', mems: mems };
		console.log('POST mem/list: Mems', mems.length);
		return json(response);
	});
};
