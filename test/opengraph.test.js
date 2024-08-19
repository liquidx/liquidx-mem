import { parseOpenGraph } from "$lib/opengraph";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("parseOpenGraph", () => {
  it("should get opengraph images from x", async () => {
    const content = readFileSync("./test/fixtures/x.html", "utf-8");

    const result = parseOpenGraph(content);
    expect(result).toHaveProperty("title");
  });

  it("should get opengraph images from youtube", async () => {
    const content = readFileSync("./test/fixtures/youtube_watch.html", "utf-8");

    const result = parseOpenGraph(content);
    console.log(result);
    expect(result).toHaveProperty("title");
  });

  it("should get opengraph images from mitpress", async () => {
    const content = readFileSync("./test/fixtures/mitpress.html", "utf-8");

    const result = parseOpenGraph(content);
    console.log(result);
    expect(result).toHaveProperty("title");
  });

  it("should get opengraph images from medium", async () => {
    const content = readFileSync("./test/fixtures/medium.html", "utf-8");

    const result = parseOpenGraph(content);
    console.log(result);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("images");
    expect(result.images.length).toBeGreaterThan(0);
    expect(result.images[0]).toHaveProperty("url");
  });

  it("should get opengraph images from kottke", async () => {
    const content = readFileSync("./test/fixtures/kottke.html", "utf-8");

    const result = parseOpenGraph(content);
    console.log(result);
    expect(result).not.toHaveProperty("images");
  });
  it("should get opengraph images from substack", async () => {
    const content = readFileSync("./test/fixtures/substack.html", "utf-8");

    const result = parseOpenGraph(content);
    console.log(result);
    expect(result).toHaveProperty("images");
    expect(result.images.length).toBeGreaterThan(0);
    expect(result.images[0]).toHaveProperty("url");
  });
});
