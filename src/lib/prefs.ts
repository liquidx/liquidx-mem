import { collection, doc, getDoc, Firestore, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export const getPrefsCollection = (db: Firestore, user: User) => {
	return collection(doc(collection(db, 'users'), user.uid), 'prefs');
};

export function getWriteSecret(db: Firestore, user: User): Promise<string | null> {
	console.log('getSecret');
	const prefsCollection = getPrefsCollection(db, user);
	const docRef = doc(prefsCollection, 'secrets');
	return getDoc(docRef)
		.then((doc) => {
			if (doc.exists()) {
				const data = doc.data();
				if (data.writeSecret) {
					return data.writeSecret;
				}
			}
			// doc.data() will be undefined in this case
			console.log('No such document', docRef.path);
			return null;
		})
		.catch((error) => {
			console.log('Error getting document:', error);
			return null;
		});
}

export const updateWriteSecret = (db: Firestore, user: User, value: string) => {
	const prefsCollection = collection(doc(collection(db, 'users'), user.uid), 'prefs');
	const docRef = doc(prefsCollection, 'secrets');
	updateDoc(docRef, {
		writeSecret: value
	});
};
