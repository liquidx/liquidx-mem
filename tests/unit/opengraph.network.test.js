import { fetchOpenGraph } from "$lib/opengraph";
import { describe, expect, it } from "vitest";

describe("parseOpenGraph", () => {
  it("should get opengraph from github", async () => {
    const url = "https://github.com/glanceapp/glance";
    const result = await fetchOpenGraph(url);
    console.log(result);
    expect(result).toHaveProperty("title");
  });
});
