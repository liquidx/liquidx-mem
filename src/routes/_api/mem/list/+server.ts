import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	CollectionReference,
	Query,
	Firestore
} from '@google-cloud/firestore';
import { error, json } from '@sveltejs/kit';

import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import type { MemListRequest, MemListResponse } from '$lib/request.types';
import { getUserId } from '$lib/server/api.server.js';

const getMems = async (db: Firestore, request: MemListRequest) => {
	let query: CollectionReference<DocumentData> | Query<DocumentData> = db.collection(
		`users/${request.userId}/mems`
	);

	if (request.all) {
		query = query;
	} else if (request.isArchived) {
		query = query.where('new', '==', false);
	} else if (request.allOfTags) {
		// Limitation of Firestore is that we can't combined multple array-contains conditions.
		// So we have to take the first tag and query for that, then filter the results.
		const firstTag = request.allOfTags[0];
		query = query.where('tags', 'array-contains', firstTag);
	} else if (request.oneOfTags) {
		query = query.where('tags', 'array-contains-any', request.oneOfTags);
	} else {
		query = query.where('new', '==', true);
	}

	if (request.pageSize) {
		const pageSize = parseInt(request.pageSize);
		query = query.limit(pageSize);
		const page = request.page ? parseInt(request.page) : 0;
		query = query.offset(page * parseInt(request.pageSize));
	}

	return query
		.orderBy('addedMs', 'desc')
		.get()
		.then((snap: QuerySnapshot<DocumentData>) => {
			const mems: Mem[] = [];
			snap.forEach((doc: DocumentSnapshot<DocumentData>) => {
				const mem = Object.assign({}, doc.data(), { id: doc.id });
				mems.push(mem);
			});

			return mems;
		});
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as MemListRequest;
	const requestUserId = body.userId || '';

	if (!requestUserId) {
		return error(500, 'Missing user');
	}

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

	const mems = await getMems(db, body).catch((err: Error) => {
		console.log('Error: ' + err.toString());
		return error(500, 'Error: ' + err.toString());
	});

	const response: MemListResponse = { status: 'OK', mems: mems };
	console.log('POST mem/list: Mems', mems.length);
	return json(response);
};
