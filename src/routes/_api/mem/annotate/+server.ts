import { memToJson } from "$lib/common/mems";
import { getDb } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getMem } from "$lib/mem.db.server";
import { mirrorMediaInMem } from "$lib/mem.db.server";
import type { MemAnnotateResponse } from "$lib/request.types";
import { getS3Client } from "$lib/s3.server";
import { annotateMem } from "$lib/server/annotator.js";
import { getUserId } from "$lib/server/api.server.js";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const memId = body["memId"] || "";

  if (!memId) {
    return error(400, JSON.stringify({ error: "No mem id" }));
  }

  console.log("/_api/mem/annotate", body);

  const firebaseApp = getFirebaseApp();
  const s3client = getS3Client();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const mem = await getMem(db, userId, memId);
  if (!mem) {
    return error(500, JSON.stringify({ error: "Error getting mem" }));
  }

  let updatedMem = await annotateMem(mem);
  const updatedMemWithMedia = await mirrorMediaInMem(db, s3client, updatedMem, userId);
  if (updatedMemWithMedia) {
    updatedMem = updatedMemWithMedia;
  }
  if (updatedMem) {
    const annotateResponse: MemAnnotateResponse = { mem: memToJson(updatedMem), memId: memId };
    return json(annotateResponse);
  }
  return error(500, JSON.stringify({ error: "Error annotating mem" }));
};
