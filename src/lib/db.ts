import { MongoClient, type Db, ServerApiVersion } from 'mongodb';
import { EJSON } from 'bson';

const MONGO_DB_SERVER = 'cluster0.uakqn3b.mongodb.net';
const MONGO_DB_CLUSTER_NAME = 'Cluster0';
const MONGO_DB_MEM_DB = 'mem';
const MONGO_DB_MEM_COLLECTION = 'mems';
const MONGO_DB_USER_COLLECTION = 'users';
const MONGO_DB_TAG_COLLECTION = 'tags';

export const getDbUrl = (user: string, password: string): string => {
	const params = new URLSearchParams({
		retryWrites: 'true',
		w: 'majority',
		appName: MONGO_DB_CLUSTER_NAME
	});
	return `mongodb+srv://${user}:${password}@${MONGO_DB_SERVER}/?${params.toString()}`;
};

export const getDbName = () => {
	return MONGO_DB_MEM_DB;
};

export const getMemCollection = (db: Db) => {
	return db.collection(MONGO_DB_MEM_COLLECTION);
};

export const getUserCollection = (db: Db) => {
	return db.collection(MONGO_DB_USER_COLLECTION);
};

export const getTagCollection = (db: Db) => {
	return db.collection(MONGO_DB_TAG_COLLECTION);
};

export const getDbClient = async (user: string, password: string) => {
	const options = {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true
		}
	};
	console.log('  >> Connecting');
	const url = getDbUrl(user, password);
	const client = new MongoClient(url, options);
	await client.connect();
	console.log('  << Database Connected');
	return client;
};

export type DbCommand = (db: Db) => Promise<any>;

export const getDb = (client: MongoClient) => {
	const name = getDbName();
	const db = client.db(name);
	return db;
};

export const executeQuery = async (
	client: MongoClient,
	command: DbCommand,
	dbName?: string
): Promise<any> => {
	const name = dbName ?? getDbName();
	const db = client.db(name);
	try {
		return await command(db);
	} finally {
		console.log('	 >> Closing');
		await client.close();
	}
};

export const toJSON = (doc: { [key: string]: any }) => {
	return EJSON.deserialize(EJSON.serialize(doc));
};
