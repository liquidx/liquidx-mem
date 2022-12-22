import { initializeApp } from 'firebase/app'
import { getFirestore, QuerySnapshot, DocumentData } from 'firebase/firestore'

import firebaseConfig from '../credentials-firebase-web.json';

// Get a Firestore instance
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp)

// Export types that exists in Firestore
// This is not always necessary, but it's used in other examples
// const { Timestamp, GeoPoint } = firebase.firestore;
// export { Timestamp, GeoPoint };

export const unwrapDocs = (docs: QuerySnapshot<DocumentData>): Array<DocumentData> => {
  let unwrapped: Array<DocumentData> = [];
  docs.forEach(snapshot => {
    let doc: DocumentData = snapshot.data()
    doc.id = snapshot.id

    unwrapped.push(doc);
  })
  return unwrapped
}

// if using Firebase JS SDK < 5.8.0
// db.settings({ timestampsInSnapshots: true });
