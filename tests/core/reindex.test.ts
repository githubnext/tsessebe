import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { DataFrame } from "../../src/core/frame.ts";
import { reindexDataFrame, reindexSeries } from "../../src/core/reindex.ts";
import { Series } from "../../src/core/series.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNumericSeries(data: number[], labels: string[], name?: string): Series<Scalar> {
  return new Series<Scalar>({
    data,
    index: new Index<string>(labels),
    name: name ?? null,
  });
}

// ─── reindexSeries — no fill method ───────────────────────────────────────────

describe("reindexSeries — no method", () => {
  const s = makeNumericSeries([10, 20, 30], ["a", "b", "c"]);

  it("same labels in same order → identical series", () => {
    const r = reindexSeries(s, ["a", "b", "c"]);
    expect(r.toArray()).toEqual([10, 20, 30]);
    expect(r.index.toArray()).toEqual(["a", "b", "c"]);
  });

  it("subset of labels → selects only those", () => {
    const r = reindexSeries(s, ["b", "c"]);
    expect(r.toArray()).toEqual([20, 30]);
  });

  it("label absent in original → null by default", () => {
    const r = reindexSeries(s, ["a", "d", "c"]);
    expect(r.toArray()).toEqual([10, null, 30]);
  });

  it("label absent in original → fillValue when provided", () => {
    const r = reindexSeries(s, ["a", "d", "c"], { fillValue: 0 });
    expect(r.toArray()).toEqual([10, 0, 30]);
  });

  it("empty new index → empty series", () => {
    const r = reindexSeries(s, []);
    expect(r.length).toBe(0);
  });

  it("longer new index with all missing → all fillValue", () => {
    const r = reindexSeries(s, ["x", "y", "z"], { fillValue: -1 });
    expect(r.toArray()).toEqual([-1, -1, -1]);
  });

  it("reorder labels", () => {
    const r = reindexSeries(s, ["c", "a", "b"]);
    expect(r.toArray()).toEqual([30, 10, 20]);
  });

  it("preserves series name", () => {
    const named = makeNumericSeries([1, 2], ["x", "y"], "my_series");
    const r = reindexSeries(named, ["x", "y"]);
    expect(r.name).toBe("my_series");
  });

  it("accepts Index<Label> as newIndex", () => {
    const idx = new Index<string>(["b", "a"]);
    const r = reindexSeries(s, idx);
    expect(r.toArray()).toEqual([20, 10]);
  });

  it("duplicate labels in new index → repeated values", () => {
    const r = reindexSeries(s, ["a", "a", "b"]);
    expect(r.toArray()).toEqual([10, 10, 20]);
  });
});

// ─── reindexSeries — ffill ────────────────────────────────────────────────────

describe("reindexSeries — method=ffill", () => {
  it("no missing values → no change", () => {
    const s = makeNumericSeries([1, 2, 3], ["a", "b", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "ffill" });
    expect(r.toArray()).toEqual([1, 2, 3]);
  });

  it("trailing missing → forward filled", () => {
    const s = makeNumericSeries([1, 2], ["a", "b"]);
    const r = reindexSeries(s, ["a", "b", "c", "d"], { method: "ffill" });
    expect(r.toArray()).toEqual([1, 2, 2, 2]);
  });

  it("leading missing not filled (no prior value)", () => {
    const s = makeNumericSeries([10, 20], ["b", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "ffill" });
    expect(r.toArray()).toEqual([null, 10, 20]);
  });

  it("interleaved missing filled from left", () => {
    const s = makeNumericSeries([1, 3], ["a", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "ffill" });
    expect(r.toArray()).toEqual([1, 1, 3]);
  });

  it("pad is alias for ffill", () => {
    const s = makeNumericSeries([5, 6], ["a", "b"]);
    const rFfill = reindexSeries(s, ["a", "b", "c"], { method: "ffill" });
    const rPad = reindexSeries(s, ["a", "b", "c"], { method: "pad" });
    expect(rFfill.toArray()).toEqual(rPad.toArray());
  });

  it("limit=1 stops after one consecutive fill", () => {
    const s = makeNumericSeries([1, 5], ["a", "e"]);
    const r = reindexSeries(s, ["a", "b", "c", "d", "e"], { method: "ffill", limit: 1 });
    // a→1, b→1 (1 fill), c→null (limit exceeded), d→null, e→5
    expect(r.toArray()).toEqual([1, 1, null, null, 5]);
  });
});

// ─── reindexSeries — bfill ────────────────────────────────────────────────────

