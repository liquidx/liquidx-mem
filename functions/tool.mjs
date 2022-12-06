import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import { program } from 'commander';

import { mirrorMedia } from './dist/core/mirror.js'

const DEFAULT_USER = 'BB8zGVrCbrQ2QryHyiZNaUZJjQ93'
const BUCKET_NAME = 'liquidx-mem.appspot.com'

const main = async () => {
  const firebaseAdminCreds = JSON.parse(fs.readFileSync("./credentials-firebase-adminsdk.json", "utf8"));
  const firebaseApp = initializeApp({ credential: cert(firebaseAdminCreds) });
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);
  const bucket = storage.bucket(BUCKET_NAME)

  program.command('mirror <memId>').action(async (memId) => {
    const userId = DEFAULT_USER
    const docResult = await firestore.collection("users").doc(userId).collection("mems").doc(memId).get()
    const mem = Object.assign(docResult.data(), { id: docResult.id })
    const outputPath = `users/${userId}/media`

    mirrorMedia(mem, bucket, outputPath).then(result => {
      console.log(result)
    })
  });


  // Add a command in commander
  program.command("get-all").action(async () => {
    const userId = DEFAULT_USER
    const docsResult = await firestore.collection("users").doc(userId).collection("mems").get()
    const mems = docsResult.docs.map(doc => Object.assign(doc.data(), { id: doc.id }))
    const outputPath = `users/${userId}/media`
    for (let mem of mems) {
      console.log(`- ${mem.id}`)
      console.log(`  - url: ${mem.url}`)
      if (mem.photos) {
        hasMedia = true;
        for (let photo of mem.photos) {
          console.log(`   - photo: ${photo.mediaUrl}`)
        }
      }
      if (mem.videos) {
        for (let video of mem.videos) {
          console.log(`   - video: ${video.mediaUrl}`)
        }
      }


    }
  })

  program.parse()
}

main()
