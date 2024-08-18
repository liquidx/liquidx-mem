import { dev } from "$app/environment";
import { type DatabaseUserAttributes } from "$lib/auth.types";
import { MONGO_AUTH_DB } from "$lib/db";
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Lucia, type User, type UserId, generateId } from "lucia";
import { type Collection, type MongoClient } from "mongodb";

// Collection names in the database.
const AUTH_COLLECTIONS = {
  Users: "auth-users",
  Sessions: "auth-sessions"
};

// This is a re-declaration of the UserDoc and SessionDoc types from the adapter-mongodb package.
// Not sure why we need it, but I can't seem to import the type from the package itself.
//
// https://lucia-auth.com/database/mongodb
interface LocalUserDoc {
  _id: UserId;
}
interface LocalSessionDoc {
  _id: string;
  expires_at: Date;
  user_id: string;
}

const getMongoDbAdapter = async (client: MongoClient) => {
  const db = client.db(MONGO_AUTH_DB);
  const userCollection = db.collection(AUTH_COLLECTIONS.Users) as Collection<LocalUserDoc>;
  const sessionCollection = db.collection(AUTH_COLLECTIONS.Sessions) as Collection<LocalSessionDoc>;
  // @ts-expect-error - Unclear how to make the types work here.
  return new MongodbAdapter(sessionCollection, userCollection);
};

export const getLucia = async (mongoClient: MongoClient) => {
  const adapter = await getMongoDbAdapter(mongoClient);
  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: !dev
      }
    },
    getUserAttributes: (attributes: DatabaseUserAttributes) => {
      // Do not need to return the id, this is filled in by the adapter.
      return attributes;
    }
  });
};

export const getExistingUser = async (
  mongoClient: MongoClient,
  email: string
): Promise<User | undefined> => {
  const databaseUser = await mongoClient
    .db(MONGO_AUTH_DB)
    .collection(AUTH_COLLECTIONS.Users)
    .findOne({ email: email });
  if (!databaseUser) {
    return;
  }

  // Force cast from a db object to a lucia object.
  return luciaUserFromDatabaseUser(databaseUser as any);
};

export const updateUser = async (
  mongoClient: MongoClient,
  userId: string,
  updatedInfo: DatabaseUserAttributes
) => {
  const result = await mongoClient
    .db(MONGO_AUTH_DB)
    .collection(AUTH_COLLECTIONS.Users)
    // @ts-ignore - Using a string userId rather than ObjectId which is allowed, but not to typescript.
    .updateOne({ _id: userId }, { $set: updatedInfo });

  console.log("updateUser", result);
  return result;
};

const luciaUserFromDatabaseUser = (value: DatabaseUserAttributes & LocalUserDoc): User => {
  // @ts-ignore Remove the __v field from the object
  delete value.__v;
  const { _id: id, ...attributes } = value;
  return Object.assign({ id }, attributes);
};

export const addNewUser = async (
  mongoClient: MongoClient,
  userInfo: DatabaseUserAttributes
): Promise<User | undefined> => {
  const userObject: any = Object.assign(
    {
      _id: generateId(12) // Avoid using ObjectId for the ID
    },
    userInfo
  );

  const result = await mongoClient
    .db(MONGO_AUTH_DB)
    .collection(AUTH_COLLECTIONS.Users)
    .insertOne(userObject);

  if (result.insertedId) {
    // A bit of a round-about way to convert the inserted object
    // back into a Lucia User object.
    const id = result.insertedId;
    userObject._id = id;
    return luciaUserFromDatabaseUser(userObject);
  }
  return;
};

// Used primarily for the Apple OAuth flow where the profile is returned in the
// token exchange as idToken.
export const decodeProfileFromIdToken = (idToken: string): { [key: string]: any } | undefined => {
  // https://github.com/lucia-auth/lucia/blob/v2/packages/oauth/src/core/oidc.ts
  const parts = idToken.split(".");
  const base64UrlPayload = parts[1];
  // Convert from URL encoded base64 to regular base64.
  const base64 = base64UrlPayload.replace(/-/g, "+").replace(/_/g, "/");
  console.log("base64UrlPayload", base64);
  const payload = atob(base64);
  console.log("payload", payload);
  const decodedJson = JSON.parse(payload) as { [key: string]: any };
  if (!decodedJson) {
    return;
  }
  return decodedJson;
};

// Some type magic that Lucia wants in order for the DatabaseUserAttributes to be
// defined in the type definitions of Lucia for `User`
declare module "lucia" {
  interface Register {
    Lucia: Lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}
