import axios from 'axios';

import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getViews } from './prefs';
import type { TagListItem } from './server/tags';

const serverUrl = '/_api';
// For debugging.
//const serverUrl = 'http://localhost:5001/liquidx-mem/us-central1'

export const getSavedViews = async (firestore: Firestore, user: User) => {
	const views = await getViews(firestore, user);
	return views;
};

export const getTags = async (firestore: Firestore, user: User) => {
	const url = `${serverUrl}/tag/count`;
	const body = { userId: user.uid };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return [];
		}

		if (!response.data.counts) {
			return [];
		}

		console.log(response.data);

		const tags = response.data.counts;
		tags.map((tag: TagListItem) => {
			tag.icon = iconForTag(tag.tag);
			return tag;
		});
		return tags;
	});
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
