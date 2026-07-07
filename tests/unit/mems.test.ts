import { describe, expect, it } from "vitest";

import { dedupePhotos } from "../../src/lib/common/mems.js";

describe("dedupePhotos", () => {
  it("removes photos that share a mediaUrl, keeping the first", () => {
    const result = dedupePhotos([
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/b.jpg" }
    ]);
    expect(result).toEqual([
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/b.jpg" }
    ]);
  });

  it("preserves order and non-duplicate photos", () => {
    const result = dedupePhotos([
      { mediaUrl: "https://example.com/b.jpg" },
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/b.jpg" }
    ]);
    expect(result.map((p) => p.mediaUrl)).toEqual([
      "https://example.com/b.jpg",
      "https://example.com/a.jpg"
    ]);
  });

  it("merges cachedMediaPath and size from a later duplicate into the kept photo", () => {
    const result = dedupePhotos([
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/a.jpg", cachedMediaPath: "users/1/a.jpg", size: { w: 4, h: 3 } }
    ]);
    expect(result).toEqual([
      {
        mediaUrl: "https://example.com/a.jpg",
        cachedMediaPath: "users/1/a.jpg",
        size: { w: 4, h: 3 }
      }
    ]);
  });

  it("dedupes by cachedMediaPath when mediaUrl is absent", () => {
    const result = dedupePhotos([
      { cachedMediaPath: "users/1/a.jpg" },
      { cachedMediaPath: "users/1/a.jpg" }
    ]);
    expect(result).toEqual([{ cachedMediaPath: "users/1/a.jpg" }]);
  });

  it("keeps photos with no stable identity", () => {
    const result = dedupePhotos([{ size: { w: 1, h: 1 } }, { size: { w: 2, h: 2 } }]);
    expect(result).toHaveLength(2);
  });

  it("does not mutate the input photos", () => {
    const input = [
      { mediaUrl: "https://example.com/a.jpg" },
      { mediaUrl: "https://example.com/a.jpg", cachedMediaPath: "users/1/a.jpg" }
    ];
    dedupePhotos(input);
    expect(input[0]).toEqual({ mediaUrl: "https://example.com/a.jpg" });
  });
});
