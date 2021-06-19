import needle from "needle";
import { DateTime } from "luxon";

import twitterToken from "../credentials-twitter.json";
import { Mem, MemVideo, MemPhoto } from "./mems";

export const twitterStatusUrlRegex = new RegExp(
  "https://twitter.com/.*/status/([0-9]+)"
);
const twitterApiUserAgent = "liquidx-mem/1";

interface Tweet {
  id: number;
  created_at: string;
  text: string;
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

export const tweetVisibleText = (tweet: Tweet): Mem => {
  const authorName = tweet.user ? tweet.user.screen_name : "unknown";
  const authorUrl = tweet.user ? tweet.user.url : undefined;
  let title = "";
  let text = "";
  let html = "";
  let date = "";
  const entities = [];
  const media = [];
  const photos: MemPhoto[] = [];
  const videos: MemVideo[] = [];

  if (tweet.entities) {
    if (tweet.entities.urls) {
      for (const url of tweet.entities.urls) {
        //console.dir(url);
        entities.push(url);
      }
    }

    if (tweet.extended_entities && tweet.extended_entities.media) {
      for (const media of tweet.extended_entities.media) {
        // console.dir(media);
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
      text += tweet.text.substring(index, entity.indices[0]);
      html += tweet.text.substring(index, entity.indices[0]);
      if (entity.media_url_https) {
        media.push(entity);
        const mediaType = entity.type || "";
        if (mediaType === "photo") {
          photos.push({
            mediaUrl: entity.media_url_https,
            size: { w: entity.sizes.large.w, h: entity.sizes.large.h }
          });
        } else if (mediaType === "animated_gif" || mediaType == "video") {
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

        // no-op for text - remove media from the tweet.
      } else if (entity.url) {
        text += `${entity.display_url} `;
        html += `<a href="${entity.expanded_url}">${entity.display_url}</a> `;
      }
      index = entity.indices[1];
    }
    text += tweet.text.substring(index, tweet.text.length);
    html += tweet.text.substring(index, tweet.text.length);
  } else {
    text = tweet.text;
    html = tweet.text;
  }

  title = `@${authorName} on twitter`;
  date = DateTime.fromJSDate(new Date(tweet.created_at))
    .toUTC()
    .toFormat("yyyy-MM-dd");

  return {
    title: title,
    date: date,
    description: text,
    descriptionHtml: html,
    twitterMedia: media,
    photos: photos,
    videos: videos,
    authorName: authorName,
    authorUrl: authorUrl
  };
};

export const annotateWithTwitterApi = (mem: Mem, url: string): Promise<Mem> => {
  const match = url.match(twitterStatusUrlRegex);
  if (match) {
    let annotated: Mem = Object.assign({}, mem);
    const endpointURL = "https://api.twitter.com/1.1/statuses/show.json";
    const params = {
      id: match[1],
      include_entities: "true"
    };
    const headers = {
      "User-Agent": twitterApiUserAgent,
      authorization: `Bearer ${twitterToken.bearerToken}`
    };

    return needle("get", endpointURL, params, { headers })
      .then(response => {
        if (response && response.body && response.body.text) {
          const contents = tweetVisibleText(response.body as Tweet);
          annotated = Object.assign(annotated, contents);
        } else {
          console.log(response.body);
        }
        return annotated;
      })
      .catch(err => {
        console.log("Error", err);
        return mem;
      });
  }

  return new Promise(resolve => {
    resolve(mem);
  });
};
