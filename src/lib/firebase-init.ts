import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import type { QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import firebaseConfig from '$lib/credentials-firebase-web.json';

export function initializeFirebase() {
	return initializeApp(firebaseConfig);
}

export function initializeLocalFirestore() {
	let db = getFirestore();
	connectFirestoreEmulator(db, 'localhost', 15001);
	return db;
}

export function initializeFirestore(firebaseApp: FirebaseApp) {
	return getFirestore(firebaseApp);
}

// Export types that exists in Firestore
// This is not always necessary, but it's used in other examples
// const { Timestamp, GeoPoint } = firebase.firestore;
// export { Timestamp, GeoPoint };

export const unwrapDocs = (docs: QuerySnapshot<DocumentData>): Array<DocumentData> => {
	let unwrapped: Array<DocumentData> = [];
	docs.forEach((snapshot) => {
		let doc: DocumentData = snapshot.data();
		doc.id = snapshot.id;

		unwrapped.push(doc);
	});
	return unwrapped;
};

// if using Firebase JS SDK < 5.8.0
// db.settings({ timestampsInSnapshots: true });

export const unwrapDoc = (snapshot: DocumentSnapshot) => {
	let doc: DocumentData | undefined = snapshot.data();
	if (!doc) {
		return;
	}
	doc.id = snapshot.id;
	return doc;
};
