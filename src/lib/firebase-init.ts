import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import type { QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { PUBLIC_MEM_FIREBASE_WEB_SECRETS } from '$env/static/public';

export function initializeFirebase() {
	let config = JSON.parse(PUBLIC_MEM_FIREBASE_WEB_SECRETS);
	return initializeApp(config);
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
