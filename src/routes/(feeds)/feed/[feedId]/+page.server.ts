import type { Db } from 'mongodb';
import type { PageLoad } from './$types';
import { getMems } from '$lib/mem.db.server';

import { getDb } from '$lib/db';

export const load: PageLoad = async ({ params, locals }) => {
	// TODO: Verify the user ID using a secret code
	const userId = params.feedId;
	const db = getDb(locals.dbClient);
	const mems = await getMems(db, userId);
	return { mems };
};
