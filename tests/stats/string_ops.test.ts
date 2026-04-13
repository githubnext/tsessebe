/**
 * Tests for src/stats/string_ops.ts
 * — strNormalize, strGetDummies, strExtractAll, strRemovePrefix,
 *   strRemoveSuffix, strTranslate, strCharWidth, strByteLength
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  strByteLength,
  strCharWidth,
  strExtractAll,
  strGetDummies,
  strNormalize,
  strRemovePrefix,
  strRemoveSuffix,
  strTranslate,
} from "../../src/stats/string_ops.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: string[]): Series<Scalar> {
  return new Series({ data: data as Scalar[] });
}

function vals(series: Series<Scalar>): Scalar[] {
  return [...series.toArray()] as Scalar[];
}

// ─── strNormalize ─────────────────────────────────────────────────────────────

describe("strNormalize", () => {
  it("scalar — NFC is identity for already-NFC string", () => {
    expect(strNormalize("hello", "NFC")).toBe("hello");
  });

  it("scalar — NFC composes decomposed é", () => {
    // \u0065\u0301 is 'e' + combining acute accent → NFC = \u00e9
    const decomposed = "\u0065\u0301";
    expect(strNormalize(decomposed, "NFC")).toBe("\u00e9");
  });

  it("scalar — NFD decomposes precomposed é", () => {
    const precomposed = "\u00e9";
    const nfd = strNormalize(precomposed, "NFD");
    expect(nfd).toBe("\u0065\u0301");
  });

  it("scalar — NFKC decomposes ligature fi", () => {
    // ﬁ U+FB01 → fi under NFKC
    expect(strNormalize("\uFB01", "NFKC")).toBe("fi");
  });

  it("array — NFC composes each element", () => {
    const out = vals(strNormalize(["\u0065\u0301", "\u0061\u0301"], "NFC"));
    expect(out[0]).toBe("\u00e9");
    expect(out[1]).toBe("\u00e1");
  });

  it("Series — preserves index", () => {
    const ser = new Series({ data: ["\u0065\u0301", "hello"] as Scalar[], index: ["x", "y"] });
    const out = strNormalize(ser, "NFC");
    expect(out.index.values[0]).toBe("x");
    expect(out.index.values[1]).toBe("y");
    expect(out.values[0]).toBe("\u00e9");
    expect(out.values[1]).toBe("hello");
  });

  it("default form is NFC", () => {
    const result = strNormalize(s(["\u0065\u0301"]));
    expect(vals(result)[0]).toBe("\u00e9");
  });

  it("NFKD decomposes and also applies compatibility mappings", () => {
    // ℌ (U+210C, script H) → NFKD → H
    expect(strNormalize("\u210C", "NFKD")).toBe("H");
  });
});

// ─── strGetDummies ────────────────────────────────────────────────────────────

describe("strGetDummies", () => {
  it("basic | separator", () => {
    const df = strGetDummies(s(["a|b", "b|c", "a"]));
    expect(df.shape[0]).toBe(3);
    expect([...df.columns.values].sort()).toEqual(["a", "b", "c"]);
    expect(df.col("a").values[0]).toBe(1);
    expect(df.col("a").values[1]).toBe(0);
    expect(df.col("a").values[2]).toBe(1);
    expect(df.col("b").values[0]).toBe(1);
    expect(df.col("b").values[1]).toBe(1);
    expect(df.col("b").values[2]).toBe(0);
    expect(df.col("c").values[0]).toBe(0);
    expect(df.col("c").values[1]).toBe(1);
    expect(df.col("c").values[2]).toBe(0);
  });

  it("custom separator", () => {
    const df = strGetDummies(s(["a,b", "b,c"]), { sep: "," });
    expect([...df.columns.values].sort()).toEqual(["a", "b", "c"]);
  });

  it("prefix option", () => {
    const df = strGetDummies(s(["x|y"]), { prefix: "tag", prefixSep: "-" });
    expect([...df.columns.values].sort()).toEqual(["tag-x", "tag-y"]);
  });

  it("empty string element maps to no tokens", () => {
    const df = strGetDummies(s(["a|b", ""]));
    expect(df.col("a").values[1]).toBe(0);
    expect(df.col("b").values[1]).toBe(0);
  });

  it("single-token element", () => {
    const df = strGetDummies(s(["a", "b", "a"]));
    expect(df.shape[0]).toBe(3);
    expect(df.col("a").values[0]).toBe(1);
    expect(df.col("a").values[1]).toBe(0);
    expect(df.col("a").values[2]).toBe(1);
  });

  it("all same token → single column of ones", () => {
    const df = strGetDummies(s(["x", "x", "x"]));
    expect(df.shape[1]).toBe(1);
    expect([...df.col("x").values]).toEqual([1, 1, 1]);
  });

  it("preserves Series index in output rows", () => {
    const ser = new Series({ data: ["a|b", "b"] as Scalar[], index: [10, 20] });
    const df = strGetDummies(ser);
    expect(df.index.values[0]).toBe(10);
    expect(df.index.values[1]).toBe(20);
  });

  it("array input (not Series)", () => {
    const df = strGetDummies(["a|b", "c"]);
    expect(df.shape[0]).toBe(2);
    expect([...df.columns.values].sort()).toEqual(["a", "b", "c"]);
  });
});

// ─── strExtractAll ────────────────────────────────────────────────────────────

describe("strExtractAll", () => {
  it("extracts all digit groups", () => {
    const out = vals(strExtractAll(s(["abc 123 def 456"]), /\d+/));
    const matches = JSON.parse(out[0] as string) as string[][];
    expect(matches.length).toBe(2);
    expect(matches[0]?.[0]).toBe("123");
    expect(matches[1]?.[0]).toBe("456");
  });

  it("capture group stored as second element", () => {
    const out = vals(strExtractAll(s(["a1b2"]), /([a-z])(\d)/));
    const matches = JSON.parse(out[0] as string) as string[][];
    expect(matches.length).toBe(2);
    expect(matches[0]?.[1]).toBe("a");
    expect(matches[0]?.[2]).toBe("1");
    expect(matches[1]?.[1]).toBe("b");
    expect(matches[1]?.[2]).toBe("2");
  });

  it("no matches → empty array", () => {
    const out = vals(strExtractAll(s(["hello"]), /\d+/));
    const matches = JSON.parse(out[0] as string) as string[][];
    expect(matches.length).toBe(0);
  });

  it("string pattern with flags", () => {
    const out = vals(strExtractAll(s(["Hello World"]), "[a-z]+", { flags: "i" }));
    const matches = JSON.parse(out[0] as string) as string[][];
    expect(matches.length).toBe(2);
    expect(matches[0]?.[0]).toBe("Hello");
    expect(matches[1]?.[0]).toBe("World");
  });

  it("each element processed independently", () => {
    const out = vals(strExtractAll(s(["a1", "b2b3"]), /[a-z]\d/));
    const m0 = JSON.parse(out[0] as string) as string[][];
    const m1 = JSON.parse(out[1] as string) as string[][];
    expect(m0.length).toBe(1);
    expect(m1.length).toBe(2);
  });
});

// ─── strRemovePrefix ─────────────────────────────────────────────────────────

describe("strRemovePrefix", () => {
  it("scalar — removes prefix", () => {
    expect(strRemovePrefix("prefix_hello", "prefix_")).toBe("hello");
  });

  it("scalar — no prefix present → unchanged", () => {
    expect(strRemovePrefix("hello", "prefix_")).toBe("hello");
  });

  it("scalar — empty prefix → unchanged", () => {
    expect(strRemovePrefix("hello", "")).toBe("hello");
  });

  it("array — mixed", () => {
    const out = vals(strRemovePrefix(["pre_a", "pre_b", "other"], "pre_"));
    expect(out).toEqual(["a", "b", "other"]);
  });

  it("Series — preserves index", () => {
    const ser = new Series({ data: ["pre_x", "y"] as Scalar[], index: [0, 1] });
    const out = strRemovePrefix(ser, "pre_");
    expect(vals(out)).toEqual(["x", "y"]);
    expect(out.index.values[0]).toBe(0);
  });

  it("whole string matches prefix → empty string", () => {
    expect(strRemovePrefix("prefix", "prefix")).toBe("");
  });

  it("prefix longer than string → unchanged", () => {
    expect(strRemovePrefix("ab", "abc")).toBe("ab");
  });
});

// ─── strRemoveSuffix ─────────────────────────────────────────────────────────

describe("strRemoveSuffix", () => {
  it("scalar — removes suffix", () => {
    expect(strRemoveSuffix("hello_suf", "_suf")).toBe("hello");
  });

  it("scalar — no suffix present → unchanged", () => {
    expect(strRemoveSuffix("hello", "_suf")).toBe("hello");
  });

  it("scalar — empty suffix → unchanged", () => {
    expect(strRemoveSuffix("hello", "")).toBe("hello");
  });

  it("array — mixed", () => {
    const out = vals(strRemoveSuffix(["a_end", "b_end", "other"], "_end"));
    expect(out).toEqual(["a", "b", "other"]);
  });

  it("Series — preserves index", () => {
    const ser = new Series({ data: ["x_suf", "y"] as Scalar[], index: ["a", "b"] });
    const out = strRemoveSuffix(ser, "_suf");
    expect(vals(out)).toEqual(["x", "y"]);
    expect(out.index.values[1]).toBe("b");
  });

  it("whole string is suffix → empty string", () => {
    expect(strRemoveSuffix("suffix", "suffix")).toBe("");
  });
});

// ─── strTranslate ─────────────────────────────────────────────────────────────

describe("strTranslate", () => {
  it("replaces characters according to table", () => {
    const table = new Map<string, string | null>([["a", "A"], ["e", "E"]]);
    expect(strTranslate("hello", table)).toBe("hEllo");
    expect(strTranslate("abc", table)).toBe("Abc");
  });

  it("null mapping deletes character", () => {
    const table = new Map<string, string | null>([["e", null]]);
    expect(strTranslate("hello", table)).toBe("hllo");
  });

  it("multi-char replacement", () => {
    const table = new Map<string, string | null>([["a", "aa"]]);
    expect(strTranslate("cat", table)).toBe("caat");
  });

  it("characters not in table pass through", () => {
    const table = new Map<string, string | null>([["z", "Z"]]);
    expect(strTranslate("hello", table)).toBe("hello");
  });

  it("array input", () => {
    const table = new Map<string, string | null>([["o", "0"]]);
    const out = vals(strTranslate(["foo", "bar"], table));
    expect(out).toEqual(["f00", "bar"]);
  });

  it("Series — preserves index", () => {
    const table = new Map<string, string | null>([["x", "X"]]);
    const ser = new Series({ data: ["fox", "box"] as Scalar[], index: [10, 20] });
    const out = strTranslate(ser, table);
    expect(vals(out)).toEqual(["foX", "boX"]);
    expect(out.index.values[0]).toBe(10);
  });

  it("empty table → identity", () => {
    const table = new Map<string, string | null>();
    expect(strTranslate("hello", table)).toBe("hello");
  });

  it("delete all vowels", () => {
    const table = new Map<string, string | null>([
      ["a", null], ["e", null], ["i", null], ["o", null], ["u", null],
    ]);
    expect(strTranslate("hello world", table)).toBe("hll wrld");
  });
});

// ─── strCharWidth ─────────────────────────────────────────────────────────────

describe("strCharWidth", () => {
  it("ASCII: width = char count", () => {
    expect(strCharWidth("hello")).toBe(5);
    expect(strCharWidth("")).toBe(0);
    expect(strCharWidth("a")).toBe(1);
  });

  it("Hiragana: each char is 2 wide", () => {
    // こんにちは = 5 chars × 2 = 10
    expect(strCharWidth("こんにちは")).toBe(10);
  });

  it("CJK unified ideographs: each char is 2 wide", () => {
    // 你好 = 2 chars × 2 = 4
    expect(strCharWidth("你好")).toBe(4);
  });

  it("mixed ASCII + CJK", () => {
    // "A你B" = 1 + 2 + 1 = 4
    expect(strCharWidth("A你B")).toBe(4);
  });

  it("array input returns Series of widths", () => {
    const out = vals(strCharWidth(["hi", "こんにちは"]));
    expect(out[0]).toBe(2);
    expect(out[1]).toBe(10);
  });

  it("Series input preserves index", () => {
    const ser = new Series({ data: ["ab", "你好"] as Scalar[], index: ["x", "y"] });
    const out = strCharWidth(ser);
    expect(vals(out)).toEqual([2, 4]);
    expect(out.index.values[0]).toBe("x");
  });
});

// ─── strByteLength ────────────────────────────────────────────────────────────

describe("strByteLength", () => {
  it("ASCII: byte length = char count", () => {
    expect(strByteLength("hello")).toBe(5);
    expect(strByteLength("")).toBe(0);
  });

  it("UTF-8 multibyte: hiragana is 3 bytes per char", () => {
    // こ = U+3053, 3-byte UTF-8
    expect(strByteLength("こんにちは")).toBe(15);
  });

  it("2-byte UTF-8: e.g. é (U+00e9)", () => {
    expect(strByteLength("\u00e9")).toBe(2);
  });

  it("4-byte UTF-8: emoji (e.g. U+1F600)", () => {
    expect(strByteLength("😀")).toBe(4);
  });

  it("array input returns Series of byte lengths", () => {
    const out = vals(strByteLength(["hi", "こ"]));
    expect(out[0]).toBe(2);
    expect(out[1]).toBe(3);
  });

  it("Series input preserves index", () => {
    const ser = new Series({ data: ["hello", "\u00e9"] as Scalar[], index: [0, 1] });
    const out = strByteLength(ser);
    expect(vals(out)).toEqual([5, 2]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("strNormalize — properties", () => {
  it("NFC is idempotent", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (str) => {
        const once = strNormalize(str, "NFC");
        const twice = strNormalize(once, "NFC");
        return once === twice;
      }),
    );
  });

  it("NFD is idempotent", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (str) => {
        const once = strNormalize(str, "NFD");
        const twice = strNormalize(str, "NFD");
        return once === twice;
      }),
    );
  });

  it("NFC and NFD have the same length after normalisation of ASCII", () => {
    fc.assert(
      fc.property(fc.asciiString(), (str) => {
        return strNormalize(str, "NFC").length === strNormalize(str, "NFD").length;
      }),
    );
  });
});

describe("strRemovePrefix — properties", () => {
  it("result never starts with prefix (when prefix non-empty)", () => {
    fc.assert(
      fc.property(fc.asciiString(), fc.asciiString({ minLength: 1 }), (str, prefix) => {
        const result = strRemovePrefix(str, prefix);
        return !result.startsWith(prefix) || !str.startsWith(prefix);
      }),
    );
  });

  it("removePrefix then re-add prefix restores original when it was present", () => {
    fc.assert(
      fc.property(fc.asciiString(), fc.asciiString(), (body, prefix) => {
        const full = prefix + body;
        const stripped = strRemovePrefix(full, prefix);
        return stripped === body;
      }),
    );
  });
});

describe("strRemoveSuffix — properties", () => {
  it("removeSuffix then re-add suffix restores original when it was present", () => {
    fc.assert(
      fc.property(fc.asciiString(), fc.asciiString(), (body, suffix) => {
        const full = body + suffix;
        const stripped = strRemoveSuffix(full, suffix);
        return stripped === body;
      }),
    );
  });
});

describe("strByteLength — properties", () => {
  it("byte length >= char length for all strings", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme" }), (str) => {
        return strByteLength(str) >= str.length;
      }),
    );
  });

  it("ASCII byte length equals char length", () => {
    fc.assert(
      fc.property(fc.asciiString(), (str) => {
        return strByteLength(str) === str.length;
      }),
    );
  });
});
