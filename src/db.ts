import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAZelmIftjq1u0g-64mIXq00YYcSKnecHY',
  authDomain: 'liquidx-mem.firebaseapp.com',
  projectId: 'liquidx-mem',
  storageBucket: 'liquidx-mem.appspot.com',
  messagingSenderId: '509558279171',
  appId: '1:509558279171:web:628db1628b86b161635236',
  measurementId: 'G-LLJ84BZNKV',
};

// Get a Firestore instance
export const db = firebase.initializeApp(firebaseConfig).firestore();

// Export types that exists in Firestore
// This is not always necessary, but it's used in other examples
const { Timestamp, GeoPoint } = firebase.firestore;
export { Timestamp, GeoPoint };

// if using Firebase JS SDK < 5.8.0
// db.settings({ timestampsInSnapshots: true });
