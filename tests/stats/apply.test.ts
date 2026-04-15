import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, applySeries, applymap, dataFrameApply } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── applySeries ──────────────────────────────────────────────────────────────

describe("applySeries — basic transforms", () => {
  const s = new Series({ data: [1, 2, 3, 4] as Scalar[], name: "nums" });

  test("doubles each value", () => {
    const r = applySeries(s, (v) => (v as number) * 2);
    expect([...r.values]).toEqual([2, 4, 6, 8]);
  });

  test("returns squared values", () => {
    const r = applySeries(s, (v) => (v as number) ** 2);
    expect([...r.values]).toEqual([1, 4, 9, 16]);
  });

  test("preserves original index", () => {
    const si = new Series({ data: [10, 20] as Scalar[], index: ["a", "b"] });
    const r = applySeries(si, (v) => v);
    expect([...r.index.values]).toEqual(["a", "b"]);
  });

  test("preserves name", () => {
    const r = applySeries(s, (v) => v);
    expect(r.name).toBe("nums");
  });

  test("fn receives label as second argument", () => {
    const si = new Series({ data: [1, 2, 3] as Scalar[], index: ["x", "y", "z"] });
    const labels: unknown[] = [];
    applySeries(si, (v, lbl) => {
      labels.push(lbl);
      return v;
    });
    expect(labels).toEqual(["x", "y", "z"]);
  });

  test("passes through null unchanged when fn returns it", () => {
    const sn = new Series({ data: [1, null, 3] as Scalar[] });
    const r = applySeries(sn, (v) => (v === null ? null : (v as number) + 10));
    expect([...r.values]).toEqual([11, null, 13]);
  });

  test("empty series returns empty series", () => {
    const se = new Series({ data: [] as Scalar[] });
    const r = applySeries(se, (v) => v);
    expect(r.size).toBe(0);
  });

  test("can map to strings", () => {
    const r = applySeries(s, (v) => `val=${v as number}`);
    expect([...r.values]).toEqual(["val=1", "val=2", "val=3", "val=4"]);
  });

  test("identity fn is a no-op", () => {
    const r = applySeries(s, (v) => v);
    expect([...r.values]).toEqual([...s.values]);
  });
});

describe("applySeries — property-based", () => {
  test("output length equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { maxLength: 50 }), (data) => {
        const s = new Series({ data: data as Scalar[] });
        const r = applySeries(s, (v) => (v as number) * 3);
        return r.size === s.size;
      }),
    );
  });

  test("identity preserves all values", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { maxLength: 40 }), (data) => {
        const s = new Series({ data: data as Scalar[] });
        const r = applySeries(s, (v) => v);
        return r.values.every((v, i) => v === s.values[i]);
      }),
    );
  });
});

// ─── applymap ─────────────────────────────────────────────────────────────────

describe("applymap — basic transforms", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[], b: [4, 5, 6] as Scalar[] });

  test("doubles every cell", () => {
    const r = applymap(df, (v) => (v as number) * 2);
    expect([...r.col("a").values]).toEqual([2, 4, 6]);
    expect([...r.col("b").values]).toEqual([8, 10, 12]);
  });

  test("preserves shape", () => {
    const r = applymap(df, (v) => v);
    expect(r.shape).toEqual([3, 2]);
  });

  test("preserves column names", () => {
    const r = applymap(df, (v) => v);
    expect([...r.columns.values]).toEqual(["a", "b"]);
  });

  test("preserves row index", () => {
    const dfi = DataFrame.fromColumns({ x: [1, 2] as Scalar[] }, { index: ["r0", "r1"] });
    const r = applymap(dfi, (v) => v);
    expect([...r.index.values]).toEqual(["r0", "r1"]);
  });

  test("fn receives colName as second argument", () => {
    const seen: string[] = [];
    applymap(df, (v, name) => {
      if (!seen.includes(name)) {
        seen.push(name);
      }
      return v;
    });
    expect(seen.sort()).toEqual(["a", "b"]);
  });

  test("can use colName in transform", () => {
    const r = applymap(df, (v, col) => `${col}:${v as number}`);
    expect(r.col("a").values[0]).toBe("a:1");
    expect(r.col("b").values[1]).toBe("b:5");
  });

  test("handles nulls: fn decides behaviour", () => {
    const dfn = DataFrame.fromColumns({ a: [1, null, 3] as Scalar[] });
    const r = applymap(dfn, (v) => (v === null ? 0 : v));
    expect([...r.col("a").values]).toEqual([1, 0, 3]);
  });

  test("empty DataFrame returns empty DataFrame", () => {
    const empty = DataFrame.fromColumns({ a: [] as Scalar[] });
    const r = applymap(empty, (v) => v);
    expect(r.shape).toEqual([0, 1]);
  });
});

describe("applymap — property-based", () => {
  test("cell count equals rows × cols", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 2 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (rows) => {
          const df = DataFrame.fromRecords(
            rows.map((r) => ({ c0: r[0] as number, c1: r[1] as number })),
          );
          const result = applymap(df, (v) => (v as number) + 1);
          return result.shape[0] === df.shape[0] && result.shape[1] === df.shape[1];
        },
      ),
    );
  });
});

// ─── dataFrameApply — axis=0 (column aggregation) ────────────────────────────

