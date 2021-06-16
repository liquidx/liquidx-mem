
import twitterToken from "../credentials-twitter.json";
//import twitterText from "twitter-text";
import needle from "needle";
import { Mem } from "./mems";

export const twitterStatusUrlRegex = new RegExp("https://twitter.com/.*/status/([0-9]+)");
const twitterApiUserAgent = "liquidx-mem/1";

interface Tweet {
  id: number,
  text: string,
  user?: {
    screen_name?: string,
    url?: string
  },
  entities?: {
    hashtags?: any,
    urls?: any,
    media?: any
  }
  extended_entities?: {
    media?: any
  }
}

export const tweetVisibleText = (tweet: Tweet): Mem => {
  const authorName = tweet.user ? tweet.user.screen_name : 'unknown';
  const authorUrl = tweet.user ? tweet.user.url : undefined;
  let title = ''
  let text = '';
  let html = '';
  const entities = [];
  const media = [];

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
  } else {
    text = tweet.text;
  }

  title = `@${authorName} on twitter: ${text}`

  return {
    title: title,
    description: text,
    descriptionHtml: html,
    twitterMedia: media,
    authorName: authorName,
    authorUrl: authorUrl
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