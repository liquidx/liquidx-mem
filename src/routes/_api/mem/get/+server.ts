import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getFirebaseApp } from '$lib/firebase.server.js';
import { getMem } from '$lib/mem.db.server';
import { memToJson } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { getDb } from '$lib/db';

export const GET: RequestHandler = async ({ request, url, locals }) => {
  const memId = url.searchParams.get('memId') || '';

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: 'Permission denied' }));
  }

  const mem = await getMem(db, userId, memId);
  if (!mem) {
    return error(404, JSON.stringify({ error: 'Mem not found' }));
  }
  return json({ mem: memToJson(mem) });
};
