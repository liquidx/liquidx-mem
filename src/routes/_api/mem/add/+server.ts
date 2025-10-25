import { S3_BUCKET } from "$env/static/private";
import { memToJson } from "$lib/common/mems";
import { parseText } from "$lib/common/parser.js";
import { getDb } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { addMem, findMemByUrl, updateMem } from "$lib/mem.db.server";
import { mirrorMediaInMem } from "$lib/mem.db.server";
import { getS3Client, writeFileToS3 } from "$lib/s3.server";
import { annotateMem } from "$lib/server/annotator.js";
import { getUserId } from "$lib/server/api.server.js";
import { refreshTagCounts } from "$lib/tags.server.js";
import { userForSharedSecret } from "$lib/user.db.server";
import { error, json } from "@sveltejs/kit";
import { DateTime } from "luxon";

import type { RequestHandler } from "./$types";

export const fallback: RequestHandler = async ({ url, request, locals }) => {
  let text: string = "";
  let image: string = "";
  let secret: string = "";

  if (request.method === "POST") {
    const body = await request.json();
    text = body["text"] || "";
    image = body["image"] || "";
    secret = body["secret"] || "";
  } else if (request.method === "GET") {
    text = url.searchParams.get("text") || "";
    image = url.searchParams.get("image") || "";
    secret = url.searchParams.get("secret") || "";
  } else {
    error(405, "Method Not Allowed");
  }

  // Check auth
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token && !secret) {
    console.log("Error: No token or secret");
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const firebaseApp = getFirebaseApp();
  const s3client = getS3Client();
  const db = getDb(locals.mongoClient);

  let userId: string | undefined;
  if (token) {
    userId = await getUserId(firebaseApp, request);
  } else if (secret) {
    const user = await userForSharedSecret(db, secret);
    if (user) {
      userId = user._id;
    }
  }

  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  let mem = null;
  if (text) {
    mem = parseText(text.toString());
    if (!mem) {
      return error(500, JSON.stringify({ error: "Invalid text" }));
    }

    // Check if a mem with this URL already exists
    if (mem.url) {
      const existingMem = await findMemByUrl(db, userId, mem.url);
      if (existingMem) {
        // Merge tags from new mem into existing mem
        if (mem.tags && mem.tags.length > 0) {
          const existingTags = existingMem.tags || [];
          const newTags = mem.tags || [];
          // Combine and deduplicate tags
          existingMem.tags = [...new Set([...existingTags, ...newTags])];
        }

        // Merge description/note from new mem into existing mem
        if (mem.note) {
          if (existingMem.note) {
            existingMem.note = `${existingMem.note}\n\n${mem.note}`;
          } else {
            existingMem.note = mem.note;
          }
        }

        // Update the last modified timestamp
        existingMem.addedMs = DateTime.utc().toMillis();

        // Save the updated mem
        const updatedExistingMem = await updateMem(db, existingMem);
        if (updatedExistingMem) {
          await refreshTagCounts(db, userId);
          return json({ mem: memToJson(updatedExistingMem) });
        }
        return json({ mem: memToJson(existingMem) });
      }
    }
  } else if (image) {
    //const imageDataBuffer = Buffer.from(image, "base64");
    const dateString = DateTime.utc().toFormat("yyyyMMddhhmmss");
    const path = `users/${userId}/${dateString}`;

    const finalPath = writeFileToS3(s3client, S3_BUCKET, path, Buffer.from(image, "base64"));
    if (!finalPath) {
      return error(500, JSON.stringify({ error: "Error uploading image" }));
    }
    mem = { media: { path: path } };
  } else {
    return error(500, JSON.stringify({ error: "No text or image" }));
  }

  let updatedMem = await addMem(db, userId, mem);
  if (!updatedMem) {
    return error(500, JSON.stringify({ error: "Error adding mem" }));
  }

  await refreshTagCounts(db, userId);
  updatedMem = await annotateMem(updatedMem);
  const updatedMemWithMedia = await mirrorMediaInMem(db, s3client, updatedMem, userId);
  if (updatedMemWithMedia) {
    updatedMem = updatedMemWithMedia;
  }
  return json({ mem: memToJson(updatedMem) });
};
