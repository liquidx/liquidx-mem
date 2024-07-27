import { type Db, type DeleteResult } from 'mongodb';
import { DateTime } from 'luxon';
import { mirrorMedia } from '$lib/server/mirror.js';
import type { Mem } from '$lib/common/mems';
import type { Bucket } from '@google-cloud/storage';
import type { MemListRequest } from './request.types';

import { getMemCollection } from '$lib/db';

export interface MemOptions {
	maxResults?: number;
	lookQueue?: boolean;
}

export const updateMem = async (db: Db, mem: Mem): Promise<Mem | undefined> => {
	const memTable = db.collection('mems');
	return (await memTable.findOneAndUpdate({ _id: mem._id }, { $set: mem })) as unknown as Mem;
};

export const deleteMem = async (db: Db, memId: string): Promise<DeleteResult> => {
	const memTable = db.collection('mems');
	return await memTable.deleteOne({ _id: memId });
};

export const addMem = async (db: Db, mem: Mem): Promise<Mem | undefined> => {
	mem._id = crypto.randomUUID();
	mem.new = true;
	mem.addedMs = DateTime.utc().toMillis();

	const memsTable = db.collection('mems');
	await memsTable.insertOne(mem);
	return mem;
};

export const mirrorMediaInMem = async (
	db: Db,
	bucket: Bucket,
	mem: Mem,
	userId: string
): Promise<Mem | void> => {
	const outputPath = `users/${userId}/media`;
	const updatedMem = await mirrorMedia(mem, bucket, outputPath);
	const result = await updateMem(db, updatedMem);
	if (result) {
		return updatedMem;
	}
};

export const getMems = async (db: Db, userId: string, request?: MemListRequest) => {
	const query: { [key: string]: any } = { userId: userId };

	if (request) {
		if (request.isArchived) {
			query.new = false;
		} else if (request.allOfTags) {
			query['tags'] = { $all: request.allOfTags };
		} else if (request.oneOfTags) {
			query['tags'] = { $in: request.oneOfTags };
		} else if (!request.all) {
			query.new = true;
		}
	}

	const options: { [key: string]: any } = { sort: { addedMs: -1 } };
	if (request && request.pageSize) {
		const pageSize = parseInt(request.pageSize);
		options.limit = pageSize;
		const page = request.page ? parseInt(request.page) : 0;
		options.skip = page * pageSize;
	}

	console.log(query, options);

	const collection = db.collection('mems');
	const cursor = await collection.find(query, options);
	const docs = [];
	for await (const doc of cursor) {
		docs.push(doc);
		// docs.push(toJSON(doc)) // ??
	}
	return docs;
};

export const getMem = async (db: Db, userId: string, memId: string): Promise<Mem | undefined> => {
	return getMemCollection(db).findOne({ _id: memId, userId: userId });
};

// TODO: merge with getMems
export const getAllMems = async (
	db: Db,
	userId: string,
	queryOptions?: MemOptions
): Promise<Mem[]> => {
	const query: { [key: string]: any } = { userId: userId };
	const options: { [key: string]: any } = { addedMs: -1 };

	if (queryOptions) {
		if (queryOptions.lookQueue) {
			query['tags'] = { $in: ['#look'] };
		}
		if (queryOptions.maxResults) {
			options['limit'] = queryOptions.maxResults;
		}
	}
	const cursor = await getMemCollection(db).find(query, options);
	const docs: Mem[] = [];
	for await (const doc of cursor) {
		docs.push(doc as unknown as Mem);
		// docs.push(toJSON(doc)) // ??
	}
	return docs;
};