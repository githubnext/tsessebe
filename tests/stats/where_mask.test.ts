/**
 * Tests for src/stats/where_mask.ts — seriesWhere, seriesMask, dataFrameWhere, dataFrameMask.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  dataFrameMask,
  dataFrameWhere,
  seriesMask,
  seriesWhere,
} from "../../src/stats/where_mask.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function sv(series: Series<Scalar>): readonly Scalar[] {
  return series.values;
}

// ─── seriesWhere — boolean array cond ─────────────────────────────────────────

describe("seriesWhere — boolean array", () => {
  it("keeps values where cond=true, replaces with null where false", () => {
    const result = seriesWhere(s([1, 2, 3, 4, 5]), [true, false, true, false, true]);
    expect(sv(result)).toEqual([1, null, 3, null, 5]);
  });

  it("keeps all values when cond is all-true", () => {
    const result = seriesWhere(s([10, 20, 30]), [true, true, true]);
    expect(sv(result)).toEqual([10, 20, 30]);
  });

  it("replaces all values when cond is all-false", () => {
    const result = seriesWhere(s([1, 2, 3]), [false, false, false]);
    expect(sv(result)).toEqual([null, null, null]);
  });

  it("uses custom other value", () => {
    const result = seriesWhere(s([1, 2, 3]), [true, false, true], { other: -99 });
    expect(sv(result)).toEqual([1, -99, 3]);
  });

  it("preserves null source values when cond is true", () => {
    const result = seriesWhere(s([1, null, 3]), [true, true, false]);
    expect(sv(result)).toEqual([1, null, null]);
  });

  it("preserves series name and index", () => {
    const src = new Series({ data: [1, 2, 3], name: "myCol" });
    const result = seriesWhere(src, [true, false, true]);
    expect(result.name).toBe("myCol");
    expect(result.values.length).toBe(3);
  });

  it("works with string values", () => {
    const result = seriesWhere(s(["a", "b", "c"]), [false, true, false], { other: "x" });
    expect(sv(result)).toEqual(["x", "b", "x"]);
  });

  it("works with boolean values in series", () => {
    const result = seriesWhere(s([true, false, true]), [true, false, true], { other: false });
    expect(sv(result)).toEqual([true, false, true]);
  });
});

// ─── seriesWhere — Series<boolean> cond ───────────────────────────────────────

describe("seriesWhere — Series<boolean> cond (label-aligned)", () => {
  it("aligns by label", () => {
    const src = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const cond = new Series<boolean>({ data: [false, true, false], index: ["a", "b", "c"] });
    const result = seriesWhere(src, cond);
    expect(sv(result)).toEqual([null, 2, null]);
  });

  it("treats missing label as false (replaces with other)", () => {
    const src = new Series({ data: [10, 20, 30], index: ["x", "y", "z"] });
    // cond only has "y" and "z"
    const cond = new Series<boolean>({ data: [true, true], index: ["y", "z"] });
    const result = seriesWhere(src, cond, { other: 0 });
    expect(sv(result)).toEqual([0, 20, 30]);
  });
});

// ─── seriesWhere — callable cond ──────────────────────────────────────────────

describe("seriesWhere — callable cond", () => {
  it("callable returning boolean array", () => {
    const result = seriesWhere(s([1, 2, 3, 4, 5]), (x) => x.values.map((v) => (v as number) > 3));
    expect(sv(result)).toEqual([null, null, null, 4, 5]);
  });

  it("callable returning Series<boolean>", () => {
    const src = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    const result = seriesWhere(src, (x) => {
      const bools = x.values.map((v) => (v as number) >= 20);
      return new Series<boolean>({ data: bools, index: x.index });
    });
    expect(sv(result)).toEqual([null, 20, 30]);
  });

  it("callable with other value", () => {
    const result = seriesWhere(s([5, 10, 15]), (x) => x.values.map((v) => (v as number) > 7), {
      other: -1,
    });
    expect(sv(result)).toEqual([-1, 10, 15]);
  });
});

// ─── seriesMask — basic ───────────────────────────────────────────────────────

describe("seriesMask — boolean array", () => {
  it("is inverse of seriesWhere", () => {
    const data = s([1, 2, 3, 4, 5]);
    const cond = [true, false, true, false, true];
    const where = seriesWhere(data, cond);
    const mask = seriesMask(data, cond);
    // Where: [1, null, 3, null, 5] — Mask: [null, 2, null, 4, null]
    expect(sv(where)).toEqual([1, null, 3, null, 5]);
    expect(sv(mask)).toEqual([null, 2, null, 4, null]);
  });

  it("keeps all when cond all-false", () => {
    const result = seriesMask(s([1, 2, 3]), [false, false, false]);
    expect(sv(result)).toEqual([1, 2, 3]);
  });

  it("replaces all when cond all-true", () => {
    const result = seriesMask(s([1, 2, 3]), [true, true, true]);
    expect(sv(result)).toEqual([null, null, null]);
  });

  it("uses custom other value", () => {
    const result = seriesMask(s([1, 2, 3, 4]), [false, true, false, true], { other: 999 });
    expect(sv(result)).toEqual([1, 999, 3, 999]);
  });
});

describe("seriesMask — callable cond", () => {
  it("masks values satisfying condition", () => {
    const result = seriesMask(s([1, 2, 3, 4, 5]), (x) => x.values.map((v) => (v as number) > 3), {
      other: 0,
    });
    expect(sv(result)).toEqual([1, 2, 3, 0, 0]);
  });
});

// ─── dataFrameWhere ───────────────────────────────────────────────────────────

describe("dataFrameWhere — DataFrame cond", () => {
  it("keeps values where cond=true, replaces with null elsewhere", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [true, false, true],
      b: [false, true, false],
    });
    const result = dataFrameWhere(df, cond);
    expect(result.col("a").values).toEqual([1, null, 3]);
    expect(result.col("b").values).toEqual([null, 5, null]);
  });

  it("uses custom other value", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const cond = DataFrame.fromColumns({ x: [true, false, true] });
    const result = dataFrameWhere(df, cond, { other: -1 });
    expect(result.col("x").values).toEqual([10, -1, 30]);
  });

  it("treats missing column in cond as all-false (replaces with other)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const cond = DataFrame.fromColumns({ a: [true, false] }); // missing col "b"
    const result = dataFrameWhere(df, cond, { other: 0 });
    expect(result.col("a").values).toEqual([1, 0]);
    expect(result.col("b").values).toEqual([0, 0]); // all replaced
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3] }, { index: ["r0", "r1", "r2"] });
    const cond = DataFrame.fromColumns({ v: [false, true, false] }, { index: ["r0", "r1", "r2"] });
    const result = dataFrameWhere(df, cond);
    expect(result.index.values).toEqual(["r0", "r1", "r2"]);
    expect(result.col("v").values).toEqual([null, 2, null]);
  });

  it("all-true cond returns copy of df values", () => {
    const df = DataFrame.fromColumns({ a: [7, 8, 9], b: [1, 2, 3] });
    const cond = DataFrame.fromColumns({ a: [true, true, true], b: [true, true, true] });
    const result = dataFrameWhere(df, cond);
    expect(result.col("a").values).toEqual([7, 8, 9]);
    expect(result.col("b").values).toEqual([1, 2, 3]);
  });
});

describe("dataFrameWhere — callable cond", () => {
  it("callable returning boolean DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameWhere(df, (d) => {
      const condCols: Record<string, boolean[]> = {};
      for (const c of d.columns) {
        condCols[c as string] = d.col(c as string).values.map((v) => (v as number) > 2);
      }
      return DataFrame.fromColumns(condCols);
    });
    expect(result.col("a").values).toEqual([null, null, 3]);
    expect(result.col("b").values).toEqual([4, 5, 6]);
  });
});

// ─── dataFrameMask ────────────────────────────────────────────────────────────

describe("dataFrameMask — DataFrame cond", () => {
  it("is inverse of dataFrameWhere", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const cond = DataFrame.fromColumns({
      a: [true, false, true],
      b: [false, true, false],
    });
    const rWhere = dataFrameWhere(df, cond);
    const rMask = dataFrameMask(df, cond);
    // where keeps trues, mask keeps falses — they should be complements
    expect(rWhere.col("a").values).toEqual([1, null, 3]);
    expect(rMask.col("a").values).toEqual([null, 2, null]);
    expect(rWhere.col("b").values).toEqual([null, 5, null]);
    expect(rMask.col("b").values).toEqual([4, null, 6]);
  });

  it("uses custom other value", () => {
    const df = DataFrame.fromColumns({ z: [10, 20, 30] });
    const cond = DataFrame.fromColumns({ z: [false, true, false] });
    const result = dataFrameMask(df, cond, { other: 99 });
    expect(result.col("z").values).toEqual([10, 99, 30]);
  });
});

describe("dataFrameMask — callable cond", () => {
  it("callable returning boolean DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [5, 6, 7, 8] });
    const result = dataFrameMask(
      df,
      (d) => {
        const condCols: Record<string, boolean[]> = {};
        for (const c of d.columns) {
          condCols[c as string] = d.col(c as string).values.map((v) => (v as number) % 2 === 0);
        }
        return DataFrame.fromColumns(condCols);
      },
      { other: -1 },
    );
    // mask: replaces where cond=true (even values)
    expect(result.col("a").values).toEqual([1, -1, 3, -1]);
    expect(result.col("b").values).toEqual([5, -1, 7, -1]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based: seriesWhere / seriesMask complement", () => {
  it("where + mask partition values (no overlap, full coverage)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -100, max: 100 }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (rawData, rawCond) => {
          const n = Math.min(rawData.length, rawCond.length);
          const data = rawData.slice(0, n) as Scalar[];
          const cond = rawCond.slice(0, n);

          const src = new Series<Scalar>({ data });
          const whereResult = seriesWhere(src, cond, { other: "__OTHER__" as Scalar });
          const maskResult = seriesMask(src, cond, { other: "__OTHER__" as Scalar });

          for (let i = 0; i < n; i++) {
            const wv = whereResult.values[i];
            const mv = maskResult.values[i];
            if (cond[i]) {
              // where keeps original, mask replaces
              expect(wv).toBe(data[i]);
              expect(mv).toBe("__OTHER__");
            } else {
              // where replaces, mask keeps original
              expect(wv).toBe("__OTHER__");
              expect(mv).toBe(data[i]);
            }
          }
        },
      ),
    );
  });

  it("seriesWhere with all-true cond === identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -1000, max: 1000 }), fc.constant(null)), {
          minLength: 0,
          maxLength: 30,
        }),
        (data) => {
          const src = new Series<Scalar>({ data: data as Scalar[] });
          const cond = data.map(() => true);
          const result = seriesWhere(src, cond);
          expect(result.values).toEqual(src.values);
        },
      ),
    );
  });

  it("seriesMask with all-false cond === identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -1000, max: 1000 }), fc.constant(null)), {
          minLength: 0,
          maxLength: 30,
        }),
        (data) => {
          const src = new Series<Scalar>({ data: data as Scalar[] });
          const cond = data.map(() => false);
          const result = seriesMask(src, cond);
          expect(result.values).toEqual(src.values);
        },
      ),
    );
  });
});
