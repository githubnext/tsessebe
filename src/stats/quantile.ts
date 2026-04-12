/**
 * quantile — quantile/percentile for Series and DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.quantile(q=0.5, interpolation='linear')`
 * - `pandas.DataFrame.quantile(q=0.5, axis=0, numeric_only=True, interpolation='linear')`
 *
 * ### Interpolation methods (pandas-compatible)
 * - `"linear"`: linear interpolation between adjacent values
 * - `"lower"`: take the lower of the two surrounding values
 * - `"higher"`: take the higher of the two surrounding values
 * - `"midpoint"`: arithmetic mean of the two surrounding values
 * - `"nearest"`: whichever of the two surrounding indices is closest
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { DtypeKind } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Interpolation method for quantile estimation. */
export type QuantileInterpolation = "linear" | "lower" | "higher" | "midpoint" | "nearest";

/** Options for {@link quantileSeries}. */
export interface QuantileSeriesOptions {
  /**
   * Quantile level(s) in [0, 1].
   * - A single number returns a `number`.
   * - An array returns a `Series<Scalar>` indexed by the q-values.
   * @defaultValue `0.5`
   */
  readonly q?: number | readonly number[];
  /**
   * Interpolation method when the desired quantile lies between two values.
   * @defaultValue `"linear"`
   */
  readonly interpolation?: QuantileInterpolation;
  /**
   * If `true` (default), ignore null/NaN values before computing.
   */
  readonly skipna?: boolean;
}

/** Options for {@link quantileDataFrame}. */
export interface QuantileDataFrameOptions {
  /**
   * Quantile level(s) in [0, 1].
   * - A single number returns a `Series<Scalar>`.
   * - An array returns a `DataFrame`.
   * @defaultValue `0.5`
   */
  readonly q?: number | readonly number[];
  /**
   * Axis along which to compute.
   * - `0` (default): across rows — one value per column.
   * - `1`: across columns — one value per row.
   */
  readonly axis?: 0 | 1;
  /**
   * If `true` (default), only include numeric columns.
   * If `false`, non-numeric columns produce `NaN`.
   */
  readonly numericOnly?: boolean;
  /**
   * Interpolation method when the desired quantile lies between two values.
   * @defaultValue `"linear"`
   */
  readonly interpolation?: QuantileInterpolation;
  /**
   * If `true` (default), ignore null/NaN values before computing.
   */
  readonly skipna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when a dtype kind is numeric. */
function isNumericKind(kind: DtypeKind): boolean {
  return kind === "int" || kind === "uint" || kind === "float";
}

/** Extract numeric (non-missing) values, respecting skipna. */
function extractNumbers(values: readonly Scalar[], skipna: boolean): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      if (!skipna) {
        return [];
      }
      continue;
    }
    if (typeof v === "number") {
      out.push(v);
    }
  }
  return out;
}

/** Sort numbers ascending (non-mutating). */
function sortAsc(xs: number[]): number[] {
  return xs.slice().sort((a, b) => a - b);
}

/**
 * Compute a single quantile from a **sorted** array using the given method.
 *
 * Returns `NaN` when the array is empty.
 */
function computeOne(sorted: readonly number[], q: number, method: QuantileInterpolation): number {
  const n = sorted.length;
  if (n === 0) {
    return Number.NaN;
  }
  if (n === 1) {
    return sorted[0] as number;
  }
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const vlo = sorted[lo] as number;
  const vhi = sorted[hi] as number;
  if (lo === hi) {
    return vlo;
  }
  switch (method) {
    case "lower":
      return vlo;
    case "higher":
      return vhi;
    case "midpoint":
      return (vlo + vhi) / 2;
    case "nearest": {
      const frac = pos - lo;
      return frac <= 0.5 ? vlo : vhi;
    }
    default: {
      const frac = pos - lo;
      return vlo * (1 - frac) + vhi * frac;
    }
  }
}

/** Compute multiple quantile levels from a sorted array. */
function computeMany(
  sorted: readonly number[],
  qLevels: readonly number[],
  method: QuantileInterpolation,
): number[] {
  return qLevels.map((q) => computeOne(sorted, q, method));
}

// ─── Series API ───────────────────────────────────────────────────────────────

/**
 * Compute quantile(s) for a Series.
 *
 * When `q` is a single number, returns a scalar `number`.
 * When `q` is an array, returns a `Series<Scalar>` indexed by the q-values.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * quantileSeries(s);                                        // 3
 * quantileSeries(s, { q: 0.25 });                           // 1.75
 * quantileSeries(s, { q: [0.25, 0.5, 0.75] });              // Series { 0.25:1.75, 0.5:3, 0.75:4.25 }
 * quantileSeries(s, { q: 0.5, interpolation: "lower" });    // 2
 * ```
 */
