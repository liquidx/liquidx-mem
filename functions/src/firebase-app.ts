import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

export const firebaseApp = (): admin.app.App => {
  if (!app) {
    app = admin.initializeApp();
  }
  return app;
};
