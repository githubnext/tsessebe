/**
 * Tests for StringAccessor (Series.str).
 *
 * Covers: case conversion, padding/trimming, search predicates,
 * transforms (replace, split, get, slice), length, and null propagation.
 */
import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function strSeries(data: (string | null)[]): Series<import("../../src/types.ts").Scalar> {
  return new Series({ data });
}

// ─── case ────────────────────────────────────────────────────────────────────

describe("StringAccessor", () => {
  describe("upper / lower", () => {
    it("upper() converts each element to upper-case", () => {
      const s = strSeries(["hello", "World"]);
      expect([...s.str.upper().values]).toEqual(["HELLO", "WORLD"]);
    });

    it("lower() converts each element to lower-case", () => {
      const s = strSeries(["HELLO", "World"]);
      expect([...s.str.lower().values]).toEqual(["hello", "world"]);
    });

    it("upper/lower propagate null", () => {
      const s = strSeries(["hi", null]);
      expect([...s.str.upper().values]).toEqual(["HI", null]);
      expect([...s.str.lower().values]).toEqual(["hi", null]);
    });

    it("upper/lower are inverses for ASCII", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 20 }), (str) => {
          const s = strSeries([str]);
          expect([...s.str.upper().str.lower().values]).toEqual([str.toLowerCase()]);
        }),
      );
    });
  });

  describe("capitalize / title / swapcase", () => {
    it("capitalize() capitalizes first char, lower-cases rest", () => {
      const s = strSeries(["hELLO", "wORLD"]);
      expect([...s.str.capitalize().values]).toEqual(["Hello", "World"]);
    });

    it("title() capitalizes first letter of every word", () => {
      const s = strSeries(["hello world", "foo bar baz"]);
      expect([...s.str.title().values]).toEqual(["Hello World", "Foo Bar Baz"]);
    });

    it("swapcase() swaps case of every character", () => {
      const s = strSeries(["Hello", "WORLD"]);
      expect([...s.str.swapcase().values]).toEqual(["hELLO", "world"]);
    });
  });

  // ─── padding / trimming ───────────────────────────────────────────────────

  describe("strip / lstrip / rstrip", () => {
    it("strip() removes leading and trailing whitespace", () => {
      const s = strSeries(["  hello  ", "\tworld\n"]);
      expect([...s.str.strip().values]).toEqual(["hello", "world"]);
    });

    it("lstrip() removes only leading whitespace", () => {
      const s = strSeries(["  hi  "]);
      expect([...s.str.lstrip().values]).toEqual(["hi  "]);
    });

    it("rstrip() removes only trailing whitespace", () => {
      const s = strSeries(["  hi  "]);
      expect([...s.str.rstrip().values]).toEqual(["  hi"]);
    });
  });

  describe("pad / center / ljust / rjust / zfill", () => {
    it("pad(5, 'right') right-pads a short string", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.pad(5).values]).toEqual(["hi   "]);
    });

    it("pad(5, 'left') left-pads a short string", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.pad(5, "left").values]).toEqual(["   hi"]);
    });

    it("pad() does nothing when string is already at width", () => {
      const s = strSeries(["hello"]);
      expect([...s.str.pad(3).values]).toEqual(["hello"]);
    });

    it("center() centers the string", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.center(6).values]).toEqual(["  hi  "]);
    });

    it("ljust() left-justifies", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.ljust(5).values]).toEqual(["hi   "]);
    });

    it("rjust() right-justifies", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.rjust(5).values]).toEqual(["   hi"]);
    });

    it("zfill() pads with zeros on the left", () => {
      const s = strSeries(["42", "7"]);
      expect([...s.str.zfill(5).values]).toEqual(["00042", "00007"]);
    });
  });

  // ─── search ──────────────────────────────────────────────────────────────

  describe("contains / startswith / endswith", () => {
    it("contains() returns true when substring is present", () => {
      const s = strSeries(["hello", "world", "foo"]);
      expect([...s.str.contains("llo").values]).toEqual([true, false, false]);
    });

    it("contains() accepts RegExp", () => {
      const s = strSeries(["abc", "xyz", "a1b"]);
      expect([...s.str.contains(/\d/).values]).toEqual([false, false, true]);
    });

    it("contains() with regex=true treats string as pattern", () => {
      const s = strSeries(["abc", "xyz"]);
      expect([...s.str.contains("^a", true).values]).toEqual([true, false]);
    });

    it("contains() propagates null", () => {
      const s = strSeries(["hello", null]);
      expect([...s.str.contains("h").values]).toEqual([true, null]);
    });

    it("startswith() checks string prefix", () => {
      const s = strSeries(["hello", "world"]);
      expect([...s.str.startswith("he").values]).toEqual([true, false]);
    });

    it("endswith() checks string suffix", () => {
      const s = strSeries(["hello", "world"]);
      expect([...s.str.endswith("ld").values]).toEqual([false, true]);
    });
  });

  describe("count / find", () => {
    it("count() counts substring occurrences", () => {
      const s = strSeries(["banana", "apple"]);
      expect([...s.str.count("a").values]).toEqual([3, 1]);
    });

    it("find() returns index of first occurrence", () => {
      const s = strSeries(["hello", "world"]);
      expect([...s.str.find("l").values]).toEqual([2, 3]);
    });

    it("find() returns -1 when not found", () => {
      const s = strSeries(["hello"]);
      expect([...s.str.find("z").values]).toEqual([-1]);
    });
  });

  // ─── transforms ──────────────────────────────────────────────────────────

  describe("replace", () => {
    it("replaces all occurrences by default", () => {
      const s = strSeries(["banana"]);
      expect([...s.str.replace("a", "o").values]).toEqual(["bonono"]);
    });

    it("replaces at most n occurrences when n is given", () => {
      const s = strSeries(["banana"]);
      expect([...s.str.replace("a", "o", 2).values]).toEqual(["bonona"]);
    });

    it("accepts a RegExp", () => {
      const s = strSeries(["hello123"]);
      expect([...s.str.replace(/\d+/, "").values]).toEqual(["hello"]);
    });
  });

  describe("split", () => {
    it("splits by separator into JSON array string", () => {
      const s = strSeries(["a,b,c"]);
      expect([...s.str.split(",").values]).toEqual(['["a","b","c"]']);
    });

    it("splits on whitespace by default", () => {
      const s = strSeries(["hello world"]);
      expect([...s.str.split().values]).toEqual(['["hello","world"]']);
    });

    it("respects n limit", () => {
      const s = strSeries(["a,b,c,d"]);
      expect([...s.str.split(",", 2).values]).toEqual(['["a","b","c,d"]']);
    });
  });

  describe("get / slice", () => {
    it("get() returns the i-th character", () => {
      const s = strSeries(["hello"]);
      expect([...s.str.get(0).values]).toEqual(["h"]);
      expect([...s.str.get(-1).values]).toEqual(["o"]);
    });

    it("get() returns null for out-of-bounds", () => {
      const s = strSeries(["hi"]);
      expect([...s.str.get(10).values]).toEqual([null]);
    });

    it("slice() extracts a substring", () => {
      const s = strSeries(["hello"]);
      expect([...s.str.slice(1, 3).values]).toEqual(["el"]);
    });

    it("slice() with step skips characters", () => {
      const s = strSeries(["abcdef"]);
      expect([...s.str.slice(0, 6, 2).values]).toEqual(["ace"]);
    });
  });

  // ─── length ──────────────────────────────────────────────────────────────

  describe("len", () => {
    it("returns the length of each element", () => {
      const s = strSeries(["hello", "hi", ""]);
      expect([...s.str.len().values]).toEqual([5, 2, 0]);
    });

    it("propagates null", () => {
      const s = strSeries(["hi", null]);
      expect([...s.str.len().values]).toEqual([2, null]);
    });

    it("len is non-negative for all strings", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 30 }), (str) => {
          const s = strSeries([str]);
          const len = s.str.len().values[0] as number;
          expect(len).toBeGreaterThanOrEqual(0);
        }),
      );
    });
  });

  // ─── null propagation (property-based) ───────────────────────────────────

  describe("null propagation", () => {
    it("all operations return null for null input", () => {
      const s = strSeries([null]);
      expect(s.str.upper().values[0]).toBeNull();
      expect(s.str.lower().values[0]).toBeNull();
      expect(s.str.strip().values[0]).toBeNull();
      expect(s.str.len().values[0]).toBeNull();
      expect(s.str.contains("x").values[0]).toBeNull();
      expect(s.str.startswith("x").values[0]).toBeNull();
      expect(s.str.endswith("x").values[0]).toBeNull();
    });
  });
});
