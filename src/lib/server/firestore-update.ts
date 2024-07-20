import type { Firestore, WriteResult } from '@google-cloud/firestore';
import type { Mem } from '../common/mems.js';

export const firestoreUpdate = (
	db: Firestore,
	userId: string,
	memId: string,
	mem: Mem
): Promise<WriteResult> => {
	return db
		.collection('users')
		.doc(userId)
		.collection('mems')
		.doc(memId)
		.update(mem as { [x: string]: any });
};
