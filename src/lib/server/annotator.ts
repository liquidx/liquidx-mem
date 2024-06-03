import openGraphScraper from 'open-graph-scraper';
import type { Mem, MemPhoto } from '../common/mems.js';
import { annotateWithTwitterApi, twitterStatusUrlRegex } from './annotator-twitter.js';

import { isResultBlocked } from './annotator-og-blocklist.js';

// TODO: Type not exporting properly.
const getOpenGraph = openGraphScraper as any;

const annotateWithOpenGraph = (mem: Mem, url: string): Promise<Mem> => {
	const annotated: Mem = Object.assign({}, mem);
	const request = {
		url: url,
		headers: {
			'user-agent': 'liquidx-mem.web.app/1.0'
		}
	};
	return getOpenGraph(request)
		.then((response: { result: any; error: any | undefined }) => {
			if (response.error) {
				return mem;
			}

			const result = response.result;
			console.log(result);
			if (result && !isResultBlocked(result)) {
				if (result.ogTitle) {
					annotated.title = result.ogTitle;
				}
				if (result.ogDescription) {
					annotated.description = result.ogDescription;
				}
				if (result.ogImage) {
					if ('url' in result.ogImage) {
						const photo: MemPhoto = {
							mediaUrl: result.ogImage.url
						};
						if (
							'width' in result.ogImage &&
							'height' in result.ogImage &&
							typeof result.ogImage.width === 'string' &&
							typeof result.ogImage.height === 'string'
						) {
							photo.size = {
								w: parseInt(result.ogImage.width),
								h: parseInt(result.ogImage.height)
							};
						}
						annotated.photos = [photo];
					}
				}
			}
			return annotated;
		})
		.catch((err: string) => {
			console.log(err);
			return mem;
		});
};

export const annotateMem = (mem: Mem): Promise<Mem> => {
	if (mem.url) {
		if (mem.url.match(twitterStatusUrlRegex)) {
			return annotateWithTwitterApi(mem, mem.url);
		} else {
			return annotateWithOpenGraph(mem, mem.url);
		}
	}

	return new Promise((resolve) => {
		resolve(mem);
	});
};