describe("reindexSeries — method=bfill", () => {
  it("leading missing → backward filled", () => {
    const s = makeNumericSeries([10, 20], ["b", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "bfill" });
    expect(r.toArray()).toEqual([10, 10, 20]);
  });

  it("trailing missing not filled (no next value)", () => {
    const s = makeNumericSeries([1, 2], ["a", "b"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "bfill" });
    expect(r.toArray()).toEqual([1, 2, null]);
  });

  it("interleaved missing filled from right", () => {
    const s = makeNumericSeries([1, 3], ["a", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "bfill" });
    expect(r.toArray()).toEqual([1, 3, 3]);
  });

  it("backfill is alias for bfill", () => {
    const s = makeNumericSeries([5, 6], ["b", "c"]);
    const rBfill = reindexSeries(s, ["a", "b", "c"], { method: "bfill" });
    const rBackfill = reindexSeries(s, ["a", "b", "c"], { method: "backfill" });
    expect(rBfill.toArray()).toEqual(rBackfill.toArray());
  });

  it("limit=1 stops after one consecutive back-fill", () => {
    const s = makeNumericSeries([1, 5], ["a", "e"]);
    const r = reindexSeries(s, ["a", "b", "c", "d", "e"], { method: "bfill", limit: 1 });
    // a→1, b→null (bfill: e fills d, then stops), c→null, d→5 (1 fill), e→5
    expect(r.toArray()).toEqual([1, null, null, 5, 5]);
  });
});

// ─── reindexSeries — nearest ──────────────────────────────────────────────────

describe("reindexSeries — method=nearest", () => {
  it("equidistant → prefer right (forward) value", () => {
    const s = makeNumericSeries([1, 3], ["a", "c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "nearest" });
    // "b" is equidistant from "a"(1) and "c"(3) — prefer right → 3
    expect(r.toArray()).toEqual([1, 3, 3]);
  });

  it("closer to left → use left value", () => {
    const s = makeNumericSeries([10, 40], ["a", "d"]);
    // a b c d — "b" is 1 from a, 2 from d → use a=10
    // "c" is 2 from a, 1 from d → use d=40
    const r = reindexSeries(s, ["a", "b", "c", "d"], { method: "nearest" });
    expect(r.toArray()).toEqual([10, 10, 40, 40]);
  });

  it("only one side available → use that side", () => {
    const s = makeNumericSeries([99], ["c"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "nearest" });
    expect(r.toArray()).toEqual([99, 99, 99]);
  });

  it("all missing → all null", () => {
    const s = makeNumericSeries([1, 2], ["x", "y"]);
    const r = reindexSeries(s, ["a", "b", "c"], { method: "nearest" });
    expect(r.toArray()).toEqual([null, null, null]);
  });
});

// ─── reindexDataFrame — rows ──────────────────────────────────────────────────

describe("reindexDataFrame — row reindex", () => {
  const df = DataFrame.fromColumns({
    a: [1, 2, 3],
    b: [4, 5, 6],
  });

  it("same index → identical data", () => {
    const r = reindexDataFrame(df, { index: [0, 1, 2] });
    expect(r.col("a").toArray()).toEqual([1, 2, 3]);
    expect(r.col("b").toArray()).toEqual([4, 5, 6]);
  });

  it("add new rows → filled with null", () => {
    const r = reindexDataFrame(df, { index: [0, 1, 2, 3] });
    expect(r.col("a").toArray()).toEqual([1, 2, 3, null]);
    expect(r.col("b").toArray()).toEqual([4, 5, 6, null]);
    expect(r.shape).toEqual([4, 2]);
  });

  it("drop rows → subset", () => {
    const r = reindexDataFrame(df, { index: [1, 2] });
    expect(r.col("a").toArray()).toEqual([2, 3]);
    expect(r.shape).toEqual([2, 2]);
  });

  it("custom fillValue for new rows", () => {
    const r = reindexDataFrame(df, { index: [0, 1, 2, 3], fillValue: -1 });
    expect(r.col("a").toArray()).toEqual([1, 2, 3, -1]);
  });

  it("row ffill applied to each column independently", () => {
    const r = reindexDataFrame(df, { index: [0, 1, 2, 3, 4], method: "ffill" });
    expect(r.col("a").toArray()).toEqual([1, 2, 3, 3, 3]);
    expect(r.col("b").toArray()).toEqual([4, 5, 6, 6, 6]);
  });

  it("string index", () => {
    const df2 = DataFrame.fromColumns(
      { x: [10, 20], y: [30, 40] },
      { index: new Index<string>(["p", "q"]) },
    );
    const r = reindexDataFrame(df2, {
      index: new Index<string>(["p", "q", "r"]),
      fillValue: 0,
    });
    expect(r.col("x").toArray()).toEqual([10, 20, 0]);
  });
});

// ─── reindexDataFrame — columns ───────────────────────────────────────────────

describe("reindexDataFrame — column reindex", () => {
  const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });

  it("same columns in same order → identical", () => {
    const r = reindexDataFrame(df, { columns: ["a", "b"] });
    expect(r.columns.toArray()).toEqual(["a", "b"]);
    expect(r.col("a").toArray()).toEqual([1, 2]);
  });

  it("reorder columns", () => {
    const r = reindexDataFrame(df, { columns: ["b", "a"] });
    expect(r.columns.toArray()).toEqual(["b", "a"]);
    expect(r.col("b").toArray()).toEqual([3, 4]);
    expect(r.col("a").toArray()).toEqual([1, 2]);
  });

  it("add new column → filled with null", () => {
    const r = reindexDataFrame(df, { columns: ["a", "b", "c"] });
    expect(r.columns.toArray()).toEqual(["a", "b", "c"]);
    expect(r.col("c").toArray()).toEqual([null, null]);
  });

  it("add new column → filled with fillValue", () => {
    const r = reindexDataFrame(df, { columns: ["a", "b", "c"], fillValue: 0 });
    expect(r.col("c").toArray()).toEqual([0, 0]);
  });

  it("drop column", () => {
    const r = reindexDataFrame(df, { columns: ["a"] });
    expect(r.columns.toArray()).toEqual(["a"]);
    expect(r.shape[1]).toBe(1);
  });
});

