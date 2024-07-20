import type { Firestore } from '@google-cloud/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';

export const getMem = (db: Firestore, userId: string, memId: string): Promise<DocumentSnapshot> => {
	return db.collection('users').doc(userId).collection('mems').doc(memId).get();
};
