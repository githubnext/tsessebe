/**
 * Validity-oracle tests for `Series.sortValues`.
 *
 * These tests are the correctness gate for the `tsb-perf-evolve` AlphaEvolve
 * program: every candidate that mutates the implementation in
 * `src/core/series.ts` must keep all of these tests green before its benchmark
 * timing is even considered.
 *
 * Behaviour is anchored to pandas' `Series.sort_values` semantics where the
 * spec is otherwise ambiguous (NaN ordering, stability, empty Series, etc.).
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { Dtype, Index, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Element-wise equality that treats two NaNs as equal. Used to assert exact
 * NaN positions in the output rather than relying on `toEqual` matcher
 * semantics, so the intent of each NaN-related assertion is explicit.
 */
function arraysEqualWithNaN<T>(actual: readonly T[], expected: readonly T[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    const a = actual[i];
    const e = expected[i];
    const aNaN = typeof a === "number" && Number.isNaN(a);
    const eNaN = typeof e === "number" && Number.isNaN(e);
    if (aNaN && eNaN) {
      continue;
    }
    if (aNaN !== eNaN) {
      return false;
    }
    if (a !== e) {
      return false;
    }
  }
  return true;
}

// ─── numeric with NaN ─────────────────────────────────────────────────────────

describe("Series.sortValues — numeric with NaN", () => {
  // Same input is reused so the tests document the relationship between the
  // four (ascending, naPosition) combinations.
  const data = [3, Number.NaN, 1, 2, Number.NaN];
  const labels = ["a", "b", "c", "d", "e"];

  it("ascending, naPosition='last' (default)", () => {
    const s = new Series<number>({ data, index: labels });
    const r = s.sortValues();
    expect(arraysEqualWithNaN(r.values, [1, 2, 3, Number.NaN, Number.NaN])).toBe(true);
    expect(r.index.toArray()).toEqual(["c", "d", "a", "b", "e"]);
  });

  it("ascending, naPosition='first'", () => {
    const s = new Series<number>({ data, index: labels });
    const r = s.sortValues(true, "first");
    expect(arraysEqualWithNaN(r.values, [Number.NaN, Number.NaN, 1, 2, 3])).toBe(true);
    expect(r.index.toArray()).toEqual(["b", "e", "c", "d", "a"]);
  });

  it("descending, naPosition='last'", () => {
    const s = new Series<number>({ data, index: labels });
    const r = s.sortValues(false, "last");
    expect(arraysEqualWithNaN(r.values, [3, 2, 1, Number.NaN, Number.NaN])).toBe(true);
    expect(r.index.toArray()).toEqual(["a", "d", "c", "b", "e"]);
  });

  it("descending, naPosition='first'", () => {
    const s = new Series<number>({ data, index: labels });
    const r = s.sortValues(false, "first");
    expect(arraysEqualWithNaN(r.values, [Number.NaN, Number.NaN, 3, 2, 1])).toBe(true);
    expect(r.index.toArray()).toEqual(["b", "e", "a", "d", "c"]);
  });

  it("preserves original indices in output (the value at position i kept its label)", () => {
    const s = new Series<number>({ data, index: labels });
    const r = s.sortValues();
    // For every output position, the value must equal s.at(label_at_that_position).
    for (let i = 0; i < r.size; i++) {
      const lbl = r.index.toArray()[i] as string;
      const out = r.values[i] as number;
      const original = s.at(lbl);
      if (Number.isNaN(out)) {
        expect(Number.isNaN(original)).toBe(true);
      } else {
        expect(out).toBe(original);
      }
    }
  });

  it("treats null and NaN identically as missing", () => {
    const s = new Series<number | null>({
      data: [3, null, 1, Number.NaN, 2],
      index: ["a", "b", "c", "d", "e"],
    });
    const r = s.sortValues();
    expect(r.values.slice(0, 3)).toEqual([1, 2, 3]);
    // The last two are both "missing" — order between them is the input order
    // (stable sort), but they must both appear at the end.
    const tail = r.values.slice(3);
    for (const v of tail) {
      expect(v === null || (typeof v === "number" && Number.isNaN(v))).toBe(true);
    }
  });
});

// ─── string ──────────────────────────────────────────────────────────────────

