import { detectCharset } from "$lib/opengraph";
import iconv from "iconv-lite";
import { describe, expect, it } from "vitest";

describe("detectCharset", () => {
  it("prefers an explicit charset in the HTTP content-type header", () => {
    const body = Buffer.from("<html></html>", "latin1");
    expect(detectCharset(body, "text/html; charset=EUC-JP")).toBe("euc-jp");
  });

  it("falls back to the HTML5 meta charset when the header omits it", () => {
    // itmedia.co.jp: Content-Type: text/html (no charset) + Shift_JIS meta tag.
    const body = iconv.encode(
      '<html><head><meta charset="shift_jis"><title>日本語</title></head></html>',
      "shift_jis"
    );
    expect(detectCharset(body, "text/html")).toBe("shift_jis");
  });

  it("falls back to the legacy http-equiv meta charset", () => {
    const body = iconv.encode(
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS"></head></html>',
      "shift_jis"
    );
    expect(detectCharset(body, undefined)).toBe("shift_jis");
  });

  it("defaults to utf-8 when nothing declares a charset", () => {
    const body = Buffer.from("<html><head></head></html>", "utf-8");
    expect(detectCharset(body, "text/html")).toBe("utf-8");
  });

  it("decodes Shift_JIS bytes to correct Japanese once the charset is known", () => {
    const original = "IT総合情報ポータル「ITmedia」Home";
    const body = iconv.encode(`<meta charset="shift_jis"><title>${original}</title>`, "shift_jis");

    // The old behaviour (blind UTF-8) produces mojibake...
    expect(body.toString("utf-8")).not.toContain(original);

    // ...but decoding with the detected charset recovers the text.
    const charset = detectCharset(body, "text/html");
    const decoded = iconv.decode(body, charset);
    expect(decoded).toContain(original);
  });
});
