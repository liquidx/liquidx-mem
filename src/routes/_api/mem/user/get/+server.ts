import { getDb } from "$lib/db";
import { userForSharedSecret } from "$lib/user.db.server";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const fallback: RequestHandler = async ({ url, request, locals }) => {
  let secret: string = "";

  if (request.method === "POST") {
    const body = await request.json();
    secret = body["secret"] || "";
  } else if (request.method === "GET") {
    secret = url.searchParams.get("secret") || "";
  } else {
    error(405, "Method Not Allowed");
  }

  if (!secret) {
    return error(400, JSON.stringify({ error: "Missing secret parameter" }));
  }

  const db = getDb(locals.mongoClient);
  const user = await userForSharedSecret(db, secret);

  if (!user) {
    return error(404, JSON.stringify({ error: "User not found for secret" }));
  }

  return json({ userId: user._id });
};