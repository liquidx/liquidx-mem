import { orderBy, toPairs } from 'lodash-es';
import type { Mem } from '../common/mems';

export type TagIndex = { [field: string]: number };
export type TagListItem = { tag: string; count: number; icon?: string };
export type IndexTagDocument = { counts: TagListItem[] };

export const getTagCounts = (mems: Mem[]): TagListItem[] => {
	const tags: TagIndex = {};
	mems.forEach((mem: Mem) => {
		if (mem.tags) {
			for (const tag of mem.tags) {
				tags[tag] = tags[tag] ? tags[tag] + 1 : 1;
			}
		}
	});

	const orderedTags: TagListItem[] = orderBy(toPairs(tags), [1], ['desc']).map(
		(o) =>
			({
				tag: o[0],
				icon: '',
				count: o[1]
			}) as TagListItem
	);
	return orderedTags;
};
