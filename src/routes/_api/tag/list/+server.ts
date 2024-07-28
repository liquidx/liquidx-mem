import { error, json } from '@sveltejs/kit';
import { getFirebaseApp } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import { getDb, getTagCollection } from '$lib/db';
import type { TagIndex } from '$lib/tags.types';
import { getMems } from '$lib/mem.db.server';
import { tagFiltersByString } from '$lib/filter';
import type { MemListRequest } from '$lib/request.types';
import { computeTagCounts, type MemTags } from '$lib/tags.server';

// TODO: Call on tag edits and creates.
export const GET: RequestHandler = async ({ request, url, locals }) => {
	const requestUserId = url.searchParams.get('userId') || '';
	const filter = url.searchParams.get('filter') || '';

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

	// Returns all tags.
	if (!filter) {
		const tags = (await getTagCollection(db).findOne({ userId: userId })) as unknown as TagIndex;
		if (!tags) {
			return error(500, 'Error: No tags');
		}

		const tagCounts = tags.counts;
		return json({ counts: tagCounts });
	}

	const tagFilter = tagFiltersByString(filter);
	const memsRequest: MemListRequest = {
		userId: userId,
		matchAllTags: tagFilter.matchAllTags,
		matchAnyTags: tagFilter.matchAnyTags
	};
	const projection = { tags: 1, _id: 1 };
	const memTags: MemTags[] = (await getMems(
		db,
		userId,
		memsRequest,
		projection
	)) as unknown as MemTags[];
	const counts = computeTagCounts(memTags);
	return json({ counts: counts });

	// count tags based on these mems.
};
