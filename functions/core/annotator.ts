import openGraphScraper from "open-graph-scraper";
import { Mem } from "./mems";
import { annotateWithTwitterApi, twitterStatusUrlRegex } from './annotator-twitter';

const annotateWithOpenGraph = (mem: Mem, url: string): Promise<Mem> => {
  const annotated: Mem = Object.assign({}, mem);
  const request: openGraphScraper.Options = {
    url: url,
  };
  return openGraphScraper(request)
    .then((data) => {
      if (data.error) {
        return mem;
      }

      const result = data.result;
      //console.log(result);
      if (result) {
        if (result.ogTitle) {
          annotated.title = result.ogTitle;
        }
        if (result.ogDescription) {
          annotated.description = result.ogDescription;
        }
        // if (typeof result.ogImage !== "string") {
        //   annotated.thumbnail = result.ogImage[0];
        // }
      }
      return annotated;
    })
    .catch((err) => {
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

  return new Promise((resolve) => {
    resolve(mem);
  });
};
