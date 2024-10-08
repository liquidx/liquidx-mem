// @ts-expect-error $env actually exists
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from "$env/static/public";
import { initializeApp } from "firebase/app";

export function initializeFirebase() {
  const config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);
  return initializeApp(config);
}
