import { User } from 'firebase/auth'
import { Firestore, CollectionReference, DocumentData, collection, doc } from 'firebase/firestore'

export function getUserMemCollection(db: Firestore, user: User): CollectionReference<DocumentData> {
  let uid = '1';
  if (user) {
    uid = user.uid
  }
  return collection(doc(collection(db, 'users'), uid), 'mems')
}
