import type { User } from 'firebase/auth';
import {
	Firestore,
	CollectionReference,
	type DocumentData,
	collection,
	doc,
	DocumentReference
} from 'firebase/firestore';

export function getUserMemCollection(db: Firestore, user: User): CollectionReference<DocumentData> {
	let uid = '1';
	if (user) {
		uid = user.uid;
	}
	return collection(doc(collection(db, 'users'), uid), 'mems');
}

export function getUserTagIndexDoc(db: Firestore, user: User): DocumentReference {
	let uid = '1';
	if (user) {
		uid = user.uid;
	}
	return doc(collection(doc(collection(db, 'users'), uid), 'index'), 'tags');
}
