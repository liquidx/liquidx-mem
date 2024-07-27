import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MongoBatchReExecutionError, type Db } from 'mongodb';

import { getFirebaseApp } from '$lib/firebase.server.js';
import { getMem } from '$lib/mem.db.server';
import { memToJson } from '$lib/common/mems';
import type { Mem } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { extractEntities } from '$lib/common/parser.js';
import { refreshTagCounts } from '$lib/server/tags.server.js';

import { getDbClient, executeQuery } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';
	const updates = body['updates'];

	console.log('/_api/mem/edit:', body);

	if (!updates) {
		return error(400, JSON.stringify({ error: 'No mem' }));
	}

	const firebaseApp = getFirebaseApp();
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	return await executeQuery(mongo, async (db: Db) => {
		let mem = await getMem(db, userId, memId);
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

		const result = await executeQuery(mongo, async (db: Db) => {
			const memTable = db.collection('mems');
			return await memTable.updateOne({ userId: userId, _id: mem._id }, mem);
		});

		if (!result) {
			return error(500, JSON.stringify({ error: 'Error updating mem' }));
		}

		await refreshTagCounts(db, userId);
		const resultMem = Object.assign({}, mem, { _id: memId });
		return json({ mem: memToJson(resultMem) });
	});
};
