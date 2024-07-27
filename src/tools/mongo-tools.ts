import process from 'process';
import fs from 'fs';
import type { Command } from 'commander';
import type { Mem } from '../lib/common/mems';
import { executeQuery, getDbClient } from '../lib/db.js';

const DEFAULT_MEM_USER_ID = 'BB8zGVrCbrQ2QryHyiZNaUZJjQ93';

const importMems = async (mems: Mem[], memUserId: string, dbUser: string, dbPassword: string) => {
	let hasNoId: number = 0;
	for (const mem of mems) {
		if (mem.id === undefined) {
			hasNoId++;
		}
	}

	// Convert id to to _id
	const writableMems = mems.map((mem) => {
		const memId = mem.id;
		delete mem.id;
		return { _id: memId, userId: memUserId, ...mem };
	});

	const client = await getDbClient(dbUser, dbPassword);
	await executeQuery(client, async (db) => {
		const collection = db.collection('mems');
		//await db.command({ ping: 1 });
		await collection.deleteMany({});
		await collection.insertMany(writableMems);
		console.log('Success');
	});
};

export const addMongoCommands = (program: Command, dbUser: string, dbPassword: string) => {
	program
		.command('import-mems')
		.description('Import mems from a file')
		.option('-u --user-id <userId>', 'User ID', DEFAULT_MEM_USER_ID)
		.option('-f, --file <file>', 'File to import')
		.action(async (options: any) => {
			const file = options.file;
			const data = fs.readFileSync(file, 'utf8');
			const mems = JSON.parse(data);
			const memUser = options.userId;

			importMems(mems, memUser, dbUser, dbPassword);
		});
};
