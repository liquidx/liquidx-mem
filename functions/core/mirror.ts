
import { Mem, MemPhoto } from "./mems";
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
  if (mem.photos) {
    for (let photo of mem.photos) {
      if (photo.mediaUrl) {
        let destinationFilename = md5(photo.mediaUrl);
        let destinationPath = `${outputPath}/${destinationFilename}.jpg`;

        const response = await axios.get(photo.mediaUrl, {
          responseType: 'arraybuffer'
        });
        writeToCloudStorage(bucket, destinationPath, response.data)
      }
    }
  }

  return new Promise(resolve => {
    resolve(mem);
  });
};