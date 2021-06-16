
import twitterToken from "../credentials-twitter.json";
//import twitterText from "twitter-text";
import needle from "needle";
import { Mem } from "./mems";

export const twitterStatusUrlRegex = new RegExp("https://twitter.com/.*/status/([0-9]+)");
const twitterApiUserAgent = "liquidx-mem/1";

interface Tweet {
  id: number,
  text: string,
  entities?: {
    hashtags?: any,
    urls?: any,
    media?: any
  }
  extended_entities?: {
    media?: any
  }
}

export const tweetVisibleText = (tweet: Tweet): { description?: string, descriptionHtml?: string, twitterMedia?: any } => {
  console.dir(tweet);
  if (!tweet.entities) {
    return { description: tweet.text };
  }

  let text = '';
  let html = text;
  const entities = [];
  const media = [];

  if (tweet.entities.urls) {
    for (const url of tweet.entities.urls) {
      console.dir(url);
      entities.push(url);
    }
  }

  if (tweet.extended_entities && tweet.extended_entities.media) {
    for (const media of tweet.extended_entities.media) {
      console.dir(media);
      if (media.video_info) {
        console.dir(media.video_info);
      }
      entities.push(media);
    }
  }

  // sort replacements.
  entities.sort((a, b) => { return a.indices[0] - b.indices[0]})
  let index = 0;
  for (const entity of entities) {
    text += tweet.text.substring(index, entity.indices[0])
    html += tweet.text.substring(index, entity.indices[0])
    if (entity.url) {
      text += entity.display_url;
      html += `<a href="${entity.expanded_url}">${entity.display_url}</a>`
    } else if (entity.media_url) {
      media.push(entity);
      // no-op, ignore.
    }
    index = entity.indices[1]
  }
  text += tweet.text.substring(index, tweet.text.length)

  return {
    description: text,
    descriptionHtml: html,
    twitterMedia: media
  };
}

export const annotateWithTwitterApi = (mem: Mem, url: string): Promise<Mem> => {
  const match = url.match(twitterStatusUrlRegex);
  if (match) {
    let annotated: Mem = Object.assign({}, mem);
    const endpointURL = "https://api.twitter.com/1.1/statuses/show.json";
    const params = {
      id: match[1],
      include_entities: 'true'
    };
    const headers = {
      "User-Agent": twitterApiUserAgent,
      authorization: `Bearer ${twitterToken.bearerToken}`,
    };

    return needle("get", endpointURL, params, { headers })
      .then((response) => {
        if (response && response.body && response.body.text) {
          const contents = tweetVisibleText(response.body as Tweet);
          annotated = Object.assign(annotated, contents);
        }
        return annotated;
      })
      .catch((err) => {
        console.log(err);
        return mem;
      });
  }

  return new Promise((resolve) => {
    resolve(mem);
  });
};