import { describe, expect, it } from "vitest";

import { parseText } from "../../src/lib/common/parser.js";

describe("parseText", () => {
  it("should parse plain text without entities", () => {
    const text = "This is a simple note.";
    const result = parseText(text);
    expect(result).toEqual({
      raw: text,
      note: text,
      tags: [],
      date: ""
    });
  });

  it("should extract a URL and set the note", () => {
    const text = "Check out https://example.com for more info";
    const result = parseText(text);
    // url-regex-safe seems to normalize with a trailing slash
    expect(result.url).toBe("https://example.com/");
    expect(result.note).toBe("Check out  for more info");
    expect(result.raw).toBe(text);
  });

  it("should extract the URL in the middle of the note", () => {
    const text = "visualrambling.space https://visualrambling.space/ #look";
    const result = parseText(text);
    expect(result.url).toBe("https://visualrambling.space/");
    expect(result.note).toBe("visualrambling.space  #look");
    expect(result.raw).toBe(text);
  });

  it("should remove tracking parameters from URL", () => {
    const text = "https://example.com/page?utm_source=twitter&id=123";
    const result = parseText(text);
    // removeUrlTrackingParams should have removed utm_source
    expect(result.url).toBe("https://example.com/page?id=123");
    expect(result.note).toBe("");
  });

  it("should extract tags from text", () => {
    const text = "A note with #tag1 and #tag2";
    const result = parseText(text);
    expect(result.tags).toEqual(["#tag1", "#tag2"]);
    expect(result.note).toBe(text);
  });

  it("should extract date from text", () => {
    const text = "Event on 2023-12-30";
    const result = parseText(text);
    expect(result.date).toBe("2023-12-30");
    expect(result.note).toBe(text);
  });

  it("should handle a mix of URL, tags, and date", () => {
    const text = "https://google.com #search #web 2023-01-01 cool site";
    const result = parseText(text);
    expect(result.url).toBe("https://google.com/");
    expect(result.tags).toEqual(["#search", "#web"]);
    expect(result.date).toBe("2023-01-01");
    expect(result.note).toBe("#search #web 2023-01-01 cool site");
  });

  it("should take the first URL if multiple are present", () => {
    const text = "Check https://first.com and https://second.com";
    const result = parseText(text);
    expect(result.url).toBe("https://first.com/");
    expect(result.note).toBe("Check  and");
  });

  it("should handle empty string", () => {
    const result = parseText("");
    expect(result).toEqual({
      raw: "",
      note: ""
    });
  });
});
