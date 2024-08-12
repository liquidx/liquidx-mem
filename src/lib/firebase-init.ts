import { initializeApp } from 'firebase/app';
// @ts-expect-error $env actually exists
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from '$env/static/public';

export function initializeFirebase() {
  const config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);
  return initializeApp(config);
}
