import openGraphScraper from "open-graph-scraper";
import { Mem } from "./mems";

export const annotateMem = (mem: Mem): Promise<Mem> => {
  const annotated: Mem = Object.assign({}, mem);
  if (mem.url) {
    const request = {
      url: mem.url,
      peekSize: 100000
    };
    return openGraphScraper(request).then(data => {
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
    });
  }

  return new Promise(resolve => {
    resolve(mem);
  });
};
