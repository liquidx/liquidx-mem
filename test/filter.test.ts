import { describe, expect, it } from "vitest";

import { listOptionsByString, stringFromListOptions } from "../src/lib/filter.js";

describe("listOptionsByString", () => {
  it("defaults to only-new when empty", () => {
    const options = listOptionsByString("");
    expect(options.onlyNew).toBe(true);
    expect(options.onlyArchived).toBe(false);
    expect(options.matchAllTags).toEqual([]);
    expect(options.matchAnyTags).toEqual([]);
  });

  it("treats '*' as the archive view", () => {
    const options = listOptionsByString("*");
    expect(options.onlyArchived).toBe(true);
    expect(options.matchAllTags).toEqual(["#*"]);
  });

  it("parses a single tag as match-all", () => {
    const options = listOptionsByString("code");
    expect(options.matchAllTags).toEqual(["#code"]);
    expect(options.matchAnyTags).toEqual([]);
  });

  it("parses '+' separated tags as match-all (AND)", () => {
    const options = listOptionsByString("code+ml");
    expect(options.matchAllTags).toEqual(["#code", "#ml"]);
    expect(options.matchAnyTags).toEqual([]);
  });

  it("parses ',' separated tags as match-any (OR)", () => {
    const options = listOptionsByString("look,next,try");
    expect(options.matchAnyTags).toEqual(["#look", "#next", "#try"]);
    expect(options.matchAllTags).toEqual([]);
  });

  it("lowercases and trims tags", () => {
    const options = listOptionsByString("Look, Next");
    expect(options.matchAnyTags).toEqual(["#look", "#next"]);
  });
});

describe("stringFromListOptions round-trips", () => {
  it("round-trips a match-any (OR) filter", () => {
    const filter = "look,next,try";
    expect(stringFromListOptions(listOptionsByString(filter))).toBe(filter);
  });

  it("round-trips a match-all (AND) filter", () => {
    const filter = "code+ml";
    expect(stringFromListOptions(listOptionsByString(filter))).toBe(filter);
  });

  it("round-trips the archive view", () => {
    expect(stringFromListOptions(listOptionsByString("*"))).toBe("*");
  });
});
