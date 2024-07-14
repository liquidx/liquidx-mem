import { DateTime } from 'luxon';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { parseText } from '$lib/common/parser.js';
import { userForSharedSecret, USER_NOT_FOUND } from '$lib/server/firestore-user-secrets.js';
import { firestoreAdd } from '$lib/server/firestore-add.js';
import { firebaseApp, getFirestoreDb, getFirebaseStorageBucket } from '$lib/server/firebase-app.js';

export const POST: RequestHandler = async ({ url, request }) => {
	let memId: string = '';
	if (request.method === 'POST') {
		const body = await request.json();
		memId = body['mem'] || '';
	}

	const db = getFirestoreDb(firebaseApp());
	const userId = await userForSharedSecret(db, secret);

	if (!userId || userId === USER_NOT_FOUND) {
		return error(403, 'Error: Permission denied.');
	}

	let mem = null;
	if (text) {
		mem = parseText(text.toString());
		if (!mem) {
			return error(500, 'error: Invalid text.');
		}
	} else if (image) {
		//const imageDataBuffer = Buffer.from(image, "base64");
		const dateString = DateTime.utc().toFormat('yyyyMMddhhmmss');
		const path = `users/${userId}/${dateString}`;
		const bucket = getFirebaseStorageBucket(firebaseApp());
		const file = bucket.file(path);

		const writable = file.createWriteStream();
		writable.write(image, 'base64');
		writable.end();

		mem = { media: { path: path } };
	} else {
		return error(500, "Error: 'text' parameter not found");
	}

	mem.new = true;
	mem.addedMs = DateTime.utc().toMillis();

	return firestoreAdd(db, userId, mem)
		.then(() => {
			return json({ status: 'OK' });
		})
		.catch((err) => {
			return error(500, `Error saving: ${err}`);
		});
};
