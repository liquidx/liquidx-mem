import { firestore } from "firebase-admin";
import find from "lodash/find";

export const USER_NOT_FOUND = "";

export const userForSharedSecret = async (
  db: firestore.Firestore,
  sharedSecret: string
): Promise<string> => {
  const secrets = await db
    .collection("admin")
    .doc("users")
    .collection("secrets")
    .get()
    .then(snapshot => {
      return snapshot.docs.map(doc => {
        return { userId: doc.id, secret: doc.data().secret };
      });
    });

  const match = find(secrets, o => o.secret == sharedSecret);
  if (match) {
    return match.userId;
  }
  return USER_NOT_FOUND;
};
