/**
 * Alignment and binary operations for Series and DataFrame.
 *
 * Mirrors pandas' index-alignment semantics: when two labeled objects are
 * combined, their labels are first aligned (union by default), and missing
 * values are filled with `null` before the operation is applied element-wise.
 *
 * **Design note**: this module imports `Series` and `DataFrame` (one-way
 * dependency only).  Neither `series.ts` nor `frame.ts` imports from here,
 * so there is no circular dependency.
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** How to join two indexes when aligning. */
export type AlignJoin = "outer" | "inner" | "left" | "right";

/** The result of aligning two Series to a common index. */
export interface SeriesAlignResult {
  readonly left: Series<Scalar>;
  readonly right: Series<Scalar>;
  readonly index: Index<Label>;
}

/** The result of aligning two DataFrames. */
export interface DataFrameAlignResult {
  readonly left: DataFrame;
  readonly right: DataFrame;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Build a label → value map for fast reindex. */
function buildLabelValueMap(s: Series<Scalar>): Map<Label, Scalar> {
  const map = new Map<Label, Scalar>();
  const labels = s.index.values;
  const vals = s.values;
  for (let i = 0; i < labels.length; i++) {
    const lbl = labels[i] as Label;
    if (!map.has(lbl)) {
      map.set(lbl, vals[i] as Scalar);
    }
  }
  return map;
}

/** Reindex a Series to `targetIndex`, filling absent labels with `null`. */
function reindexSeries(s: Series<Scalar>, targetIndex: Index<Label>): Series<Scalar> {
  const map = buildLabelValueMap(s);
  const data: Scalar[] = targetIndex.values.map((lbl) => {
    const v = map.get(lbl);
    return v !== undefined ? v : null;
  });
  return new Series<Scalar>({ data, index: targetIndex, dtype: Dtype.inferFrom(data) });
}

/** Compute the merged index based on `join` strategy. */
function mergeIndexes(left: Index<Label>, right: Index<Label>, join: AlignJoin): Index<Label> {
  switch (join) {
    case "outer":
      return left.union(right) as Index<Label>;
    case "inner":
      return left.intersection(right) as Index<Label>;
    case "left":
      return left;
    default:
      return right;
  }
}

/** True when a scalar should be treated as missing. */
function isMissingVal(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── Series alignment ─────────────────────────────────────────────────────────

/**
 * Align two Series to a common index, filling missing labels with `null`.
 *
 * Mirrors `pandas.Series.align()`.
 *
 * @param left  - First Series.
 * @param right - Second Series.
 * @param join  - How to combine the indexes (default `"outer"`).
 *
 * @example
 * ```ts
 * import { Index } from "tsb";
 * const a = new Series({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
 * const b = new Series({ data: [10, 30], index: new Index(["a", "c"]) });
 * const { left, right } = alignSeries(a, b);
 * // left.values  → [1, 2, 3]
 * // right.values → [10, null, 30]
 * ```
 */
export function alignSeries(
  left: Series<Scalar>,
  right: Series<Scalar>,
  join: AlignJoin = "outer",
): SeriesAlignResult {
  const idx = mergeIndexes(left.index, right.index, join);
  return {
    left: reindexSeries(left, idx),
    right: reindexSeries(right, idx),
    index: idx,
  };
}

/**
 * Apply a binary numeric function to two Series after aligning them on their
 * index.  Missing values on either side produce `NaN` in the result (unless
 * `fillValue` is provided).
 *
 * @param left      - Left operand.
 * @param right     - Right operand.
 * @param fn        - Function applied element-wise.
 * @param join      - Index join strategy (default `"outer"`).
 * @param fillValue - Substitute for missing values before applying `fn`.
 *                    Defaults to `null` (propagate as `NaN`).
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
 * const b = new Series({ data: [10, 30], index: new Index(["a", "c"]) });
 * alignedBinaryOp(a, b, (x, y) => x + y).values;
 * // → [11, NaN, 33]
 * ```
 */
export function alignedBinaryOp(
  left: Series<Scalar>,
  right: Series<Scalar>,
  fn: (a: number, b: number) => number,
  join: AlignJoin = "outer",
  fillValue: number | null = null,
): Series<number> {
  const { left: la, right: ra, index } = alignSeries(left, right, join);
  const lv = la.values;
  const rv = ra.values;
  const data: number[] = lv.map((l, i) => {
    const r = rv[i] as Scalar;
    const a = isMissingVal(l) ? fillValue : (l as unknown as number);
    const b = isMissingVal(r) ? fillValue : (r as unknown as number);
    if (a === null || b === null) {
      return Number.NaN;
    }
    return fn(a, b);
  });
  return new Series<number>({ data, index, dtype: Dtype.float64 });
}

// ─── DataFrame alignment ──────────────────────────────────────────────────────

/** Reindex a DataFrame row-axis and column-axis, filling missing cells with `null`. */
function reindexDataFrame(
  df: DataFrame,
  rowIndex: Index<Label>,
  colIndex: Index<Label>,
): DataFrame {
  const cols: Record<string, readonly Scalar[]> = {};
  const rowLabels = rowIndex.values;
  for (const colLabel of colIndex.values) {
    const colName = String(colLabel);
    const data: Scalar[] = rowLabels.map(() => null as Scalar);
    if (df.columns.contains(colLabel)) {
      const src = df.col(colName);
      const map = buildLabelValueMap(src);
      for (let i = 0; i < rowLabels.length; i++) {
        const lbl = rowLabels[i] as Label;
        const v = map.get(lbl);
        data[i] = v !== undefined ? v : null;
      }
    }
    cols[colName] = data;
  }
  return DataFrame.fromColumns(cols, { index: rowIndex });
}

/**
 * Align two DataFrames on both row and column axes.
 *
 * Mirrors `pandas.DataFrame.align()`.
 *
 * @param left  - First DataFrame.
 * @param right - Second DataFrame.
 * @param join  - How to combine the indexes (default `"outer"`).
 *
 * @example
 * ```ts
 * const a = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
 * const b = DataFrame.fromColumns({ y: [10, 20], z: [30, 40] });
 * const { left, right } = alignDataFrames(a, b);
 * // left has columns x, y, z (x filled with null for right)
 * ```
 */
export function alignDataFrames(
  left: DataFrame,
  right: DataFrame,
  join: AlignJoin = "outer",
): DataFrameAlignResult {
  const rowIdx = mergeIndexes(left.index, right.index, join);
  const colIdx = mergeIndexes(left.columns, right.columns, join);
  return {
    left: reindexDataFrame(left, rowIdx, colIdx),
    right: reindexDataFrame(right, rowIdx, colIdx),
  };
}

/**
 * Apply a binary numeric function to two DataFrames element-wise, after
 * aligning them on both row and column axes.
 *
 * @param left      - Left operand.
 * @param right     - Right operand.
 * @param fn        - Function applied to each cell pair.
 * @param join      - Index join strategy (default `"outer"`).
 * @param fillValue - Substitute for missing cells.  Defaults to `null`
 *                    (propagate as `null`).
 *
 * @example
 * ```ts
 * const a = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
 * const b = DataFrame.fromColumns({ x: [10, 20] });
 * alignedDataFrameBinaryOp(a, b, (p, q) => p + q).toRecords();
 * // [{ x: 11, y: null }, { x: 22, y: null }]
 * ```
 */
export function alignedDataFrameBinaryOp(
  left: DataFrame,
  right: DataFrame,
  fn: (a: number, b: number) => number,
  join: AlignJoin = "outer",
  fillValue: number | null = null,
): DataFrame {
  const { left: la, right: ra } = alignDataFrames(left, right, join);
  const cols: Record<string, readonly Scalar[]> = {};
  for (const colLabel of la.columns.values) {
    const colName = String(colLabel);
    const lSeries = la.col(colName);
    const rSeries = ra.col(colName);
    const data: Scalar[] = lSeries.values.map((l, i) => {
      const r = rSeries.values[i] as Scalar;
      const a = isMissingVal(l) ? fillValue : (l as unknown as number);
      const b = isMissingVal(r) ? fillValue : (r as unknown as number);
      if (a === null || b === null) {
        return null;
      }
      return fn(a, b);
    });
    cols[colName] = data;
  }
  return DataFrame.fromColumns(cols, { index: la.index });
}
