import { Mem } from "./mems";
import urlRegex from "url-regex";

const tagRegex = new RegExp("#\\w+", "g");

export const extractTags = (text: string): string[] => {
  if (!text) {
    return [];
  }

  const matches = text.toLowerCase().matchAll(tagRegex);
  if (!matches) {
    return [];
  }

  const tags = [];
  for (const match of matches) {
    tags.push(match[0]);
  }
  return tags;
};

export const parseText = (text: string): Mem => {
  const mem: Mem = {
    raw: text
  };

  const matches = text.match(urlRegex());
  // TODO: deal with multiple matches.
  if (matches && matches.length > 0) {
    const first = matches[0];
    mem.url = first.toString();
    mem.note = text.replace(urlRegex(), "").trim();
    if (mem.note) {
      mem.tags = extractTags(mem.note);
    }
  }

  return mem;
};