// ─── reindexDataFrame — both index and columns ────────────────────────────────

describe("reindexDataFrame — both index and columns", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });

  it("extend rows and columns simultaneously", () => {
    const r = reindexDataFrame(df, {
      index: [0, 1, 2, 3],
      columns: ["a", "b", "c"],
      fillValue: 0,
    });
    expect(r.shape).toEqual([4, 3]);
    expect(r.col("c").toArray()).toEqual([0, 0, 0, 0]);
    expect(r.col("a").toArray()).toEqual([1, 2, 3, 0]);
  });

  it("shrink rows and expand columns", () => {
    const r = reindexDataFrame(df, {
      index: [0, 2],
      columns: ["a", "b", "c"],
      fillValue: -1,
    });
    expect(r.shape).toEqual([2, 3]);
    expect(r.col("a").toArray()).toEqual([1, 3]);
    expect(r.col("c").toArray()).toEqual([-1, -1]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("reindexSeries — property tests", () => {
  it("values present in original are preserved exactly", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 4 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data, labels) => {
          const _trimmed = data.slice(0, labels.length);
          const uniqueLabels = [...new Set(labels)];
          if (uniqueLabels.length === 0) {
            return true;
          }
          const dataForUnique = uniqueLabels.map((_, i) => i);
          const s = makeNumericSeries(dataForUnique, uniqueLabels);
          // reindex with same labels → all values preserved
          const r = reindexSeries(s, uniqueLabels);
          const orig = s.toArray();
          const res = r.toArray();
          for (let i = 0; i < uniqueLabels.length; i++) {
            if (orig[i] !== res[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("reindex with subset of labels returns correct values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 10 }),
        (data) => {
          const labels = data.map((_, i) => `k${i}`);
          const s = makeNumericSeries(data, labels);
          const subset = labels.filter((_, i) => i % 2 === 0);
          const r = reindexSeries(s, subset);
          return (
            r.length === subset.length &&
            subset.every((lbl, i) => {
              const origPos = labels.indexOf(lbl);
              return r.toArray()[i] === data[origPos];
            })
          );
        },
      ),
    );
  });

  it("ffill produces no leading missing values from an existing value", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 3 }), { minLength: 3, maxLength: 12 }),
        (data, allLabels) => {
          // Ensure srcLabels matches data length (allLabels may be shorter than data)
          const srcLen = Math.min(data.length, allLabels.length);
          if (srcLen === 0) {
            return true;
          }
          const srcData = data.slice(0, srcLen);
          const srcLabels = allLabels.slice(0, srcLen);
          const s = makeNumericSeries(srcData, srcLabels);
          const r = reindexSeries(s, allLabels, { method: "ffill" });
          const arr = r.toArray() as (number | null)[];
          // Once we pass a non-null, all subsequent values (from ffill) must be non-null
          let seenValue = false;
          for (const v of arr) {
            if (v !== null) {
              seenValue = true;
            }
            if (seenValue && v === null) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("reindexDataFrame row count equals length of provided index", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1, maxLength: 8 }),
        (colA, newRowLabels) => {
          const df = DataFrame.fromColumns({ a: colA });
          const r = reindexDataFrame(df, { index: newRowLabels });
          return r.shape[0] === newRowLabels.length;
        },
      ),
    );
  });
});
