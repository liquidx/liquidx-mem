import { error, json } from '@sveltejs/kit';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';
import type { RequestHandler } from './$types';
import { getUserId } from '$lib/server/api.server.js';
import { Firestore } from '@google-cloud/firestore';
import type { SettingsWriteRequest, SettingsReadResponse } from '$lib/request.types.js';

const getPrefsCollection = (db: Firestore, userId: string) => {
	return db.collection('users').doc(userId).collection('prefs');
};

export const GET: RequestHandler = async ({ request, url }) => {
	const docId = url.searchParams.get('key') || '';
	if (!docId) {
		return error(400, 'Missing docId');
	}

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const prefs = getPrefsCollection(db, userId);
	const doc = await prefs.doc(docId).get();
	if (!doc) {
		return error(500, 'Error: No tags');
	}

	let response: SettingsReadResponse = { key: docId, settings: null };

	if (!doc.exists) {
		return json(response);
	}

	response = { key: docId, settings: doc.data() };
	return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as SettingsWriteRequest;
	const docId = body.key || '';
	const settings = body.settings || '';

	const firebaseApp = getFirebaseApp();
	const db = getFirestoreClient(FIREBASE_PROJECT_ID);

	const userId = await getUserId(firebaseApp, request);
	if (!userId) {
		return error(403, JSON.stringify({ error: 'Permission denied' }));
	}

	const prefs = getPrefsCollection(db, userId);
	await prefs.doc(docId).set(settings);

	return json({ key: docId, settings });
};
