/**
 * mode — most-frequent value(s) in a Series or DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.mode(dropna?)`
 * - `pandas.DataFrame.mode(axis?, numeric_only?, dropna?)`
 *
 * Returns a new Series/DataFrame containing all tied modal values sorted
 * ascending.  The result index is always a 0-based integer index.
 * For DataFrames with `axis=0` (default, column-wise), each column's modes
 * are returned, null-padded to the length of the longest mode list.
 *
 * @module
 */

import { DataFrame, type Dtype, Index, Series } from "../core/index.ts";
import type { DtypeKind } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link modeSeries}. */
export interface ModeSeriesOptions {
  /**
   * If `true` (default), exclude null/NaN values from frequency counts.
   */
  readonly dropna?: boolean;
}

/** Options for {@link modeDataFrame}. */
export interface ModeDataFrameOptions {
  /**
   * Axis along which to compute the mode.
   * - `0` (default): compute per column.
   * - `1`: compute per row.
   */
  readonly axis?: 0 | 1;
  /**
   * If `true`, only include numeric columns when `axis=0`.
   * Has no effect for `axis=1`.
   * @defaultValue `false`
   */
  readonly numericOnly?: boolean;
  /**
   * If `true` (default), exclude null/NaN values.
   */
  readonly dropna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when a dtype kind is numeric (int, uint, or float). */
function isNumericKind(kind: DtypeKind): boolean {
  if (kind === "int") {
    return true;
  }
  if (kind === "uint") {
    return true;
  }
  if (kind === "float") {
    return true;
  }
  return false;
}

/** Stable string key for a Scalar value used in frequency maps. */
function scalarKey(v: Scalar): string {
  if (v === null) {
    return "\0null";
  }
  if (v === undefined) {
    return "\0undefined";
  }
  if (v instanceof Date) {
    return `\0date:${v.getTime().toString()}`;
  }
  return String(v);
}

/**
 * Compare two Scalar values for ascending sort.
 * Numbers < strings < booleans < dates < null/undefined.
 */
function compareScalars(a: Scalar, b: Scalar): number {
  // Both missing — equal
  if (isMissing(a) && isMissing(b)) {
    return 0;
  }
  // Missing values sort last
  if (isMissing(a)) {
    return 1;
  }
  if (isMissing(b)) {
    return -1;
  }
  // Both numbers
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  // Both bigints
  if (typeof a === "bigint" && typeof b === "bigint") {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }
  // Both dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  // Both booleans
  if (typeof a === "boolean" && typeof b === "boolean") {
    if (a === b) {
      return 0;
    }
    return a ? 1 : -1;
  }
  // Both strings
  if (typeof a === "string" && typeof b === "string") {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }
  // Mixed types — compare by canonical key
  return scalarKey(a) < scalarKey(b) ? -1 : 1;
}

/**
 * Compute the modal value(s) from an array of scalars.
 * Returns all values tied for the highest frequency, sorted ascending.
 */
function computeModes(values: readonly Scalar[], dropna: boolean): Scalar[] {
  const freq = new Map<string, { value: Scalar; count: number }>();
  let maxCount = 0;

  for (const v of values) {
    if (dropna && isMissing(v)) {
      continue;
    }
    const key = scalarKey(v);
    const entry = freq.get(key);
    if (entry === undefined) {
      freq.set(key, { value: v, count: 1 });
      if (maxCount === 0) {
        maxCount = 1;
      }
    } else {
      entry.count += 1;
      if (entry.count > maxCount) {
        maxCount = entry.count;
      }
    }
  }

  if (maxCount === 0) {
    return [];
  }

  const result: Scalar[] = [];
  for (const { value, count } of freq.values()) {
    if (count === maxCount) {
      result.push(value);
    }
  }
  result.sort(compareScalars);
  return result;
}

/** Build an integer-index Series from a Scalar array, preserving the source dtype. */
function buildModeSeries(modes: readonly Scalar[], name: Label, dtype: Dtype): Series<Scalar> {
  const idx = new Index<Label>(modes.map((_, i) => i));
  const seriesName = typeof name === "string" ? name : name === null ? null : String(name);
  return new Series({ data: modes.slice(), index: idx, dtype, name: seriesName });
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return the most-frequent value(s) in a Series.
 *
 * When multiple values share the highest frequency they are all returned,
 * sorted in ascending order.  The result has a 0-based integer index.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 2, 3, 3] });
 * modeSeries(s); // Series([2, 3])
 * ```
 */
export function modeSeries(
  series: Series<Scalar>,
  options: ModeSeriesOptions = {},
): Series<Scalar> {
  const dropna = options.dropna ?? true;
  const modes = computeModes(series.values as readonly Scalar[], dropna);
  return buildModeSeries(modes, series.name, series.dtype);
}

/**
 * Return the most-frequent value(s) per column (axis=0) or per row (axis=1).
 *
 * For `axis=0` (default): each column gets its own mode list.  Columns with
 * shorter mode lists are null-padded to match the column with the most modes.
 * The result index is 0-based integers; the columns are the same as the input
 * (or only numeric columns when `numericOnly=true`).
 *
 * For `axis=1`: each row is reduced to its modal values.  The result has the
 * same row index as the input; the columns are 0-based integers.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 1, 2], b: [3, 3, 3] });
 * modeDataFrame(df); // {a: [1], b: [3]}
 * ```
 */
