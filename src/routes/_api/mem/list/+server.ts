import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	CollectionReference,
	Query,
	Firestore
} from '@google-cloud/firestore';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import type { MemListRequest, MemListResponse } from '$lib/request.types';
import { getUserId } from '$lib/server/api.server.js';

const getMems = async (db: Firestore, request: MemListRequest) => {
	let ref: CollectionReference<DocumentData> | Query<DocumentData> = db.collection(
		`users/${request.userId}/mems`
	);

	if (request.isArchived) {
		ref = ref.where('new', '==', false);
	} else if (request.allOfTags) {
		// Limitation of Firestore is that we can't combined multple array-contains conditions.
		// So we have to take the first tag and query for that, then filter the results.
		const firstTag = request.allOfTags[0];
		ref = ref.where('tags', 'array-contains', firstTag);
	} else if (request.oneOfTags) {
		ref = ref.where('tags', 'array-contains-any', request.oneOfTags);
	} else {
		ref = ref.where('new', '==', true);
	}

	// TODO: ref.limit(request.pageSize)
	const pageSize = request.pageSize ?? 100;
	const page = request.page ?? 0;

	return ref
		.orderBy('addedMs', 'desc')
		.limit(pageSize)
		.offset(pageSize * page)
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
