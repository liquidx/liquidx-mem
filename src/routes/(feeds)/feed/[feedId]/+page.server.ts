import type { Db } from 'mongodb';
import type { PageLoad } from './$types';
import { getMems } from '$lib/mem.db.server';

import { getDbClient } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';
import { executeQuery } from '$lib/mem-data-queries';

export const load: PageLoad = async ({ params, request }) => {
	// TODO: Verify the user ID using a secret code
	const userId = params.feedId;
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);
	return await executeQuery(mongo, async (db: Db) => {
		const mems = await getMems(db, userId);
		return { mems };
	});
};
