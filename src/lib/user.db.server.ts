import type { MongoClient, Db } from 'mongodb';
import { executeQuery, getUserCollection } from './db';

export const USER_NOT_FOUND = '';

export const userForSharedSecret = async (
	mongo: MongoClient,
	writeSecret: string
): Promise<string> => {
	const result = await executeQuery(mongo, async (db: Db) => {
		const userCollection = getUserCollection(db);
		const user = await userCollection.findOne({ writeSecret: writeSecret });
		if (user) {
			return user;
		}
		return;
	});

	if (result) {
		return result.userId;
	}

	return USER_NOT_FOUND;
};
