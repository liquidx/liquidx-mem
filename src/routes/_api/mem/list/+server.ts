import { getFirebaseApp, getFirestoreDb } from '$lib/firebase.server.js';
import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	Firestore
} from '@google-cloud/firestore';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import type { MemListResponse } from '$lib/request.types';

const getAll = async (db: Firestore, userId: string) => {
	return db
		.collection(`users/${userId}/mems`)
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
	const body = await request.json();
	const userId = body.userId || '';

	if (!userId) {
		return error(500, 'Missing user');
	}

	const app = getFirebaseApp();
	const db = getFirestoreDb(app);
	const mems = await getAll(db, userId).catch((err: Error) => {
		return error(500, 'Error: ' + err.toString());
	});

	const response: MemListResponse = { status: 'OK', mems: mems };
	console.log('POST mem/list: Mems', mems.length);
	return json(response);
};
