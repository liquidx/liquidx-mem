export interface MemPhoto {
  mediaUrl?: string;
  cachedMediaPath?: string;
  size?: {
    w: number;
    h: number;
  };
}

export interface MemVideo {
  mediaUrl?: string;
  cachedMediaPath?: string;
  posterUrl?: string;
  contentType?: string;
  size?: {
    w: number;
    h: number;
  };
}

export interface MemLink {
  url: string;
  description?: string;
}

export interface Mem {
  _id?: string;
  raw?: string;
  userId?: string;

  media?: {
    path?: string;
    url?: string;
    type?: string;
    width?: string;
    height?: string;
  };

  // If null or 0, this mem is archived.
  new?: boolean;

  addedMs?: number;

  // Derived
  url?: string;
  note?: string;
  tags?: string[];
  date?: string; // Not added date, but date described by the content. (yyyy-mm-dd format)

  // Open Graph or Tweet.
  title?: string;
  description?: string;
  descriptionHtml?: string;
  thumbnail?: {
    height?: string;
    type?: string;
    url?: string;
    width?: string;
  };
  authorName?: string;
  authorUrl?: string;
  twitterMedia?: any;
  photos?: MemPhoto[];
  videos?: MemVideo[];
  links?: MemLink[];
}

// Identity of a photo for dedup purposes: prefer the source URL, fall back to
// the mirrored path. Empty string means "no stable identity" (never deduped).
export const photoKey = (photo: MemPhoto): string =>
  photo.mediaUrl || photo.cachedMediaPath || "";

// Remove duplicate photos that share the same identity, preserving order and
// keeping the first occurrence. Useful fields (cachedMediaPath, size) from a
// later duplicate are merged into the kept photo so nothing is lost.
export const dedupePhotos = (photos: MemPhoto[]): MemPhoto[] => {
  const seen = new Map<string, MemPhoto>();
  const result: MemPhoto[] = [];
  for (const photo of photos) {
    const key = photoKey(photo);
    if (!key) {
      // No stable identity to dedupe on; keep it.
      result.push(photo);
      continue;
    }
    const existing = seen.get(key);
    if (!existing) {
      const copy = { ...photo };
      seen.set(key, copy);
      result.push(copy);
      continue;
    }
    if (!existing.cachedMediaPath && photo.cachedMediaPath) {
      existing.cachedMediaPath = photo.cachedMediaPath;
    }
    if (!existing.size && photo.size) {
      existing.size = photo.size;
    }
  }
  return result;
};

export const memFromJson = (json: Mem) => {
  const mem = Object.assign({}, json);
  return mem;
};

export const memToJson = (mem: Mem) => {
  const json = Object.assign({}, mem);
  return json;
};
