/**
 * idxmin / idxmax — return the index label of the minimum or maximum value.
 *
 * Mirrors `pandas.Series.idxmin()` / `pandas.Series.idxmax()` and
 * `pandas.DataFrame.idxmin()` / `pandas.DataFrame.idxmax()`:
 *
 * - `idxminSeries(series)` — label of the minimum value (NaN/null excluded)
 * - `idxmaxSeries(series)` — label of the maximum value (NaN/null excluded)
 * - `idxminDataFrame(df)` — Series of row labels where each column achieves its min
 * - `idxmaxDataFrame(df)` — Series of row labels where each column achieves its max
 *
 * When `skipna` is true (the default), NaN / null values are ignored.
 * When `skipna` is false, any NaN / null causes the result to be `null`.
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Dtype, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link idxminSeries}, {@link idxmaxSeries}. */
export interface IdxOptions {
  /**
   * Whether to skip NaN / null values.
   * @defaultValue `true`
   */
  readonly skipna?: boolean;
}

/** Options for {@link idxminDataFrame}, {@link idxmaxDataFrame}. */
export interface IdxDataFrameOptions {
  /**
   * Whether to skip NaN / null values.
   * @defaultValue `true`
   */
  readonly skipna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Find the index of the extreme value (min or max) among `values`.
 * Returns `null` when all values are missing (with `skipna=true`) or when
 * any value is missing (with `skipna=false`).
 */
function findExtreme(
  values: readonly Scalar[],
  skipna: boolean,
  isBetter: (a: Scalar, b: Scalar) => boolean,
): number | null {
  let bestIdx: number | null = null;
  let bestVal: Scalar = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i] as Scalar;
    if (isMissing(v)) {
      if (!skipna) {
        return null;
      }
      continue;
    }
    if (bestIdx === null || isBetter(v, bestVal)) {
      bestIdx = i;
      bestVal = v;
    }
  }
  return bestIdx;
}

/** Compare scalars: returns true if `a` is less than `b`. */
function isLess(a: Scalar, b: Scalar): boolean {
  if (b === null || b === undefined) {
    return false;
  }
  return (a as number | string | boolean) < (b as number | string | boolean);
}

/** Compare scalars: returns true if `a` is greater than `b`. */
function isGreater(a: Scalar, b: Scalar): boolean {
  if (b === null || b === undefined) {
    return false;
  }
  return (a as number | string | boolean) > (b as number | string | boolean);
}

// ─── public API — Series ──────────────────────────────────────────────────────

/**
 * Return the index label of the minimum value in `series`.
 *
 * NaN / null values are excluded when `skipna` is true (the default).
 * Returns `null` when the series is empty or all values are NaN / null.
 *
 * Mirrors `pandas.Series.idxmin()`.
 *
 * @param series  - Input Series.
 * @param options - Options (skipna).
 * @returns The index label at the minimum value, or `null` if no valid value exists.
 *
 * @example
 * ```ts
 * import { Series, idxminSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 4, 1, 5], index: ["a", "b", "c", "d", "e"] });
 * idxminSeries(s);  // "b"  (first occurrence of 1)
 * ```
 */
export function idxminSeries(series: Series<Scalar>, options: IdxOptions = {}): Label {
  const skipna = options.skipna ?? true;
  const idx = findExtreme(series.values, skipna, isLess);
  if (idx === null) {
    return null;
  }
  return series.index.at(idx);
}

/**
 * Return the index label of the maximum value in `series`.
 *
 * NaN / null values are excluded when `skipna` is true (the default).
 * Returns `null` when the series is empty or all values are NaN / null.
 *
 * Mirrors `pandas.Series.idxmax()`.
 *
 * @param series  - Input Series.
 * @param options - Options (skipna).
 * @returns The index label at the maximum value, or `null` if no valid value exists.
 *
 * @example
 * ```ts
 * import { Series, idxmaxSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 4, 1, 5], index: ["a", "b", "c", "d", "e"] });
 * idxmaxSeries(s);  // "e"
 * ```
 */
export function idxmaxSeries(series: Series<Scalar>, options: IdxOptions = {}): Label {
  const skipna = options.skipna ?? true;
  const idx = findExtreme(series.values, skipna, isGreater);
  if (idx === null) {
    return null;
  }
  return series.index.at(idx);
}

// ─── public API — DataFrame ───────────────────────────────────────────────────

/**
 * Return a Series containing the index label of the minimum value for each column.
 *
 * The result Series is indexed by column names.
 * NaN / null values are excluded when `skipna` is true (the default).
 * Columns where all values are NaN / null yield `null` in the result.
 *
 * Mirrors `pandas.DataFrame.idxmin()` (axis=0).
 *
 * @param df      - Input DataFrame.
 * @param options - Options (skipna).
 * @returns A Series indexed by column names, containing the row label of each column's min.
 *
 * @example
 * ```ts
 * import { DataFrame, idxminDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 20, 5] }, { index: ["x", "y", "z"] });
 * idxminDataFrame(df).values;  // ["y", "z"]
 * ```
 */
export function idxminDataFrame(df: DataFrame, options: IdxDataFrameOptions = {}): Series<Scalar> {
  const skipna = options.skipna ?? true;
  const colNames = df.columns.values;
  const result: Label[] = colNames.map((colName) => {
    const s = df.col(colName);
    const idx = findExtreme(s.values, skipna, isLess);
    if (idx === null) {
      return null;
    }
    return df.index.at(idx);
  });
  return new Series<Scalar>({
    data: result,
    index: colNames as unknown as Label[],
    name: null,
    dtype: Dtype.from("object"),
  });
}

/**
 * Return a Series containing the index label of the maximum value for each column.
 *
 * The result Series is indexed by column names.
 * NaN / null values are excluded when `skipna` is true (the default).
 * Columns where all values are NaN / null yield `null` in the result.
 *
 * Mirrors `pandas.DataFrame.idxmax()` (axis=0).
 *
 * @param df      - Input DataFrame.
 * @param options - Options (skipna).
 * @returns A Series indexed by column names, containing the row label of each column's max.
 *
 * @example
 * ```ts
 * import { DataFrame, idxmaxDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 20, 5] }, { index: ["x", "y", "z"] });
 * idxmaxDataFrame(df).values;  // ["z", "y"]
 * ```
 */
export function idxmaxDataFrame(df: DataFrame, options: IdxDataFrameOptions = {}): Series<Scalar> {
  const skipna = options.skipna ?? true;
  const colNames = df.columns.values;
  const result: Label[] = colNames.map((colName) => {
    const s = df.col(colName);
    const idx = findExtreme(s.values, skipna, isGreater);
    if (idx === null) {
      return null;
    }
    return df.index.at(idx);
  });
  return new Series<Scalar>({
    data: result,
    index: colNames as unknown as Label[],
    name: null,
    dtype: Dtype.from("object"),
  });
}
