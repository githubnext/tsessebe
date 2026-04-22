/**
 * scalar_extract — extract scalar / Series values from Series and DataFrame.
 *
 * Mirrors several pandas scalar-extraction utilities:
 * - `Series.squeeze()` — return scalar if length == 1, else self
 * - `DataFrame.squeeze(axis?)` — squeeze 1-D axis objects into scalars/Series
 * - `Series.item()` — return the single element (throws if size != 1)
 * - `Series.bool()` — return bool of single-element Series
 * - `DataFrame.bool()` — return bool of single-element DataFrame
 * - `Series.first_valid_index()` — index label of first non-NA value or null
 * - `Series.last_valid_index()` — index label of last non-NA value or null
 * - `DataFrame.first_valid_index()` — label of first row with any non-NA value
 * - `DataFrame.last_valid_index()` — label of last row with any non-NA value
 *
 * @module
 */

import { type DataFrame, Index, Series } from "../core/index.ts";
import type { Axis, Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Safely read values[i] with noUncheckedIndexedAccess. */
function atVal<T extends Scalar>(arr: readonly T[], i: number): T | null {
  const v = arr[i];
  return v !== undefined ? v : null;
}

// ─── squeeze ──────────────────────────────────────────────────────────────────

/**
 * Return the single element of a one-element Series as a scalar.
 * If the Series has more than one element, return the Series unchanged.
 *
 * Mirrors `pandas.Series.squeeze()`.
 *
 * @example
 * ```ts
 * import { Series, squeezeSeries } from "tsb";
 *
 * squeezeSeries(new Series({ data: [42] }));    // 42
 * squeezeSeries(new Series({ data: [1, 2] }));  // Series([1, 2])
 * ```
 */
export function squeezeSeries(s: Series<Scalar>): Scalar | Series<Scalar> {
  if (s.size === 1) {
    return atVal(s.values, 0);
  }
  return s;
}

/**
 * Result type for {@link squeezeDataFrame}.
 *
 * - `scalar` — returned when the DataFrame is 1×1 and `axis` is not specified
 * - `series` — returned when one axis has size 1
 * - `dataframe` — returned when neither axis has size 1
 */
export type SqueezeResult = Scalar | Series<Scalar> | DataFrame;

/**
 * Squeeze 1-D axis objects from a DataFrame into a scalar or Series.
 *
 * Mirrors `pandas.DataFrame.squeeze(axis?)`:
 * - `axis=undefined` (default): squeeze as many dimensions as possible.
 *   - 1 row AND 1 col → scalar
 *   - 1 row only → the single row as a Series (indexed by column names)
 *   - 1 col only → the single column as a Series (indexed by row labels)
 *   - Otherwise → DataFrame unchanged
 * - `axis=0` / `"index"`: squeeze rows. If 1 row → Series; else → DataFrame.
 * - `axis=1` / `"columns"`: squeeze columns. If 1 col → Series; else → DataFrame.
 *
 * @example
 * ```ts
 * import { DataFrame, squeezeDataFrame } from "tsb";
 *
 * const df1x1 = DataFrame.fromColumns({ A: [10] });
 * squeezeDataFrame(df1x1);          // 10
 *
 * const df1xN = DataFrame.fromColumns({ A: [1], B: [2] });
 * squeezeDataFrame(df1xN);          // Series([1, 2], index=["A", "B"])
 *
 * const dfNx1 = DataFrame.fromColumns({ A: [1, 2, 3] });
 * squeezeDataFrame(dfNx1);          // Series([1, 2, 3])
 * ```
 */
export function squeezeDataFrame(df: DataFrame, axis?: Axis): SqueezeResult {
  const [nRows, nCols] = df.shape;
  const normalAxis = axis === "index" ? 0 : axis === "columns" ? 1 : axis;

  if (normalAxis === 0) {
    if (nRows === 1) {
      return _rowSeries(df, 0);
    }
    return df;
  }

  if (normalAxis === 1) {
    if (nCols === 1) {
      return df.col(df.columns.at(0));
    }
    return df;
  }

  // axis === undefined — squeeze as many dimensions as possible
  if (nRows === 1 && nCols === 1) {
    const s = df.col(df.columns.at(0));
    return atVal(s.values, 0);
  }
  if (nRows === 1) {
    return _rowSeries(df, 0);
  }
  if (nCols === 1) {
    return df.col(df.columns.at(0));
  }
  return df;
}

/** Extract row `i` as a Series indexed by column names. */
function _rowSeries(df: DataFrame, row: number): Series<Scalar> {
  const colLabels = df.columns.toArray();
  const values: Scalar[] = colLabels.map((c) => atVal(df.col(c).values, row));
  return new Series({ data: values, index: new Index<Label>(colLabels) });
}

// ─── item ─────────────────────────────────────────────────────────────────────

/**
 * Return the single element of a Series as a scalar value.
 *
 * Throws a `RangeError` if the Series does not have exactly one element.
 *
 * Mirrors `pandas.Series.item()`.
 *
 * @example
 * ```ts
 * import { Series, itemSeries } from "tsb";
 *
 * itemSeries(new Series({ data: [7] }));  // 7
 * ```
 */
export function itemSeries(s: Series<Scalar>): Scalar {
  if (s.size !== 1) {
    throw new RangeError(`itemSeries: Series must have exactly 1 element, got ${s.size}`);
  }
  return atVal(s.values, 0);
}

// ─── bool ─────────────────────────────────────────────────────────────────────

/**
 * Return the boolean value of a single-element Series.
 *
 * Throws if the Series does not contain exactly one element, or if that
 * element is null/undefined.
 *
 * Mirrors `pandas.Series.bool()`.
 *
 * @example
 * ```ts
 * import { Series, boolSeries } from "tsb";
 *
 * boolSeries(new Series({ data: [1] }));    // true
 * boolSeries(new Series({ data: [0] }));    // false
 * boolSeries(new Series({ data: [true] })); // true
 * ```
 */
export function boolSeries(s: Series<Scalar>): boolean {
  if (s.size !== 1) {
    throw new RangeError(
      `boolSeries: only a single-element Series can be converted to a scalar boolean, got size ${s.size}`,
    );
  }
  const v = atVal(s.values, 0);
  if (v === null || v === undefined) {
    throw new TypeError("boolSeries: element is null/undefined — cannot convert to bool");
  }
  return Boolean(v);
}

/**
 * Return the boolean value of a single-element (1×1) DataFrame.
 *
 * Throws if the DataFrame shape is not exactly 1×1.
 *
 * Mirrors `pandas.DataFrame.bool()`.
 *
 * @example
 * ```ts
 * import { DataFrame, boolDataFrame } from "tsb";
 *
 * boolDataFrame(DataFrame.fromColumns({ A: [1] }));     // true
 * boolDataFrame(DataFrame.fromColumns({ A: [false] })); // false
 * ```
 */
export function boolDataFrame(df: DataFrame): boolean {
  const [nRows, nCols] = df.shape;
  if (nRows !== 1 || nCols !== 1) {
    throw new RangeError(
      `boolDataFrame: only a 1×1 DataFrame can be converted to a scalar boolean, got shape [${nRows}, ${nCols}]`,
    );
  }
  const s = df.col(df.columns.at(0));
  const v = atVal(s.values, 0);
  if (v === null || v === undefined) {
    throw new TypeError("boolDataFrame: element is null/undefined — cannot convert to bool");
  }
  return Boolean(v);
}

// ─── first/last valid index ───────────────────────────────────────────────────

/**
 * Return the index label of the first non-NA value in a Series.
 * Returns `null` if all values are NA (null / undefined / NaN).
 *
 * Mirrors `pandas.Series.first_valid_index()`.
 *
 * @example
 * ```ts
 * import { Series, firstValidIndex } from "tsb";
 *
 * firstValidIndex(new Series({ data: [null, NaN, 3, 4], index: ["a","b","c","d"] }));
 * // "c"
 * firstValidIndex(new Series({ data: [null, null] }));
 * // null
 * ```
 */
export function firstValidIndex(s: Series<Scalar>): Label | null {
  for (let i = 0; i < s.size; i++) {
    const v = atVal(s.values, i);
    if (!isMissing(v)) {
      return s.index.at(i);
    }
  }
  return null;
}

/**
 * Return the index label of the last non-NA value in a Series.
 * Returns `null` if all values are NA.
 *
 * Mirrors `pandas.Series.last_valid_index()`.
 *
 * @example
 * ```ts
 * import { Series, lastValidIndex } from "tsb";
 *
 * lastValidIndex(new Series({ data: [1, 2, null, null], index: ["a","b","c","d"] }));
 * // "b"
 * ```
 */
export function lastValidIndex(s: Series<Scalar>): Label | null {
  for (let i = s.size - 1; i >= 0; i--) {
    const v = atVal(s.values, i);
    if (!isMissing(v)) {
      return s.index.at(i);
    }
  }
  return null;
}

/**
 * Return the row index label of the first row that contains at least one
 * non-NA value across all columns.
 * Returns `null` if every value in the DataFrame is NA.
 *
 * Mirrors `pandas.DataFrame.first_valid_index()`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameFirstValidIndex } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   A: [null, null, 1],
 *   B: [null, 2, 3],
 * });
 * dataFrameFirstValidIndex(df); // 1  (row 1 has B=2)
 * ```
 */
export function dataFrameFirstValidIndex(df: DataFrame): Label | null {
  const [nRows] = df.shape;
  const colNames = df.columns.toArray();
  for (let i = 0; i < nRows; i++) {
    for (const col of colNames) {
      const v = atVal(df.col(col).values, i);
      if (!isMissing(v)) {
        return df.index.at(i);
      }
    }
  }
  return null;
}

/**
 * Return the row index label of the last row that contains at least one
 * non-NA value across all columns.
 * Returns `null` if every value in the DataFrame is NA.
 *
 * Mirrors `pandas.DataFrame.last_valid_index()`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameLastValidIndex } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   A: [1, null, null],
 *   B: [2, 3, null],
 * });
 * dataFrameLastValidIndex(df); // 1  (row 1 has B=3)
 * ```
 */
export function dataFrameLastValidIndex(df: DataFrame): Label | null {
  const [nRows] = df.shape;
  const colNames = df.columns.toArray();
  for (let i = nRows - 1; i >= 0; i--) {
    for (const col of colNames) {
      const v = atVal(df.col(col).values, i);
      if (!isMissing(v)) {
        return df.index.at(i);
      }
    }
  }
  return null;
}
