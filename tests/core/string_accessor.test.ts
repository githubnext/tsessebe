/**
 * Tests for StringAccessor (Series.str).
 *
 * Covers all public methods with unit tests and property-based tests.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import type { StringSeriesLike } from "../../src/index.ts";

// ─── top-level regex constants (required by biome useTopLevelRegex) ───────────
const RE_DIGITS = /\d/;
const RE_WHITESPACE_GLOBAL = /\s+/;

// ─── helpers ──────────────────────────────────────────────────────────────────

function strSeries(data: (string | null)[], name?: string): Series {
  return new Series({ data, name: name ?? null });
}

/** Extract string values from a StringSeriesLike. */
function vals(s: StringSeriesLike): (string | null)[] {
  return s.toArray() as (string | null)[];
}

// ─── case ─────────────────────────────────────────────────────────────────────

describe("StringAccessor — case", () => {
  it("lower()", () => {
    const s = strSeries(["Hello", "WORLD", null]);
    expect(vals(s.str.lower())).toEqual(["hello", "world", null]);
  });

  it("upper()", () => {
    const s = strSeries(["hello", "World", null]);
    expect(vals(s.str.upper())).toEqual(["HELLO", "WORLD", null]);
  });

  it("title()", () => {
    const s = strSeries(["hello world", "foo bar"]);
    expect(vals(s.str.title())).toEqual(["Hello World", "Foo Bar"]);
  });

  it("capitalize()", () => {
    const s = strSeries(["hello WORLD", "fOO"]);
    expect(vals(s.str.capitalize())).toEqual(["Hello world", "Foo"]);
  });

  it("swapcase()", () => {
    const s = strSeries(["Hello", "WORLD"]);
    expect(vals(s.str.swapcase())).toEqual(["hELLO", "world"]);
  });

  it("round-trip lower→upper", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const series = strSeries([s]);
        const result = vals(series.str.lower().str.upper())[0];
        expect(result).toBe(s.toUpperCase());
      }),
    );
  });
});

// ─── length ───────────────────────────────────────────────────────────────────

describe("StringAccessor — len", () => {
  it("returns string length", () => {
    const s = strSeries(["hello", "", "ab", null]);
    expect(s.str.len().toArray()).toEqual([5, 0, 2, null]);
  });

  it("len property test", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const s = strSeries([str]);
        expect(s.str.len().toArray()[0]).toBe(str.length);
      }),
    );
  });
});

// ─── strip ────────────────────────────────────────────────────────────────────

describe("StringAccessor — strip", () => {
  it("strip() removes leading and trailing whitespace", () => {
    const s = strSeries(["  hello  ", "\tfoo\n", null]);
    expect(vals(s.str.strip())).toEqual(["hello", "foo", null]);
  });

  it("lstrip() removes only leading whitespace", () => {
    const s = strSeries(["  hello  "]);
    expect(vals(s.str.lstrip())).toEqual(["hello  "]);
  });

  it("rstrip() removes only trailing whitespace", () => {
    const s = strSeries(["  hello  "]);
    expect(vals(s.str.rstrip())).toEqual(["  hello"]);
  });

  it("strip(chars) removes specific chars", () => {
    const s = strSeries(["***hello***", "***"]);
    expect(vals(s.str.strip("*"))).toEqual(["hello", ""]);
  });

  it("strip property: result has no leading/trailing whitespace", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const s = strSeries([str]);
        const r = (vals(s.str.strip())[0] ?? "") as string;
        expect(r.trim()).toBe(r);
      }),
    );
  });
});

// ─── pad ──────────────────────────────────────────────────────────────────────

describe("StringAccessor — pad", () => {
  it("pad left (rjust equivalent)", () => {
    const s = strSeries(["hi", "hello"]);
    expect(vals(s.str.pad(10, "left"))).toEqual(["        hi", "     hello"]);
  });

  it("pad right (ljust equivalent)", () => {
    const s = strSeries(["hi"]);
    expect(vals(s.str.pad(5, "right"))).toEqual(["hi   "]);
  });

  it("pad both (center equivalent)", () => {
    const s = strSeries(["hi"]);
    expect(vals(s.str.pad(6, "both"))).toEqual(["  hi  "]);
  });

  it("ljust()", () => {
    const s = strSeries(["foo"]);
    expect(vals(s.str.ljust(5))).toEqual(["foo  "]);
  });

  it("rjust()", () => {
    const s = strSeries(["foo"]);
    expect(vals(s.str.rjust(5))).toEqual(["  foo"]);
  });

  it("center()", () => {
    const s = strSeries(["hi"]);
    expect(vals(s.str.center(6))).toEqual(["  hi  "]);
  });

  it("zfill() pads with zeros", () => {
    const s = strSeries(["42", "-42", "5"]);
    expect(vals(s.str.zfill(5))).toEqual(["00042", "-0042", "00005"]);
  });

  it("pad does not truncate longer strings", () => {
    const s = strSeries(["hello world"]);
    expect(vals(s.str.pad(3))).toEqual(["hello world"]);
  });
});

