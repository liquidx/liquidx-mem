import { error, json } from '@sveltejs/kit';
import { getFirebaseApp } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import type { SettingsWriteRequest, SettingsReadResponse } from '$lib/request.types.js';
import { getDb, getUserCollection } from '$lib/db';

export const GET: RequestHandler = async ({ request, url, locals }) => {
  const prefKey = url.searchParams.get('key') || '';
  if (!prefKey) {
    return error(400, 'Missing key');
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: 'Permission denied' }));
  }
  const user = await getUserCollection(db).findOne({ _id: userId });
  if (!user) {
    return error(500, 'Error: No user');
  }

  const response: SettingsReadResponse = { key: prefKey, settings: user[prefKey] };
  return json(response);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json()) as SettingsWriteRequest;
  const prefKey = body.key || '';
  const settings = body.settings || '';
  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: 'Permission denied' }));
  }
  const user = await getUserCollection(db).findOneAndUpdate(
    { _id: userId },
    { $set: { [prefKey]: settings } },
    { returnDocument: 'after' }
  );
  if (!user) {
    return error(500, 'Error: No user');
  }
  const response = { key: prefKey, settings };
  return json(response);
};
