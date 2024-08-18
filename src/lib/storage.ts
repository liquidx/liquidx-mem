export const STORAGE_BASE_URL = "https://liquidx-mem.b-cdn.net/";

export const getCachedStorageUrl = (path: string): string => {
  return `${STORAGE_BASE_URL}${path}`;
};
