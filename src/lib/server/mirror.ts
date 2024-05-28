import axios from 'axios';
import { Bucket } from '@google-cloud/storage';
import md5 from 'md5';
import m3u8stream from 'm3u8stream';
import m3u8 from 'm3u8';

import { Mem } from './mems.js';

// Writes a file to cloud storage.
export const writeToCloudStorage = async (
	bucket: Bucket,
	storagePath: string,
	contents: ArrayBuffer
) => {
	return new Promise((resolve, reject) => {
		const storageFile = bucket.file(storagePath);
		const stream = storageFile.createWriteStream();
		stream.on('finish', () => {
			resolve(storagePath);
		});
		stream.on('error', (err) => {
			reject(err);
		});
		stream.write(contents);
		stream.end();
	});
};

// Downloads and writes media to cloud storage.
const writeMediaToCloudStorage = async (bucket: Bucket, storagePath: string, imageUrl: string) => {
	return axios
		.get(imageUrl, { responseType: 'arraybuffer' })
		.then((response) => {
			return writeToCloudStorage(bucket, storagePath, response.data);
		})
		.catch((err) => {
			if (err.response) {
				console.log(err.response.status, err.message);
			} else {
				console.log(err.message);
			}
			return null;
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

// Downloads and writes a video stream to cloud storage.
const writeVideoStreamToCloudStorage = async (
	bucket: Bucket,
	storagePath: string,
	streamUrl: any
) => {
	const bestStreamUrl = await getBestStreamUrl(streamUrl);
	console.log(` -- best stream ${bestStreamUrl}`);

	return new Promise((resolve, reject) => {
		const inputStream = m3u8stream(bestStreamUrl);
		const storageFile = bucket.file(storagePath);
		const outputStream = storageFile.createWriteStream();
		// Write mediaURL stream to cloud storage.
		inputStream.on('finish', () => {
			console.log('finished.');
			resolve(null);
		});
		inputStream.on('error', (err) => {
			console.log('error getting stream', err);
			reject(err);
		});
		inputStream.pipe(outputStream);
	});
};

export const mirrorMedia = async (mem: Mem, bucket: Bucket, outputPath: string): Promise<Mem> => {
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

				const request = writeMediaToCloudStorage(bucket, destinationPath, media.mediaUrl).then(
					() => {
						media.cachedMediaPath = destinationPath;
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
					if (media.contentType == 'application/x-mpegURL') {
						const destinationPath = `${outputPath}/${destinationSubpath}/${destinationFilename}.mp4`;
						console.log(` -- stream ${media.mediaUrl} to ${destinationPath}}`);
						const request = writeVideoStreamToCloudStorage(
							bucket,
							destinationPath,
							media.mediaUrl
						).then(() => {
							media.cachedMediaPath = destinationPath;
							return media;
						});
						requests.push(request);
					} else {
						const destinationPath = `${outputPath}/${destinationSubpath}/${destinationFilename}.${extension}`;
						const request = writeMediaToCloudStorage(bucket, destinationPath, media.mediaUrl).then(
							() => {
								media.cachedMediaPath = destinationPath;
								return media;
							}
						);
						requests.push(request);
					}
				}
			}
		}
	}

	if (requests.length) {
		await Promise.all(requests).catch((err) => {
			console.log('Error caching media: ', err.message);
			return null;
		});
		return mem;
	} else {
		return mem;
	}
};
