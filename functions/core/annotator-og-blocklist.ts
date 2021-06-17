import openGraphScraper from "open-graph-scraper";

export const ogBlockList: Record<string, Array<string>> = {
  ogUrl: ["https://www.instagram.com/accounts/login/"]
};

export const isResultBlocked = (
  result: openGraphScraper.OpenGraphProperties
): boolean => {
  if (!result) {
    return false;
  }
  for (const param of Object.keys(ogBlockList)) {
    if (!result[param]) {
      continue;
    }

    const invalidValues = ogBlockList[param];
    const val = result[param] as string;
    if (invalidValues.includes(val)) {
      return true;
    }
  }
  return false;
};