describe("dataFrameApply — axis=0 (default)", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[], b: [10, 20, 30] as Scalar[] });

  test("column sum", () => {
    const r = dataFrameApply(df, (col) => col.sum());
    expect([...r.values]).toEqual([6, 60]);
  });

  test("result is indexed by column names", () => {
    const r = dataFrameApply(df, (col) => col.sum());
    expect([...r.index.values]).toEqual(["a", "b"]);
  });

  test("column mean", () => {
    const r = dataFrameApply(df, (col) => col.mean());
    expect([...r.values]).toEqual([2, 20]);
  });

  test("column max", () => {
    const r = dataFrameApply(df, (col) => col.max());
    expect([...r.values]).toEqual([3, 30]);
  });

  test("column min", () => {
    const r = dataFrameApply(df, (col) => col.min());
    expect([...r.values]).toEqual([1, 10]);
  });

  test("explicit axis=0 matches default", () => {
    const r0 = dataFrameApply(df, (col) => col.sum(), { axis: 0 });
    const rDefault = dataFrameApply(df, (col) => col.sum());
    expect([...r0.values]).toEqual([...rDefault.values]);
  });

  test("explicit axis='index' matches default", () => {
    const ri = dataFrameApply(df, (col) => col.sum(), { axis: "index" });
    const rDefault = dataFrameApply(df, (col) => col.sum());
    expect([...ri.values]).toEqual([...rDefault.values]);
  });

  test("single column DataFrame", () => {
    const single = DataFrame.fromColumns({ x: [5, 10, 15] as Scalar[] });
    const r = dataFrameApply(single, (col) => col.sum());
    expect(r.size).toBe(1);
    expect(r.values[0]).toBe(30);
  });
});

// ─── dataFrameApply — axis=1 (row aggregation) ───────────────────────────────

describe("dataFrameApply — axis=1", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[], b: [10, 20, 30] as Scalar[] });

  test("row sum", () => {
    const r = dataFrameApply(df, (row) => row.sum(), { axis: 1 });
    expect([...r.values]).toEqual([11, 22, 33]);
  });

  test("result length equals number of rows", () => {
    const r = dataFrameApply(df, (row) => row.sum(), { axis: 1 });
    expect(r.size).toBe(3);
  });

  test("result is indexed by row labels", () => {
    const dfi = DataFrame.fromColumns(
      { a: [1, 2] as Scalar[], b: [3, 4] as Scalar[] },
      { index: ["r0", "r1"] },
    );
    const r = dataFrameApply(dfi, (row) => row.sum(), { axis: 1 });
    expect([...r.index.values]).toEqual(["r0", "r1"]);
  });

  test("row fn receives Series with column-name index", () => {
    const colsSeen: string[][] = [];
    dataFrameApply(
      df,
      (row) => {
        colsSeen.push([...row.index.values] as string[]);
        return 0;
      },
      { axis: 1 },
    );
    for (const cols of colsSeen) {
      expect(cols).toEqual(["a", "b"]);
    }
  });

  test("axis='columns' matches axis=1", () => {
    const r1 = dataFrameApply(df, (row) => row.sum(), { axis: 1 });
    const rCols = dataFrameApply(df, (row) => row.sum(), { axis: "columns" });
    expect([...r1.values]).toEqual([...rCols.values]);
  });

  test("row mean", () => {
    const r = dataFrameApply(df, (row) => row.mean(), { axis: 1 });
    expect([...r.values]).toEqual([5.5, 11, 16.5]);
  });

  test("single row DataFrame", () => {
    const single = DataFrame.fromColumns({ a: [7] as Scalar[], b: [3] as Scalar[] });
    const r = dataFrameApply(single, (row) => row.sum(), { axis: 1 });
    expect(r.size).toBe(1);
    expect(r.values[0]).toBe(10);
  });

  test("empty DataFrame returns empty series for axis=1", () => {
    const empty = DataFrame.fromColumns({ a: [] as Scalar[], b: [] as Scalar[] });
    const r = dataFrameApply(empty, (row) => row.sum(), { axis: 1 });
    expect(r.size).toBe(0);
  });
});

// ─── property-based: dataFrameApply ──────────────────────────────────────────

describe("dataFrameApply — property-based", () => {
  test("axis=0 result size equals number of columns", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (vals, nRows) => {
          const colData: Record<string, Scalar[]> = {};
          for (let i = 0; i < vals.length; i++) {
            colData[`c${i}`] = new Array<Scalar>(nRows).fill(vals[i] as Scalar);
          }
          const df = DataFrame.fromColumns(colData);
          const r = dataFrameApply(df, (col) => col.sum());
          return r.size === vals.length;
        },
      ),
    );
  });

  test("axis=1 result size equals number of rows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const df = DataFrame.fromColumns({ a: data as Scalar[], b: data as Scalar[] });
          const r = dataFrameApply(df, (row) => row.sum(), { axis: 1 });
          return r.size === data.length;
        },
      ),
    );
  });

  test("applySeries then applymap produce consistent transforms", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 50 }), { maxLength: 30 }), (data) => {
        const s = new Series({ data: data as Scalar[] });
        const doubled = applySeries(s, (v) => (v as number) * 2);
        return doubled.values.every((v, i) => v === (s.values[i] as number) * 2);
      }),
    );
  });
});
