import { getDb, getMemCollection } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getUserId } from "$lib/server/api.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// Counts for the three feed views: new (inbox), reading (#look queue), archive.
export const GET: RequestHandler = async ({ request, locals }) => {
  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const suppressedTags = ["#xxx"];
  const notSuppressed = { tags: { $not: { $in: suppressedTags } } };
  const collection = getMemCollection(db);

  const [newCount, readingCount, archiveCount] = await Promise.all([
    collection.countDocuments({ $and: [{ userId }, { new: true }, notSuppressed] }),
    collection.countDocuments({ $and: [{ userId }, { tags: { $all: ["#look"] } }, notSuppressed] }),
    collection.countDocuments({ $and: [{ userId }, { new: false }, notSuppressed] })
  ]);

  return json({
    status: "OK",
    counts: { new: newCount, reading: readingCount, archive: archiveCount }
  });
};
