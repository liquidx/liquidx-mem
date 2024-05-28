import { firebaseApp, getFirestoreDb } from '$lib/server/firebase-app.js';
import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	Firestore
} from '@google-cloud/firestore';
import { type IndexTagDocument, getTagCounts } from '$lib/server/tags';
import type { Mem } from '$lib/common/mems';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

const refreshTagCounts = async (db: Firestore, userId: string) => {
	return db
		.collection(`users/${userId}/mems`)
		.get()
		.then((snap: QuerySnapshot<DocumentData>) => {
			const mems: Mem[] = [];
			snap.forEach((doc: DocumentSnapshot<DocumentData>) => {
				const mem = Object.assign({}, doc.data(), { id: doc.id });
				mems.push(mem);
			});

			const counts = getTagCounts(mems);
			return db.doc(`users/${userId}/index/tags`).set({ counts: counts } as IndexTagDocument);
		});
};

// TODO: Call on tag edits and creates.
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const userId = body.user || '';

	if (!userId) {
		return error(500, 'Missing user');
	}
	const db = getFirestoreDb(firebaseApp());
	await refreshTagCounts(db, userId).catch((err: Error) => {
		return error(500, 'Error: ' + err.toString());
	});
	return json({ status: 'OK' });
};
