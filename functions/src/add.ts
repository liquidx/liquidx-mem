import * as functions from "firebase-functions";
import { DateTime } from "luxon";

import { parseText } from "../core/parser.js";
import {
  userForSharedSecret,
  USER_NOT_FOUND
} from "../core/firestore-user-secrets.js";
import { firestoreAdd } from "../core/firestore-add.js";
import { firebaseApp, getFirestoreDb, getFirebaseStorageBucket } from "./firebase-app.js";

export const add = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    // functions.logger.debug("request.original.url", request.originalUrl);
    // functions.logger.debug("request.body", request.body);
    const text = request.query.text || request.body.text || "";
    const image = request.query.image || request.body.image || "";
    const secret = request.query.secret || request.body.secret || "";

    if (!secret) {
      response.status(500).send("Error: 'secret' parameter not found");
      return;
    }

    const db = getFirestoreDb(firebaseApp());
    const userId = await userForSharedSecret(db, secret);

    if (!userId || userId === USER_NOT_FOUND) {
      response.status(403).send("Error: Permission denied.");
      return;
    }

    let mem = null;
    if (text) {
      mem = parseText(text.toString());
      if (!mem) {
        response.status(500).send("error: Invalid text.");
        return;
      }
    } else if (image) {
      //const imageDataBuffer = Buffer.from(image, "base64");
      const dateString = DateTime.utc().toFormat("yyyyMMddhhmmss");
      const path = `users/${userId}/${dateString}`;
      const bucket = getFirebaseStorageBucket(firebaseApp())
      const file = bucket.file(path);

      const writable = file.createWriteStream();
      writable.write(image, "base64");
      writable.end();

      mem = { media: { path: path } };
    } else {
      response.status(500).send("Error: 'text' parameter not found");
      return;
    }

    mem.new = true;
    mem.addedMs = DateTime.utc().toMillis();
    functions.logger.debug("mem", mem);

    firestoreAdd(db, userId, mem)
      .then(() => {
        response.send("OK");
      })
      .catch(err => {
        functions.logger.error(err);
        response.send(`Error saving: ${err}`);
      });
  });
