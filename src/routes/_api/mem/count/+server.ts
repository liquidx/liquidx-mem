import { getDb, getMemCollection, getUserCollection } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { listsForUser } from "$lib/common/lists";
import { getUserId } from "$lib/server/api.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// Counts for the feed views: new (inbox), each configured list, and archive.
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

  const userDoc = await getUserCollection(db).findOne({ _id: userId });
  const lists = listsForUser(userDoc?.lists);

  const [newCount, archiveCount, ...listCounts] = await Promise.all([
    collection.countDocuments({ $and: [{ userId }, { new: true }, notSuppressed] }),
    collection.countDocuments({ $and: [{ userId }, { new: false }, notSuppressed] }),
    ...lists.map((list) =>
      collection.countDocuments({
        $and: [{ userId }, { tags: { $in: list.tags } }, notSuppressed]
      })
    )
  ]);

  return json({
    status: "OK",
    counts: {
      new: newCount,
      archive: archiveCount,
      lists: lists.map((list, i) => ({ name: list.name, count: listCounts[i] }))
    }
  });
};