// ─── contains / match ─────────────────────────────────────────────────────────

describe("StringAccessor — contains / match / startswith / endswith", () => {
  it("contains() with regex", () => {
    const s = strSeries(["foo bar", "baz", "foobar", null]);
    expect(s.str.contains("foo").toArray()).toEqual([true, false, true, null]);
  });

  it("contains() with literal substring", () => {
    const s = strSeries(["foo.bar", "baz"]);
    expect(s.str.contains("foo.bar", false).toArray()).toEqual([true, false]);
  });

  it("startswith()", () => {
    const s = strSeries(["hello", "world", null]);
    expect(s.str.startswith("hel").toArray()).toEqual([true, false, null]);
  });

  it("endswith()", () => {
    const s = strSeries(["hello", "world", null]);
    expect(s.str.endswith("ld").toArray()).toEqual([false, true, null]);
  });

  it("match() anchors to start", () => {
    const s = strSeries(["foo123", "123foo"]);
    expect(s.str.match("\\d+").toArray()).toEqual([false, true]);
  });

  it("fullmatch() requires full match", () => {
    const s = strSeries(["hello", "hello world"]);
    expect(s.str.fullmatch("hello").toArray()).toEqual([true, false]);
  });

  it("contains property: always boolean for non-null", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const s = strSeries([str]);
        const result = s.str.contains("a").toArray()[0];
        expect(typeof result === "boolean").toBe(true);
      }),
    );
  });
});

// ─── find / count ─────────────────────────────────────────────────────────────

describe("StringAccessor — find / count", () => {
  it("find() returns first index", () => {
    const s = strSeries(["hello world", "xyz"]);
    expect(s.str.find("o").toArray()).toEqual([4, -1]);
  });

  it("rfind() returns last index", () => {
    const s = strSeries(["hello world"]);
    expect(s.str.rfind("o").toArray()).toEqual([7]);
  });

  it("count() counts occurrences", () => {
    const s = strSeries(["banana", "apple", null]);
    expect(s.str.count("a").toArray()).toEqual([3, 1, null]);
  });

  it("count with regex", () => {
    const s = strSeries(["a1b2c3", "no digits"]);
    expect(s.str.count(RE_DIGITS).toArray()).toEqual([3, 0]);
  });
});

// ─── replace ──────────────────────────────────────────────────────────────────

describe("StringAccessor — replace", () => {
  it("replace all occurrences by default", () => {
    const s = strSeries(["aabbaa", "xyz"]);
    expect(vals(s.str.replace("a", "X"))).toEqual(["XXbbXX", "xyz"]);
  });

  it("replace n=1 replaces only first", () => {
    const s = strSeries(["aabbaa"]);
    expect(vals(s.str.replace("a", "X", 1))).toEqual(["Xabbaa"]);
  });

  it("replace with literal (regex=false)", () => {
    const s = strSeries(["foo.bar.baz"]);
    expect(vals(s.str.replace(".", "-", -1, false))).toEqual(["foo-bar-baz"]);
  });

  it("replace with RegExp object", () => {
    const s = strSeries(["hello world"]);
    expect(vals(s.str.replace(RE_WHITESPACE_GLOBAL, "_"))).toEqual(["hello_world"]);
  });

  it("replace propagates null", () => {
    const s = strSeries([null]);
    expect(vals(s.str.replace("a", "b"))).toEqual([null]);
  });
});

// ─── extract ──────────────────────────────────────────────────────────────────

describe("StringAccessor — extract", () => {
  it("extract first capture group", () => {
    const s = strSeries(["foo123", "bar456", "nope"]);
    expect(vals(s.str.extract("(\\d+)"))).toEqual(["123", "456", null]);
  });

  it("extract returns null on no match", () => {
    const s = strSeries(["abc"]);
    expect(vals(s.str.extract("(\\d+)"))).toEqual([null]);
  });
});

// ─── split / join / cat ───────────────────────────────────────────────────────

