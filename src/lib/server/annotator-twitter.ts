/**
 * Annotator methods for Tweets.
 *
 * Deliberately using v1.1 API because v2 API doesn't return URLs for GIFs and Videos.
 */

import needle from 'needle';
import { DateTime } from 'luxon';
import fs from 'fs';

import { Mem, MemVideo, MemPhoto, MemLink } from '../common/mems.js';

export const twitterStatusUrlRegex = new RegExp('https://twitter.com/.*/status/([0-9]+)');
const twitterApiUserAgent = 'liquidx-mem/1';

interface ShowTweetResponse {
	id: number;
	created_at: string;
	// Returned if tweet_mode=extended
	full_text?: string;
	// Returned if using regular v1.1 API
	text?: string;
	user?: {
		screen_name?: string;
		url?: string;
	};
	entities?: {
		hashtags?: any;
		urls?: any;
		media?: any;
	};
	extended_entities?: {
		media?: any;
	};
}

const loadCredentials = () => {
	return JSON.parse(fs.readFileSync('./credentials-twitter.json', 'utf8'));
};

const tweetVisibleText = (tweet: ShowTweetResponse): Mem => {
	const authorName = tweet.user ? tweet.user.screen_name : 'unknown';
	const authorUrl = tweet.user ? tweet.user.url : undefined;
	let originalText = '';
	if (tweet.full_text) {
		originalText = tweet.full_text;
	} else if (tweet.text) {
		originalText = tweet.text;
	}

	let title = '';
	let text = '';
	let html = '';
	let date = '';
	const entities = [];
	const media = [];
	const photos: MemPhoto[] = [];
	const videos: MemVideo[] = [];
	const links: MemLink[] = [];

	if (tweet.entities) {
		if (tweet.entities.urls) {
			for (const url of tweet.entities.urls) {
				//console.dir(url);
				entities.push(url);
			}
		}

		if (tweet.extended_entities && tweet.extended_entities.media) {
			//console.log('media:', tweet.extended_entities.media);
			for (const media of tweet.extended_entities.media) {
				// if (media.video_info) {
				//   console.dir(media.video_info);
				// }
				entities.push(media);
			}
		}

		// sort replacements.
		entities.sort((a, b) => {
			return a.indices[0] - b.indices[0];
		});

		let index = 0;
		for (const entity of entities) {
			text += originalText.substring(index, entity.indices[0]);
			html += originalText.substring(index, entity.indices[0]);
			if (entity.media_url_https) {
				media.push(entity);
				const mediaType = entity.type || '';
				if (mediaType === 'photo') {
					photos.push({
						mediaUrl: entity.media_url_https,
						size: { w: entity.sizes.large.w, h: entity.sizes.large.h }
					});
				} else if (mediaType === 'animated_gif' || mediaType == 'video') {
					const variants = entity.video_info.variants;
					if (variants.length > 0) {
						const video = variants[0];
						videos.push({
							posterUrl: entity.media_url_https,
							size: { w: entity.sizes.large.w, h: entity.sizes.large.h },
							contentType: video.content_type,
							mediaUrl: video.url
						});
					}
				}
			} else if (entity.url) {
				// Parse links as MemLink objects.
				text += `${entity.display_url} `;
				html += `<a href="${entity.expanded_url}">${entity.display_url}</a> `;
				links.push({
					url: entity.expanded_url,
					description: entity.display_url
				});
			}
			index = entity.indices[1];
		}
		text += originalText.substring(index, originalText.length);
		html += originalText.substring(index, originalText.length);
	} else {
		text = originalText;
		html = originalText;
	}

	title = `@${authorName} on twitter`;
	date = DateTime.fromJSDate(new Date(tweet.created_at)).toUTC().toFormat('yyyy-MM-dd');

	return {
		title: title,
		date: date,
		description: text,
		descriptionHtml: html,
		twitterMedia: media,
		photos: photos,
		videos: videos,
		links: links,
		authorName: authorName,
		authorUrl: authorUrl
	};
};

export const twitterApiRequest = (
	version: number,
	tweetId: string
): { url: string; params: Record<string, unknown>; headers: Record<string, string> } => {
	if (version == 1) {
		const twitterToken = loadCredentials();
		const url = 'https://api.twitter.com/1.1/statuses/show.json';
		const params = {
			id: tweetId,
			include_entities: 'true',
			// Undocumented parameter to access tweets with 280 chars.
			// https://twittercommunity.com/t/missing-media-property-in-entities/70388/4
			// attribute text -> full_text
			tweet_mode: 'extended'
		};
		const headers = {
			'User-Agent': twitterApiUserAgent,
			authorization: `Bearer ${twitterToken.bearerToken}`
		};
		return { url, params, headers };
	} else {
		// Currently ignored. API v2 does not return URLs for video and GIF entities.
		const url = `https://api.twitter.com/2/tweets/${tweetId}`;
		const params = {
			expansions: 'attachments.media_keys,author_id',
			'tweet.fields': 'entities,source,text,created_at',
			'media.fields': 'width,height,type,duration_ms,preview_image_url,url',
			'user.fields': 'id,name'
		};
		const headers = {
			'User-Agent': twitterApiUserAgent
			//authorization: `Bearer ${twitterV2Token.BEARER_TOKEN}`
		};
		return { url, params, headers };
	}
};

export const annotateWithTwitterApi = (mem: Mem, url: string): Promise<Mem> => {
	const match = url.match(twitterStatusUrlRegex);
	const version = 1;
	if (match) {
		let annotated: Mem = Object.assign({}, mem);
		const { url, params, headers } = twitterApiRequest(version, match[1]);

		return needle('get', url, params, { headers })
			.then((response) => {
				// Check this is a valid JSON response and has the atttribute 'text' or 'full_text'
				if (response && response.body && (response.body.text || response.body.full_text)) {
					const contents = tweetVisibleText(response.body as ShowTweetResponse);
					annotated = Object.assign(annotated, contents);
				} else {
					console.log('Error. Invalid response:', response.body);
				}
				return annotated;
			})
			.catch((err) => {
				console.log('Error', err);
				return mem;
			});
	}

	return new Promise((resolve) => {
		resolve(mem);
	});
};
