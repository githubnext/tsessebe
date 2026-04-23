/**
 * dot_matmul — dot product and matrix multiplication for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.dot(other)` — dot product with a Series (→ scalar) or
 *   matrix-multiply with a DataFrame (→ Series).
 * - `DataFrame.dot(other)` — matrix-multiply with a Series (→ Series) or
 *   another DataFrame (→ DataFrame).
 *
 * Index alignment is performed automatically (inner join on shared labels).
 * Missing values (`null`, `undefined`, `NaN`) are treated as `0` during
 * multiplication (same as pandas with fill_value=0 semantics for missing
 * intersection items, but NaN propagates within aligned pairs).
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build a label → position map for quick lookup.
 */
function buildLabelMap(idx: Index<Label>): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < idx.size; i++) {
    m.set(String(idx.at(i)), i);
  }
  return m;
}

/**
 * Align two arrays by shared labels (inner join on index).
 * Returns the aligned numeric values (NaN for missing scalars).
 */
function alignTwoSeries(
  a: Series<Scalar>,
  b: Series<Scalar>,
): { aVals: number[]; bVals: number[]; labels: Label[] } {
  const bMap = buildLabelMap(b.index);
  const aVals: number[] = [];
  const bVals: number[] = [];
  const labels: Label[] = [];

  for (let i = 0; i < a.index.size; i++) {
    const label = String(a.index.at(i));
    const j = bMap.get(label);
    if (j === undefined) {
      continue;
    }
    const av = a.values[i] as Scalar;
    const bv = b.values[j] as Scalar;
    aVals.push(isMissing(av) ? Number.NaN : (av as number));
    bVals.push(isMissing(bv) ? Number.NaN : (bv as number));
    labels.push(a.index.at(i));
  }
  return { aVals, bVals, labels };
}

// ─── seriesDotSeries ──────────────────────────────────────────────────────────

/**
 * Compute the dot product of two Series after aligning on their shared index.
 *
 * Mirrors the core of `pandas.Series.dot(other: Series)`.
 *
 * - Labels present in both Series participate in the sum.
 * - If either aligned value is `NaN`, the result is `NaN`.
 * - Returns `0` when there are no common labels.
 *
 * @example
 * ```ts
 * import { Series, seriesDotSeries } from "tsb";
 *
 * const a = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
 * const b = new Series({ data: [4, 5, 6], index: ["x", "y", "z"] });
 * seriesDotSeries(a, b); // 1*4 + 2*5 + 3*6 = 32
 * ```
 */
export function seriesDotSeries(a: Series<Scalar>, b: Series<Scalar>): number {
  const { aVals, bVals } = alignTwoSeries(a, b);
  let sum = 0;
  for (let i = 0; i < aVals.length; i++) {
    const av = aVals[i] as number;
    const bv = bVals[i] as number;
    if (Number.isNaN(av) || Number.isNaN(bv)) {
      return Number.NaN;
    }
    sum += av * bv;
  }
  return sum;
}

// ─── seriesDotDataFrame ────────────────────────────────────────────────────────

/**
 * Multiply a row-vector Series against a DataFrame (inner join on index ↔ row labels).
 *
 * Mirrors `pandas.Series.dot(other: DataFrame)`.
 *
 * For each column `c` of `other`, computes:
 *   `result[c] = Σ s[k] * other.loc[k, c]`  for all `k` in `s.index ∩ other.index`.
 *
 * The returned Series is indexed by the DataFrame's column names.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, seriesDotDataFrame } from "tsb";
 *
 * const s = new Series({ data: [1, 2], index: ["r0", "r1"] });
 * const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 4] });
 * // df index is [0,1]; s index is ["r0","r1"] → no overlap → [0, 0]
 * ```
 */
export function seriesDotDataFrame(s: Series<Scalar>, df: DataFrame): Series<Scalar> {
  // Build label → row index map for df
  const dfRowMap = buildLabelMap(df.index);
  const colNames = df.columns.values;

  const result: Scalar[] = new Array<Scalar>(colNames.length).fill(0);

  for (let si = 0; si < s.index.size; si++) {
    const label = String(s.index.at(si));
    const ri = dfRowMap.get(label);
    if (ri === undefined) {
      continue;
    }
    const sv = s.values[si] as Scalar;
    const svNum = isMissing(sv) ? Number.NaN : (sv as number);

    for (let ci = 0; ci < colNames.length; ci++) {
      const colSeries = df.col(colNames[ci] as string);
      const cv = colSeries.values[ri] as Scalar;
      const cvNum = isMissing(cv) ? Number.NaN : (cv as number);
      const cur = result[ci] as number;
      result[ci] =
        Number.isNaN(cur) || Number.isNaN(svNum) || Number.isNaN(cvNum)
          ? Number.NaN
          : cur + svNum * cvNum;
    }
  }

  return new Series<Scalar>({
    data: result,
    index: new Index<Label>(colNames as readonly Label[]),
    name: s.name,
  });
}

// ─── dataFrameDotSeries ────────────────────────────────────────────────────────

