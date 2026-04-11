/**
 * where_mask — conditional value selection for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.where(cond, other=NaN)` — keep values where `cond` is True, replace with `other` where False
 * - `Series.mask(cond, other=NaN)` — replace values where `cond` is True with `other`, keep where False
 * - `DataFrame.where(cond, other=NaN, axis?)` — same but for DataFrames
 * - `DataFrame.mask(cond, other=NaN, axis?)` — same but for DataFrames
 *
 * The condition can be:
 * - A `boolean[]` array aligned by position
 * - A `Series<boolean>` (aligned by index label when axis=0, or by position)
 * - A callable `(value: Scalar) => boolean`
 *
 * For DataFrames, `cond` may additionally be:
 * - A `DataFrame` of booleans (same shape)
 * - A `boolean[][]` 2-D array
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 * Missing values in `cond` are treated as `false`.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Axis, Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Condition types accepted by {@link whereSeries} and {@link maskSeries}. */
export type SeriesCond =
  | readonly boolean[]
  | Series<boolean>
  | Series<Scalar>
  | ((value: Scalar, label: Label) => boolean);

/** Condition types accepted by {@link whereDataFrame} and {@link maskDataFrame}. */
export type DataFrameCond = readonly (readonly boolean[])[] | DataFrame | SeriesCond;

/** Options for {@link whereSeries} and {@link maskSeries}. */
export interface WhereOptions {
  /**
   * Value to use where the condition is `false` (for `where`) or `true` (for `mask`).
   * Defaults to `null` (propagated as missing, matching pandas NaN behaviour).
   */
  readonly other?: Scalar;
}

