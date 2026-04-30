/**
 * Tests for hashPandasObject — FNV-1a 64-bit hashing of Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, hashPandasObject } from "../../src/index.ts";

// ─── Series hashing ───────────────────────────────────────────────────────────

describe("hashPandasObject — Series", () => {
  it("returns a Series of the same length", () => {
    const s = new Series({ data: [1, 2, 3] });
    const h = hashPandasObject(s);
    expect(h.index.size).toBe(3);
  });

  it("returns numeric hash values", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    const h = hashPandasObject(s);
    for (let i = 0; i < 3; i++) {
      expect(typeof h.iat(i)).toBe("number");
    }
  });

  it("equal values → equal hashes (index=true)", () => {
    const s = new Series({ data: ["x", "y", "x"], index: [0, 1, 2] });
    const h = hashPandasObject(s);
    // index differs (0 vs 2), so hashes must differ
    expect(h.iat(0)).not.toBe(h.iat(2));
  });

  it("equal values + equal index → equal hashes", () => {
    const s1 = new Series({ data: [42], index: ["k"] });
    const s2 = new Series({ data: [42], index: ["k"] });
    const h1 = hashPandasObject(s1);
    const h2 = hashPandasObject(s2);
    expect(h1.iat(0)).toBe(h2.iat(0));
  });

  it("different values → different hashes (with overwhelming probability)", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5], index: [0, 1, 2, 3, 4] });
    const h = hashPandasObject(s);
    const unique = new Set<number>();
    for (let i = 0; i < 5; i++) {
      unique.add(h.iat(i));
    }
    expect(unique.size).toBe(5);
  });

  it("index=false: same value + different index → same hash", () => {
    const s = new Series({ data: ["hello", "hello"], index: ["a", "b"] });
    const h = hashPandasObject(s, { index: false });
    expect(h.iat(0)).toBe(h.iat(1));
  });

  it("index=false: different values → different hashes", () => {
    const s = new Series({ data: ["hello", "world"] });
    const h = hashPandasObject(s, { index: false });
    expect(h.iat(0)).not.toBe(h.iat(1));
  });

  it("preserves the original index on the result", () => {
    const s = new Series({ data: [10, 20], index: ["x", "y"] });
    const h = hashPandasObject(s);
    expect(h.index.at(0)).toBe("x");
    expect(h.index.at(1)).toBe("y");
  });

  it("handles null values", () => {
    const s = new Series({ data: [null, null], index: [0, 1] });
    const h = hashPandasObject(s, { index: false });
    // Same null → same hash
    expect(h.iat(0)).toBe(h.iat(1));
  });

  it("null ≠ zero hash", () => {
    const sNull = new Series({ data: [null], index: [0] });
    const sZero = new Series({ data: [0], index: [0] });
    const hNull = hashPandasObject(sNull, { index: false });
    const hZero = hashPandasObject(sZero, { index: false });
    expect(hNull.iat(0)).not.toBe(hZero.iat(0));
  });

  it("handles boolean values", () => {
    const s = new Series({ data: [true, false, true] });
    const h = hashPandasObject(s, { index: false });
    expect(h.iat(0)).toBe(h.iat(2)); // true === true
    expect(h.iat(0)).not.toBe(h.iat(1)); // true ≠ false
  });

  it("handles Date values", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-02");
    const s = new Series({ data: [d1, d1, d2] });
    const h = hashPandasObject(s, { index: false });
    expect(h.iat(0)).toBe(h.iat(1));
    expect(h.iat(0)).not.toBe(h.iat(2));
  });

  it("handles empty Series", () => {
    const s = new Series({ data: [] });
    const h = hashPandasObject(s);
    expect(h.index.size).toBe(0);
  });

  it("property: deterministic — same input same hash", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.boolean()), { maxLength: 20 }),
        (arr) => {
          const s1 = new Series({ data: arr });
          const s2 = new Series({ data: arr });
          const h1 = hashPandasObject(s1, { index: false });
          const h2 = hashPandasObject(s2, { index: false });
          for (let i = 0; i < arr.length; i++) {
            if (h1.iat(i) !== h2.iat(i)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── DataFrame hashing ────────────────────────────────────────────────────────

describe("hashPandasObject — DataFrame", () => {
  it("returns a Series with one hash per row", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
    const h = hashPandasObject(df);
    expect(h.index.size).toBe(3);
  });

  it("returns numeric hashes", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const h = hashPandasObject(df);
    expect(typeof h.iat(0)).toBe("number");
    expect(typeof h.iat(1)).toBe("number");
  });

  it("identical rows → same hash (index=false)", () => {
    const df = DataFrame.fromColumns({ a: [1, 1], b: ["x", "x"] });
    const h = hashPandasObject(df, { index: false });
    expect(h.iat(0)).toBe(h.iat(1));
  });

  it("different rows → different hashes", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const h = hashPandasObject(df, { index: false });
    expect(h.iat(0)).not.toBe(h.iat(1));
  });

  it("preserves df.index on result", () => {
    const df = DataFrame.fromColumns({ a: [10, 20] }, { index: ["r0", "r1"] });
    const h = hashPandasObject(df);
    expect(h.index.at(0)).toBe("r0");
    expect(h.index.at(1)).toBe("r1");
  });

  it("index=true: same data, different index → different hashes", () => {
    const df = DataFrame.fromColumns({ a: [1, 1] }, { index: [0, 1] });
    const h = hashPandasObject(df, { index: true });
    expect(h.iat(0)).not.toBe(h.iat(1));
  });

  it("handles null values in rows", () => {
    const df = DataFrame.fromColumns({ a: [null, null] });
    const h = hashPandasObject(df, { index: false });
    expect(h.iat(0)).toBe(h.iat(1));
  });

  it("handles empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const h = hashPandasObject(df);
    expect(h.index.size).toBe(0);
  });

  it("column order matters", () => {
    // { a:[1], b:[2] } ≠ { b:[2], a:[1] } — different column order → different row hashes
    const df1 = DataFrame.fromColumns({ a: [1], b: [2] });
    const df2 = DataFrame.fromColumns({ b: [2], a: [1] });
    const h1 = hashPandasObject(df1, { index: false });
    const h2 = hashPandasObject(df2, { index: false });
    // Column order is reflected in the hash
    expect(h1.iat(0)).not.toBe(h2.iat(0));
  });

  it("property: deterministic for DataFrames", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ a: fc.integer(), b: fc.string() }), { minLength: 1, maxLength: 10 }),
        (rows) => {
          const aVals = rows.map((r) => r.a);
          const bVals = rows.map((r) => r.b);
          const df1 = DataFrame.fromColumns({ a: aVals, b: bVals });
          const df2 = DataFrame.fromColumns({ a: aVals, b: bVals });
          const h1 = hashPandasObject(df1, { index: false });
          const h2 = hashPandasObject(df2, { index: false });
          for (let i = 0; i < rows.length; i++) {
            if (h1.iat(i) !== h2.iat(i)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
