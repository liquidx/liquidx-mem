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

  // Deprecated because it's freaking useless.
  added?: firebase.firestore.Timestamp;

  // Export
  addedMs?: number;

  // Derived
  url?: string;
  note?: string;

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

  if (json.addedMs) {
    mem.added = firebase.firestore.Timestamp.fromMillis(json.addedMs);
  } else if (json.added) {
    const ms = json.added.seconds * 1000;
    const timestamp = new firebase.firestore.Timestamp(
      json.added.seconds,
      json.added.nanoseconds
    );
    console.log(timestamp);
    //mem.added = timestamp;
    delete mem.added;
    mem.addedMs = ms;
  }

  return mem;
};

export const memToJson = (mem: Mem) => {
  const json = Object.assign({}, mem);
  if (mem.added) {
    json.addedMs = mem.added.toMillis();
    delete json.added;
  }
  return json;
};
