import { DateTime } from 'luxon';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { getUserId } from '$lib/server/api.server.js';

import { getFirebaseApp } from '$lib/firebase.server.js';
import { writeToCloudStorage } from '$lib/server/mirror.js';
import { memToJson } from '$lib/common/mems';
import { getMem } from '$lib/mem.db.server';
import { getDb } from '$lib/db';
import { updateMem } from '$lib/mem.db.server';
import { STORAGE_BASE_URL } from '$lib/storage';
import { getS3Client } from '$lib/s3.server';

const getFileExtension = (fileType: string | null): string => {
  switch (fileType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    default:
      return '';
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const memId = body.mem || '';
  const files = [body.image];

  console.log('/_api/mem/attach', memId);

  const firebaseApp = getFirebaseApp();
  const s3client = getS3Client();
  const db = getDb(locals.mongoClient);

  const userId = await getUserId(firebaseApp, request);
  if (!userId) {
    return error(403, JSON.stringify({ error: 'Permission denied' }));
  }

  const mem = await getMem(db, userId, memId);
  if (!mem) {
    return error(404, 'Mem not found');
  }

  for (const file of files) {
    const dateString = DateTime.utc().toFormat('yyyyMMddhhmmss');
    const extension = getFileExtension(file.mimetype);
    const path = `users/${userId}/attachments/${dateString}/${file.filename}.${extension}`;
    await writeToCloudStorage(s3client, path, Buffer.from(file.body, 'base64'));

    if (!mem.photos) {
      mem.photos = [];
    }

    const media = {
      cachedMediaPath: path,
      mediaUrl: `${STORAGE_BASE_URL}/${path}`
    };
    mem.photos.push(media);
  }

  const res = await updateMem(db, mem);
  if (!res) {
    return error(500, 'Unable to update mem');
  }
  console.log('updatedMem', mem);
  return json({ mem: memToJson(mem) });
};
