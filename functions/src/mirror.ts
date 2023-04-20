import * as functions from "firebase-functions";
import cors from "cors";

import { mirrorMedia } from "../core/mirror.js";
import { firebaseApp, getFirebaseStorageBucket, getFirestoreDb } from "./firebase-app.js";

const corsAllowOrigin = cors({ origin: true });

export const mrirorOnAnnotate = functions.firestore
  .document("users/{userId}/mems/{memId}")
  .onUpdate((change, context) => {
    // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}
    const currentMem = change.after.data();

    // ...or the previous value before this update
    const previousValue = change.before.data();

    // Check if the photos or videos field was updated.
    let shouldMirror = false
    if (currentMem.photos && (!previousValue.photos || currentMem.photos.length !== previousValue.photos.length)) {
      shouldMirror = true
    }
    if (currentMem.videos && (!previousValue.videos || currentMem.videos.length !== previousValue.videos.length)) {
      shouldMirror = true
    }

    if (shouldMirror) {
      const userId = context.params.userId
      const outputPath = `users/${userId}/media`
      const bucket = getFirebaseStorageBucket(firebaseApp())
      return mirrorMedia(currentMem, bucket, outputPath).then((updatedMem) => {
        const writable = Object.assign({}, updatedMem)
        delete writable.id
        change.after.ref.update(writable as { [x: string]: any; });
      })
    }
    return null;
  });


export const mirror = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    return corsAllowOrigin(request, response, () => {
      const memId = request.query.mem || request.body.mem || "";
      const userId = request.query.user || request.body.user || "";

      functions.logger.debug("path", `users/${userId}/mems/${memId}`)

      const db = getFirestoreDb(firebaseApp())
      return db.doc(`users/${userId}/mems/${memId}`)
        .get()
        .then(snap => {
          const mem = Object.assign({}, snap.data(), { id: snap.id });
          const outputPath = `users/${userId}/media`
          const bucket = getFirebaseStorageBucket(firebaseApp())
          return mirrorMedia(mem, bucket, outputPath).then((updatedMem) => {
            functions.logger.debug("updated result", updatedMem);
            const writable = Object.assign({}, updatedMem)
            delete writable.id
            snap.ref.update(writable as { [x: string]: any; });
            response.send("OK");
          })
        })
        .catch(err => {
          response.status(500).send("Error: " + err.toString());
        });
    })
  })