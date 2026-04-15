/**
 * Tests for notna / isna / notnull / isnull.
 *
 * Covers:
 * - Scalar detection (null, undefined, NaN, 0, "", false, Date, etc.)
 * - Array overload
 * - Series overload (values, index, name preservation)
 * - DataFrame overload (values, column structure)
 * - Alias symmetry (isnull === isna, notnull === notna)
 * - Property-based tests (notna === !isna for all scalars)
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import { isna, isnull, notna, notnull } from "../../src/stats/notna.ts";

// ─── scalar ───────────────────────────────────────────────────────────────────

describe("isna — scalar", () => {
  test("null → true", () => expect(isna(null)).toBe(true));
  test("undefined → true", () => expect(isna(undefined)).toBe(true));
  test("NaN → true", () => expect(isna(Number.NaN)).toBe(true));
  test("0 → false", () => expect(isna(0)).toBe(false));
  test("'' → false", () => expect(isna("")).toBe(false));
  test("false → false", () => expect(isna(false)).toBe(false));
  test("0n → false", () => expect(isna(0n)).toBe(false));
  test("new Date → false", () => expect(isna(new Date())).toBe(false));
  test("Infinity → false", () => expect(isna(Number.POSITIVE_INFINITY)).toBe(false));
  test("-Infinity → false", () => expect(isna(Number.NEGATIVE_INFINITY)).toBe(false));
  test("42 → false", () => expect(isna(42)).toBe(false));
  test('"hello" → false', () => expect(isna("hello")).toBe(false));
  test("true → false", () => expect(isna(true)).toBe(false));
});

describe("notna — scalar", () => {
  test("null → false", () => expect(notna(null)).toBe(false));
  test("undefined → false", () => expect(notna(undefined)).toBe(false));
  test("NaN → false", () => expect(notna(Number.NaN)).toBe(false));
  test("0 → true", () => expect(notna(0)).toBe(true));
  test("'' → true", () => expect(notna("")).toBe(true));
  test("false → true", () => expect(notna(false)).toBe(true));
  test("42 → true", () => expect(notna(42)).toBe(true));
});

// ─── aliases ─────────────────────────────────────────────────────────────────

describe("aliases", () => {
  test("isnull === isna", () => {
    expect(isnull).toBe(isna);
  });
  test("notnull === notna", () => {
    expect(notnull).toBe(notna);
  });
});

// ─── array ────────────────────────────────────────────────────────────────────

describe("isna — array", () => {
  test("all present → all false", () => {
    expect(isna([1, 2, 3])).toEqual([false, false, false]);
  });
  test("all missing → all true", () => {
    expect(isna([null, undefined, Number.NaN])).toEqual([true, true, true]);
  });
  test("mixed → correct mask", () => {
    expect(isna([1, null, Number.NaN, "x", undefined, false])).toEqual([
      false,
      true,
      true,
      false,
      true,
      false,
    ]);
  });
  test("empty array → []", () => {
    expect(isna([])).toEqual([]);
  });
});

describe("notna — array", () => {
  test("mixed → inverted mask", () => {
    expect(notna([1, null, Number.NaN, "x"])).toEqual([true, false, false, true]);
  });
  test("empty → []", () => {
    expect(notna([])).toEqual([]);
  });
});

// ─── Series ───────────────────────────────────────────────────────────────────

describe("isna — Series", () => {
  test("returns boolean Series", () => {
    const s = new Series({ data: [1, null, Number.NaN, "x", undefined] });
    const result = isna(s);
    expect([...result.values]).toEqual([false, true, true, false, true]);
  });

  test("preserves index", () => {
    const idx = new Index(["a", "b", "c"]);
    const s = new Series({ data: [1, null, 3], index: idx });
    const result = isna(s);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  test("preserves name", () => {
    const s = new Series({ data: [1, null], name: "myCol" });
    expect(isna(s).name).toBe("myCol");
  });

  test("all present → all false", () => {
    const s = new Series({ data: [10, 20, 30] });
    const result = isna(s);
    expect([...result.values]).toEqual([false, false, false]);
  });

  test("all missing → all true", () => {
    const s = new Series({ data: [null, undefined, Number.NaN] });
    const result = isna(s);
    expect([...result.values]).toEqual([true, true, true]);
  });

  test("empty Series → empty result", () => {
    const s = new Series({ data: [] });
    const result = isna(s);
    expect(result.size).toBe(0);
  });
});

describe("notna — Series", () => {
  test("inverts isna result", () => {
    const s = new Series({ data: [1, null, Number.NaN, "x"] });
    const na = isna(s);
    const nna = notna(s);
    for (let i = 0; i < s.size; i++) {
      expect(nna.values[i]).toBe(!na.values[i]);
    }
  });
});

// ─── DataFrame ───────────────────────────────────────────────────────────────

describe("isna — DataFrame", () => {
  test("basic mask", () => {
    const df = DataFrame.fromColumns({
      a: [1, null, 3],
      b: [Number.NaN, 2, undefined],
    });
    const result = isna(df);
    const records = result.toRecords();
    expect(records).toEqual([
      { a: false, b: true },
      { a: true, b: false },
      { a: false, b: true },
    ]);
  });

  test("preserves column order", () => {
    const df = DataFrame.fromColumns({ x: [1], y: [null], z: [Number.NaN] });
    const result = isna(df);
    expect([...result.columns]).toEqual(["x", "y", "z"]);
  });

  test("preserves row index", () => {
    const idx = new Index(["r0", "r1"]);
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: idx });
    const result = isna(df);
    expect([...result.index.values]).toEqual(["r0", "r1"]);
  });

  test("all-present DataFrame → all false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = isna(df);
    for (const rec of result.toRecords()) {
      expect(rec["a"]).toBe(false);
      expect(rec["b"]).toBe(false);
    }
  });

  test("all-missing DataFrame → all true", () => {
    const df = DataFrame.fromColumns({ a: [null, null], b: [Number.NaN, undefined] });
    const result = isna(df);
    for (const rec of result.toRecords()) {
      expect(rec["a"]).toBe(true);
      expect(rec["b"]).toBe(true);
    }
  });

  test("empty DataFrame → empty result", () => {
    const df = DataFrame.fromColumns({});
    const result = isna(df);
    expect(result.shape).toEqual([0, 0]);
  });
});

describe("notna — DataFrame", () => {
  test("inverts isna for DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [Number.NaN, 3] });
    const na = isna(df);
    const nna = notna(df);
    for (const colName of df.columns) {
      const naCol = na.col(String(colName)).values;
      const nnaCol = nna.col(String(colName)).values;
      for (let i = 0; i < naCol.length; i++) {
        expect(nnaCol[i]).toBe(!naCol[i]);
      }
    }
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("isna — property-based", () => {
  test("notna(x) === !isna(x) for all scalars", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(Number.NaN),
          fc.double({ noNaN: true }),
          fc.string(),
          fc.boolean(),
        ),
        (v) => {
          expect(notna(v)).toBe(!isna(v));
        },
      ),
    );
  });

  test("isna of non-null number → false", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (n) => {
        expect(isna(n)).toBe(false);
        expect(notna(n)).toBe(true);
      }),
    );
  });

  test("isna of string → false", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(isna(s)).toBe(false);
      }),
    );
  });

  test("array result length matches input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.double(), fc.constant(null), fc.constant(undefined))),
        (arr) => {
          expect(isna(arr).length).toBe(arr.length);
          expect(notna(arr).length).toBe(arr.length);
        },
      ),
    );
  });

  test("isna(arr) + notna(arr) all true (complement)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.double(), fc.constant(null), fc.constant(undefined), fc.string())),
        (arr) => {
          const na = isna(arr);
          const nna = notna(arr);
          for (let i = 0; i < arr.length; i++) {
            expect(na[i]).toBe(!nna[i]);
          }
        },
      ),
    );
  });

  test("Series: isna.values complement of notna.values", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.double(), fc.constant(null))), (arr) => {
        const s = new Series({ data: arr });
        const na = isna(s).values;
        const nna = notna(s).values;
        for (let i = 0; i < arr.length; i++) {
          expect(na[i]).toBe(!nna[i]);
        }
      }),
    );
  });
});
