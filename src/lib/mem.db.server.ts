import type { Mem } from "$lib/common/mems";
import { getMemCollection } from "$lib/db";
import { mirrorMedia } from "$lib/server/mirror.js";
import type { S3Client } from "@aws-sdk/client-s3";
import { DateTime } from "luxon";
import { type Db, type DeleteResult } from "mongodb";

import type { MemListRequest } from "./request.types";

export interface MemOptions {
  maxResults?: number;
  lookQueue?: boolean;
}

export const updateMem = async (db: Db, mem: Mem): Promise<Mem | undefined> => {
  return (await getMemCollection(db).findOneAndUpdate(
    { _id: mem._id },
    { $set: mem },
    { returnDocument: "after" }
  )) as unknown as Mem;
};

export const deleteMem = async (db: Db, memId: string): Promise<DeleteResult> => {
  const memTable = db.collection("mems");
  return await memTable.deleteOne({ _id: memId });
};

export const addMem = async (db: Db, userId: string, mem: Mem): Promise<Mem | void> => {
  mem._id = crypto.randomUUID();
  mem.userId = userId;
  mem.new = true;
  mem.addedMs = DateTime.utc().toMillis();

  const result = await getMemCollection(db).insertOne(mem);
  if (!result) {
    return;
  }
  return mem;
};

export const mirrorMediaInMem = async (
  db: Db,
  s3client: S3Client,
  mem: Mem,
  userId: string
): Promise<Mem | void> => {
  const outputPath = `users/${userId}/media`;
  const updatedMem = await mirrorMedia(mem, s3client, outputPath);
  const result = await updateMem(db, updatedMem);
  if (result) {
    return updatedMem;
  }
};

export const getMems = async (
  db: Db,
  userId: string,
  request?: MemListRequest,
  projection?: any
) => {
  const query: { [key: string]: any } = { $and: [{ userId: userId }] };
  // TODO: Make this a user configuration.
  const suppressedTags = ["#xxx"];

  if (request) {
    if (request.isArchived) {
      query.$and.push({ new: false });
    } else if (request.matchAllTags && request.matchAllTags.length > 0) {
      query.$and.push({ tags: { $all: request.matchAllTags } });
    } else if (request.matchAnyTags && request.matchAnyTags.length > 0) {
      query.$and.push({ tags: { $in: request.matchAnyTags } });
    } else if (!request.all) {
      query.$and.push({ new: true });
    }

    // Filter out suppressed tags if it is not explicitly requested.
    if (
      !request.matchAllTags ||
      request.matchAllTags.length === 0 ||
      !request.matchAllTags.some((t) => suppressedTags.includes(t))
    ) {
      query.$and.push({ tags: { $not: { $in: suppressedTags } } });
    }
  }

  const options: { [key: string]: any } = {};

  // Apply order
  if (request && request.order) {
    options["sort"] = { addedMs: request.order === "oldest" ? 1 : -1 };
  } else {
    options["sort"] = { addedMs: -1 };
  }

  if (request && request.pageSize) {
    const pageSize = parseInt(request.pageSize);
    options.limit = pageSize;
    const page = request.page ? parseInt(request.page) : 0;
    options.skip = page * pageSize;
  }

  if (projection) {
    options.projection = projection;
  }

  console.log(query, options);

  // Process this request as a search query, which will require using
  // an aggregate pipeline rather than find().
  if (request && request.searchQuery) {
    const stages: any = [];
    stages.push({
      $search: {
        index: "text",
        text: { query: request.searchQuery, path: ["title", "description", "url"] }
      }
    });

    stages.push({ $sort: options.sort });

    // Convert from the query to an aggregate request.
    if (query.$and) {
      const conditions = query.$and.filter((c: any) => !c.new); // Filter out the new condition
      if (conditions.length > 0) {
        stages.push({ $match: { $and: conditions } });
      }
    }

    if (options.limit) {
      stages.push({ $limit: options.limit });
    }
    if (options.skip) {
      stages.push({ $skip: options.skip });
    }

    console.log("Stages: ");
    console.dir(stages, { depth: null, colors: true });
    try {
      const docs = await getMemCollection(db).aggregate(stages).toArray();
      return docs;
    } catch (err: any) {
      console.error("Error in search query", err);
      return [];
    }
  } else {
    const docs = await getMemCollection(db).find(query, options).toArray();
    return docs;
  }
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
      query["tags"] = { $in: ["#look"] };
    }
    if (queryOptions.maxResults) {
      options["limit"] = queryOptions.maxResults;
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
