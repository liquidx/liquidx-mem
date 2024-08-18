import { memToJson } from "$lib/common/mems";
import { getDb } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getMem } from "$lib/mem.db.server";
import { updateMem } from "$lib/mem.db.server";
import { getUserId } from "$lib/server/api.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const memId = body["memId"] || "";

  console.log("/_api/mem/flag:", body);

  if (!memId) {
    return error(400, JSON.stringify({ error: "No mem id" }));
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const mem = await getMem(db, userId, memId);
  if (!mem) {
    return error(404, JSON.stringify({ error: "Mem not found" }));
  }

  if (body.new !== undefined) {
    mem.new = body.new;
  }

  if (body.seen !== undefined) {
    // Remove or add the '#look' tag dependeing on the 'seen' value.
    if (body.seen) {
      if (mem.tags) {
        mem.tags = mem.tags.filter((tag) => tag !== "#look");
      }
      if (mem.note) {
        mem.note = mem.note.replace(/#look/g, "");
      }
    } else {
      if (mem.tags) {
        mem.tags.push("#look");
      } else {
        mem.tags = ["#look"];
      }
      mem.note += " #look";
    }
  }

  const updatedMem = await updateMem(db, mem);
  if (!updatedMem) {
    return error(500, JSON.stringify({ error: "Error updating mem" }));
  }

  return json({ mem: memToJson(updatedMem) });
};
