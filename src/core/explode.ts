/**
 * Explode operations — expand list-like elements into separate rows.
 *
 * Mirrors:
 *   - `pandas.Series.explode`
 *   - `pandas.DataFrame.explode`
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True if `v` is array-like (Array or looks like one). */
function isArrayLike(v: Scalar): v is Scalar {
  return Array.isArray(v);
}

/** Extract elements from an array-like value, or wrap scalars. */
function explodeValue(v: Scalar): Scalar[] {
  if (v === null || v === undefined) {
    return [null];
  }
  if (isArrayLike(v)) {
    const arr = v as unknown as Scalar[];
    return arr.length === 0 ? [null] : arr;
  }
  return [v];
}

// ─── explodeSeries ────────────────────────────────────────────────────────────

/**
 * Expand list-like elements into separate rows.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [[1, 2], [3], null] });
 * explodeSeries(s);
 * // => Series([1, 2, 3, null], index=[0, 0, 1, 2])
 * ```
 */
export function explodeSeries(s: Series<Scalar>): Series<Scalar> {
  const vals = s.values;
  const idxArr = s.index.toArray();
  const out: Scalar[] = [];
  const newIdx: Label[] = [];

  for (let i = 0; i < vals.length; i++) {
    const expanded = explodeValue(vals[i] ?? null);
    const lbl = idxArr[i] as Label;
    for (const elem of expanded) {
      out.push(elem);
      newIdx.push(lbl);
    }
  }

  return new Series<Scalar>({
    data: out,
    index: new Index<Label>(newIdx),
    name: s.name,
  });
}

// ─── explodeDataFrame ─────────────────────────────────────────────────────────

/** Build expansion data for a non-exploded column. */
function buildRepeatedColumn(
  colVals: readonly Scalar[],
  counts: readonly number[],
  n: number,
): Scalar[] {
  const repVals: Scalar[] = [];
  for (let i = 0; i < n; i++) {
    const count = counts[i] ?? 1;
    const v = colVals[i] ?? null;
    for (let j = 0; j < count; j++) {
      repVals.push(v);
    }
  }
  return repVals;
}

/**
 * Explode a DataFrame column, repeating other columns to match the expanded rows.
 *
 * @example
 * ```ts
 * // const df = DataFrame.fromColumns({ a: [[1, 2], [3]], b: ["x", "y"] });
 * explodeDataFrame(df, "a");
 * // => DataFrame with a=[1,2,3], b=["x","x","y"]
 * ```
 */
export function explodeDataFrame(df: DataFrame, column: string): DataFrame {
  const s = df.col(column) as Series<Scalar>;
  const vals = s.values;
  const idxArr = df.index.toArray();
  const n = vals.length;

  // Build row-expansion counts
  const counts: number[] = [];
  const expandedVals: Scalar[] = [];
  const newIdx: Label[] = [];

  for (let i = 0; i < n; i++) {
    const expanded = explodeValue(vals[i] ?? null);
    counts.push(expanded.length);
    const lbl = idxArr[i] as Label;
    for (const elem of expanded) {
      expandedVals.push(elem);
      newIdx.push(lbl);
    }
  }

  // Build new data
  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    if (col === column) {
      data[col] = expandedVals;
    } else {
      const colVals = (df.col(col) as Series<Scalar>).values;
      data[col] = buildRepeatedColumn(colVals, counts, n);
    }
  }

  return DataFrame.fromColumns(data, { index: new Index<Label>(newIdx) });
}
