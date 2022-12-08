import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

let app: admin.app.App | null = null;

export const firebaseApp = (): admin.app.App => {
  if (!app) {
    app = admin.initializeApp();
  }
  return app;
};

export const getFirebaseStorageBucket = (app: admin.app.App) => {
  return getStorage(app).bucket('liquidx-mem.appspot.com')
}

export const getFirestoreDb = (app: admin.app.App): admin.firestore.Firestore => {
  return getFirestore(app)
}