import urlRegexSafe from 'url-regex-safe';

import type { Mem } from './mems.js';

const tagRegex = new RegExp('#[^\\s,]+', 'g');
const dateRegex = new RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}');

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

export const extractDate = (text: string): string => {
	if (!text) {
		return '';
	}

	const dateMatch = text.match(dateRegex);
	if (!dateMatch) {
		return '';
	}

	return dateMatch[0];
};

export const extractEntities = (note: string): { date?: string; tags?: string[] } => {
	if (!note) {
		return {};
	}

	const entities = {
		tags: extractTags(note),
		date: extractDate(note)
	};
	return entities;
};

export const parseText = (text: string): Mem => {
	const mem: Mem = {
		raw: text
	};

	const matches = text.match(urlRegexSafe());
	// TODO: deal with multiple matches.
	if (matches && matches.length > 0) {
		const first = matches[0];
		mem.url = first.toString();
		mem.note = text.replace(urlRegexSafe(), '').trim();
	} else {
		mem.note = text;
	}

	if (mem.note) {
		Object.assign(mem, extractEntities(mem.note));
	}
	return mem;
};
