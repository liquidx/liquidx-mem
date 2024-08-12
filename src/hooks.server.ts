import type { MongoClient } from 'mongodb';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getDbClient } from '$lib/db';
import type { HandleServerError } from '@sveltejs/kit';
// @ts-expect-error $env actually exists
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';

let _cachedClient: MongoClient | undefined;

const dbPrepare: Handle = async ({ event, resolve }) => {
  if (_cachedClient) {
    event.locals.mongoClient = _cachedClient;
  } else {
    //console.log("hooks.server.ts: dbPrepare: create new dbClient");
    _cachedClient = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);
    event.locals.mongoClient = _cachedClient;
  }

  const response = await resolve(event);
  return response;
};

// sequence() here is in case we have multiple hooks.
export const handle = sequence(dbPrepare);

export const handleError: HandleServerError = ({ error }) => {
  return { message: (error as any).message };
};
