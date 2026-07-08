import { describe, expect, it } from "vitest";
import { scrambleFrame, isResolved, BRAILLE_GLYPHS } from "./decryptText";

// Deterministic rng that always picks the first glyph.
const firstGlyph = () => 0;

describe("scrambleFrame", () => {
  it("scrambles every non-space char before any lock-in (elapsed <= 0)", () => {
    const cells = scrambleFrame("ab c", 0, firstGlyph);
    expect(cells.map((c) => c.locked)).toEqual([false, false, true, false]);
    // spaces are preserved and marked locked
    expect(cells[2]).toEqual({ ch: " ", locked: true });
    // non-space unlocked chars show a braille glyph, not the original
    expect(cells[0].ch).toBe(BRAILLE_GLYPHS[0]);
    expect(cells[0].ch).not.toBe("a");
  });

  it("locks characters left-to-right as elapsed grows", () => {
    // msPerChar = 9 → at elapsed 20ms, floor(20/9) = 2 chars locked
    const cells = scrambleFrame("abcd", 20, firstGlyph);
    expect(cells.map((c) => c.locked)).toEqual([true, true, false, false]);
    expect(cells.slice(0, 2).map((c) => c.ch)).toEqual(["a", "b"]);
  });

  it("returns the exact original text once fully elapsed", () => {
    const cells = scrambleFrame("abcd", 1000, firstGlyph);
    expect(cells.map((c) => c.ch).join("")).toBe("abcd");
    expect(cells.every((c) => c.locked)).toBe(true);
  });
});

describe("isResolved", () => {
  it("is false mid-scramble and true once every char is locked", () => {
    expect(isResolved("abcd", 20)).toBe(false);
    expect(isResolved("abcd", 4 * 9)).toBe(true);
  });
});
