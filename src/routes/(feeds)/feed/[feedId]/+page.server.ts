import { getDb } from "$lib/db";
import { getMems } from "$lib/mem.db.server";

export const load = async ({ params, locals }) => {
  // TODO: Verify the user ID using a secret code
  const userId = params.feedId;
  const db = getDb(locals.dbClient);
  const mems = await getMems(db, userId);
  return { mems };
};
