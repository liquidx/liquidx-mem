import { json, error } from '@sveltejs/kit';
import { annotateMem } from '$lib/server/annotator.js';
import { firebaseApp, getFirestoreDb } from '$lib/server/firebase-app.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// TODO: Validate user
	const body = await request.json();
	const memId = body.mem || '';
	const userId = body.user || '';

	const db = getFirestoreDb(firebaseApp());
	const snapshot = await db.doc(`users/${userId}/mems/${memId}`).get();
	if (!snapshot.exists) {
		return error(404, 'Error: Mem not found');
	}

	const value = Object.assign({}, snapshot.data(), { id: snapshot.id });
	return annotateMem(value).then((result) => {
		delete result.id;
		snapshot.ref.update(result as { [x: string]: any });
		return json({ status: 'OK' });
	});
};
