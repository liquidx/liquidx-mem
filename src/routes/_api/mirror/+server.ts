import { json, error } from '@sveltejs/kit';
import { mirrorMedia } from '$lib/server/mirror.js';
import { getFirebaseApp, getFirebaseStorageBucket, getFirestoreDb } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body.mem || '';
	const userId = body.user || '';

	const db = getFirestoreDb(getFirebaseApp());
	return db
		.doc(`users/${userId}/mems/${memId}`)
		.get()
		.then((snap) => {
			const mem = Object.assign({}, snap.data(), { id: snap.id });
			const outputPath = `users/${userId}/media`;
			const bucket = getFirebaseStorageBucket(getFirebaseApp());
			return mirrorMedia(mem, bucket, outputPath).then((updatedMem) => {
				const writable = Object.assign({}, updatedMem);
				delete writable.id;
				snap.ref.update(writable as { [x: string]: any });
				return json({ status: 'OK' });
			});
		})
		.catch((err) => {
			return error(500, 'Error: ' + err.toString());
		});
};