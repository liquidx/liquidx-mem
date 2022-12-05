import * as functions from "firebase-functions";
import { annotateMem } from "../core/annotator";
import { firebaseApp } from "./firebase-app";
import cors from "cors";

const corsAllowOrigin = cors({ origin: true });

export const annotateOnCreate = functions.firestore
  .document("users/{userId}/mems/{memId}")
  .onCreate((snap, context) => {
    const value = Object.assign({}, snap.data(), { id: snap.id });
    return annotateMem(value).then(result => {
      functions.logger.debug("annotated result", result);
      delete result.id;
      snap.ref.update(result as { [x: string]: any; });
    });
  });

export const annotate = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    return corsAllowOrigin(request, response, () => {
      const memId = request.query.mem || request.body.mem || "";
      const userId = request.query.user || request.body.user || "";

      const db = firebaseApp().firestore();
      db.doc(`users/${userId}/mems/${memId}`)
        .get()
        .then(snap => {
          const value = Object.assign({}, snap.data(), { id: snap.id });
          return annotateMem(value).then(result => {
            functions.logger.debug("annotated result", result);
            delete result.id;
            snap.ref.update(result as { [x: string]: any; });
            response.send("OK");
          });
        })
        .catch(err => {
          response.status(500).send("Error: " + err.toString());
        });
    });
  });
