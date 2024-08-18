import { getDb } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getUserId } from "$lib/server/api.server.js";
import { refreshTagCounts } from "$lib/tags.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const requestUserId = body.userId || "";

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

  const counts = await refreshTagCounts(db, userId);
  return json({ counts });
};
