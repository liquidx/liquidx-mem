import axios from 'axios';
import type { S3Client } from '@aws-sdk/client-s3';
import md5 from 'md5';
import m3u8 from 'm3u8';
import { S3_BUCKET } from '$env/static/private';

import type { Mem } from '../common/mems.js';
import { writeFileToS3 } from '$lib/s3.server.js';

// Writes a file to cloud storage.
export const writeToCloudStorage = async (
	s3client: S3Client,
	storagePath: string,
	contents: ArrayBuffer
): Promise<string> => {
	return writeFileToS3(s3client, S3_BUCKET, storagePath, Buffer.from(contents));
};

// Downloads and writes media to cloud storage.
const writeMediaToCloudStorage = async (
	s3client: S3Client,
	storagePath: string,
	imageUrl: string
): Promise<string | void> => {
	return axios
		.get(imageUrl, { responseType: 'arraybuffer' })
		.then((response) => {
			return writeFileToS3(s3client, S3_BUCKET, storagePath, response.data);
		})
		.catch((err) => {
			if (err.response) {
				console.log(err.response.status, err.message);
			} else {
				console.log(err.message);
			}
			return;
		});
};

// Gets the best streaming URL from a M3U8 master playlist.
const getBestStreamUrl = async (streamUrl: string) => {
	// Download the master playlist.
	const masterResponse = await axios.get(streamUrl);

	// Read the m3u8 file.
	const m3u: any = await new Promise((resolve, reject) => {
		const m3u8reader: any = m3u8.createStream();
		m3u8reader.on('m3u', (m3u: Map<string, any>) => {
			resolve(m3u);
		});
		m3u8reader.write(masterResponse.data);
		m3u8reader.end();
	});

	// Pick the highest quality stream.
	let bestStream = null;
	for (const stream of m3u.items.StreamItem) {
		// console.log(' -', stream.attributes.get('bandwidth'), stream.attributes)
		if (!bestStream) {
			bestStream = stream;
			continue;
		}

		// Attributes are an AttributeList, not a dict, so we need to use get().
		if (stream.attributes.get('bandwidth') > bestStream.attributes.get('bandwidth')) {
			bestStream = stream;
		}
	}

	let bestStreamUrl = bestStream.properties.uri;
	if (bestStreamUrl.startsWith('/')) {
		const streamHost = new URL(streamUrl).host;
		bestStreamUrl = `https://${streamHost}${bestStreamUrl}`;
	}
	return bestStreamUrl;
};

export const mirrorMedia = async (
	mem: Mem,
	s3client: S3Client,
	outputPath: string
): Promise<Mem> => {
	const requests = [];

	if (mem.photos) {
		for (const media of mem.photos) {
			if (media.mediaUrl && media.mediaUrl.startsWith('http') && media.cachedMediaPath == null) {
				console.log(' -- mediaUrl: ', media.mediaUrl);

				const mediaUrl = new URL(media.mediaUrl);
				const destinationFilename = md5(media.mediaUrl);
				const destinationSubpath = mediaUrl.host.replace(/\./g, '_');
				const extension = mediaUrl.pathname.split('.').pop();
				const destinationPath = `${outputPath}/${destinationSubpath}/${destinationFilename}.${extension}`;

				const request = writeMediaToCloudStorage(s3client, destinationPath, media.mediaUrl).then(
					(outputPath) => {
						if (outputPath) {
							media.cachedMediaPath = destinationPath;
						}
						return media;
					}
				);
				requests.push(request);
			}
		}
		if (mem.videos) {
			for (const media of mem.videos) {
				if (media.mediaUrl && media.mediaUrl.startsWith('http') && media.cachedMediaPath == null) {
					console.log(' -- mediaUrl: ', media.mediaUrl);

					const mediaUrl = new URL(media.mediaUrl);
					const destinationFilename = md5(media.mediaUrl);
					const destinationSubpath = mediaUrl.host.replace(/\./g, '_');

					const extension = mediaUrl.pathname.split('.').pop();
					if (media.contentType != 'application/x-mpegURL') {
						const destinationPath = `${outputPath}/${destinationSubpath}/${destinationFilename}.${extension}`;
						const request = writeMediaToCloudStorage(
							s3client,
							destinationPath,
							media.mediaUrl
						).then(() => {
							if (outputPath) {
								media.cachedMediaPath = destinationPath;
							}
							return media;
						});
						requests.push(request);
					}
				}
			}
		}
	}

	if (requests.length) {
		await Promise.all(requests).catch((err) => {
			console.log('Error caching media: ', err.message);
		});
		return mem;
	} else {
		return mem;
	}
};
