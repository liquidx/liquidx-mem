import { initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

let sharedApp: App | null = null;

export const firebaseApp = (): App => {
  if (!sharedApp) {
    sharedApp = initializeApp();
  }
  return sharedApp;
};

export const getFirebaseStorageBucket = (firebaseApp: App) => {
  return getStorage(firebaseApp).bucket('liquidx-mem.appspot.com')
}

export const getFirestoreDb = (firebaseApp: App): Firestore => {
  return getFirestore(firebaseApp)
}