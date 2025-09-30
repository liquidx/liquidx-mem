import { getDb, getTagCollection } from "$lib/db";
import { getFirebaseApp } from "$lib/firebase.server.js";
import { getUserId } from "$lib/server/api.server.js";
import type { TagCount, TagIndex } from "$lib/tags.types";
import { userForSharedSecret } from "$lib/user.db.server";
import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

const parseLimit = (value: string | null): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

const matchesQuery = (tag: string, query: string, queryWithoutHash: string): boolean => {
  if (!query && !queryWithoutHash) {
    return true;
  }

  const normalizedTag = tag.toLowerCase();
  if (query && normalizedTag.startsWith(query)) {
    return true;
  }

  if (queryWithoutHash) {
    if (normalizedTag.startsWith(`#${queryWithoutHash}`)) {
      return true;
    }

    if (!normalizedTag.startsWith("#") && normalizedTag.startsWith(queryWithoutHash)) {
      return true;
    }
  }

  return false;
};

export const GET: RequestHandler = async ({ request, url, locals }) => {
  const secret = url.searchParams.get("secret")?.trim() ?? "";

  // Check auth
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token && !secret) {
    console.log("Error: No token or secret");
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const firebaseApp = getFirebaseApp();
  const db = getDb(locals.mongoClient);

  let userId: string | undefined;
  if (token) {
    userId = await getUserId(firebaseApp, request);
  } else if (secret) {
    const user = await userForSharedSecret(db, secret);
    if (user) {
      userId = user._id;
    }
  }

  if (!userId) {
    return error(403, JSON.stringify({ error: "Permission denied" }));
  }

  const rawQuery = url.searchParams.get("query") ?? "";
  const normalizedQuery = rawQuery.trim().toLowerCase();
  const normalizedQueryWithoutHash = normalizedQuery.startsWith("#")
    ? normalizedQuery.slice(1)
    : normalizedQuery;
  const limit = parseLimit(url.searchParams.get("limit"));

  const tagIndex = (await getTagCollection(db).findOne({ userId })) as TagIndex | null;
  if (!tagIndex || !Array.isArray(tagIndex.counts)) {
    return json({ suggestions: [] });
  }

  const suggestions = tagIndex.counts
    .filter((tagCount: TagCount) =>
      matchesQuery(tagCount.tag, normalizedQuery, normalizedQueryWithoutHash)
    )
    .sort((a: TagCount, b: TagCount) => {
      if (b.count === a.count) {
        return a.tag.localeCompare(b.tag);
      }
      return b.count - a.count;
    })
    .slice(0, limit)
    .map(({ tag, count, icon }) => ({ tag, count, icon }));

  return json({ suggestions });
};