describe("StringAccessor — split / join / cat", () => {
  it("split() with n returns nth segment", () => {
    const s = strSeries(["a,b,c", "x,y"]);
    expect(vals(s.str.split(",", 1))).toEqual(["b", "y"]);
  });

  it("split() without n returns JSON array", () => {
    const s = strSeries(["a,b"]);
    expect(vals(s.str.split(","))).toEqual(['["a","b"]']);
  });

  it("rsplit() with maxsplit returns last segment", () => {
    const s = strSeries(["a,b,c"]);
    // rsplit with maxsplit=1 from right: ["a,b", "c"]; n=1 → "c"
    expect(vals(s.str.rsplit(",", 1, 1))).toEqual(["c"]);
  });

  it("join() reassembles split result", () => {
    const s = strSeries(["a,b,c"]);
    const split = s.str.split(",");
    const joined = split.str.join("-");
    expect(vals(joined)).toEqual(["a-b-c"]);
  });

  it("cat() concatenates element-wise", () => {
    const s = strSeries(["a", "b"]);
    const result = s.str.cat([["1", "2"]], "-");
    expect(vals(result)).toEqual(["a-1", "b-2"]);
  });
});

// ─── slice ────────────────────────────────────────────────────────────────────

describe("StringAccessor — slice", () => {
  it("slice(1, 4) slices characters", () => {
    const s = strSeries(["hello", "world"]);
    expect(vals(s.str.slice(1, 4))).toEqual(["ell", "orl"]);
  });

  it("slice with step", () => {
    const s = strSeries(["abcdef"]);
    expect(vals(s.str.slice(0, undefined, 2))).toEqual(["ace"]);
  });

  it("get(i) returns character at position", () => {
    const s = strSeries(["hello"]);
    expect(vals(s.str.get(1))).toEqual(["e"]);
    expect(vals(s.str.get(-1))).toEqual(["o"]);
  });

  it("get() returns null out of bounds", () => {
    const s = strSeries(["hi"]);
    expect(s.str.get(10).toArray()[0]).toBeNull();
  });

  it("sliceReplace()", () => {
    const s = strSeries(["hello world"]);
    expect(vals(s.str.sliceReplace(6, 11, "Python"))).toEqual(["hello Python"]);
  });
});

// ─── repeat / wrap ────────────────────────────────────────────────────────────

describe("StringAccessor — repeat / wrap", () => {
  it("repeat()", () => {
    const s = strSeries(["ab", "xy"]);
    expect(vals(s.str.repeat(3))).toEqual(["ababab", "xyxyxy"]);
  });

  it("wrap()", () => {
    const s = strSeries(["hello world foo"]);
    expect(vals(s.str.wrap(11))).toEqual(["hello world\nfoo"]);
  });
});

// ─── predicates ───────────────────────────────────────────────────────────────

describe("StringAccessor — predicates", () => {
  it("isalpha()", () => {
    const s = strSeries(["abc", "ab1", "", null]);
    expect(s.str.isalpha().toArray()).toEqual([true, false, false, null]);
  });

  it("isdigit()", () => {
    const s = strSeries(["123", "12a", ""]);
    expect(s.str.isdigit().toArray()).toEqual([true, false, false]);
  });

  it("isalnum()", () => {
    const s = strSeries(["abc123", "abc 123"]);
    expect(s.str.isalnum().toArray()).toEqual([true, false]);
  });

  it("islower()", () => {
    const s = strSeries(["hello", "Hello", "HELLO"]);
    expect(s.str.islower().toArray()).toEqual([true, false, false]);
  });

  it("isupper()", () => {
    const s = strSeries(["HELLO", "Hello", "hello"]);
    expect(s.str.isupper().toArray()).toEqual([true, false, false]);
  });

  it("istitle()", () => {
    const s = strSeries(["Hello World", "hello world", "Hello world"]);
    expect(s.str.istitle().toArray()).toEqual([true, false, false]);
  });

  it("isspace()", () => {
    const s = strSeries(["   ", "\t\n", "a ", ""]);
    expect(s.str.isspace().toArray()).toEqual([true, true, false, false]);
  });

  it("encode() returns JSON byte array", () => {
    const s = strSeries(["hi"]);
    const result = s.str.encode().toArray()[0] as string;
    const decoded = JSON.parse(result) as number[];
    expect(new TextDecoder().decode(new Uint8Array(decoded))).toBe("hi");
  });
});

// ─── null propagation property test ──────────────────────────────────────────

describe("StringAccessor — null propagation", () => {
  it("null values propagate through all transformations", () => {
    const methods = [
      (s: Series) => s.str.lower(),
      (s: Series) => s.str.upper(),
      (s: Series) => s.str.strip(),
      (s: Series) => s.str.len(),
      (s: Series) => s.str.contains("x"),
      (s: Series) => s.str.replace("a", "b"),
    ];
    for (const method of methods) {
      const s = strSeries([null]);
      expect(method(s).toArray()[0]).toBeNull();
    }
  });
});
