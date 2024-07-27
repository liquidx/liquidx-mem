import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	CollectionReference,
	Query,
	Firestore
} from '@google-cloud/firestore';
import { executeQuery, getDbClient } from '$lib/db';
import { error, json } from '@sveltejs/kit';
import { MongoClient, type Db } from 'mongodb';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import type { MemListRequest, MemListResponse } from '$lib/request.types';
import { getUserId } from '$lib/server/api.server.js';

import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';

const getMems = async (client: MongoClient, userId: string, request: MemListRequest) => {
	const query: { [key: string]: any } = { userId: userId };

	if (request.isArchived) {
		query.new = false;
	} else if (request.allOfTags) {
		query['tags'] = { $all: request.allOfTags };
	} else if (request.oneOfTags) {
		query['tags'] = { $in: request.oneOfTags };
	} else if (!request.all) {
		query.new = true;
	}

	const options: { [key: string]: any } = { sort: { addedMs: -1 } };
	if (request.pageSize) {
		const pageSize = parseInt(request.pageSize);
		options.limit = pageSize;
		const page = request.page ? parseInt(request.page) : 0;
		options.skip = page * pageSize;
	}

	console.log(query, options);

	const results = await executeQuery(client, async (db: Db) => {
		const collection = db.collection('mems');
		return await collection.find(query, options);
	});

	return results;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json()) as MemListRequest;
	const requestUserId = body.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

	const mongoDb = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);
	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	if (requestUserId != userId) {
		// Currently all users are private.
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const mems = await getMems(mongoDb, userId, body).catch((err: Error) => {
		console.log('Error: ' + err.toString());
		return error(500, 'Error: ' + err.toString());
	});

	const response: MemListResponse = { status: 'OK', mems: mems };
	console.log('POST mem/list: Mems', mems.length);
	return json(response);
};
