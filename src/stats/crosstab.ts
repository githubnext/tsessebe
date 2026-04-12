/**
 * crosstab — cross-tabulation of two or more factors.
 *
 * Mirrors `pandas.crosstab`:
 *   - `crosstab(index, columns)` → frequency table (count of co-occurrences)
 *   - Supports `values` + `aggfunc` for aggregated cross-tabulations
 *   - Supports `normalize` (all / index / columns) for proportion tables
 *   - Supports `margins` for row/column totals
 *   - Supports `dropna` to exclude NaN combinations
 *
 * @example
 * ```ts
 * import { crosstab, Series } from "tsb";
 * const a = new Series({ data: ["foo","foo","bar","bar"], name: "A" });
 * const b = new Series({ data: ["one","two","one","two"], name: "B" });
 * const ct = crosstab(a, b);
 * // col  one  two
 * // A
 * // bar   1    1
 * // foo   1    1
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Aggregation function name for {@link crosstab}. */
export type CrosstabAggFunc = "count" | "sum" | "mean" | "min" | "max";

/** Normalize mode: proportions over all cells, rows, or columns. */
export type CrosstabNormalize = boolean | "all" | "index" | "columns";

/** Options for {@link crosstab}. */
export interface CrosstabOptions {
  /**
   * Values to aggregate. If omitted, counts co-occurrences.
   */
  readonly values?: Series<Scalar> | readonly Scalar[];
  /**
   * Aggregation function when `values` is provided. Default `"count"`.
   */
  readonly aggfunc?: CrosstabAggFunc;
  /**
   * If `true` or a string, add row/column totals.
   * Default `false`.
   */
  readonly margins?: boolean;
  /**
   * Label for the margins row/column. Default `"All"`.
   */
  readonly margins_name?: string;
  /**
   * Normalise values:
   *   - `"all"` or `true` → divide by grand total
   *   - `"index"` → divide each row by its row total
   *   - `"columns"` → divide each column by its column total
   *   - `false` (default) → no normalisation
   */
  readonly normalize?: CrosstabNormalize;
  /**
   * If `true` (default), exclude combinations where either factor is NaN/null.
   */
  readonly dropna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a Series or array to a plain Scalar array. */
function toScalarArray(x: Series<Scalar> | readonly Scalar[]): readonly Scalar[] {
  if (x instanceof Series) {
    return x.values as readonly Scalar[];
  }
  return x;
}

/** True when a value is missing (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Aggregate a numeric bucket according to `aggfunc`. */
function aggregateBucket(nums: number[], fn: CrosstabAggFunc): number {
  if (fn === "count") {
    return nums.length;
  }
  if (nums.length === 0) {
    return Number.NaN;
  }
  if (fn === "sum") {
    return nums.reduce((s, v) => s + v, 0);
  }
  if (fn === "mean") {
    return nums.reduce((s, v) => s + v, 0) / nums.length;
  }
  if (fn === "min") {
    return Math.min(...nums);
  }
  // max
  return Math.max(...nums);
}

/** Add an observation to the cell map. */
function pushObservation(
  cellMap: Map<string, number[]>,
  rowKey: string,
  colKey: string,
  value: number,
): void {
  const key = `${rowKey}\x00${colKey}`;
  let bucket = cellMap.get(key);
  if (bucket === undefined) {
    bucket = [];
    cellMap.set(key, bucket);
  }
  bucket.push(value);
}

/** Build ordered row/column key arrays and the cell map. */
function buildCellMap(
  rowVals: readonly Scalar[],
  colVals: readonly Scalar[],
  valVals: readonly Scalar[] | null,
  dropna: boolean,
): {
  rowKeys: string[];
  colKeys: string[];
  rowOrder: string[];
  colOrder: string[];
  cellMap: Map<string, number[]>;
} {
  const rowKeys: string[] = rowVals.map((v) => String(v));
  const colKeys: string[] = colVals.map((v) => String(v));
  const rowOrder: string[] = [];
  const colOrder: string[] = [];
  const seenRow = new Set<string>();
  const seenCol = new Set<string>();
  const cellMap = new Map<string, number[]>();

  const n = rowKeys.length;
  for (let i = 0; i < n; i++) {
    const rv = rowVals[i];
    const cv = colVals[i];
    if (dropna && (isMissing(rv) || isMissing(cv))) {
      continue;
    }
    const rk = rowKeys[i] ?? "";
    const ck = colKeys[i] ?? "";
    if (!seenRow.has(rk)) {
      seenRow.add(rk);
      rowOrder.push(rk);
    }
    if (!seenCol.has(ck)) {
      seenCol.add(ck);
      colOrder.push(ck);
    }
    const value = valVals !== null ? (valVals[i] as number) : 1;
    pushObservation(cellMap, rk, ck, value);
  }

  return { rowKeys, colKeys, rowOrder, colOrder, cellMap };
}

/** Build matrix using direct key lookup. */
function buildMatrixDirect(
  rowOrder: readonly string[],
  colOrder: readonly string[],
  cellMap: Map<string, number[]>,
  aggfunc: CrosstabAggFunc,
): number[][] {
  return rowOrder.map((rk) =>
    colOrder.map((ck) => {
      const key = `${rk}\x00${ck}`;
      const bucket = cellMap.get(key);
      if (bucket === undefined || bucket.length === 0) {
        return aggfunc === "count" ? 0 : Number.NaN;
      }
      return aggregateBucket(bucket, aggfunc);
    }),
  );
}

/** Sum all non-NaN cells in a matrix. */
function sumAll(matrix: number[][]): number {
  let total = 0;
  for (const row of matrix) {
    for (const v of row) {
      total += Number.isNaN(v) ? 0 : v;
    }
  }
  return total;
}

/** Sum non-NaN cells excluding the last row and last column (margins). */
function sumExcludeMargins(matrix: number[][]): number {
  const nRows = matrix.length;
  const nCols = nRows > 0 ? (matrix[0]?.length ?? 0) : 0;
  let total = 0;
  for (let ri = 0; ri < nRows - 1; ri++) {
    for (let ci = 0; ci < nCols - 1; ci++) {
      total += Number.isNaN(matrix[ri]?.[ci] ?? Number.NaN) ? 0 : (matrix[ri]?.[ci] ?? 0);
    }
  }
  return total;
}

/** Divide every cell by `total`. */
function divideMatrix(matrix: number[][], total: number): number[][] {
  return matrix.map((row) => row.map((v) => (Number.isNaN(v) ? Number.NaN : v / total)));
}

/** Normalise by grand total, optionally ignoring the margins row/col. */
function normalizeAll(matrix: number[][], withMargins: boolean): number[][] {
  const total = withMargins ? sumExcludeMargins(matrix) : sumAll(matrix);
  return divideMatrix(matrix, total);
}

/** Normalise each row by its row total. */
function normalizeByIndex(matrix: number[][]): number[][] {
  return matrix.map((row) => {
    const rowTotal = row.reduce((s, v) => s + (Number.isNaN(v) ? 0 : v), 0);
    return row.map((v) => (Number.isNaN(v) ? Number.NaN : v / rowTotal));
  });
}

/** Normalise each column by its column total. */
function normalizeByColumns(matrix: number[][]): number[][] {
  const nCols = matrix.length > 0 ? (matrix[0]?.length ?? 0) : 0;
  const colTotals = new Array<number>(nCols).fill(0);
  for (const row of matrix) {
    row.forEach((v, ci) => {
      colTotals[ci] = (colTotals[ci] ?? 0) + (Number.isNaN(v) ? 0 : v);
    });
  }
  return matrix.map((row) =>
    row.map((v, ci) => {
      const ct = colTotals[ci] ?? 1;
      return Number.isNaN(v) ? Number.NaN : v / ct;
    }),
  );
}

/** Apply normalisation to a matrix. */
function normalizeMatrix(
  matrix: number[][],
  mode: CrosstabNormalize,
  withMargins: boolean,
): number[][] {
  if (mode === false) {
    return matrix;
  }
  const actualMode = mode === true ? "all" : mode;
  if (actualMode === "all") {
    return normalizeAll(matrix, withMargins);
  }
  if (actualMode === "index") {
    return normalizeByIndex(matrix);
  }
  return normalizeByColumns(matrix);
}

/** Add margins (All row + All column) to matrix, rowOrder, colOrder. */
function addMargins(
  matrix: number[][],
  rowOrder: readonly string[],
  colOrder: readonly string[],
  marginsName: string,
): { matrix: number[][]; rowOrder: string[]; colOrder: string[] } {
  const nCols = colOrder.length;
  const newMatrix = matrix.map((row) => {
    const rowSum = row.reduce((s, v) => s + (Number.isNaN(v) ? 0 : v), 0);
    return [...row, rowSum];
  });
  const colSums = new Array<number>(nCols).fill(0);
  for (const row of matrix) {
    row.forEach((v, ci) => {
      colSums[ci] = (colSums[ci] ?? 0) + (Number.isNaN(v) ? 0 : v);
    });
  }
  const grandTotal = colSums.reduce((s, v) => s + v, 0);
  newMatrix.push([...colSums, grandTotal]);

  return {
    matrix: newMatrix,
    rowOrder: [...rowOrder, marginsName],
    colOrder: [...colOrder, marginsName],
  };
}

/** Resolve final layout (optionally applying margins then normalization). */
function resolveFinalLayout(
  matrix: number[][],
  rowOrder: string[],
  colOrder: string[],
  opts: Required<Pick<CrosstabOptions, "margins" | "margins_name" | "normalize">>,
): { matrix: number[][]; rowOrder: string[]; colOrder: string[] } {
  const { margins, margins_name: marginsName, normalize } = opts;
  const withMargins = margins === true;

  let mat = matrix;
  let ro = rowOrder;
  let co = colOrder;

  if (withMargins) {
    const result = addMargins(mat, ro, co, marginsName);
    mat = result.matrix;
    ro = result.rowOrder;
    co = result.colOrder;
  }

  if (normalize !== false) {
    mat = normalizeMatrix(mat, normalize, withMargins);
  }

  return { matrix: mat, rowOrder: ro, colOrder: co };
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Compute a simple cross-tabulation of two Series (frequency count).
 *
 * @param rowSeries - Series (or array) to use as row factor.
 * @param colSeries - Series (or array) to use as column factor.
 * @param options   - Optional configuration.
 * @returns         A DataFrame where rows = unique row-factor values,
 *                  columns = unique column-factor values, cells = counts
 *                  (or aggregated values when `values` is provided).
 */
export function crosstab(
  rowSeries: Series<Scalar> | readonly Scalar[],
  colSeries: Series<Scalar> | readonly Scalar[],
  options: CrosstabOptions = {},
): DataFrame {
  const rowVals = toScalarArray(rowSeries);
  const colVals = toScalarArray(colSeries);
  if (rowVals.length !== colVals.length) {
    throw new RangeError("crosstab: index and columns must have the same length.");
  }

  const aggfunc: CrosstabAggFunc =
    options.values !== undefined ? (options.aggfunc ?? "mean") : "count";
  const dropna: boolean = options.dropna ?? true;
  const margins: boolean = options.margins === true;
  const marginsName: string = options.margins_name ?? "All";
  const normalize: CrosstabNormalize = options.normalize ?? false;

  const valVals: readonly Scalar[] | null =
    options.values !== undefined ? toScalarArray(options.values) : null;

  const { rowOrder, colOrder, cellMap } = buildCellMap(rowVals, colVals, valVals, dropna);

  const matrix = buildMatrixDirect(rowOrder, colOrder, cellMap, aggfunc);

  const layout = resolveFinalLayout(matrix, rowOrder, colOrder, {
    margins,
    margins_name: marginsName,
    normalize,
  });

  const outCols: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < layout.colOrder.length; ci++) {
    const colName = layout.colOrder[ci] ?? "";
    outCols[colName] = layout.matrix.map((row) => row[ci] ?? null);
  }

  return DataFrame.fromColumns(outCols, {
    index: new Index<Label>(layout.rowOrder as Label[]),
  });
}

/**
 * Compute a cross-tabulation directly from two same-length arrays
 * (convenience wrapper for array inputs).
 */
export function crosstabSeries(
  rowData: readonly Scalar[],
  colData: readonly Scalar[],
  options: CrosstabOptions = {},
): DataFrame {
  return crosstab(rowData, colData, options);
}
