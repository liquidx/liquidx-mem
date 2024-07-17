import { DateTime } from 'luxon';
import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { parseText } from '$lib/common/parser.js';
import { userForSharedSecret, USER_NOT_FOUND } from '$lib/server/firestore-user-secrets.js';
import { firestoreAdd } from '$lib/server/firestore-add.js';
import { getAuth } from 'firebase-admin/auth';
import {
	FIREBASE_PROJECT_ID,
	getFirebaseApp,
	getFirebaseStorageBucket,
	getFirestoreClient
} from '$lib/firebase.server.js';

export const fallback: RequestHandler = async ({ url, request }) => {
	let text: string = '';
	let image: string = '';
	let secret: string = '';

	if (request.method === 'POST') {
		const body = await request.json();
		text = body['text'] || '';
		image = body['image'] || '';
		secret = body['secret'] || '';
	} else if (request.method === 'GET') {
		text = url.searchParams.get('text') || '';
		image = url.searchParams.get('image') || '';
		secret = url.searchParams.get('secret') || '';
	} else {
		error(405, 'Method Not Allowed');
	}

	// Check auth
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token && !secret) {
		console.log('Error: No token or secret');
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);
	let userId = '';
	if (token) {
		const decodedToken = await getAuth(firebaseApp).verifyIdToken(token);
		if (!decodedToken) {
			return error(403, JSON.stringify({ error: 'Permission denied' }));
		}
		userId = decodedToken.uid;
	} else if (secret) {
		userId = await userForSharedSecret(db, secret);
	}

	if (!userId || userId === USER_NOT_FOUND) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	let mem = null;
	if (text) {
		mem = parseText(text.toString());
		if (!mem) {
			return error(500, JSON.stringify({ error: 'Invalid text' }));
		}
	} else if (image) {
		//const imageDataBuffer = Buffer.from(image, "base64");
		const dateString = DateTime.utc().toFormat('yyyyMMddhhmmss');
		const path = `users/${userId}/${dateString}`;
		const bucket = getFirebaseStorageBucket(firebaseApp);
		const file = bucket.file(path);

		const writable = file.createWriteStream();
		writable.write(image, 'base64');
		writable.end();

		mem = { media: { path: path } };
	} else {
		return error(500, JSON.stringify({ error: 'No text or image' }));
	}

	mem.new = true;
	mem.addedMs = DateTime.utc().toMillis();

	return firestoreAdd(db, userId, mem)
		.then(() => {
			return json({ mem: mem });
		})
		.catch((err) => {
			console.error('Unable to save', err);
			return error(500, JSON.stringify({ error: 'Unable to save' }));
		});
};