/**
 * Multiply a DataFrame by a column-vector Series (inner join on columns ↔ index).
 *
 * Mirrors `pandas.DataFrame.dot(other: Series)`.
 *
 * For each row `r` of `df`, computes:
 *   `result[r] = Σ df.loc[r, k] * s[k]`  for all `k` in `df.columns ∩ s.index`.
 *
 * The returned Series is indexed by the DataFrame's row index.
 *
 * @example
 * ```ts
 * import { DataFrame, Series, dataFrameDotSeries } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * const s  = new Series({ data: [1, 0], index: ["a", "b"] });
 * dataFrameDotSeries(df, s).values; // [1, 2]  (a column × 1 + b column × 0)
 * ```
 */
export function dataFrameDotSeries(df: DataFrame, s: Series<Scalar>): Series<Scalar> {
  const nRows = df.index.size;
  const colNames = df.columns.values;

  // Build column → series-index map
  const sMap = buildLabelMap(s.index);

  // Find the intersecting columns
  const sharedCols: Array<{ colName: string; sIdx: number }> = [];
  for (const colName of colNames) {
    const si = sMap.get(String(colName));
    if (si !== undefined) {
      sharedCols.push({ colName: colName as string, sIdx: si });
    }
  }

  const result: Scalar[] = new Array<Scalar>(nRows).fill(0);

  for (const { colName, sIdx } of sharedCols) {
    const col = df.col(colName);
    const sv = s.values[sIdx] as Scalar;
    const svNum = isMissing(sv) ? Number.NaN : (sv as number);

    for (let ri = 0; ri < nRows; ri++) {
      const cv = col.values[ri] as Scalar;
      const cvNum = isMissing(cv) ? Number.NaN : (cv as number);
      const cur = result[ri] as number;
      result[ri] =
        Number.isNaN(cur) || Number.isNaN(svNum) || Number.isNaN(cvNum)
          ? Number.NaN
          : cur + cvNum * svNum;
    }
  }

  return new Series<Scalar>({ data: result, index: df.index });
}

// ─── dataFrameDotDataFrame ─────────────────────────────────────────────────────

/**
 * Matrix-multiply two DataFrames (inner join on left.columns ↔ right.index).
 *
 * Mirrors `pandas.DataFrame.dot(other: DataFrame)`.
 *
 * The result has:
 * - Row index = `left.index`
 * - Column names = `right.columns`
 * - Shape = `[left.nRows, right.nCols]`
 *
 * Only the labels that appear in **both** `left.columns` **and** `right.index`
 * participate in the sum (inner join).
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameDotDataFrame } from "tsb";
 *
 * const A = DataFrame.fromColumns({ k: [1, 2] });         // 2×1
 * const B = DataFrame.fromColumns({ x: [3], y: [4] });    // 1×2
 * // A has columns ["k"], B has index [0] — no overlap → zeros
 * ```
 */
export function dataFrameDotDataFrame(left: DataFrame, right: DataFrame): DataFrame {
  const nRowsLeft = left.index.size;
  const rightColNames = right.columns.values;

  // Build left.columns → right.index map
  const rightRowMap = buildLabelMap(right.index);
  const leftColNames = left.columns.values;

  const sharedKeys: Array<{ leftColName: string; rightRowIdx: number }> = [];
  for (const lc of leftColNames) {
    const ri = rightRowMap.get(String(lc));
    if (ri !== undefined) {
      sharedKeys.push({ leftColName: lc as string, rightRowIdx: ri });
    }
  }

  // Result columns: one per right column
  const colMap: Record<string, Scalar[]> = {};
  for (const rc of rightColNames) {
    colMap[rc as string] = new Array<Scalar>(nRowsLeft).fill(0);
  }

  for (const { leftColName, rightRowIdx } of sharedKeys) {
    const leftCol = left.col(leftColName);
    for (let ci = 0; ci < rightColNames.length; ci++) {
      const rightColName = rightColNames[ci] as string;
      const rightCol = right.col(rightColName);
      const rv = rightCol.values[rightRowIdx] as Scalar;
      const rvNum = isMissing(rv) ? Number.NaN : (rv as number);
      const outCol = colMap[rightColName] as Scalar[];
      for (let ri = 0; ri < nRowsLeft; ri++) {
        const lv = leftCol.values[ri] as Scalar;
        const lvNum = isMissing(lv) ? Number.NaN : (lv as number);
        const cur = outCol[ri] as number;
        outCol[ri] =
          Number.isNaN(cur) || Number.isNaN(rvNum) || Number.isNaN(lvNum)
            ? Number.NaN
            : cur + lvNum * rvNum;
      }
    }
  }

  const finalColMap: Record<string, Series<Scalar>> = {};
  for (const rc of rightColNames) {
    finalColMap[rc as string] = new Series<Scalar>({
      data: colMap[rc as string] as Scalar[],
      index: left.index,
    });
  }
  return new DataFrame(new Map(Object.entries(finalColMap)), left.index);
}
