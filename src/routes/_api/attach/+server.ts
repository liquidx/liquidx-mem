import { DateTime } from 'luxon';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';

import { firestoreUpdate } from '$lib/server/firestore-update.js';
import { getFirebaseApp, getFirebaseStorageBucket, getFirestoreDb } from '$lib/firebase.server.js';
import { writeToCloudStorage } from '$lib/server/mirror.js';
import { validateFirebaseIdToken } from '$lib/server/firestore-user-auth.js';

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
	const validUser = await validateFirebaseIdToken(request);
	if (!validUser || !validUser.user) {
		return error(403, 'Unauthorized');
	}

	const body = await request.json();
	const memId = body.mem || '';
	const userId = validUser.user.uid;
	const files = [body.image];

	const db = getFirestoreDb(getFirebaseApp());
	const bucket = getFirebaseStorageBucket(getFirebaseApp());
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
			return json({ status: 'OK' });
		})
		.catch((err) => {
			error(500, `Error saving: ${err}`);
		});
};
