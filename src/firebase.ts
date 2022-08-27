import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import firebaseConfig from '../credentials-firebase-web.json';

// Get a Firestore instance
export const firebaseApp = firebase.initializeApp(firebaseConfig);
export const db = firebaseApp.firestore();

// Export types that exists in Firestore
// This is not always necessary, but it's used in other examples
const { Timestamp, GeoPoint } = firebase.firestore;
export { Timestamp, GeoPoint };

export const unwrapDocs = (docs: firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>): Array<firebase.firestore.DocumentData> => {
  let unwrapped: Array<firebase.firestore.DocumentData> = [];
  docs.forEach(snapshot => {
    let doc: firebase.firestore.DocumentData = snapshot.data()
    doc.id = snapshot.id

    unwrapped.push(doc);
  })
  return unwrapped
}

// if using Firebase JS SDK < 5.8.0
// db.settings({ timestampsInSnapshots: true });
