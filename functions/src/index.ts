import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { parseText } from "../core/parser";

//import cors from "cors";
//const corsAllowOrigin = cors({ origin: true });

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const add = functions
  .region("asia-northeast1")
  .https.onRequest((request, response) => {
    functions.logger.debug("request.original.url", request.originalUrl);
    functions.logger.debug("request.body", request.body);
    //return corsAllowOrigin(request, response, () => {
    const text = request.query.text || request.body.text || "";

    if (!text) {
      response.status(500).send("Error: Text parameter not found");
      return;
    }

    const mem = parseText(text.toString());
    if (!mem) {
      response.status(500).send("Error: Invalid data");
      return;
    }

    mem.added = admin.firestore.Timestamp.fromDate(new Date());
    functions.logger.debug("mem", mem);

    admin.initializeApp();
    const db = admin.firestore();
    db.collection("users")
      .doc("1")
      .collection("mems")
      .add(mem)
      .then(() => {
        response.send("OK");
      });
    //});
  });
