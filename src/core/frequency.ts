/**
 * Frequency counting — `valueCounts` and `crosstab`.
 *
 * Mirrors:
 *   - `pandas.Series.value_counts`
 *   - `pandas.crosstab`
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── valueCounts helpers ──────────────────────────────────────────────────────

/** Build a count map from Series values. */
function buildCountMap(
  vals: readonly Scalar[],
  dropna: boolean,
): Map<string, { key: Scalar; count: number }> {
  const counts = new Map<string, { key: Scalar; count: number }>();
  for (const v of vals) {
    const isMissing = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
    if (isMissing && dropna) {
      continue;
    }
    const key = isMissing ? "__NA__" : String(v);
    const entry = counts.get(key);
    if (entry !== undefined) {
      entry.count++;
    } else {
      counts.set(key, { key: v, count: 1 });
    }
  }
  return counts;
}

// ─── valueCounts ──────────────────────────────────────────────────────────────

/** Options for {@link valueCounts}. */
export interface ValueCountsOptions {
  /** Return relative frequencies (proportions). Default `false`. */
  normalize?: boolean;
  /** Sort by count descending. Default `true`. */
  sort?: boolean;
  /** If `sort` is true, put smallest counts first. Default `false`. */
  ascending?: boolean;
  /** Include NaN/null in the counts. Default `false`. */
  dropna?: boolean;
}

/**
 * Count occurrences of each unique value in a Series.
 * Returns a new `Series<number>` with unique values as index.
 *
 * @example
 * ```ts
 * valueCounts(new Series({ data: ["a", "b", "a", "c", "b", "a"] }));
 * // => Series { a: 3, b: 2, c: 1 }
 * ```
 */
export function valueCounts(s: Series<Scalar>, opts: ValueCountsOptions = {}): Series<number> {
  const normalize = opts.normalize ?? false;
  const sort = opts.sort ?? true;
  const ascending = opts.ascending ?? false;
  const dropna = opts.dropna ?? true;

  const counts = buildCountMap(s.values, dropna);
  const entries = [...counts.values()];

  if (sort) {
    entries.sort((a, b) => (ascending ? a.count - b.count : b.count - a.count));
  }

  const total = entries.reduce((acc, e) => acc + e.count, 0);
  const idxLabels: Label[] = entries.map((e) =>
    e.key === null || e.key === undefined ? null : (e.key as Label),
  );
  const values = entries.map((e) => (normalize && total > 0 ? e.count / total : e.count));

  return new Series<number>({
    data: values,
    index: new Index<Label>(idxLabels),
    name: s.name,
  });
}

// ─── crosstab helpers ─────────────────────────────────────────────────────────

/** Normalize options for crosstab. */
export type CrosstabNormalize = "all" | "index" | "columns" | false;

/** Options for {@link crosstab}. */
export interface CrosstabOptions {
  /** Normalize frequencies. */
  normalize?: CrosstabNormalize;
  /** Column to use as cell values. */
  values?: Series<Scalar>;
  /** Aggregation function when `values` is provided. */
  aggfunc?: (vals: Scalar[]) => Scalar;
  /** Include row/column totals. */
  margins?: boolean;
  /** Name for the margins row/column. */
  margins_name?: string;
  /** Drop rows/columns whose sum is zero. */
  dropna?: boolean;
}

/** Compute row totals for normalize="all". */
function computeAllTotal(matrix: Map<string, Map<string, number>>): number {
  let total = 0;
  for (const row of matrix.values()) {
    for (const v of row.values()) {
      total += v;
    }
  }
  return total;
}

/** Apply normalization to a cell value. */
function normalizeCell(
  v: number,
  normalize: CrosstabNormalize,
  rowSum: number,
  colSum: number,
  allTotal: number,
): number {
  if (normalize === "all") {
    return allTotal > 0 ? v / allTotal : 0;
  }
  if (normalize === "index") {
    return rowSum > 0 ? v / rowSum : 0;
  }
  if (normalize === "columns") {
    return colSum > 0 ? v / colSum : 0;
  }
  return v;
}

/** Crosstab matrix entry type. */
interface CrossMatrix {
  rowKeys: string[];
  colKeys: string[];
  matrix: Map<string, Map<string, number>>;
}

/** Track unique keys in insertion order. */
function addKey(set: Set<string>, keys: string[], key: string): void {
  if (!set.has(key)) {
    set.add(key);
    keys.push(key);
  }
}

/** Increment the cell count in the matrix. */
function incrementCell(matrix: Map<string, Map<string, number>>, rk: string, ck: string): void {
  if (!matrix.has(rk)) {
    matrix.set(rk, new Map<string, number>());
  }
  const row = matrix.get(rk);
  if (row !== undefined) {
    row.set(ck, (row.get(ck) ?? 0) + 1);
  }
}

/** Build the frequency matrix from two parallel Series. */
function buildMatrix(
  rowVals: readonly Scalar[],
  colVals: readonly Scalar[],
  n: number,
  dropna: boolean,
): CrossMatrix {
  const rowKeys: string[] = [];
  const colKeys: string[] = [];
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const matrix = new Map<string, Map<string, number>>();

  for (let i = 0; i < n; i++) {
    const rv = rowVals[i];
    const cv = colVals[i];
    const isMissing = rv === null || rv === undefined || cv === null || cv === undefined;
    if (dropna && isMissing) {
      continue;
    }
    const rk = String(rv ?? "__NA__");
    const ck = String(cv ?? "__NA__");
    addKey(rowSet, rowKeys, rk);
    addKey(colSet, colKeys, ck);
    incrementCell(matrix, rk, ck);
  }
  return { rowKeys, colKeys, matrix };
}

/**
 * Compute a cross-tabulation of two factor Series.
 * Mirrors `pandas.crosstab`.
 *
 * @example
 * ```ts
 * const rows = new Series({ data: ["A", "A", "B"] });
 * const cols = new Series({ data: ["X", "Y", "X"] });
 * crosstab(rows, cols);
 * ```
 */
export function crosstab(
  index: Series<Scalar>,
  columns: Series<Scalar>,
  opts: CrosstabOptions = {},
): DataFrame {
  const normalize = opts.normalize ?? false;
  const dropna = opts.dropna ?? true;

  const rowVals = index.values;
  const colVals = columns.values;
  const n = Math.min(rowVals.length, colVals.length);

  const { rowKeys, colKeys, matrix } = buildMatrix(rowVals, colVals, n, dropna);

  // Compute normalization totals
  const allTotal = computeAllTotal(matrix);
  const colSums = new Map<string, number>();
  for (const ck of colKeys) {
    let s = 0;
    for (const rk of rowKeys) {
      s += matrix.get(rk)?.get(ck) ?? 0;
    }
    colSums.set(ck, s);
  }

  const data: Record<string, Scalar[]> = {};
  for (const ck of colKeys) {
    const colArr: Scalar[] = [];
    for (const rk of rowKeys) {
      const raw = matrix.get(rk)?.get(ck) ?? 0;
      const rowSum = [...(matrix.get(rk)?.values() ?? [])].reduce((s, v) => s + v, 0);
      const colSum = colSums.get(ck) ?? 0;
      colArr.push(normalizeCell(raw, normalize, rowSum, colSum, allTotal));
    }
    data[ck] = colArr;
  }

  const idx = new Index<Label>(rowKeys as Label[]);
  return DataFrame.fromColumns(data, { index: idx });
}
