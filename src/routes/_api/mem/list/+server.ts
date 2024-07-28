import { getDb } from '$lib/db';
import { error, json } from '@sveltejs/kit';

import { getFirebaseApp } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import type { MemListRequest, MemListResponse } from '$lib/request.types';
import { getUserId } from '$lib/server/api.server.js';
import { getMems } from '$lib/mem.db.server';

export const POST: RequestHandler = async ({ request, locals }) => {
	const requestBody = (await request.json()) as MemListRequest;
	const requestUserId = requestBody.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

	const db = getDb(locals.dbClient);
	const firebaseApp = getFirebaseApp();

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	if (requestUserId != userId) {
		// Currently all users are private.
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const mems = await getMems(db, userId, requestBody);

	const response: MemListResponse = { status: 'OK', mems: mems };
	console.log('POST mem/list: Mems', mems.length);
	return json(response);
};
