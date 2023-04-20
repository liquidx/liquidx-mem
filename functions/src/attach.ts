import * as functions from "firebase-functions";
import { DateTime } from "luxon";
import cors from "cors";
import multer from "multer";

import { firestoreUpdate } from "../core/firestore-update.js";
import { firebaseApp, getFirebaseStorageBucket, getFirestoreDb } from "./firebase-app.js";
import { writeToCloudStorage } from "../core/mirror.js";
import { DocumentSnapshot } from "firebase-admin/firestore";
import { validateFirebaseIdToken, type AuthorizedRequest } from '../core/firestore-user-auth.js';

const corsAllowOrigin = cors({ origin: true });

const getFileExtension = (fileType: string | null): string => {
  switch (fileType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif'
    default:
      return ''
  }
}

const memStorage = multer.memoryStorage()
const upload = multer({ storage: memStorage }).array('files')

export const attach = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    return corsAllowOrigin(request, response, () => {
      return validateFirebaseIdToken(request, response, async () => {
        return upload(request, response, async () => {

          if (request.method !== "POST") {
            return;
          }

          // Force cast request to AuthorizedRequest when coming from validateFirebaseIdToken
          let authorizedRequest = request as AuthorizedRequest

          if (!authorizedRequest.user) {
            response.status(403).send(`Unauthorized`);
            return;
          }

          if (!request.files) {
            response.status(500).send(`Error with attachment`);
            return;
          }

          console.log(request.files)

          const memId = request.query.mem || request.body.mem || "";
          const userId = authorizedRequest.user.uid;

          const db = getFirestoreDb(firebaseApp());
          const bucket = getFirebaseStorageBucket(firebaseApp());
          db.doc(`users/${userId}/mems/${memId}`)
            .get()
            .then(async (snap: DocumentSnapshot) => {
              const mem = Object.assign({}, snap.data(), { id: snap.id });

              if (request.files instanceof Array && request.files.length > 0) {
                for (let file of request.files) {
                  const dateString = DateTime.utc().toFormat("yyyyMMddhhmmss");
                  const extension = getFileExtension(file.mimetype)
                  const path = `users/${userId}/attachments/${dateString}/${file.filename}.${extension}}`;
                  await writeToCloudStorage(bucket, path, Buffer.from(file.toString()))

                  if (!mem.photos) {
                    mem.photos = [];
                  }

                  let media = {
                    cachedMediaPath: path,
                    mediaUrl: `https://storage.googleapis.com/${bucket.name}/${path}`,
                  }
                  mem.photos.push(media);
                }
              }


              return firestoreUpdate(db, userId, memId, mem)
                .then(() => {
                  response.send("OK");
                })
                .catch(err => {
                  functions.logger.error(err);
                  response.send(`Error saving: ${err}`);
                });
            })
            .catch((err: Error) => {
              response.status(500).send("Error: " + err.toString());
            });
        })

      });
    })
  });
