import process from 'process';
import fs from 'fs';

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { Command } from 'commander';

import { mirrorMedia } from '../lib/server/mirror.js';
import { annotateMem } from '../lib/server/annotator.js';

const DEFAULT_USER = 'BB8zGVrCbrQ2QryHyiZNaUZJjQ93';
const BUCKET_NAME = 'liquidx-mem.appspot.com';

export const addFirebaseCommands = (program: Command) => {
	const firebaseAdminCreds = JSON.parse(process.env.MEM_FIREBASE_ADMIN_KEY ?? '');
	const firebaseApp = initializeApp({ credential: cert(firebaseAdminCreds) });
	const firestore = getFirestore(firebaseApp);
	const storage = getStorage(firebaseApp);
	const bucket = storage.bucket(BUCKET_NAME);

	program
		.command('annotate <memId>')
		.requiredOption('-m --mem-id <memId>', 'Mem ID')
		.option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
		.action(async (options: any) => {
			const userId = options.userId;
			const memId = options.memId;
			const docResult = await firestore
				.collection('users')
				.doc(userId)
				.collection('mems')
				.doc(memId)
				.get();
			const doc: any = docResult.data();
			const mem = Object.assign(doc, { id: docResult.id });

			await annotateMem(mem).then((mem) => {
				const writable = Object.assign({}, mem);
				// writable.description = mem.description.slice(0, -5)
				// writable.descriptionHtml = mem.descriptionHtml.slice(0, -5)
				delete writable.id;
				console.log(writable);

				return firestore
					.collection('users')
					.doc(userId)
					.collection('mems')
					.doc(memId)
					.set(writable);
			});
		});

	program
		.command('mirror <memId>')
		.option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
		.action(async (memId: string, options) => {
			const userId = options.userId;
			const outputPath = `users/${userId}/media`;
			const docResult = await firestore
				.collection('users')
				.doc(userId)
				.collection('mems')
				.doc(memId)
				.get();
			const doc: any = docResult.data();
			const mem = Object.assign(doc, { id: docResult.id });

			await mirrorMedia(mem, bucket, outputPath).then((mem) => {
				const writable = Object.assign({}, mem);
				delete writable.id;
				return firestore
					.collection('users')
					.doc(userId)
					.collection('mems')
					.doc(memId)
					.set(writable);
			});
		});

	program
		.command('mirror-all')
		.option('--only-video', 'Only mirror mems with videos', false)
		.option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
		.action(async (options) => {
			const userId = options.userId;
			const docsResult = await firestore.collection('users').doc(userId).collection('mems').get();
			const mems = docsResult.docs.map((doc) => Object.assign(doc.data(), { id: doc.id }));
			for (const mem of mems) {
				if (mem.photos || mem.videos) {
					// Check if any of the photos are already mirrored
					const uncachedPhotos = mem.photos
						? mem.photos.filter((photo: any) => !photo.cachedMediaPath)
						: [];
					const uncachedVideos = mem.videos
						? mem.videos.filter((video: any) => !video.cachedMediaPath)
						: [];
					if (uncachedPhotos.length > 0 || uncachedVideos.length > 0) {
						console.log(`- ${mem.id} ${mem.url}`);
						await mirrorMedia(mem, bucket, `users/${userId}/media`)
							.then(async (mem) => {
								const writable = Object.assign({}, mem);
								delete writable.id;
								const memId = mem.id;
								if (memId) {
									await firestore
										.collection('users')
										.doc(userId)
										.collection('mems')
										.doc(memId)
										.set(writable);
								}
							})
							.then(() => {
								console.log(`  - updated ${mem.id}`);
							});
					} else {
						console.log(`- skipping ${mem.id}`);
					}
				}
			}
		});

	// Add a command in commander
	program
		.command('get-all')
		.option('-u --user-id <userId>', 'User ID', DEFAULT_USER)
		.option('-o --output <output>', 'Output file')
		.action(async (options) => {
			const userId = options.userId;
			const docsResult = await firestore.collection('users').doc(userId).collection('mems').get();
			const mems = docsResult.docs.map((doc) => Object.assign(doc.data(), { id: doc.id }));
			if (options.output) {
				fs.writeFileSync(options.output, JSON.stringify(mems, null, 2));
				console.log('Output to JSON file');
			}

			for (const mem of mems) {
				console.log(`- ${mem.id}`);
				console.log(`  - url: ${mem.url}`);
				if (mem.photos) {
					for (const photo of mem.photos) {
						console.log(`   - photo: ${photo.mediaUrl}`);
					}
				}
				if (mem.videos) {
					for (const video of mem.videos) {
						console.log(`   - video: ${video.mediaUrl}`);
					}
				}
			}
		});

	// Rename a tag.
	program
		.command('rename-tag')
		.option('-u,--user-id <userId>', 'User ID', DEFAULT_USER)
		.option('-f,--from <from>', 'From tag (without #)')
		.option('-t,--to <to>', 'To tag (without #)')
		.action(async (options) => {
			const userId = options.userId;
			const docsResult = await firestore.collection('users').doc(userId).collection('mems').get();

			const fromHashTag = `#${options.from}`;
			const toHashTag = `#${options.to}`;
			docsResult.docs.forEach(async (doc) => {
				const mem = Object.assign(doc.data(), { id: doc.id });
				if (mem.tags && mem.tags.includes(fromHashTag)) {
					const newTags = mem.tags.filter((tag: string) => tag !== fromHashTag);
					newTags.push(toHashTag);
					const note = mem.note ? mem.note.replace(fromHashTag, toHashTag) : undefined;
					console.log(`Renaming tag: ${mem.id} : ${mem.tags} --> ${newTags}`);
					console.log(`Renaming tag: ${mem.id} : ${mem.note} --> ${note}`);
					await firestore
						.collection('users')
						.doc(userId)
						.collection('mems')
						.doc(mem.id)
						.update({ tags: newTags, note: note });
				}
			});
		});
};
