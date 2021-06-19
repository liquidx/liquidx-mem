import firebase from "firebase/app";
import "firebase/firestore";

export interface MemPhoto {
  mediaUrl?: string;
  size?: {
    w: number;
    h: number;
  };
}

export interface MemVideo {
  mediaUrl?: string;
  posterUrl?: string;
  contentType?: string;
  size?: {
    w: number;
    h: number;
  };
}

export interface Mem {
  id?: string;
  raw?: string;

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
}

export const memFromJson = (json: Mem) => {
  const mem = Object.assign({}, json);
  return mem;
};

export const memToJson = (mem: Mem) => {
  const json = Object.assign({}, mem);
  return json;
};
