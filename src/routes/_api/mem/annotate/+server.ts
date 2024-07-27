import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { getFirebaseApp, getFirebaseStorageBucket } from '$lib/firebase.server.js';
import { getMem } from '$lib/mem.db.server';
import { memToJson } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { annotateMem } from '$lib/server/annotator.js';
import type { MemAnnotateResponse } from '$lib/request.types';
import { getDb } from '$lib/db';
import { mirrorMediaInMem } from '$lib/mem.db.server';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const memId = body['memId'] || '';

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No mem id' }));
	}

	console.log('/_api/mem/annotate', body);

	const firebaseApp = getFirebaseApp();
	const bucket = getFirebaseStorageBucket(firebaseApp);
	const db = getDb(locals.dbClient);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const mem = await getMem(db, userId, memId);
	if (!mem) {
		return error(500, JSON.stringify({ error: 'Error getting mem' }));
	}

	let updatedMem = await annotateMem(mem);
	const updatedMemWithMedia = await mirrorMediaInMem(db, bucket, updatedMem, userId);
	if (updatedMemWithMedia) {
		updatedMem = updatedMemWithMedia;
	}
	console.log('updatedMem', updatedMem);
	if (updatedMem) {
		const annotateResponse: MemAnnotateResponse = { mem: memToJson(updatedMem), memId: memId };
		return json(annotateResponse);
	}
	return error(500, JSON.stringify({ error: 'Error annotating mem' }));
};
