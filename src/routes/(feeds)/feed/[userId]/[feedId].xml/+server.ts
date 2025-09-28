import type { Mem } from "$lib/common/mems";
import { getDb } from "$lib/db";
import { htmlEscape } from "$lib/html";
import { getMems } from "$lib/mem.db.server";
import type { MemListRequest } from "$lib/request.types";
import { getCachedStorageUrl } from "$lib/storage";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals }) => {
  // TODO: Verify the user ID using a secret code
  const userId = params.userId;
  const feedId = params.feedId;

  if (!userId || !feedId) {
    return new Response("Missing feed parameters", { status: 400 });
  }

  const normalizedTag = feedId.startsWith("#") ? feedId : `#${feedId}`;
  const feedLimit = 100;

  const db = getDb(locals.mongoClient);
  const request: MemListRequest = {
    userId,
    matchAllTags: [normalizedTag],
    order: "newest",
    pageSize: feedLimit,
    page: 0,
    all: true
  };

  const mems = (await getMems(db, userId, request)) as Mem[];
  const limitedMems = (mems ?? []).slice(0, feedLimit);

  const channelTitle = `Mem Feed [${normalizedTag}]`;
  const now = new Date().toUTCString();

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  rss += `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">\n`;
  rss += `<channel>\n`;
  rss += `<title>${htmlEscape(channelTitle) ?? channelTitle}</title>\n`;
  rss += `<link></link>\n`;
  rss += `<description>${htmlEscape(`Mem feed for ${normalizedTag}`) ?? ""}</description>\n`;
  rss += `<lastBuildDate>${now}</lastBuildDate>\n`;

  for (const mem of limitedMems) {
    const title = htmlEscape(mem.title ?? mem.note ?? normalizedTag) ?? normalizedTag;
    const link = htmlEscape(mem.url ?? "") ?? "";
    const descriptionSource = mem.description || mem.note || mem.url || "";
    const enclosure = getMemImage(mem);
    
    // Include image in description for better RSS reader compatibility
    let description = htmlEscape(descriptionSource) ?? "";
    if (enclosure) {
      const imageTag = `<img src="${htmlEscape(enclosure.url) ?? enclosure.url}" alt="${title}" style="max-width: 100%; height: auto;" />`;
      description = description ? `${imageTag}<br/><br/>${description}` : imageTag;
    }
    
    const pubDate = mem.addedMs ? new Date(mem.addedMs).toUTCString() : now;
    const guid =
      htmlEscape(mem._id ?? `${userId}-${feedId}-${mem.addedMs ?? now}`) ??
      `${userId}-${feedId}-${mem.addedMs ?? now}`;

    rss += `<item>\n`;
    rss += `<guid isPermaLink="false">${guid}</guid>\n`;
    rss += `<title>${title}</title>\n`;
    if (link) {
      rss += `<link>${link}</link>\n`;
    }
    rss += `<description><![CDATA[${description}]]></description>\n`;
    rss += `<pubDate>${pubDate}</pubDate>\n`;
    if (enclosure) {
      const enclosureUrl = htmlEscape(enclosure.url) ?? enclosure.url;
      rss += `<enclosure url="${enclosureUrl}" type="${enclosure.type}" length="0" />\n`;
      rss += `<media:content url="${enclosureUrl}" type="${enclosure.type}" medium="image" />\n`;
    }
    rss += `</item>\n`;
  }

  rss += `</channel>\n`;
  rss += `</rss>\n`;

  return new Response(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
};

const getMemImage = (mem: Mem): { url: string; type: string } | undefined => {
  const photoUrl = getFirstPhotoUrl(mem);
  if (photoUrl) {
    return { url: photoUrl, type: guessMimeType(photoUrl) };
  }

  const mediaUrl = getMediaUrl(mem);
  if (mediaUrl) {
    return { url: mediaUrl.url, type: mediaUrl.type };
  }

  return undefined;
};

const getFirstPhotoUrl = (mem: Mem): string | undefined => {
  if (!mem.photos || mem.photos.length === 0) {
    return undefined;
  }

  for (const photo of mem.photos) {
    if (photo.cachedMediaPath) {
      return getCachedStorageUrl(photo.cachedMediaPath);
    }
    if (photo.mediaUrl) {
      return photo.mediaUrl;
    }
  }

  return undefined;
};

const getMediaUrl = (mem: Mem): { url: string; type: string } | undefined => {
  if (!mem.media) {
    return undefined;
  }

  const url = mem.media.path
    ? getCachedStorageUrl(mem.media.path)
    : mem.media.url
      ? mem.media.url
      : undefined;
  if (!url) {
    return undefined;
  }

  const type = mem.media.type || guessMimeType(url);

  return { url, type };
};

const guessMimeType = (url: string): string => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match ? match[1].toLowerCase() : "";
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
};
