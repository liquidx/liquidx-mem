// Braille glyph set (U+2800 block) used for the "decrypt" scramble noise.
export const BRAILLE_GLYPHS = "⠁⠃⠋⠙⠓⠛⠞⠟⠥⠧⠭⠯⠷⠿⠮⠾⠫⠻⠺⠵";

// Timing — single source of truth for the whole effect.
export const ROW_STAGGER_MS = 30; // per-row start offset
export const ROW_CAP = 12; // rows beyond this start together
export const MS_PER_CHAR = 9; // left-to-right lock-in speed
export const GLYPH_REROLL_MS = 14; // random-glyph repaint cadence
export const MAX_RUN_MS = 2200; // hard stop safety cap

export interface Cell {
  ch: string;
  locked: boolean;
}

/**
 * Compute the per-character frame for a title at a given elapsed time.
 * `elapsed` is milliseconds since THIS row's scramble started (i.e. already
 * has the per-row delay subtracted). `rng` returns [0,1); inject for tests.
 */
export function scrambleFrame(
  text: string,
  elapsed: number,
  rng: () => number,
  msPerChar: number = MS_PER_CHAR
): Cell[] {
  const lockedCount = Math.floor(elapsed / msPerChar);
  return Array.from(text).map((ch, i) => {
    if (ch === " ") return { ch: " ", locked: true };
    if (i < lockedCount) return { ch, locked: true };
    const glyph = BRAILLE_GLYPHS[Math.floor(rng() * BRAILLE_GLYPHS.length)];
    return { ch: glyph, locked: false };
  });
}

/** True once every non-space character has locked in. */
export function isResolved(
  text: string,
  elapsed: number,
  msPerChar: number = MS_PER_CHAR
): boolean {
  return Math.floor(elapsed / msPerChar) >= Array.from(text).length;
}
