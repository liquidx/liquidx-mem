import type { Firestore } from '@google-cloud/firestore';

export const USER_NOT_FOUND = '';

export const userForSharedSecret = async (db: Firestore, sharedSecret: string): Promise<string> => {
	const secrets = await db
		.collection('admin')
		.doc('users')
		.collection('secrets')
		.get()
		.then((snapshot) => {
			return snapshot.docs.map((doc) => {
				return { userId: doc.id, secret: doc.data().secret };
			});
		});

	const match = secrets.find((o: any) => o.secret == sharedSecret);
	if (match) {
		return match.userId;
	}
	return USER_NOT_FOUND;
};
