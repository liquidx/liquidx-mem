import firebase from "firebase";

export interface Mem {
  id?: string,
  raw?: string,
  added?: firebase.firestore.Timestamp

  // Derived
  url?: string,
  note?: string,
  title?: string
}
