import { DateTime } from 'luxon';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { getUserId } from '$lib/server/api.server.js';

import { firestoreUpdate } from '$lib/server/firestore-update.js';
import { getFirebaseApp, getFirebaseStorageBucket } from '$lib/firebase.server.js';
import { writeToCloudStorage } from '$lib/server/mirror.js';
import { getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import { memToJson } from '$lib/common/mems';

const getFileExtension = (fileType: string | null): string => {
	switch (fileType) {
		case 'image/png':
			return 'png';
		case 'image/jpeg':
			return 'jpg';
		case 'image/gif':
			return 'gif';
		default:
			return '';
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body.mem || '';
	const files = [body.image];

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const bucket = getFirebaseStorageBucket(firebaseApp);
	const snapshot = await db.doc(`users/${userId}/mems/${memId}`).get();

	if (!snapshot.exists) {
		return error(404, 'Error: Mem not found');
	}

	const mem = Object.assign({}, snapshot.data(), { id: snapshot.id });

	for (const file of files) {
		const dateString = DateTime.utc().toFormat('yyyyMMddhhmmss');
		const extension = getFileExtension(file.mimetype);
		const path = `users/${userId}/attachments/${dateString}/${file.filename}.${extension}`;
		await writeToCloudStorage(bucket, path, Buffer.from(file.body, 'base64'));

		if (!mem.photos) {
			mem.photos = [];
		}

		const media = {
			cachedMediaPath: path,
			mediaUrl: `https://storage.googleapis.com/${bucket.name}/${path}`
		};
		mem.photos.push(media);
	}

	return firestoreUpdate(db, userId, memId, mem)
		.then(() => {
			return json({ mem: memToJson(mem) });
		})
		.catch((err) => {
			error(500, `Error saving: ${err}`);
		});
};
