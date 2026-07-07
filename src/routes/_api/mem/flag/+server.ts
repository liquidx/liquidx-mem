import { allListTags, listsForUser } from "$lib/common/lists";
import { memToJson } from "$lib/common/mems";
import { getDb, getUserCollection } from "$lib/db.server";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getMem } from "$lib/mem.db.server";
import { updateMem } from "$lib/mem.db.server";
import { getUserId } from "$lib/server/api.server.js";
import { refreshTagCounts } from "$lib/tags.server.js";
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

  // Mark a mem as read/seen: strip the user's configured list tags so it drops
  // off every later list while staying saved.
  if (body.markRead) {
    const userDoc = await getUserCollection(db).findOne({ _id: userId });
    const listTags = allListTags(listsForUser(userDoc?.lists));
    if (mem.tags) {
      mem.tags = mem.tags.filter((tag) => !listTags.includes(tag));
    }
    if (mem.note) {
      for (const tag of listTags) {
        mem.note = mem.note.replaceAll(tag, "");
      }
      mem.note = mem.note.replace(/\s+/g, " ").trim();
    }
  }

  const updatedMem = await updateMem(db, mem);
  if (!updatedMem) {
    return error(500, JSON.stringify({ error: "Error updating mem" }));
  }

  // The set of tags changed, so refresh the cached counts.
  if (body.seen !== undefined || body.markRead) {
    await refreshTagCounts(db, userId);
  }

  return json({ mem: memToJson(updatedMem) });
};