describe("Series.sortValues — string", () => {
  it("ascending lexicographic", () => {
    const s = new Series<string>({ data: ["banana", "apple", "cherry"] });
    expect(s.sortValues().values).toEqual(["apple", "banana", "cherry"]);
  });

  it("descending lexicographic", () => {
    const s = new Series<string>({ data: ["banana", "apple", "cherry"] });
    expect(s.sortValues(false).values).toEqual(["cherry", "banana", "apple"]);
  });

  it("places nulls last by default", () => {
    const s = new Series<string | null>({
      data: ["b", null, "a"],
      index: [10, 20, 30],
    });
    const r = s.sortValues();
    expect(r.values).toEqual(["a", "b", null]);
    expect(r.index.toArray()).toEqual([30, 10, 20]);
  });

  it("places nulls first when requested", () => {
    const s = new Series<string | null>({
      data: ["b", null, "a"],
      index: [10, 20, 30],
    });
    const r = s.sortValues(true, "first");
    expect(r.values).toEqual([null, "a", "b"]);
    expect(r.index.toArray()).toEqual([20, 30, 10]);
  });

  it("descending with nulls last", () => {
    const s = new Series<string | null>({ data: ["b", null, "a"] });
    expect(s.sortValues(false, "last").values).toEqual(["b", "a", null]);
  });
});

// ─── mixed dtype (values + missing) ───────────────────────────────────────────

describe("Series.sortValues — mixed dtype with missing", () => {
  it("numeric series with all-NaN keeps stable order", () => {
    const s = new Series<number>({
      data: [Number.NaN, Number.NaN, Number.NaN],
      index: ["a", "b", "c"],
    });
    const r = s.sortValues();
    expect(r.size).toBe(3);
    expect(r.index.toArray()).toEqual(["a", "b", "c"]);
  });

  it("numeric series with no missing values returns sorted permutation", () => {
    const s = new Series<number>({
      data: [5, -1, 0, 3.5, 2],
      index: ["a", "b", "c", "d", "e"],
    });
    const r = s.sortValues();
    expect(r.values).toEqual([-1, 0, 2, 3.5, 5]);
    expect(r.index.toArray()).toEqual(["b", "c", "e", "d", "a"]);
  });

  it("integer dtype is preserved across sort", () => {
    const s = new Series<number>({ data: [3, 1, 2], dtype: Dtype.int64 });
    expect(s.sortValues().dtype).toBe(Dtype.int64);
  });
});

// ─── empty Series ─────────────────────────────────────────────────────────────

describe("Series.sortValues — empty Series", () => {
  it("returns an empty Series with the same dtype and name", () => {
    const s = new Series<number>({
      data: [],
      name: "price",
      dtype: Dtype.float64,
    });
    const r = s.sortValues();
    expect(r.size).toBe(0);
    expect(r.values).toEqual([]);
    expect(r.dtype).toBe(Dtype.float64);
    expect(r.name).toBe("price");
  });

  it("works with descending and naPosition options on an empty Series", () => {
    const s = new Series<string>({ data: [], name: null });
    expect(s.sortValues(false, "first").size).toBe(0);
    expect(s.sortValues(false, "last").size).toBe(0);
    expect(s.sortValues(true, "first").size).toBe(0);
  });
});

// ─── index alignment invariant ────────────────────────────────────────────────

describe("Series.sortValues — index alignment", () => {
  it("output index at every position is the *originating* row's label", () => {
    // Build a series whose labels are unrelated to positions so we can detect a
    // candidate that confuses "the sorted index array" with the originating
    // row's index.
    const s = new Series<number>({
      data: [40, 10, 30, 20],
      index: ["w", "x", "y", "z"],
    });
    const r = s.sortValues();
    // Sorted values are [10, 20, 30, 40]; the labels that originally held those
    // values are ["x", "z", "y", "w"].
    expect(r.values).toEqual([10, 20, 30, 40]);
    expect(r.index.toArray()).toEqual(["x", "z", "y", "w"]);
  });

  it("works with non-string (numeric) labels", () => {
    const s = new Series<number>({
      data: [3, 1, 2],
      index: new Index<number>([100, 200, 300]),
    });
    const r = s.sortValues();
    expect(r.values).toEqual([1, 2, 3]);
    expect(r.index.toArray()).toEqual([200, 300, 100]);
  });

  it("preserves the Series name", () => {
    const s = new Series<number>({ data: [3, 1, 2], name: "metric" });
    expect(s.sortValues().name).toBe("metric");
    expect(s.sortValues(false).name).toBe("metric");
  });

  it("does not mutate the input Series", () => {
    const data = [3, 1, 2];
    const s = new Series<number>({ data, index: ["a", "b", "c"] });
    const before = [...s.values];
    const beforeIdx = s.index.toArray();
    s.sortValues();
    expect([...s.values]).toEqual(before);
    expect(s.index.toArray()).toEqual(beforeIdx);
  });
});

