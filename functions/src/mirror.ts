import * as functions from "firebase-functions";
import { Mem } from "../core/mems";
import { mirrorMedia } from "../core/mirror";
import { firebaseApp } from "./firebase-app";

import cors from "cors";

const corsAllowOrigin = cors({ origin: true });

export const mirror = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    return corsAllowOrigin(request, response, () => {
      const memId = request.query.mem || request.body.mem || "";
      const userId = request.query.user || request.body.user || "";
      const bucket = firebaseApp().storage().bucket()

      const db = firebaseApp().firestore();
      db.doc(`users/${userId}/mems/${memId}`)
        .get()
        .then(snap => {
          const mem: Mem = Object.assign({}, snap.data())
          return mirrorMedia(mem, bucket, `users/${userId}/media`).then(updatedMem => {
            snap.ref.update(updatedMem as { [x: string]: any; });
            response.send("OK");

          })

        })
        .catch(err => {
          response.status(500).send("Error: " + err.toString());
        });
    });
  });
