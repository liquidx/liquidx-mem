import { type Db } from "mongodb";

import { getUserCollection } from "./db.server.js";
import type { User } from "./user.types.js";

export const USER_NOT_FOUND = "";

export const userForSharedSecret = async (
  db: Db,
  writeSecret: string
): Promise<User | undefined> => {
  const user = (await getUserCollection(db).findOne({
    writeSecret: writeSecret
  })) as unknown as User;
  if (user) {
    return user;
  }
  return;
};
