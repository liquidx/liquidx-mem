import { MongoClient, type Db, ServerApiVersion } from 'mongodb';
import { EJSON } from 'bson';

const MONGO_DB_ATLAS_SERVER = 'cluster0.uakqn3b.mongodb.net';
const MONGO_DB_ATLAS_CLUSTER_NAME = 'Cluster0';

const MONGO_DB_ATLAS_PARAMS = {
	retryWrites: 'true',
	w: 'majority',
	appName: MONGO_DB_ATLAS_CLUSTER_NAME
};
const MONGO_DB_MEM_DB = 'mem';
const MONGO_DB_MEM_COLLECTION = 'mems';
const MONGO_DB_USER_COLLECTION = 'users';
const MONGO_DB_TAG_COLLECTION = 'tags';

const MONGO_DB_SERVER = 'db-mongodb-sfo2-liquidx-bdf6d203.mongo.ondigitalocean.com';
const MONGO_DB_PARAMS = {
	authSource: 'admin',
	replicaSet: 'db-mongodb-sfo2-liquidx',
	tls: 'true'
};

export const getDbUrl = (user: string, password: string): string => {
	const params = new URLSearchParams(MONGO_DB_PARAMS);
	return `mongodb+srv://${user}:${password}@${MONGO_DB_SERVER}/${MONGO_DB_MEM_DB}?${params.toString()}`;
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
	console.log('  >> Connecting');
	const url = getDbUrl(user, password);
	const client = new MongoClient(url);
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
