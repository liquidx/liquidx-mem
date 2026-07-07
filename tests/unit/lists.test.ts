import { describe, expect, it } from "vitest";

import {
  DEFAULT_LISTS,
  allListTags,
  autoArchiveTags,
  listsForUser
} from "../../src/lib/common/lists.js";

describe("listsForUser", () => {
  it("returns DEFAULT_LISTS when none configured", () => {
    expect(listsForUser(undefined)).toEqual(DEFAULT_LISTS);
    expect(listsForUser(null)).toEqual(DEFAULT_LISTS);
    expect(listsForUser([])).toEqual(DEFAULT_LISTS);
  });

  it("returns the configured lists when present", () => {
    const lists = [{ name: "watching", tags: ["#watch"] }];
    expect(listsForUser(lists)).toBe(lists);
  });
});

describe("autoArchiveTags", () => {
  it("includes tags from lists where autoArchive is not false", () => {
    const lists = [
      { name: "reading", tags: ["#look", "#next"], autoArchive: true },
      { name: "default-on", tags: ["#go"] } // undefined defaults to on
    ];
    expect(autoArchiveTags(lists)).toEqual(["#look", "#next", "#go"]);
  });

  it("excludes tags from lists with autoArchive false", () => {
    const lists = [
      { name: "reading", tags: ["#look"], autoArchive: true },
      { name: "notes", tags: ["#note"], autoArchive: false }
    ];
    expect(autoArchiveTags(lists)).toEqual(["#look"]);
  });
});

describe("allListTags", () => {
  it("flattens every list's tags regardless of autoArchive", () => {
    const lists = [
      { name: "reading", tags: ["#look"], autoArchive: true },
      { name: "notes", tags: ["#note"], autoArchive: false }
    ];
    expect(allListTags(lists)).toEqual(["#look", "#note"]);
  });
});

describe("DEFAULT_LISTS", () => {
  it("is reading -> #look, auto-archiving", () => {
    expect(DEFAULT_LISTS).toEqual([{ name: "reading", tags: ["#look"], autoArchive: true }]);
  });
});
