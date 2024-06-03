import axios from 'axios';
import type { Mem } from '$lib/common/mems';
import { extractEntities } from '$lib/common/parser';
import { CollectionReference, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const serverUrl = '/_api';
// For debugging.
//const serverUrl = 'http://localhost:5001/liquidx-mem/us-central1'

export async function addMem(
	mem: Mem,
	collection: CollectionReference<DocumentData>
): Promise<void> {
	// API
	// const url = `${serverUrl}/add`;

	// const body = { text: mem.raw };
	// return axios.post(url, body).then((response) => console.log('addMem', response));
	// Firebase client
	await addDoc(collection, mem);
}

export function deleteMem(mem: Mem, collection: CollectionReference<DocumentData>): Promise<void> {
	return deleteDoc(doc(collection, mem.id));
}

export async function annotateMem(mem: Mem, uid: string): Promise<void> {
	const url = `${serverUrl}/annotate`;
	const body = { user: uid, mem: mem.id };
	return axios.post(url, body).then((response) => console.log(response));
}

export function archiveMem(mem: Mem, collection: CollectionReference<DocumentData>): Promise<void> {
	return updateDoc(doc(collection, mem.id), { new: false });
}

export function unarchiveMem(
	mem: Mem,
	collection: CollectionReference<DocumentData>
): Promise<void> {
	return updateDoc(doc(collection, mem.id), { new: true });
}

export function updateNoteForMem(
	mem: Mem,
	note: string,
	collection: CollectionReference<DocumentData>
): Promise<void> {
	const entities = extractEntities(note);
	const updated = Object.assign({ note: note }, entities);
	return updateDoc(doc(collection, mem.id), updated).then(() => {
		console.log('Updated mem', mem.id, updated);
	});
}

export function updateTitleForMem(
	mem: Mem,
	title: string,
	collection: CollectionReference<DocumentData>
): Promise<void> {
	const updated = {
		title: title
	};
	return updateDoc(doc(collection, mem.id), updated).then(() => {
		console.log('Updated mem', mem.id, updated);
	});
}

export function updateDescriptionForMem(
	mem: Mem,
	description: string,
	collection: CollectionReference<DocumentData>
): Promise<void> {
	const updated = {
		description: description
	};
	console.log('updateDescriptionForMem', mem);

	return updateDoc(doc(collection, mem.id), updated).then(() => {
		console.log('Updated mem', mem.id, updated);
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
): Promise<void> {
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

	return axios({
		url: `${serverUrl}/attach?mem=${mem.id}`,
		method: 'POST',
		data: {
			image: {
				body: fileContents,
				filename: firstFile.name,
				mimetype: firstFile.type
			},
			mem: mem.id
		},
		headers: {
			Authorization: `Bearer ${authToken}`
		}
	})
		.then(() => {
			if (onFinish) onFinish();
		})
		.catch(() => {
			if (onFinish) onFinish();
		});
}
