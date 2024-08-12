import axios from 'axios';
import { parse } from 'dotenv';
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
  site_name?: string;
  title?: string;
  type?: string;
  locale?: string;
  description?: string;
  url?: string;
  oldDescription?: string;
  oldTitle?: string;
  images?: OpenGraphImage[];
  videos?: OpenGraphVideo[];
  audios?: OpenGraphAudio[];
}

// https://stackoverflow.com/questions/62526483/twitter-website-doesnt-have-open-graph-tags
const DISCORD_BOT_USER_AGENT = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';

export const parseOpenGraph = (content: string): OpenGraphTags => {
  const ogRegex = /<meta\s+(content|property)="([^"]*)"\s+(content|property)="([^"]*)"/g;
  const ogTags: OpenGraphTags = {};

  let images = [];
  let videos = [];
  let audios = [];

  let currentImage: OpenGraphImage | null = null;
  let currentVideo: OpenGraphVideo | null = null;
  let currentAudio: OpenGraphAudio | null = null;

  const matches = content.matchAll(ogRegex);
  for (const match of matches) {
    let propertyKey = '';
    let propertyValue = '';

    // Figure out which group is the property and which is the content
    if (match[1] === 'property') {
      propertyKey = match[2];
      propertyValue = he.decode(match[4]);
    } else if (match[3] === 'property') {
      propertyKey = match[4];
      propertyValue = he.decode(match[2]);
    } else {
      console.log(match.groups);
    }

    if (propertyKey.startsWith('og:')) {
      propertyKey = propertyKey.replace('og:', '');
    } else {
      continue;
    }

    // Handle the content from the images.
    if (propertyKey.startsWith('image')) {
      if (propertyKey === 'image' || propertyKey === 'image:url') {
        if (currentImage) {
          images.push(currentImage);
        }
        currentImage = { url: propertyValue };
      } else if (propertyKey === 'image:width' && currentImage) {
        currentImage.width = propertyValue;
      } else if (propertyKey === 'image:height' && currentImage) {
        currentImage.height = propertyValue;
      } else if (propertyKey === 'image:type' && currentImage) {
        currentImage.type = propertyValue;
      } else if (propertyKey === 'image:alt' && currentImage) {
        currentImage.alt = propertyValue;
      }
    } else if (propertyKey.startsWith('video')) {
      if (propertyKey === 'video' || propertyKey === 'video:url') {
        if (currentVideo) {
          videos.push(currentVideo);
        }
        currentVideo = { url: propertyValue };
      } else if (propertyKey === 'video:width' && currentVideo) {
        currentVideo.width = propertyValue;
      } else if (propertyKey === 'video:height' && currentVideo) {
        currentVideo.height = propertyValue;
      } else if (propertyKey === 'video:type' && currentVideo) {
        currentVideo.type = propertyValue;
      }
    } else if (propertyKey.startsWith('audio')) {
      if (propertyKey === 'audio') {
        if (currentAudio) {
          audios.push(currentAudio);
        }
        currentAudio = { url: propertyValue };
      } else if (propertyKey === 'audio:type' && currentAudio) {
        currentAudio.type = propertyValue;
      }
    } else {
      ogTags[propertyKey] = propertyValue;
    }
  }

  // Add any remaining images
  if (currentImage) {
    images.push(currentImage);
  }
  if (currentVideo) {
    videos.push(currentVideo);
  }
  if (currentAudio) {
    audios.push(currentAudio);
  }

  if (images.length > 0) {
    ogTags.images = images;
  }
  if (videos.length > 0) {
    ogTags.videos = videos;
  }
  if (audios.length > 0) {
    ogTags.audios = audios;
  }

  // Extract any old school meta tags
  const metaDescription = content.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (metaDescription) {
    ogTags.oldDescription = he.decode(metaDescription[1]);
  }

  const metaTitle = content.match(/<title>([^<]*)<\/title>/);
  if (metaTitle) {
    ogTags.oldTitle = he.decode(metaTitle[1]);
  }

  return ogTags;
};

// Fetch open graph tags from a URL
export const fetchOpenGraph = async (
  url: string,
  verbose = false
): Promise<OpenGraphTags | void> => {
  const request = {
    method: 'GET',
    url: url,
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': DISCORD_BOT_USER_AGENT
    }
  };

  const content = await axios(request)
    .then((response: { data: any }) => {
      return response.data;
    })
    .catch((err: any) => {
      console.log('Error:', err.code, err.response.status);
      return null;
    });

  if (verbose) {
    console.log('Content:', content);
  }

  if (!content) {
    return null;
  }
  return parseOpenGraph(content);
};