// ─── public signature ─────────────────────────────────────────────────────────

describe("Series.sortValues — public signature", () => {
  it("ascending defaults to true and naPosition defaults to 'last'", () => {
    const s = new Series<number | null>({ data: [2, null, 1] });
    const a = s.sortValues();
    const b = s.sortValues(true);
    const c = s.sortValues(true, "last");
    expect(a.values).toEqual(b.values);
    expect(b.values).toEqual(c.values);
  });

  it("returns a Series<T> (compile-time check via type assertion)", () => {
    const s = new Series<number>({ data: [1, 2, 3] });
    // The next line is a compile-time check: if the signature changes the
    // assigned type would mismatch and `tsc --noEmit` would fail.
    const r: Series<number> = s.sortValues();
    expect(r.values).toEqual([1, 2, 3]);

    const ss = new Series<string>({ data: ["b", "a"] });
    const rs: Series<string> = ss.sortValues();
    expect(rs.values).toEqual(["a", "b"]);
  });
});

// ─── property-based checks ────────────────────────────────────────────────────

describe("Series.sortValues — property checks", () => {
  it("output length equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const s = new Series<number>({ data: arr });
        expect(s.sortValues().size).toBe(arr.length);
      }),
    );
  });

  it("output is a permutation of the input (numeric, no NaN)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const s = new Series<number>({ data: arr });
        const sorted = [...s.sortValues().values];
        expect(sorted.slice().sort((a, b) => a - b)).toEqual(arr.slice().sort((a, b) => a - b));
      }),
    );
  });

  it("output is non-decreasing for ascending sort (numeric, no NaN)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const s = new Series<number>({ data: arr });
        const out = s.sortValues().values;
        for (let i = 1; i < out.length; i++) {
          expect(out[i] as number).toBeGreaterThanOrEqual(out[i - 1] as number);
        }
      }),
    );
  });

  it("output is non-increasing for descending sort (numeric, no NaN)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const s = new Series<number>({ data: arr });
        const out = s.sortValues(false).values;
        for (let i = 1; i < out.length; i++) {
          expect(out[i] as number).toBeLessThanOrEqual(out[i - 1] as number);
        }
      }),
    );
  });

  it("applying sortValues twice is idempotent up to ties (the values match)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const s = new Series<number>({ data: arr });
        const once = s.sortValues();
        const twice = once.sortValues();
        expect([...twice.values]).toEqual([...once.values]);
      }),
    );
  });

  it("each output (label, value) pair is also an input (label, value) pair", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 50 }).chain((data) =>
          fc
            .uniqueArray(fc.integer({ min: 0, max: 10000 }), {
              minLength: data.length,
              maxLength: data.length,
            })
            .map((idx) => ({ data, idx })),
        ),
        ({ data, idx }) => {
          const s = new Series<number>({ data, index: idx });
          const r = s.sortValues();
          const labels = r.index.toArray();
          for (let i = 0; i < r.size; i++) {
            const lbl = labels[i] as number;
            expect(r.values[i]).toBe(s.at(lbl));
          }
        },
      ),
    );
  });

  it("sort is stable: equal values preserve original input order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 0, maxLength: 30 }),
        (arr) => {
          // Tag each element with its original position; two elements with the
          // same value must appear in the output with their original positions
          // in increasing order.
          const s = new Series<number>({ data: arr });
          const r = s.sortValues();
          const positions = r.index.toArray() as number[];
          for (let i = 1; i < r.size; i++) {
            if ((r.values[i - 1] as number) === (r.values[i] as number)) {
              expect(positions[i - 1] as number).toBeLessThan(positions[i] as number);
            }
          }
        },
      ),
    );
  });
});
