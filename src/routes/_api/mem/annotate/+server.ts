import { error, json } from '@sveltejs/kit';
import type { Firestore } from '@google-cloud/firestore';

import type { RequestHandler } from './$types';
import type { Mem } from '$lib/common/mems';
import {
	getFirebaseApp,
	getFirestoreClient,
	getFirebaseStorageBucket,
	FIREBASE_PROJECT_ID
} from '$lib/firebase.server.js';
import { getMem } from '$lib/server/mem';
import { memToJson } from '$lib/common/mems';
import { getUserId } from '$lib/server/api.server.js';
import { annotateMem } from '$lib/server/annotator.js';
import { mirrorMedia } from '$lib/server/mirror.js';
import { firestoreUpdate } from '$lib/server/firestore-update.js';

const mirrorMediaInMem = async (
	db: Firestore,
	memId: string,
	mem: Mem,
	userId: string
): Promise<Mem | void> => {
	const outputPath = `users/${userId}/media`;
	const bucket = getFirebaseStorageBucket(getFirebaseApp());
	const updatedMem = await mirrorMedia(mem, bucket, outputPath);
	const result = await firestoreUpdate(db, userId, memId, updatedMem);
	if (result) {
		return updatedMem;
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const memId = body['memId'] || '';

	if (!memId) {
		return error(400, JSON.stringify({ error: 'No mem id' }));
	}

	console.log('annotate mem', memId);

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const memSnap = await getMem(db, userId, memId);
	if (!memSnap) {
		return error(500, JSON.stringify({ error: 'Error getting mem' }));
	}

	const mem = memSnap.data() as unknown as Mem;

	let updatedMem = await annotateMem(mem);
	const updatedMemWithMedia = await mirrorMediaInMem(db, memId, updatedMem, userId);
	if (updatedMemWithMedia) {
		updatedMem = updatedMemWithMedia;
	}
	console.log('updatedMem', updatedMem);
	if (updatedMem) {
		return json({ mem: memToJson(updatedMem) });
	}
	return error(500, JSON.stringify({ error: 'Error annotating mem' }));
};
