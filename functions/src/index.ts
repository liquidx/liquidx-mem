import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { parseText } from "./parser";
import cors from "cors";

const corsAllowOrigin = cors({ origin: true });

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const add = functions
  .region("asia-northeast1")
  .https.onRequest((request, response) => {
    //functions.logger.info("Hello logs!", {structuredData: true});
    return corsAllowOrigin(request, response, () => {
      if (!request.query.text) {
        response.send(
          JSON.stringify({ status: "error", error: "No text parameter" })
        );
        return;
      }

      const mem = parseText(request.query.text.toString());
      mem.added = admin.firestore.Timestamp.fromDate(new Date());

      admin.initializeApp();
      const db = admin.firestore();
      db.collection("users")
        .doc("1")
        .collection("mems")
        .add(mem)
        .then(() => {
          response.send(JSON.stringify({ status: "OK" }));
        });
    });
  });
