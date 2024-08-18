import { getDb } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { deleteMem } from "$lib/mem.db.server";
import { getUserId } from "$lib/server/api.server.js";
import { refreshTagCounts } from "$lib/tags.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const memId = body["memId"] || "";

  if (!memId) {
    return error(400, JSON.stringify({ error: "No mem id" }));
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const result = await deleteMem(db, memId);
  if (result) {
    await refreshTagCounts(db, userId);
    return json({ memId });
  }

  console.log("Failed to delete mem: ", memId);
  return error(500, JSON.stringify({ error: "Error deleting mem" }));
};
