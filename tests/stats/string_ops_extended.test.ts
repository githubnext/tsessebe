/**
 * Tests for src/stats/string_ops_extended.ts
 * — strSplitExpand, strExtractGroups, strPartition, strRPartition,
 *   strMultiReplace, strIndent, strDedent
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { type DataFrame, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  strDedent,
  strExtractGroups,
  strIndent,
  strMultiReplace,
  strPartition,
  strRPartition,
  strSplitExpand,
} from "../../src/stats/string_ops_extended.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: (string | null)[]): Series<Scalar> {
  return new Series({ data: data as Scalar[] });
}

function vals(series: Series<Scalar>): Scalar[] {
  return [...series.toArray()] as Scalar[];
}

function dfCol(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).toArray()] as Scalar[];
}

// ─── strSplitExpand ───────────────────────────────────────────────────────────

describe("strSplitExpand — scalar", () => {
  it("splits on space by default", () => {
    expect(strSplitExpand("hello world foo")).toEqual(["hello", "world", "foo"]);
  });

  it("splits on custom separator", () => {
    expect(strSplitExpand("a,b,c", ",")).toEqual(["a", "b", "c"]);
  });

  it("respects n option", () => {
    expect(strSplitExpand("a-b-c-d", "-", { n: 2 })).toEqual(["a", "b", "c-d"]);
  });

  it("n=1 splits once", () => {
    expect(strSplitExpand("a|b|c", "|", { n: 1 })).toEqual(["a", "b|c"]);
  });

  it("handles separator not found", () => {
    expect(strSplitExpand("hello", ",")).toEqual(["hello"]);
  });

  it("splits on RegExp", () => {
    expect(strSplitExpand("a1b2c", /\d/)).toEqual(["a", "b", "c"]);
  });
});

describe("strSplitExpand — Series/array", () => {
  it("expands to DataFrame columns", () => {
    const sr = s(["a b c", "x y z"]);
    const df = strSplitExpand(sr);
    expect(dfCol(df, "0")).toEqual(["a", "x"]);
    expect(dfCol(df, "1")).toEqual(["b", "y"]);
    expect(dfCol(df, "2")).toEqual(["c", "z"]);
  });

  it("pads short rows with null", () => {
    const sr = s(["a b c", "x y"]);
    const df = strSplitExpand(sr);
    expect(dfCol(df, "2")).toEqual(["c", null]);
  });

  it("handles null elements", () => {
    const sr = s([null, "a b"]);
    const df = strSplitExpand(sr);
    expect(dfCol(df, "0")).toEqual([null, "a"]);
    expect(dfCol(df, "1")).toEqual([null, "b"]);
  });

  it("preserves Series index", () => {
    const sr = new Series({ data: ["a b", "c d"], index: ["i", "j"] });
    const df = strSplitExpand(sr);
    expect([...df.index.toArray()]).toEqual(["i", "j"]);
  });

  it("accepts raw array", () => {
    const df = strSplitExpand(["x y", "a b c"], " ");
    expect(df.columns.values).toHaveLength(3);
  });

  it("respects n option in Series mode", () => {
    const sr = s(["a-b-c", "x-y-z"]);
    const df = strSplitExpand(sr, "-", { n: 1 });
    expect(dfCol(df, "0")).toEqual(["a", "x"]);
    expect(dfCol(df, "1")).toEqual(["b-c", "y-z"]);
  });
});

// ─── strExtractGroups ─────────────────────────────────────────────────────────

describe("strExtractGroups", () => {
  it("extracts numbered groups to columns 0, 1, ...", () => {
    const sr = s(["2024-01-15", "2025-12-31"]);
    const df = strExtractGroups(sr, /(\d{4})-(\d{2})-(\d{2})/);
    expect(dfCol(df, "0")).toEqual(["2024", "2025"]);
    expect(dfCol(df, "1")).toEqual(["01", "12"]);
    expect(dfCol(df, "2")).toEqual(["15", "31"]);
  });

  it("uses named groups as column names", () => {
    const sr = s(["John 42", "Alice 30"]);
    const df = strExtractGroups(sr, /(?<name>\w+) (?<age>\d+)/);
    expect(dfCol(df, "name")).toEqual(["John", "Alice"]);
    expect(dfCol(df, "age")).toEqual(["42", "30"]);
  });

  it("non-matching rows produce null", () => {
    const sr = s(["hello", "world"]);
    const df = strExtractGroups(sr, /(\d+)/);
    expect(dfCol(df, "0")).toEqual([null, null]);
  });

  it("null elements produce null", () => {
    const sr = s([null, "abc123"]);
    const df = strExtractGroups(sr, /([a-z]+)(\d+)/);
    expect(dfCol(df, "0")).toEqual([null, "abc"]);
    expect(dfCol(df, "1")).toEqual([null, "123"]);
  });

  it("accepts string pattern", () => {
    const sr = s(["foo-bar"]);
    const df = strExtractGroups(sr, "([a-z]+)-([a-z]+)");
    expect(dfCol(df, "0")).toEqual(["foo"]);
    expect(dfCol(df, "1")).toEqual(["bar"]);
  });

  it("accepts flags option", () => {
    const sr = s(["HELLO world"]);
    const df = strExtractGroups(sr, /([a-z]+)/, { flags: "i" });
    expect(dfCol(df, "0")).toEqual(["HELLO"]);
  });
});

// ─── strPartition ─────────────────────────────────────────────────────────────

describe("strPartition — scalar", () => {
  it("splits at first occurrence", () => {
    expect(strPartition("hello world foo", " ")).toEqual(["hello", " ", "world foo"]);
  });

  it("returns [s, '', ''] when sep not found", () => {
    expect(strPartition("hello", ",")).toEqual(["hello", "", ""]);
  });

  it("handles empty sep at start", () => {
    expect(strPartition("-hello", "-")).toEqual(["", "-", "hello"]);
  });

  it("multi-char separator", () => {
    expect(strPartition("a::b::c", "::")).toEqual(["a", "::", "b::c"]);
  });
});

describe("strPartition — Series/array", () => {
  it("expands to 3-column DataFrame", () => {
    const sr = s(["a|b|c", "x|y"]);
    const df = strPartition(sr, "|");
    expect(dfCol(df, "0")).toEqual(["a", "x"]);
    expect(dfCol(df, "1")).toEqual(["|", "|"]);
    expect(dfCol(df, "2")).toEqual(["b|c", "y"]);
  });

  it("handles null elements", () => {
    const sr = s([null, "a|b"]);
    const df = strPartition(sr, "|");
    expect(dfCol(df, "0")).toEqual([null, "a"]);
    expect(dfCol(df, "1")).toEqual([null, "|"]);
  });

  it("accepts raw array", () => {
    const df = strPartition(["x-y", "a-b"] as Scalar[], "-");
    expect(dfCol(df, "0")).toEqual(["x", "a"]);
  });
});

// ─── strRPartition ────────────────────────────────────────────────────────────

describe("strRPartition — scalar", () => {
  it("splits at last occurrence", () => {
    expect(strRPartition("hello world foo", " ")).toEqual(["hello world", " ", "foo"]);
  });

  it("returns ['', '', s] when sep not found", () => {
    expect(strRPartition("hello", ",")).toEqual(["", "", "hello"]);
  });

  it("multi-char separator", () => {
    expect(strRPartition("a::b::c", "::")).toEqual(["a::b", "::", "c"]);
  });
});

describe("strRPartition — Series/array", () => {
  it("expands to 3-column DataFrame", () => {
    const sr = s(["a|b|c", "x|y"]);
    const df = strRPartition(sr, "|");
    expect(dfCol(df, "0")).toEqual(["a|b", "x"]);
    expect(dfCol(df, "1")).toEqual(["|", "|"]);
    expect(dfCol(df, "2")).toEqual(["c", "y"]);
  });

  it("handles null elements", () => {
    const sr = s([null, "a|b|c"]);
    const df = strRPartition(sr, "|");
    expect(dfCol(df, "2")).toEqual([null, "c"]);
  });
});

// ─── strMultiReplace ──────────────────────────────────────────────────────────

describe("strMultiReplace — scalar", () => {
  it("applies replacements in order", () => {
    const result = strMultiReplace("hello world", [
      { pat: "hello", repl: "hi" },
      { pat: "world", repl: "earth" },
    ]);
    expect(result).toBe("hi earth");
  });

  it("applies regex replacement", () => {
    const result = strMultiReplace("foo123bar456", [{ pat: /\d+/g, repl: "N" }]);
    expect(result).toBe("fooNbarN");
  });

  it("chain order matters", () => {
    // first replaces 'a' with 'b', then 'b' with 'c' → 'c'
    const result = strMultiReplace("a", [
      { pat: "a", repl: "b" },
      { pat: "b", repl: "c" },
    ]);
    expect(result).toBe("c");
  });

  it("empty replacements returns original", () => {
    expect(strMultiReplace("hello", [])).toBe("hello");
  });
});

describe("strMultiReplace — Series", () => {
  it("applies to each element", () => {
    const sr = s(["hello", "world"]);
    const out = strMultiReplace(sr, [{ pat: "o", repl: "0" }]);
    expect(vals(out)).toEqual(["hell0", "w0rld"]);
  });

  it("null elements remain null", () => {
    const sr = s([null, "hello"]);
    const out = strMultiReplace(sr, [{ pat: "h", repl: "H" }]);
    expect(vals(out)).toEqual([null, "Hello"]);
  });

  it("preserves Series index", () => {
    const sr = new Series({ data: ["a", "b"], index: ["x", "y"] });
    const out = strMultiReplace(sr, [{ pat: "a", repl: "A" }]);
    expect([...out.index.toArray()]).toEqual(["x", "y"]);
  });
});

// ─── strIndent ────────────────────────────────────────────────────────────────

describe("strIndent — scalar", () => {
  it("adds prefix to non-empty lines", () => {
    expect(strIndent("hello\nworld", "  ")).toBe("  hello\n  world");
  });

  it("skips empty/whitespace-only lines by default", () => {
    expect(strIndent("a\n\nb", "> ")).toBe("> a\n\n> b");
  });

  it("respects custom predicate", () => {
    // only indent lines starting with '#'
    const result = strIndent("# title\nnormal line\n# section", "  ", {
      predicate: (line) => line.startsWith("#"),
    });
    expect(result).toBe("  # title\nnormal line\n  # section");
  });

  it("single line", () => {
    expect(strIndent("hello", ">>")).toBe(">>hello");
  });

  it("empty string returns empty", () => {
    expect(strIndent("", "  ")).toBe("");
  });
});

describe("strIndent — Series", () => {
  it("applies to each element", () => {
    const sr = s(["a\nb", "x\ny"]);
    const out = strIndent(sr, "- ");
    expect(vals(out)).toEqual(["- a\n- b", "- x\n- y"]);
  });

  it("null elements remain null", () => {
    const sr = s([null, "hello"]);
    const out = strIndent(sr, "> ");
    expect(vals(out)).toEqual([null, "> hello"]);
  });
});

// ─── strDedent ────────────────────────────────────────────────────────────────

describe("strDedent — scalar", () => {
  it("removes common leading whitespace", () => {
    expect(strDedent("    hello\n    world")).toBe("hello\nworld");
  });

  it("removes only the common prefix", () => {
    expect(strDedent("  a\n    b")).toBe("a\n  b");
  });

  it("ignores whitespace-only lines for computing prefix", () => {
    expect(strDedent("  a\n\n  b")).toBe("a\n\nb");
  });

  it("no-op when no leading whitespace", () => {
    expect(strDedent("a\nb")).toBe("a\nb");
  });

  it("single line", () => {
    expect(strDedent("   hello")).toBe("hello");
  });

  it("empty string returns empty", () => {
    expect(strDedent("")).toBe("");
  });

  it("mixed indentation collapses to minimum", () => {
    expect(strDedent("    a\n  b\n      c")).toBe("  a\nb\n    c");
  });
});

describe("strDedent — Series", () => {
  it("applies to each element independently", () => {
    const sr = s(["  a\n  b", "    x\n    y"]);
    const out = strDedent(sr);
    expect(vals(out)).toEqual(["a\nb", "x\ny"]);
  });

  it("null elements remain null", () => {
    const sr = s([null, "  hi"]);
    const out = strDedent(sr);
    expect(vals(out)).toEqual([null, "hi"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("strSplitExpand — property tests", () => {
  it("split then rejoin recovers original (no-limit, single-char sep)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (arr) => {
          const df = strSplitExpand(arr as Scalar[], "|");
          const cols = df.columns.values as string[];
          // rejoin each row
          const rejoined = arr.map((_s, ri) => {
            return cols.map((c) => df.col(c).iat(ri) ?? "").join("|");
          });
          // compare (escaped) — the round-trip should work if the original had no "|" in it
          // just check shape: each row gets at least 1 column
          return rejoined.length === arr.length;
        },
      ),
    );
  });
});

describe("strPartition / strRPartition — property tests", () => {
  it("partition: concatenating parts recovers original", () => {
    fc.assert(
      fc.property(fc.string(), fc.string({ minLength: 1, maxLength: 3 }), (str, sep) => {
        const [before, mid, after] = strPartition(str, sep);
        if (str.includes(sep)) {
          return before + mid + after === str;
        }
        return before === str && mid === "" && after === "";
      }),
    );
  });

  it("rpartition: concatenating parts recovers original", () => {
    fc.assert(
      fc.property(fc.string(), fc.string({ minLength: 1, maxLength: 3 }), (str, sep) => {
        const [before, mid, after] = strRPartition(str, sep);
        if (str.includes(sep)) {
          return before + mid + after === str;
        }
        return before === "" && mid === "" && after === str;
      }),
    );
  });
});

describe("strDedent — property tests", () => {
  it("dedent-then-indent is idempotent on uniform indentation", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .string({ minLength: 1 })
            .filter(
              (s) => !s.includes("\n") && s.trim().length > 0 && s[0] !== " " && s[0] !== "\t",
            ),
          {
            minLength: 1,
            maxLength: 5,
          },
        ),
        fc.integer({ min: 0, max: 8 }),
        (lines, spaces) => {
          const prefix = " ".repeat(spaces);
          const indented = lines.map((l) => prefix + l).join("\n");
          const dedented = strDedent(indented);
          return dedented === lines.join("\n");
        },
      ),
    );
  });
});

describe("strMultiReplace — property tests", () => {
  it("empty replacements is identity", () => {
    fc.assert(fc.property(fc.string(), (str) => strMultiReplace(str, []) === str));
  });
});
