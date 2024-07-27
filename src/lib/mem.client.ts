import axios from 'axios';
import type { User } from 'firebase/auth';

import { memFromJson, type Mem, type MemPhoto } from './common/mems';
import type { TagListItem } from './tags.server';
import { iconForTag } from './tags';
import type { UserView, UserWriteSecret } from './user.types';
import type { MemAnnotateResponse } from './request.types';

const serverUrl = '/_api';
// For debugging.
//const serverUrl = 'http://localhost:5001/liquidx-mem/us-central1'

export interface MemAddResponse {
	mem: Mem;
}

export async function getMem(memId: string, user: User): Promise<Mem | undefined> {
	const url = `${serverUrl}/mem/get?memId=${memId}`;

	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.get(url, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}
		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function addMem(mem: Mem, user: User): Promise<Mem | void> {
	const url = `${serverUrl}/mem/add`;

	const body = { text: mem.raw };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios
		.post(url, body, { headers })
		.then((response) => {
			if (response.status != 200) {
				return;
			}

			if (!response.data.mem) {
				return;
			}
			return memFromJson(response.data.mem) as unknown as Mem;
		})
		.catch(() => {
			return; // Add a return statement here to handle any errors and ensure a value is always returned.
		});
}

export async function deleteMem(mem: Mem, user: User): Promise<string | void> {
	console.log('deleteMem', mem);
	const url = `${serverUrl}/mem/del`;
	const body = { memId: mem._id };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}
		if (!response.data) {
			return;
		}
		return mem._id;
	});
}

export async function annotateMem(mem: Mem, user: User): Promise<MemAnnotateResponse | undefined> {
	const url = `${serverUrl}/mem/annotate`;
	const body = { userId: user.uid, memId: mem._id };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}

		// TODO: Use zod to verify.
		const annotateResponse: MemAnnotateResponse = response.data;

		return { mem: memFromJson(annotateResponse.mem), memId: annotateResponse.memId };
	});
}

export async function archiveMem(mem: Mem, user: User): Promise<Mem | undefined> {
	const url = `${serverUrl}/mem/flag`;
	const body = { userId: user.uid, memId: mem._id, new: false };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function unarchiveMem(mem: Mem, user: User): Promise<Mem | undefined> {
	const url = `${serverUrl}/mem/flag`;
	const body = { userId: user.uid, memId: mem._id, new: true };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function seenMem(mem: Mem, user: User): Promise<Mem | undefined> {
	const url = `${serverUrl}/mem/flag`;
	const body = { userId: user.uid, memId: mem._id, seen: true };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function updateNoteForMem(
	mem: Mem,
	note: string,
	user: User
): Promise<Mem | undefined> {
	const url = `${serverUrl}/mem/edit`;
	const body = { userId: user.uid, memId: mem._id, updates: { note: note } };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function updateTitleForMem(
	mem: Mem,
	title: string,
	user: User
): Promise<Mem | undefined> {
	const updates = {
		title: title
	};

	const url = `${serverUrl}/mem/edit`;
	const body = { userId: user.uid, memId: mem._id, updates };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

export async function updateDescriptionForMem(
	mem: Mem,
	description: string,
	user: User
): Promise<Mem | undefined> {
	const updates = {
		description: description
	};

	const url = `${serverUrl}/mem/edit`;
	const body = { userId: user.uid, memId: mem._id, updates };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
}

const contentsAsBase64 = (file: File) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			if (typeof reader.result !== 'string') {
				reject('reader.result is not a string');
				return;
			}
			resolve(reader.result.split(',')[1]);
		};
		reader.onerror = (error) => reject(error);
	});

export async function uploadFilesForMem(
	mem: Mem,
	files: FileList,
	user: User,
	onFinish?: () => void
): Promise<Mem | undefined> {
	const authToken = await user.getIdToken();
	if (!authToken) {
		console.error('No auth token');
		return;
	}

	if (!files || files.length < 1) {
		console.error('No files');
		return;
	}

	const firstFile: File = files[0];
	const fileContents = await contentsAsBase64(firstFile);
	const url = `${serverUrl}/mem/attach`;
	const headers = {
		Authorization: `Bearer ${authToken}`
	};
	const body = {
		image: { body: fileContents, filename: firstFile.name, mimetype: firstFile.type },
		mem: mem._id
	};

	return axios
		.post(url, body, { headers })
		.then((response) => {
			if (onFinish) onFinish();
			if (response.status != 200) {
				return undefined;
			}
			if (!response.data.mem) {
				return undefined;
			}
			const mem = memFromJson(response.data.mem);
			return mem;
		})
		.catch(() => {
			if (onFinish) onFinish();
			return undefined;
		});
}

export const deletePhotoForMem = async (
	mem: Mem,
	photo: MemPhoto,
	user: User
): Promise<Mem | undefined> => {
	const url = `${serverUrl}/mem/media-del`;
	const body = { userId: user.uid, memId: mem._id, mediaUrl: photo.mediaUrl };
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, body, { headers }).then((response) => {
		if (response.status != 200) {
			return;
		}

		if (!response.data.mem) {
			return;
		}
		return memFromJson(response.data.mem);
	});
};

export const getSavedViews = async (user: User): Promise<UserView[] | undefined> => {
	const url = `${serverUrl}/prefs?key=views`;
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.get(url, { headers }).then((response) => {
		console.log('getSavedViews', response);
		if (!response.data) {
			return [];
		}
		if (!response.data.settings) {
			return [];
		}
		const views = response.data.settings as UserView[];
		return views;
	});
};

export const updateSavedViews = async (user: User, settings: UserView[]): Promise<void> => {
	const url = `${serverUrl}/prefs`;
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, { key: 'views', settings }, { headers });
};

export const getWriteSecret = async (user: User): Promise<UserWriteSecret> => {
	const url = `${serverUrl}/prefs?key=writeSecret`;
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.get(url, { headers }).then((response) => {
		const secret = response.data.settings as UserWriteSecret;
		return secret;
	});
};

export const updateSecrets = async (user: User, settings: UserWriteSecret): Promise<void> => {
	const url = `${serverUrl}/prefs`;
	const authToken = await user.getIdToken();
	const headers = {
		Authorization: `Bearer ${authToken}`
	};

	return axios.post(url, { key: 'secrets', settings }, { headers });
};

export const getTags = async (user: User) => {
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

		const tags = response.data.counts;
		tags.map((tag: TagListItem) => {
			tag.icon = iconForTag(tag.tag);
			return tag;
		});
		return tags;
	});
};
