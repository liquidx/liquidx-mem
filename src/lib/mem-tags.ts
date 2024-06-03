import { getUserTagIndexDoc } from '../lib/mem-data-collection';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getViews } from '$lib/prefs';
import { getDoc } from 'firebase/firestore';
import type { IndexTagDocument, TagListItem } from '$lib/server/tags';

export const getSavedViews = async (firestore: Firestore, user: User) => {
	const views = await getViews(firestore, user);
	return views;
};

export const getTags = async (firestore: Firestore, user: User) => {
	const tagCountDoc = getUserTagIndexDoc(firestore, user);
	const tags = await getDoc(tagCountDoc).then((doc) => {
		if (doc.exists()) {
			const docData = doc.data() as IndexTagDocument;
			const tags = docData.counts;
			console.log(docData);
			tags.map((tag: TagListItem) => {
				tag.icon = iconForTag(tag.tag);
				return tag;
			});
			return tags;
		}
		return [];
	});
	return tags;
};

export const iconForTag = (tag: string) => {
	if (!tag) {
		return '';
	}
	switch (tag) {
		case '#art':
			return `🎨`;
		case '#code':
			return `👨‍💻`;
		case '#map':
			return `🗺️`;
		case '#photo':
			return `📷`;
		case '#japan':
		case '#japanese':
			return `🇯🇵`;
		case '#tokyo':
			return `🗼`;
		case '#hongkong':
			return `🇭🇰`;
		case '#house':
			return `🏠`;
		case '#look':
		case '#read':
			return `👀`;
		case '#want':
			return `🤩`;
		case '#3d':
			return `📦`;
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
			return `🧠`;
		case '#f1':
			return `🏎️`;
		case '#snow':
			return `❄️`;
		case '#datavis':
			return `📊`;
		case '#design':
			return `🎨`;
		case '#keyboard':
			return `⌨️`;
		case '#web':
			return `🌐`;
		case '#music':
			return `🎵`;
		case '#game':
		case '#gaming':
			return `🎮`;
		case '#place':
			return `📍`;
		case '#snowboard':
			return `🏂`;
		case '#furniture':
			return `🛋️`;
		case '#watch':
			return `⌚`;
		default:
			return '';
	}
};
