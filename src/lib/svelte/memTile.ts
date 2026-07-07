import type { Mem } from "$lib/common/mems";
import { getCachedStorageUrl } from "$lib/storage";

export type TileImageSource = "photo" | "media" | "thumbnail";

export interface TileImage {
  url: string;
  source: TileImageSource;
}

// Resolve the single representative image for a grid tile.
// Priority: attached photos → mirrored media → Open Graph thumbnail.
// Returns null when the mem has no usable image (caller renders a text tile).
export const resolveTileImage = (mem: Mem): TileImage | null => {
  for (const photo of mem.photos ?? []) {
    if (photo.cachedMediaPath) {
      return { url: getCachedStorageUrl(photo.cachedMediaPath), source: "photo" };
    }
    if (photo.mediaUrl) {
      return { url: photo.mediaUrl, source: "photo" };
    }
  }
  if (mem.media?.path) {
    return { url: getCachedStorageUrl(mem.media.path), source: "media" };
  }
  if (mem.thumbnail?.url) {
    return { url: mem.thumbnail.url, source: "thumbnail" };
  }
  return null;
};

// A mem is "unseen" when one of its tags matches an active list tag — the same
// highlight rule MemView uses. Drives the status square on a tile.
export const isUnseen = (mem: Mem, listTags: string[]): boolean =>
  (mem.tags ?? []).some((tag) => listTags.includes(tag));
