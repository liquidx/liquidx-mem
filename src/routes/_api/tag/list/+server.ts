import { getDb, getTagCollection } from "$lib/db";
import { listOptionsByString } from "$lib/filter";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getMems } from "$lib/mem.db.server";
import type { MemListRequest } from "$lib/request.types";
import { getUserId } from "$lib/server/api.server.js";
import { type MemTags, computeTagCounts } from "$lib/tags.server";
import type { TagIndex } from "$lib/tags.types";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

// TODO: Call on tag edits and creates.
export const GET: RequestHandler = async ({ request, url, locals }) => {
  const requestUserId = url.searchParams.get("userId") || "";
  const filter = url.searchParams.get("filter") || "";

  if (!requestUserId) {
    return error(500, "Missing user");
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  if (requestUserId != userId) {
    // Currently all users are private.
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  // Returns all tags.
  if (!filter) {
    const tags = (await getTagCollection(db).findOne({ userId: userId })) as unknown as TagIndex;
    if (!tags) {
      return error(500, "Error: No tags");
    }

    const tagCounts = tags.counts;
    return json({ counts: tagCounts });
  }

  const tagFilter = listOptionsByString(filter);
  const memsRequest: MemListRequest = {
    userId: userId,
    matchAllTags: tagFilter.matchAllTags,
    matchAnyTags: tagFilter.matchAnyTags
  };
  const projection = { tags: 1, _id: 1 };
  const memTags: MemTags[] = (await getMems(
    db,
    userId,
    memsRequest,
    projection
  )) as unknown as MemTags[];
  const counts = computeTagCounts(memTags);
  return json({ counts: counts });

  // count tags based on these mems.
};