/** Options for {@link whereDataFrame} and {@link maskDataFrame}. */
export interface WhereDataFrameOptions extends WhereOptions {
  /**
   * Axis along which to align a Series condition (when `cond` is a `Series`).
   * - `0` or `"index"` (default): align by **row** labels (broadcast across columns).
   * - `1` or `"columns"`: align by **column** labels (broadcast across rows).
   */
  readonly axis?: Axis;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Resolve a boolean condition value from a position + label, given the
 * various condition types for Series.
 */
function resolveSeriesCond(cond: SeriesCond, i: number, label: Label, value: Scalar): boolean {
  if (typeof cond === "function") {
    return cond(value, label);
  }
  if (Array.isArray(cond)) {
    const v = (cond as readonly boolean[])[i];
    return v === true;
  }
  // Series<boolean> or Series<Scalar>
  const s = cond as Series<Scalar>;
  // Try label-based lookup first, fall back to positional
  const strLabel = String(label);
  for (let j = 0; j < s.index.size; j++) {
    if (String(s.index.at(j)) === strLabel) {
      return s.iat(j) === true;
    }
  }
  return false;
}

// ─── Series: where ────────────────────────────────────────────────────────────

/**
 * Return a new Series keeping values where `cond` is `true`, replacing with
 * `other` (default `null`) where `cond` is `false`.
 *
 * Mirrors `pandas.Series.where(cond, other=np.nan)`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { whereSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * whereSeries(s, [true, false, true, false, true]); // [1, null, 3, null, 5]
 * whereSeries(s, (v) => (v as number) > 2, { other: 0 }); // [0, 0, 3, 4, 5]
 * ```
 */
export function whereSeries(
  series: Series<Scalar>,
  cond: SeriesCond,
  options?: WhereOptions,
): Series<Scalar> {
  const other: Scalar = options?.other !== undefined ? options.other : null;
  const newData: Scalar[] = [];
  for (let i = 0; i < series.size; i++) {
    const label = series.index.at(i);
    const value = series.iat(i);
    const keep = resolveSeriesCond(cond, i, label, value);
    newData.push(keep ? value : other);
  }
  return new Series<Scalar>({
    data: newData,
    index: series.index,
    name: series.name,
  });
}

// ─── Series: mask ─────────────────────────────────────────────────────────────

/**
 * Return a new Series replacing values where `cond` is `true` with `other`
 * (default `null`), keeping values where `cond` is `false`.
 *
 * Mirrors `pandas.Series.mask(cond, other=np.nan)`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { maskSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * maskSeries(s, [true, false, true, false, true]); // [null, 2, null, 4, null]
 * maskSeries(s, (v) => (v as number) > 3, { other: -1 }); // [1, 2, 3, -1, -1]
 * ```
 */
export function maskSeries(
  series: Series<Scalar>,
  cond: SeriesCond,
  options?: WhereOptions,
): Series<Scalar> {
  const other: Scalar = options?.other !== undefined ? options.other : null;
  const newData: Scalar[] = [];
  for (let i = 0; i < series.size; i++) {
    const label = series.index.at(i);
    const value = series.iat(i);
    const replace = resolveSeriesCond(cond, i, label, value);
    newData.push(replace ? other : value);
  }
  return new Series<Scalar>({
    data: newData,
    index: series.index,
    name: series.name,
  });
}

// ─── DataFrame: helpers ───────────────────────────────────────────────────────

/** Set a cell in the keep matrix safely. */
function setCell(matrix: boolean[][], r: number, c: number, v: boolean): void {
  const row = matrix[r];
  if (row !== undefined) {
    row[c] = v;
  }
}

/** Build keep-matrix from a DataFrame condition. */
function buildFromDataFrameCond(
  df: DataFrame,
  cond: DataFrame,
  matrix: boolean[][],
  invert: boolean,
): void {
  const colNames = df.columns.values;
  for (let r = 0; r < df.index.size; r++) {
    for (let c = 0; c < colNames.length; c++) {
      const colName = colNames[c];
      if (colName === undefined) {
        continue;
      }
      let val: Scalar = null;
      try {
        val = cond.col(colName).iat(r);
      } catch {
        val = null;
      }
      const condTrue = val === true;
      setCell(matrix, r, c, invert ? !condTrue : condTrue);
    }
  }
}

/** Build keep-matrix from a 2-D boolean array condition. */
function buildFrom2DArray(
  df: DataFrame,
  cond2d: readonly (readonly boolean[])[],
  matrix: boolean[][],
  invert: boolean,
): void {
  const colNames = df.columns.values;
  for (let r = 0; r < df.index.size; r++) {
    for (let c = 0; c < colNames.length; c++) {
      const condTrue = cond2d[r]?.[c] === true;
      setCell(matrix, r, c, invert ? !condTrue : condTrue);
    }
  }
}

/** Build keep-matrix from a Series/array condition on axis=0 (broadcast over columns). */
function buildFromSeriesAxis0(
  df: DataFrame,
  cond: SeriesCond,
  matrix: boolean[][],
  invert: boolean,
): void {
  const nCols = df.columns.values.length;
  for (let r = 0; r < df.index.size; r++) {
    const label = df.index.at(r);
    const condTrue = resolveSeriesCond(cond, r, label, null);
    for (let c = 0; c < nCols; c++) {
      setCell(matrix, r, c, invert ? !condTrue : condTrue);
    }
  }
}

/** Look up the condition value for a column by name from a Series (for axis=1). */
function seriesCondForColumn(s: Series<Scalar>, colName: string): boolean {
  for (let j = 0; j < s.index.size; j++) {
    if (String(s.index.at(j)) === colName) {
      return s.iat(j) === true;
    }
  }
  return false;
}

/** Resolve axis=1 condition for a single column. */
function resolveAxis1Cond(cond: SeriesCond, c: number, colName: string): boolean {
  if (cond instanceof Series) {
    return seriesCondForColumn(cond as Series<Scalar>, colName);
  }
  if (Array.isArray(cond)) {
    return (cond as readonly boolean[])[c] === true;
  }
  return false;
}

/** Build keep-matrix from a Series/array condition on axis=1 (broadcast over rows). */
function buildFromSeriesAxis1(
  df: DataFrame,
  cond: SeriesCond,
  matrix: boolean[][],
  invert: boolean,
): void {
  const colNames = df.columns.values;
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      continue;
    }
    const condTrue = resolveAxis1Cond(cond, c, colName);
    for (let r = 0; r < df.index.size; r++) {
      setCell(matrix, r, c, invert ? !condTrue : condTrue);
    }
  }
}

/** Build keep-matrix from a callable condition (element-wise). */
function buildFromCallable(
  df: DataFrame,
  cond: (v: Scalar, l: Label) => boolean,
  matrix: boolean[][],
  invert: boolean,
): void {
  const colNames = df.columns.values;
  for (let r = 0; r < df.index.size; r++) {
    for (let c = 0; c < colNames.length; c++) {
      const colName = colNames[c];
      if (colName === undefined) {
        continue;
      }
      const value = df.col(colName).iat(r);
      const label = df.index.at(r);
      const condTrue = cond(value, label);
      setCell(matrix, r, c, invert ? !condTrue : condTrue);
    }
  }
}

