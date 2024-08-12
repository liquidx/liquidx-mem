import { type Db } from 'mongodb';
import { getUserCollection } from './db';
import { type User } from './user.types';
export const USER_NOT_FOUND = '';

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
