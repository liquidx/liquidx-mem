import { orderBy, toPairs } from 'lodash-es';
import type { Mem } from '../../functions/core/mems';
import { getUserMemCollection } from '../lib/mem-data-collection';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { queryForAllMems, executeQuery } from './mem-data-queries';
import { getViews } from '$lib/prefs-get';

export type TagIndex = { [field: string]: number };
export type TagListItem = { tag: string; label: string; count: number };

export const getSavedViews = async (firestore: Firestore, user: User) => {
	let views = await getViews(firestore, user);
	return views;
};

export const getTags = async (firestore: Firestore, user: User) => {
	let collection = getUserMemCollection(firestore, user);
	let allQuery = queryForAllMems(collection);
	let mems = await executeQuery(allQuery);

	return tagListForMems(mems);
};

export const tagListForMems = (mems: Mem[]) => {
	const tags: TagIndex = {};
	mems.forEach((mem: Mem) => {
		if (mem.tags) {
			for (const tag of mem.tags) {
				tags[tag] = tags[tag] ? tags[tag] + 1 : 1;
			}
		}
	});

	let orderedTags = orderBy(toPairs(tags), [1], ['desc']).map(
		(o) =>
			({
				tag: o[0],
				label: labelForTag(o[0]),
				count: o[1]
			} as TagListItem)
	);
	return orderedTags;
};

export const labelForTag = (tag: string) => {
	if (!tag) {
		return tag;
	}
	switch (tag) {
		case '#art':
			return `🎨 ${tag}`;
		case '#code':
			return `👨‍💻 ${tag}`;
		case '#map':
			return `🗺️ ${tag}`;
		case '#photo':
			return `📷 ${tag}`;
		case '#japan':
		case '#japanese':
			return `🇯🇵 ${tag}`;
		case '#tokyo':
			return `🗼 ${tag}`;
		case '#hongkong':
			return `🇭🇰 ${tag}`;
		case '#house':
			return `🏠 ${tag}`;
		case '#look':
		case '#read':
			return `👀 ${tag}`;
		case '#want':
			return `🤩 ${tag}`;
		case '#3d':
			return `📦 ${tag}`;
		case '#ml':
		case '#ml-generative':
		case '#generated':
		case '#ml-app':
		case '#dreambooth':
		case '#nerf':
		case '#cloudml':
		case '#stablediffusion':
		case '#dalle':
		case '#midjourney':
		case '#llm':
		case '#colab':
			return `🧠 ${tag}`;
		case '#f1':
			return `🏎️ ${tag}`;
		case '#snow':
			return `❄️ ${tag}`;
		case '#datavis':
			return `📊 ${tag}`;
		case '#design':
			return `🎨 ${tag}`;
		case '#keyboard':
			return `⌨️ ${tag}`;
		case '#web':
			return `🌐 ${tag}`;
		case '#music':
			return `🎵 ${tag}`;
		case '#game':
		case '#gaming':
			return `🎮 ${tag}`;
		case '#place':
			return `📍 ${tag}`;
		case '#snowboard':
			return `🏂 ${tag}`;
		case '#furniture':
			return `🛋️ ${tag}`;
		case '#watch':
			return `⌚ ${tag}`;
		default:
			return tag;
	}
};