/**
 * Build a 2-D boolean matrix (nRows × nCols) from the condition, where
 * matrix[row][col] = true means "keep original value" (for `where`) or
 * "replace with other" (for `mask`, where invert=true flips the meaning).
 */
function buildKeepMatrix(
  df: DataFrame,
  cond: DataFrameCond,
  axis: Axis,
  invert: boolean,
): boolean[][] {
  const nRows = df.index.size;
  const nCols = df.columns.values.length;

  const matrix: boolean[][] = Array.from({ length: nRows }, () =>
    Array.from({ length: nCols }, () => false),
  );

  if (cond instanceof DataFrame) {
    buildFromDataFrameCond(df, cond, matrix, invert);
  } else if (Array.isArray(cond) && cond.length > 0 && Array.isArray(cond[0])) {
    buildFrom2DArray(df, cond as readonly (readonly boolean[])[], matrix, invert);
  } else if (typeof cond === "function") {
    buildFromCallable(df, cond as (v: Scalar, l: Label) => boolean, matrix, invert);
  } else {
    const isRowAxis = axis === 0 || axis === "index";
    if (isRowAxis) {
      buildFromSeriesAxis0(df, cond as SeriesCond, matrix, invert);
    } else {
      buildFromSeriesAxis1(df, cond as SeriesCond, matrix, invert);
    }
  }

  return matrix;
}

// ─── DataFrame: where ─────────────────────────────────────────────────────────

/**
 * Return a new DataFrame keeping values where `cond` is `true`, replacing
 * with `other` (default `null`) where `cond` is `false`.
 *
 * Mirrors `pandas.DataFrame.where(cond, other=np.nan, axis=None)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { whereDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * const cond = [[true, false], [false, true], [true, true]];
 * whereDataFrame(df, cond); // a=[1,null,3], b=[null,5,6]
 * ```
 */
export function whereDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: WhereDataFrameOptions,
): DataFrame {
  const other: Scalar = options?.other !== undefined ? options.other : null;
  const axis: Axis = options?.axis ?? 0;

  const keepMatrix = buildKeepMatrix(df, cond, axis, false);
  const colNames = df.columns.values;

  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      continue;
    }
    const col = df.col(colName);
    const newData: Scalar[] = [];
    for (let r = 0; r < df.index.size; r++) {
      const keep = keepMatrix[r]?.[c] === true;
      newData.push(keep ? col.iat(r) : other);
    }
    colMap.set(colName, new Series<Scalar>({ data: newData, index: df.index, name: colName }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── DataFrame: mask ──────────────────────────────────────────────────────────

/**
 * Return a new DataFrame replacing values where `cond` is `true` with
 * `other` (default `null`), keeping values where `cond` is `false`.
 *
 * Mirrors `pandas.DataFrame.mask(cond, other=np.nan, axis=None)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { maskDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * const cond = [[true, false], [false, true], [true, true]];
 * maskDataFrame(df, cond); // a=[null,2,null], b=[4,null,null]
 * ```
 */
export function maskDataFrame(
  df: DataFrame,
  cond: DataFrameCond,
  options?: WhereDataFrameOptions,
): DataFrame {
  const other: Scalar = options?.other !== undefined ? options.other : null;
  const axis: Axis = options?.axis ?? 0;

  // invert=true means: keepMatrix[r][c] = true → replace with other (mask)
  const keepMatrix = buildKeepMatrix(df, cond, axis, true);
  const colNames = df.columns.values;

  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c];
    if (colName === undefined) {
      continue;
    }
    const col = df.col(colName);
    const newData: Scalar[] = [];
    for (let r = 0; r < df.index.size; r++) {
      const keep = keepMatrix[r]?.[c] === true;
      newData.push(keep ? col.iat(r) : other);
    }
    colMap.set(colName, new Series<Scalar>({ data: newData, index: df.index, name: colName }));
  }
  return new DataFrame(colMap, df.index);
}

// ─── re-export isMissing for test convenience ─────────────────────────────────

export { isMissing as _isMissingWhere };
