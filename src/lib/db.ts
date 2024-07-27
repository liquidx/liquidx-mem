import { MongoClient, type Db, ServerApiVersion } from 'mongodb';

const MONGO_DB_SERVER = 'cluster0.uakqn3b.mongodb.net';
const MONGO_DB_CLUSTER_NAME = 'Cluster0';
const MONGO_DB_MEM_DB = 'mem';

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

export const getDbClient = async (user: string, password: string) => {
	const options = {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true
		}
	};
	const client = new MongoClient(getDbUrl(user, password), options);
	await client.connect();
	return client;
};

export type DbCommand = (db: Db) => Promise<any>;

export const executeQuery = async (client: MongoClient, command: DbCommand, dbName?: string) => {
	const name = dbName ?? getDbName();
	const db = client.db(name);
	try {
		return await command(db);
	} finally {
		await client.close();
	}
};
