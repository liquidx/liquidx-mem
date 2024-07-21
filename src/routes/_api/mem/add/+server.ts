import { DateTime } from 'luxon';
import { error, json } from '@sveltejs/kit';
import type { Firestore } from '@google-cloud/firestore';
import type { Bucket } from '@google-cloud/storage';

import type { RequestHandler } from './$types';
import { parseText } from '$lib/common/parser.js';
import { firestoreAdd } from '$lib/server/firestore-add.js';
import { getUserId } from '$lib/server/api.server.js';
import {
	FIREBASE_PROJECT_ID,
	getFirebaseApp,
	getFirebaseStorageBucket,
	getFirestoreClient
} from '$lib/firebase.server.js';
import { memToJson } from '$lib/common/mems';
import { refreshTagCounts } from '$lib/server/tags.server.js';
import { annotateMem } from '$lib/server/annotator.js';
import { mirrorMedia } from '$lib/server/mirror.js';
import { firestoreUpdate } from '$lib/server/firestore-update.js';
import type { Mem } from '$lib/common/mems';

const mirrorMediaInMem = async (
	db: Firestore,
	bucket: Bucket,
	memId: string,
	mem: Mem,
	userId: string
): Promise<Mem | void> => {
	const outputPath = `users/${userId}/media`;
	const updatedMem = await mirrorMedia(mem, bucket, outputPath);
	const result = await firestoreUpdate(db, userId, memId, updatedMem);
	if (result) {
		return updatedMem;
	}
};

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
	const bucket = getFirebaseStorageBucket(firebaseApp);
	const userId = await getUserId(firebaseApp, request);

	if (!userId) {
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

	const ref = await firestoreAdd(db, userId, mem).catch((err) => {
		console.error('Unable to save', err);
		return error(500, JSON.stringify({ error: 'Unable to save' }));
	});

	const memId = ref.id;
	await refreshTagCounts(db, userId);
	let updatedMem = await annotateMem(mem);
	const updatedMemWithMedia = await mirrorMediaInMem(db, bucket, memId, updatedMem, userId);
	if (updatedMemWithMedia) {
		updatedMem = updatedMemWithMedia;
	}
	return json({ mem: memToJson(updatedMem) });
};
