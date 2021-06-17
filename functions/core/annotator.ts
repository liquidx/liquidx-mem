import openGraphScraper from "open-graph-scraper";
import { Mem, MemPhoto } from "./mems";
import {
  annotateWithTwitterApi,
  twitterStatusUrlRegex
} from "./annotator-twitter";

import { isResultBlocked } from "./annotator-og-blocklist";

const annotateWithOpenGraph = (mem: Mem, url: string): Promise<Mem> => {
  const annotated: Mem = Object.assign({}, mem);
  const request: openGraphScraper.Options = {
    url: url,
    headers: {
      "user-agent": "liquidx-mem.web.app/1.0"
    }
  };
  return openGraphScraper(request)
    .then(data => {
      if (data.error) {
        return mem;
      }

      const result = data.result;
      console.log(result);
      if (result && !isResultBlocked(result)) {
        if (result.ogTitle) {
          annotated.title = result.ogTitle;
        }
        if (result.ogDescription) {
          annotated.description = result.ogDescription;
        }
        if (result.ogImage) {
          if ("url" in result.ogImage) {
            const photo: MemPhoto = {
              mediaUrl: result.ogImage.url
            };
            if (
              "width" in result.ogImage &&
              "height" in result.ogImage &&
              typeof result.ogImage.width === "string" &&
              typeof result.ogImage.height === "string"
            ) {
              photo.size = {
                w: parseInt(result.ogImage.width),
                h: parseInt(result.ogImage.height)
              };
            }
            annotated.photos = [photo];
          }
        }
      }
      return annotated;
    })
    .catch(err => {
      console.log(err);
      return mem;
    });
};

export const annotateMem = (mem: Mem): Promise<Mem> => {
  if (mem.url) {
    if (mem.url.match(twitterStatusUrlRegex)) {
      return annotateWithTwitterApi(mem, mem.url);
    } else {
      return annotateWithOpenGraph(mem, mem.url);
    }
  }

  return new Promise(resolve => {
    resolve(mem);
  });
};
