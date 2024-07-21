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

export interface MemOptions {
	maxResults?: number;
	lookQueue?: boolean;
}

export const getAllMems = async (
	db: Firestore,
	userId: string,
	queryOptions?: MemOptions
): Promise<Mem[]> => {
	let query: CollectionReference<DocumentData> | Query<DocumentData> = db.collection(
		`users/${userId}/mems`
	);

	query = query.orderBy('addedMs', 'desc');
	if (queryOptions) {
		if (queryOptions.lookQueue) {
			query = query.where('tags', 'array-contains', '#look');
		}
		if (queryOptions.maxResults) {
			query = query.limit(queryOptions.maxResults);
		}
	}

	const collection = await query.get();

	const mems: Mem[] = [];
	collection.forEach((doc: DocumentSnapshot<DocumentData>) => {
		const mem = Object.assign({}, doc.data(), { id: doc.id });
		mems.push(mem);
	});

	return mems;
};
