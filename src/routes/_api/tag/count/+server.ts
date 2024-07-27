import { error, json } from '@sveltejs/kit';
import { getFirebaseApp } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import { getDb, getTagCollection } from '$lib/db';
import type { TagIndex } from '$lib/tags.types';

// TODO: Call on tag edits and creates.
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const requestUserId = body.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

	const firebaseApp = getFirebaseApp();
	const db = getDb(locals.dbClient);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	if (requestUserId != userId) {
		// Currently all users are private.
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const tags = (await getTagCollection(db).findOne({ userId: userId })) as unknown as TagIndex;
	if (!tags) {
		return error(500, 'Error: No tags');
	}

	const tagCounts = tags.counts;
	return json({ counts: tagCounts });
};
