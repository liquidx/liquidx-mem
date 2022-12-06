
import { Mem } from "./mems";
import axios from 'axios';
import { Bucket } from '@google-cloud/storage'
import md5 from 'md5';

const writeToCloudStorage = async (bucket: Bucket, storagePath: string, contents: any) => {
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

export const mirrorMedia = async (mem: Mem, bucket: Bucket, outputPath: string): Promise<Mem> => {
  let requests = []

  if (mem.photos) {
    for (let photo of mem.photos) {
      if (photo.mediaUrl) {
        let destinationFilename = md5(photo.mediaUrl);
        let destinationSubpath = new URL(photo.mediaUrl).host.replace(/\./g, '_');
        let destinationPath = `${outputPath}/${destinationSubpath}/${destinationFilename}.jpg`;

        const response = await axios.get(photo.mediaUrl, {
          responseType: 'arraybuffer'
        });
        let request = writeToCloudStorage(bucket, destinationPath, response.data)
          .then((response) => {
            photo.cachedMediaPath = destinationPath
            return photo
          })
          .catch(err => {
            console.log(err)
            return null;
          })
        requests.push(request)
      }
    }
  }

  if (requests.length) {
    return Promise.all(requests).then(() => {
      return mem;
    })
  } else {
    return mem;
  }
};