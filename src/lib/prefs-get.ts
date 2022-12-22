import {
  getFirestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  Firestore,
} from 'firebase/firestore'



export function getViews(uid: string, db: Firestore) {

  console.log('getViews')
  let prefsCollection = collection(
    doc(collection(db, 'users'), uid),
    'prefs',
  )
  let viewsDoc = doc(prefsCollection, 'views')
  return getDoc(viewsDoc)
    .then(doc => {
      if (doc.exists()) {
        let views = doc.data()
        if (views.views) {
          return views.views;
        }
      } else {
        // doc.data() will be undefined in this case
        console.log('No such document', viewsDoc.path)
        return null;
      }
    })
    .catch(error => {
      console.log('Error getting document:', error)
      return null;
    })
}
