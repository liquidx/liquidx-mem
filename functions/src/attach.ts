import * as functions from "firebase-functions";
import { DateTime } from "luxon";
import cors from "cors";
import { IncomingMessage } from "http";

import { firestoreUpdate } from "../core/firestore-update";
import { firebaseApp } from "./firebase-app";
import formidable from "formidable";
import { writeToCloudStorage } from "../core/mirror";

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

function getImagesFromRequest(req: IncomingMessage): formidable.File[] {
  const form = formidable({ multiples: true });
  let results: formidable.File[] = []

  form.parse(req, (err: string, fields, files) => {
    if (err) {
      console.error(err);
      return;
    }

    let images: formidable.File | formidable.File[] = files.image

    if (images instanceof formidable.File) {
      results.push(images as formidable.File)
    } else if (images instanceof Array) {
      for (let image of images) {
        results.push(image as formidable.File)
      }
    }
  })

  return results;
}


export const attach = functions
  .region("us-central1") // Must use us-central1 if using firebase.json:rewrites. :sadge:
  .https.onRequest(async (request, response) => {
    return corsAllowOrigin(request, response, () => {

      const images = getImagesFromRequest(request);
      if (!images) {
        response.status(500).send(`Error with attachment`);
        return;
      }
      const memId = request.query.mem || request.body.mem || "";
      const userId = request.query.user || request.body.user || "";

      const db = firebaseApp().firestore();
      db.doc(`users/${userId}/mems/${memId}`)
        .get()
        .then(async (snap) => {
          const mem = Object.assign({}, snap.data(), { id: snap.id });

          for (let file of images) {
            const dateString = DateTime.utc().toFormat("yyyyMMddhhmmss");
            const extension = getFileExtension(file.mimetype)
            const path = `users/${userId}/attachments/${dateString}/${file.originalFilename}.${extension}}`;
            const bucket = firebaseApp().storage().bucket()
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


          return firestoreUpdate(db, userId, memId, mem)
            .then(() => {
              response.send("OK");
            })
            .catch(err => {
              functions.logger.error(err);
              response.send(`Error saving: ${err}`);
            });
        })
        .catch(err => {
          response.status(500).send("Error: " + err.toString());
        });
    })
  });
