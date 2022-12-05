import { firestore } from "firebase-admin";
import { Mem } from "./mems";

export const firestoreAdd = (
  db: firestore.Firestore,
  userId: string,
  mem: Mem
): Promise<firestore.DocumentReference<firestore.DocumentData>> => {
  return db
    .collection("users")
    .doc(userId)
    .collection("mems")
    .add(mem as { [x: string]: any; });
};