export function modeDataFrame(df: DataFrame, options: ModeDataFrameOptions = {}): DataFrame {
  const axis = options.axis ?? 0;
  const numericOnly = options.numericOnly ?? false;
  const dropna = options.dropna ?? true;

  if (axis === 0) {
    return modeByColumn(df, numericOnly, dropna);
  }
  return modeByRow(df, dropna);
}

/** Compute column-wise modes (axis=0). */
function modeByColumn(df: DataFrame, numericOnly: boolean, dropna: boolean): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const selectedCols = numericOnly
    ? colNames.filter((c) => {
        const series = df.col(c);
        return isNumericKind(series.dtype.kind);
      })
    : colNames;

  // Compute modes per column
  const columnModes: Map<string, Scalar[]> = new Map();
  let maxLen = 0;

  for (const col of selectedCols) {
    const series = df.col(col);
    const vals = series.values as readonly Scalar[];
    const modes = computeModes(vals, dropna);
    columnModes.set(col, modes);
    if (modes.length > maxLen) {
      maxLen = modes.length;
    }
  }

  // Null-pad shorter mode lists
  const record: Record<string, Scalar[]> = {};
  for (const col of selectedCols) {
    const modes = columnModes.get(col) ?? [];
    const padded: Scalar[] = modes.slice();
    while (padded.length < maxLen) {
      padded.push(null);
    }
    record[col] = padded;
  }

  return DataFrame.fromColumns(record);
}

/** Compute row-wise modes (axis=1). */
function modeByRow(df: DataFrame, dropna: boolean): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const rowCount = df.index.size;
  const rowModes: Scalar[][] = [];
  let maxLen = 0;

  for (let r = 0; r < rowCount; r++) {
    const rowVals: Scalar[] = [];
    for (const col of colNames) {
      const v = df.col(col).values[r] as Scalar;
      rowVals.push(v);
    }
    const modes = computeModes(rowVals, dropna);
    rowModes.push(modes);
    if (modes.length > maxLen) {
      maxLen = modes.length;
    }
  }

  // Build result columns (0, 1, 2, … maxLen-1), rows = original row index
  const resultCols: Record<string, Scalar[]> = {};
  for (let c = 0; c < maxLen; c++) {
    const colKey = String(c);
    resultCols[colKey] = rowModes.map((modes) => (c < modes.length ? (modes[c] as Scalar) : null));
  }

  return DataFrame.fromColumns(resultCols, { index: df.index });
}
