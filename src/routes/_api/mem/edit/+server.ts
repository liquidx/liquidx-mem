import { memToJson } from "$lib/common/mems";
import type { Mem } from "$lib/common/mems";
import { extractEntities } from "$lib/common/parser.js";
import { getDb, getMemCollection } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getMem } from "$lib/mem.db.server";
import { getUserId } from "$lib/server/api.server.js";
import { refreshTagCounts } from "$lib/tags.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const memId = body["memId"] || "";
  const updates = body["updates"];

  console.log("/_api/mem/edit:", body);

  if (!updates) {
    return error(400, JSON.stringify({ error: "No mem" }));
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  let mem = await getMem(db, userId, memId);
  if (!mem) {
    return error(404, JSON.stringify({ error: "Mem not found" }));
  }

  // Update the mem with the new data in the request.
  for (const key in updates) {
    mem[key as keyof Mem] = updates[key];
  }

  // Post processing of any edits to note.
  if (mem.note) {
    mem = Object.assign(mem, extractEntities(mem.note));
  }

  const updatedMem = (await getMemCollection(db).findOneAndUpdate(
    { userId: userId, _id: mem._id },
    { $set: mem },
    { returnDocument: "after" }
  )) as unknown as Mem;

  if (!updatedMem) {
    return error(500, JSON.stringify({ error: "Error updating mem" }));
  }

  console.log("Updated mem:", updatedMem);
  if (updates && (updates.tags || updates.note)) {
    await refreshTagCounts(db, userId);
  }
  return json({ mem: memToJson(updatedMem) });
};
