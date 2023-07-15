import * as functions from 'firebase-functions';
import { firebaseApp, getFirestoreDb } from './firebase-app.js';
import cors from 'cors';
import type {
	DocumentSnapshot,
	QuerySnapshot,
	DocumentData,
	Firestore
} from 'firebase-admin/firestore';
import { IndexTagDocument, getTagCounts } from '../core/tags';
import type { Mem } from '../core/mems';

const corsAllowOrigin = cors({ origin: true });

const refreshTagCounts = async (db: Firestore, userId: string) => {
	return db
		.collection(`users/${userId}/mems`)
		.get()
		.then((snap: QuerySnapshot<DocumentData>) => {
			const mems: Mem[] = [];
			snap.forEach((doc: DocumentSnapshot<DocumentData>) => {
				const mem = Object.assign({}, doc.data(), { id: doc.id });
				mems.push(mem);
			});

			const counts = getTagCounts(mems);
			return db.doc(`users/${userId}/index/tags`).set({ counts: counts } as IndexTagDocument);
		});
};

export const tagCountOnCreate = functions.firestore
	.document('users/{userId}/mems/{memId}')
	.onCreate((snap, context) => {
		const db = getFirestoreDb(firebaseApp());
		const userId = context.params.userId;
		return refreshTagCounts(db, userId).catch((err: Error) => {
			functions.logger.error('Error: ', err.toString());
		});
	});

export const tagCount = functions
	.region('us-central1') // Must use us-central1 if using firebase.json:rewrites. :sadge:
	.https.onRequest(async (request, response) => {
		return corsAllowOrigin(request, response, () => {
			const userId = request.query.user || request.body.user || '';
			if (!userId) {
				response.status(500).send('Missing user:' + JSON.stringify(request.query));
				return;
			}
			const db = getFirestoreDb(firebaseApp());
			return refreshTagCounts(db, userId).catch((err: Error) => {
				response.status(500).send('Error: ' + err.toString());
			});
		});
	});
