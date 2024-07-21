import openGraphScraper from 'open-graph-scraper';
import type { Mem, MemPhoto } from '../common/mems.js';

import { isResultBlocked } from './annotator-og-blocklist.js';

// TODO: Type not exporting properly.
const getOpenGraph = openGraphScraper as any;

const ogImageToPhotos = (ogImage: any): MemPhoto[] => {
	let ogImages = [];
	if (Array.isArray(ogImage)) {
		ogImages = ogImage;
	} else {
		ogImages = [ogImage];
	}

	return ogImages.map((image: any) => {
		const photo: MemPhoto = {
			mediaUrl: image.url
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

const annotateWithOpenGraph = (mem: Mem, url: string): Promise<Mem> => {
	const annotated: Mem = Object.assign({}, mem);
	const regularUserAgent =
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
	const crawlerUserAgent = 'mem.liquidx.app/@liquidx';
	const request = {
		url: url,
		headers: {
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9',
			'cache-control': 'max-age=0',
			'user-agent': crawlerUserAgent
		}
	};
	console.log('annotateWithOpenGraph');
	return getOpenGraph(request)
		.then((response: { result: any; error: any | undefined }) => {
			if (response.error) {
				console.log('Error:', response.result.error);
				return mem;
			}

			const result = response.result;
			console.log('Annotation result:', result);
			if (result && !isResultBlocked(result)) {
				if (result.ogTitle) {
					annotated.title = result.ogTitle;
				}
				if (result.ogDescription) {
					annotated.description = result.ogDescription;
				}
				if (result.ogImage) {
					annotated.photos = ogImageToPhotos(result.ogImage);
				}
			}
			return annotated;
		})
		.catch((err: { result: any; error: boolean }) => {
			console.log('Error Exception:', err.result.error);
			return mem;
		});
};

export const annotateMem = (mem: Mem): Promise<Mem> => {
	if (mem.url) {
		return annotateWithOpenGraph(mem, mem.url);
	}

	return new Promise((resolve) => {
		resolve(mem);
	});
};
