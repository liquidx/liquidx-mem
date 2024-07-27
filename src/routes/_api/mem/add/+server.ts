import { DateTime } from 'luxon';
import { error, json } from '@sveltejs/kit';
import { type Db } from 'mongodb';

import type { RequestHandler } from './$types';
import { parseText } from '$lib/common/parser.js';
import { getUserId } from '$lib/server/api.server.js';
import { getFirebaseApp, getFirebaseStorageBucket } from '$lib/firebase.server.js';

import { memToJson } from '$lib/common/mems';
import { refreshTagCounts } from '$lib/server/tags.server.js';
import { annotateMem } from '$lib/server/annotator.js';

import { getDbClient, executeQuery } from '$lib/db';
import { MONGO_DB_USERNAME, MONGO_DB_PASSWORD } from '$env/static/private';
import { addMem } from '$lib/mem.db.server';
import { userForSharedSecret } from '$lib/user.db.server';
import { mirrorMediaInMem } from '$lib/mem.db.server';

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
	const bucket = getFirebaseStorageBucket(firebaseApp);
	const mongo = await getDbClient(MONGO_DB_USERNAME, MONGO_DB_PASSWORD);

	return await executeQuery(mongo, async (db: Db) => {
		let userId: string | undefined;
		if (token) {
			userId = await getUserId(firebaseApp, request);
		} else if (secret) {
			userId = await userForSharedSecret(db, secret);
		}

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

		addMem(db, mem);

		await refreshTagCounts(db, userId);
		let updatedMem = await annotateMem(mem);
		const updatedMemWithMedia = await mirrorMediaInMem(db, bucket, mem._id, updatedMem, userId);
		if (updatedMemWithMedia) {
			updatedMem = updatedMemWithMedia;
		}
		return json({ mem: memToJson(updatedMem) });
	});
};
