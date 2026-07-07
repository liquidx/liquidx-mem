import { describe, expect, it } from "vitest";
import type { Mem } from "$lib/common/mems";
import { STORAGE_BASE_URL } from "$lib/storage";
import { isUnseen, resolveTileImage } from "./memTile";

describe("resolveTileImage", () => {
  it("prefers a cached photo over everything else", () => {
    const mem: Mem = {
      photos: [{ cachedMediaPath: "photos/a.jpg", mediaUrl: "https://x/a.jpg" }],
      media: { path: "media/b.jpg" },
      thumbnail: { url: "https://og/c.jpg" }
    };
    expect(resolveTileImage(mem)).toEqual({
      url: `${STORAGE_BASE_URL}/photos/a.jpg`,
      source: "photo"
    });
  });

  it("falls back to a live photo url when not cached", () => {
    const mem: Mem = { photos: [{ mediaUrl: "https://x/a.jpg" }] };
    expect(resolveTileImage(mem)).toEqual({ url: "https://x/a.jpg", source: "photo" });
  });

  it("uses mirrored media when there are no photos", () => {
    const mem: Mem = { media: { path: "media/b.jpg" }, thumbnail: { url: "https://og/c.jpg" } };
    expect(resolveTileImage(mem)).toEqual({
      url: `${STORAGE_BASE_URL}/media/b.jpg`,
      source: "media"
    });
  });

  it("uses the og:image thumbnail as a last resort", () => {
    const mem: Mem = { thumbnail: { url: "https://og/c.jpg" } };
    expect(resolveTileImage(mem)).toEqual({ url: "https://og/c.jpg", source: "thumbnail" });
  });

  it("skips photo entries that have neither cache nor url", () => {
    const mem: Mem = {
      photos: [{ size: { w: 1, h: 1 } }, { mediaUrl: "https://x/a.jpg" }]
    };
    expect(resolveTileImage(mem)).toEqual({ url: "https://x/a.jpg", source: "photo" });
  });

  it("returns null when the mem has no usable image", () => {
    expect(resolveTileImage({ title: "text only", url: "https://x" })).toBeNull();
    expect(resolveTileImage({ photos: [], thumbnail: {} })).toBeNull();
  });
});

describe("isUnseen", () => {
  it("is true when a mem tag matches an active list tag", () => {
    expect(isUnseen({ tags: ["read", "later"] }, ["later"])).toBe(true);
  });

  it("is false when no mem tag matches", () => {
    expect(isUnseen({ tags: ["read"] }, ["later"])).toBe(false);
  });

  it("is false with no tags or no list tags", () => {
    expect(isUnseen({ tags: ["read"] }, [])).toBe(false);
    expect(isUnseen({}, ["later"])).toBe(false);
  });
});
