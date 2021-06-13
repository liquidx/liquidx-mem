// TODO: Cloned from ./core so that we could share the types.
// TODO: resolve how to share this type on both the server
//       and the client.

import { firestore } from 'firebase-admin';

export interface Mem {
  id?: string,
  raw?: string,
  added?: firestore.Timestamp

  // Derived
  url?: string,
  note?: string,
  title?: string
}
