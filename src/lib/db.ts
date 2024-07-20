export const MONGO_AUTH_DB = 'mem';
export const MONGO_DB_URL = 'mongodb://localhost:27017';
const MONGO_DB_SERVER = 'cluster0.uakqn3b.mongodb.net';

import { MONGO_DB_USER, MONGO_DB_PASSWORD } from '$env/static/private';

export const dbUrl = (user: string | undefined, password: string | undefined) => {
	const urlUser = user ?? MONGO_DB_USER;
	const urlPassword = password ?? MONGO_DB_PASSWORD;
	return `mongodb+srv://${urlUser}:${urlPassword}@${MONGO_DB_SERVER}/?retryWrites=true&w=majority&appName=Cluster0`;
};
