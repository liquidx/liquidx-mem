import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { parseText } from "../core/parser";
import {
  userForSharedSecret,
  USER_NOT_FOUND
} from "../core/firestore-user-secrets";
import { firestoreAdd } from "../core/firestore-add";
import { firebaseApp } from "./firebase-app";

export const add = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    functions.logger.debug("request.original.url", request.originalUrl);
    functions.logger.debug("request.body", request.body);
    const text = request.query.text || request.body.text || "";
    const secret = request.query.secret || request.body.secret || "";

    if (!text) {
      response.status(500).send("Error: 'text' parameter not found");
      return;
    }

    if (!secret) {
      response.status(500).send("Error: 'secret' parameter not found");
      return;
    }

    const db = firebaseApp().firestore();
    const userId = await userForSharedSecret(db, secret);

    if (!userId || userId === USER_NOT_FOUND) {
      response.status(403).send("Error: Permission denied.");
      return;
    }

    const mem = parseText(text.toString());
    if (!mem) {
      response.status(500).send("Error: Invalid data.");
      return;
    }

    mem.addedMs = admin.firestore.Timestamp.fromDate(new Date()).toMillis();
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