export function quantileSeries(
  series: Series<Scalar>,
  options: QuantileSeriesOptions = {},
): number | Series<Scalar> {
  const method: QuantileInterpolation = options.interpolation ?? "linear";
  const skipna = options.skipna ?? true;
  const qInput = options.q ?? 0.5;

  const sorted = sortAsc(extractNumbers(series.values as readonly Scalar[], skipna));

  if (typeof qInput === "number") {
    return computeOne(sorted, qInput, method);
  }

  const qArr = qInput as readonly number[];
  const results = computeMany(sorted, qArr, method);
  return new Series<Scalar>({ data: results, index: qArr as unknown as readonly Label[] });
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Build a column record (name → Scalar[]) for DataFrame.fromColumns(). */
function buildRecord(
  colMap: ReadonlyMap<string, readonly Scalar[]>,
): Record<string, readonly Scalar[]> {
  const obj: Record<string, readonly Scalar[]> = {};
  for (const [name, vals] of colMap) {
    obj[name] = vals;
  }
  return obj;
}

/** Collect sorted numeric arrays for each selected column. */
function collectCols(
  df: DataFrame,
  numericOnly: boolean,
  skipna: boolean,
): { names: string[]; sorted: number[][] } {
  const colNames = df.columns.values as readonly string[];
  const names: string[] = [];
  const sorted: number[][] = [];
  for (const col of colNames) {
    const s = df.col(col);
    if (numericOnly && !isNumericKind(s.dtype.kind)) {
      continue;
    }
    names.push(col);
    if (isNumericKind(s.dtype.kind)) {
      sorted.push(sortAsc(extractNumbers(s.values as readonly Scalar[], skipna)));
    } else {
      sorted.push([]);
    }
  }
  return { names, sorted };
}

// ─── axis=0 (reduce rows, one result per column) ─────────────────────────────

function axis0SingleQ(
  df: DataFrame,
  q: number,
  method: QuantileInterpolation,
  skipna: boolean,
  numericOnly: boolean,
): Series<Scalar> {
  const { names, sorted } = collectCols(df, numericOnly, skipna);
  const vals = sorted.map((xs) => computeOne(xs, q, method));
  return new Series<Scalar>({ data: vals, index: names });
}

function axis0MultiQ(
  df: DataFrame,
  qLevels: readonly number[],
  method: QuantileInterpolation,
  skipna: boolean,
  numericOnly: boolean,
): DataFrame {
  const { names, sorted } = collectCols(df, numericOnly, skipna);
  const rowIndex = new Index<Label>(qLevels as unknown as Label[]);
  const colData = new Map<string, readonly Scalar[]>();
  for (let ci = 0; ci < names.length; ci++) {
    const col = names[ci] as string;
    const xs = sorted[ci] as number[];
    colData.set(col, computeMany(xs, qLevels, method));
  }
  return DataFrame.fromColumns(buildRecord(colData), { index: rowIndex });
}

// ─── axis=1 (reduce columns, one result per row) ─────────────────────────────

/** Extract numeric values for a given row across all columns. */
function rowValues(df: DataFrame, colNames: readonly string[], rowIdx: number): Scalar[] {
  const out: Scalar[] = [];
  for (const col of colNames) {
    out.push(df.col(col).values[rowIdx] as Scalar);
  }
  return out;
}

function axis1SingleQ(
  df: DataFrame,
  q: number,
  method: QuantileInterpolation,
  skipna: boolean,
): Series<Scalar> {
  const colNames = df.columns.values as readonly string[];
  const rowCount = df.index.size;
  const vals: number[] = [];
  for (let r = 0; r < rowCount; r++) {
    const xs = sortAsc(extractNumbers(rowValues(df, colNames, r), skipna));
    vals.push(computeOne(xs, q, method));
  }
  return new Series<Scalar>({ data: vals, index: df.index });
}

function axis1MultiQ(
  df: DataFrame,
  qLevels: readonly number[],
  method: QuantileInterpolation,
  skipna: boolean,
): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const rowCount = df.index.size;
  const qColData: number[][] = qLevels.map(() => []);
  for (let r = 0; r < rowCount; r++) {
    const xs = sortAsc(extractNumbers(rowValues(df, colNames, r), skipna));
    for (let qi = 0; qi < qLevels.length; qi++) {
      const arr = qColData[qi];
      if (arr !== undefined) {
        arr.push(computeOne(xs, qLevels[qi] as number, method));
      }
    }
  }
  const resultCols: Record<string, readonly Scalar[]> = {};
  for (let qi = 0; qi < qLevels.length; qi++) {
    resultCols[String(qLevels[qi])] = (qColData[qi] ?? []) as Scalar[];
  }
  return DataFrame.fromColumns(resultCols, { index: df.index });
}

// ─── public DataFrame API ─────────────────────────────────────────────────────

/**
 * Compute quantile(s) for a DataFrame.
 *
 * When `q` is a single number:
 * - `axis=0`: returns a `Series<Scalar>` (one value per column)
 * - `axis=1`: returns a `Series<Scalar>` (one value per row)
 *
 * When `q` is an array:
 * - `axis=0`: returns a `DataFrame` (q-values as rows, columns as columns)
 * - `axis=1`: returns a `DataFrame` (rows as rows, q-values as columns)
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * quantileDataFrame(df);                        // Series { a: 2, b: 5 }
 * quantileDataFrame(df, { q: [0.25, 0.75] });   // DataFrame 2×2
 * quantileDataFrame(df, { axis: 1, q: 0.5 });   // Series (one value per row)
 * ```
 */
export function quantileDataFrame(
  df: DataFrame,
  options: QuantileDataFrameOptions = {},
): Series<Scalar> | DataFrame {
  const method: QuantileInterpolation = options.interpolation ?? "linear";
  const skipna = options.skipna ?? true;
  const numericOnly = options.numericOnly ?? true;
  const axis = options.axis ?? 0;
  const qInput = options.q ?? 0.5;

  const multiQ = Array.isArray(qInput);

  if (axis === 0) {
    if (multiQ) {
      return axis0MultiQ(df, qInput as readonly number[], method, skipna, numericOnly);
    }
    return axis0SingleQ(df, qInput as number, method, skipna, numericOnly);
  }

  if (multiQ) {
    return axis1MultiQ(df, qInput as readonly number[], method, skipna);
  }
  return axis1SingleQ(df, qInput as number, method, skipna);
}
