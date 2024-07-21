import type { Firestore } from '@google-cloud/firestore';
import type {
	DocumentSnapshot,
	DocumentData,
	CollectionReference,
	Query
} from 'firebase-admin/firestore';
import type { Mem } from '$lib/common/mems';

export const getMem = (db: Firestore, userId: string, memId: string): Promise<DocumentSnapshot> => {
	return db.collection('users').doc(userId).collection('mems').doc(memId).get();
};

export const getAllMems = async (db: Firestore, userId: string): Promise<Mem[]> => {
	const ref: CollectionReference<DocumentData> | Query<DocumentData> = db.collection(
		`users/${userId}/mems`
	);

	const collection = await ref.orderBy('addedMs', 'desc').get();

	const mems: Mem[] = [];
	collection.forEach((doc: DocumentSnapshot<DocumentData>) => {
		const mem = Object.assign({}, doc.data(), { id: doc.id });
		mems.push(mem);
	});

	return mems;
};
