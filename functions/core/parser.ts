import { Mem } from './mems'
import urlRegex from 'url-regex';

export const parseText = (text: string) : Mem => {
  const mem : Mem = {
    raw: text
  };

  const matches = text.match(urlRegex())
  // TODO: deal with multiple matches.
  if (matches && matches.length > 0) {
    const first = matches[0];
    mem.url = first.toString()
    mem.note = text.replace(urlRegex(), '').trim()
  }

  return mem;
}