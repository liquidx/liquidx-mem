import * as functions from "firebase-functions";
import { annotateMem } from "../core/annotator";

export const annotate = functions.firestore
  .document("users/{userId}/mems/{memId}")
  .onCreate((snap, context) => {
    const value = Object.assign({}, snap.data(), { id: snap.id });
    return annotateMem(value).then(result => {
      functions.logger.debug("annotated result", result);
      delete result.id;
      snap.ref.set(result);
    });
  });
