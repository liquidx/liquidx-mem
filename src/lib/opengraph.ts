import axios from 'axios';
import he from 'he';

export interface OpenGraphImage {
	url: string;
	width?: string;
	height?: string;
	type?: string;
	alt?: string;
}

export interface OpenGraphVideo {
	url: string;
	width?: string;
	height?: string;
	type?: string;
}

export interface OpenGraphAudio {
	url: string;
	type?: string;
}

export interface OpenGraphTags {
	title?: string;
	type?: string;
	locale?: string;
	description?: string;
	url?: string;
	images: OpenGraphImage[];
	videos: OpenGraphVideo[];
	audios: OpenGraphAudio[];
}

// Custom implementation of the Open Graph
export const fetchOpenGraph = async (url: string): Promise<OpenGraphTags | void> => {
	const request = {
		method: 'GET',
		url: url,
		headers: {
			accept: '*/*',
			'accept-language': 'en-US,en;q=0.9',
			'user-agent': 'curl/8.7.1'
		}
	};

	const content = await axios(request)
		.then((response: { data: any }) => {
			return response.data;
		})
		.catch((err: any) => {
			console.log('Error:', err);
			return null;
		});

	if (!content) {
		return null;
	}

	const ogRegex = /<meta property="og:([^"]+)" content="([^"]+)"/g;
	const ogTags: OpenGraphTags = {
		images: []
	};

	let currentImage: OpenGraphImage | null = null;
	let currentVideo: OpenGraphVideo | null = null;
	let currentAudio: OpenGraphAudio | null = null;

	let match;
	while ((match = ogRegex.exec(content))) {
		const propertyKey = match[1];
		const propertyValue = he.decode(match[2]);

		if (propertyKey.startsWith('image')) {
			if (propertyKey === 'image') {
				if (currentImage) {
					ogTags.images.push(currentImage);
				}
				currentImage = { url: propertyValue };
			} else if (propertyKey === 'image:width') {
				currentImage.width = propertyValue;
			} else if (propertyKey === 'image:height') {
				currentImage.height = propertyValue;
			} else if (propertyKey === 'image:type') {
				currentImage.type = propertyValue;
			} else if (propertyKey === 'image:alt') {
				currentImage.alt = propertyValue;
			}
		} else if (propertyKey.startsWith('video')) {
			if (propertyKey === 'video') {
				if (currentVideo) {
					ogTags.videos.push(currentVideo);
				}
				currentVideo = { url: propertyValue };
			} else if (propertyKey === 'video:width') {
				currentVideo.width = propertyValue;
			} else if (propertyKey === 'video:height') {
				currentVideo.height = propertyValue;
			} else if (propertyKey === 'video:type') {
				currentVideo.type = propertyValue;
			}
		} else if (propertyKey.startsWith('audio')) {
			if (propertyKey === 'audio') {
				if (currentAudio) {
					ogTags.audios.push(currentAudio);
				}
				currentAudio = { url: propertyValue };
			} else if (propertyKey === 'audio:type') {
				currentAudio.type = propertyValue;
			}
		} else {
			ogTags[propertyKey] = propertyValue;
		}
	}

	// Add any remaining images
	if (currentImage) {
		ogTags.images.push(currentImage);
	}
	if (currentVideo) {
		ogTags.videos.push(currentVideo);
	}
	if (currentAudio) {
		ogTags.audios.push(currentAudio);
	}

	return ogTags;
};
