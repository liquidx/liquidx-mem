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

  program.command('mirror <memId>')
    .option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
    .action(async (memId, options) => {
      const userId = options.userId
      const outputPath = `users/${userId}/media`
      const docResult = await firestore.collection("users").doc(userId).collection("mems").doc(memId).get()
      const mem = Object.assign(docResult.data(), { id: docResult.id })

      return mirrorMedia(mem, bucket, outputPath).then(mem => {
        const writable = Object.assign({}, mem)
        delete writable.id
        return firestore.collection("users").doc(userId).collection("mems").doc(mem.id).set(writable)
      })
    });

  program.command("mirror-all")
    .option('--only-video', 'Only mirror mems with videos', false)
    .option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
    .action(async (options) => {
      const userId = options.userId
      const docsResult = await firestore.collection("users").doc(userId).collection("mems").get()
      const mems = docsResult.docs.map(doc => Object.assign(doc.data(), { id: doc.id }))
      for (let mem of mems) {
        if (mem.photos || mem.videos) {
          // Check if any of the photos are already mirrored
          const uncachedPhotos = mem.photos ? mem.photos.filter(photo => !photo.cachedMediaPath) : []
          const uncachedVideos = mem.videos ? mem.videos.filter(video => !video.cachedMediaPath) : []
          if (uncachedPhotos.length > 0 || uncachedVideos.length > 0) {
            console.log(`- ${mem.id} ${mem.url}`)
            await mirrorMedia(mem, bucket, `users/${userId}/media`).then(mem => {
              const writable = Object.assign({}, mem)
              delete writable.id
              return firestore.collection("users").doc(userId).collection("mems").doc(mem.id).set(writable)
            })
              .then(() => {
                console.log(`  - updated ${mem.id}`)
              })
          } else {
            console.log(`- skipping ${mem.id}`)
          }
        }
      }
    })

  // Add a command in commander
  program.command("get-all").action(async () => {
    const userId = DEFAULT_USER
    const docsResult = await firestore.collection("users").doc(userId).collection("mems").get()
    const mems = docsResult.docs.map(doc => Object.assign(doc.data(), { id: doc.id }))
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
