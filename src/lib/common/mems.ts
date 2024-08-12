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

export const memFromJson = (json: Mem) => {
  const mem = Object.assign({}, json);
  return mem;
};

export const memToJson = (mem: Mem) => {
  const json = Object.assign({}, mem);
  return json;
};
