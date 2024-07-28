import type { Mem, MemPhoto } from '../common/mems.js';

import { ANNOTATOR_URL_CONFIG, type AnnotatorUrlConfig } from './annotator-config.js';

import { fetchOpenGraph, type OpenGraphTags, type OpenGraphImage } from '../opengraph.js';
import { removeUrlTrackingParams } from '../url.js';

const ogImageToPhotos = (ogImages: OpenGraphImage[], url: string): MemPhoto[] => {
	return ogImages.map((image: any) => {
		let absoluteUrl = image.url;
		if (!image.url.startsWith('http')) {
			absoluteUrl = new URL(image.url, url).toString();
		}
		const photo: MemPhoto = {
			mediaUrl: absoluteUrl
		};
		if (
			'width' in image &&
			'height' in image &&
			typeof image.width === 'string' &&
			typeof image.height === 'string'
		) {
			photo.size = {
				w: parseInt(image.width),
				h: parseInt(image.height)
			};
		}
		return photo;
	});
};

const annotateWithOpenGraph = (mem: Mem, url: string, config: AnnotatorUrlConfig): Promise<Mem> => {
	const annotated: Mem = Object.assign({}, mem);

	return fetchOpenGraph(url)
		.then((og: OpenGraphTags | void) => {
			if (!og) {
				return mem;
			}

			if (og.title) {
				annotated.title = og.title;
			}
			if (og.description) {
				annotated.description = og.description;
			}
			if (config.useOldTitleDescription) {
				if (og.oldTitle) {
					annotated.title = og.oldTitle;
				}
				if (og.oldDescription) {
					annotated.description = og.oldDescription;
				}
			}

			if (og.images && (!annotated.photos || annotated.photos.length === 0)) {
				annotated.photos = ogImageToPhotos(og.images, url);
			}
			return annotated;
		})
		.catch(() => {
			return mem;
		});
};

export const annotateMem = async (mem: Mem): Promise<Mem> => {
	if (!mem.url) {
		return mem;
	}

	// Sanitize the URL
	mem.url = removeUrlTrackingParams(mem.url);

	// Sanitize any existing image URLs
	// if (mem.photos) {
	// 	for (const photo of mem.photos) {
	// 		if (photo.mediaUrl) {
	// 			if (!photo.mediaUrl.startsWith('http')) {
	// 				console.log('Absolute URL:', photo.mediaUrl, mem.url);
	// 			}
	// 		}
	// 	}
	// }

	for (const config of ANNOTATOR_URL_CONFIG) {
		const matched = mem.url.match(config.pattern);
		if (matched) {
			switch (config.action) {
				case 'ignore':
					return mem;
				case 'opengraph': {
					const content = await fetchOpenGraph(mem.url);
					console.log('Content:', content);
					return annotateWithOpenGraph(mem, mem.url, config);
				}
				case 'fetch': {
					// TODO implement me

					break;
				}
			}
		}
	}
	// Default is to use opengraph
	return annotateWithOpenGraph(mem, mem.url);
};
