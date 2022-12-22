import { firestore } from "firebase-admin";
import { Mem } from "./mems";

export const firestoreUpdate = (
  db: firestore.Firestore,
  userId: string,
  memId: string,
  mem: Mem
): Promise<firestore.WriteResult> => {
  return db
    .collection("users")
    .doc(userId)
    .collection("mems")
    .doc(memId)
    .update(mem as { [x: string]: any; });
};
