import type { Firestore } from '@google-cloud/firestore';
import type { WriteResult } from 'firebase-admin/firestore';

export const firestoreDelete = (
	db: Firestore,
	userId: string,
	memId: string
): Promise<WriteResult> => {
	return db.collection('users').doc(userId).collection('mems').doc(memId).delete();
};
