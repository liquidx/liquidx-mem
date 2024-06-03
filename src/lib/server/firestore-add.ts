import type { Firestore, DocumentReference, DocumentData } from '@google-cloud/firestore';
import type { Mem } from '../common/mems.js';

export const firestoreAdd = (
	db: Firestore,
	userId: string,
	mem: Mem
): Promise<DocumentReference<DocumentData>> => {
	return db
		.collection('users')
		.doc(userId)
		.collection('mems')
		.add(mem as { [x: string]: any });
};
