/**
 * where_mask — element-wise conditional selection for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.where(cond, other)` — keep values where `cond` is truthy, replace with `other` elsewhere
 * - `Series.mask(cond, other)` — inverse of `where`; keep where `cond` is falsy
 * - `DataFrame.where(cond, other)` — element-wise `where` for DataFrames
 * - `DataFrame.mask(cond, other)` — element-wise `mask` for DataFrames
 *
 * The `cond` parameter accepts:
 * - A boolean array (aligned positionally to the series/column values)
 * - A boolean `Series<boolean>` (aligned by label to the target series)
 * - A callable `(s: Series<Scalar>) => boolean[] | Series<boolean>` for Series ops
 * - A boolean `DataFrame` (aligned by label) for DataFrame ops
 * - A callable `(df: DataFrame) => DataFrame` returning a boolean DataFrame for DataFrame ops
 *
 * All functions are **pure** — inputs are never mutated.
 * Missing values in `cond` are treated as `false` (i.e. the position is replaced).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A boolean condition for a Series operation.
 *
 * - `readonly boolean[]` — positional mask (must match series length)
 * - `Series<boolean>` — label-aligned boolean series
 * - `(s: Series<Scalar>) => readonly boolean[] | Series<boolean>` — callable
 */
export type SeriesCond =
  | readonly boolean[]
  | Series<boolean>
  | ((s: Series<Scalar>) => readonly boolean[] | Series<boolean>);

/**
 * A boolean condition for a DataFrame operation.
 *
 * - `DataFrame` — label-aligned boolean DataFrame
 * - `(df: DataFrame) => DataFrame` — callable returning a boolean DataFrame
 */
export type DataFrameCond = DataFrame | ((df: DataFrame) => DataFrame);

/** Options for {@link seriesWhere} and {@link seriesMask}. */
export interface SeriesWhereOptions {
  /**
   * Replacement value for positions where the condition is not satisfied.
   * Defaults to `null` (pandas uses `NaN` for numeric; we use `null` as the
   * universal missing sentinel in tsb).
   */
  readonly other?: Scalar;
}

/** Options for {@link dataFrameWhere} and {@link dataFrameMask}. */
export interface DataFrameWhereOptions {
  /**
   * Replacement value for positions where the condition is not satisfied.
   * Defaults to `null`.
   */
  readonly other?: Scalar;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a {@link SeriesCond} to a positional boolean array aligned to
 * `series`.
 *
 * For a label-aligned `Series<boolean>`, labels that are absent in the target
 * series are treated as `false`.
 */
function resolveSeriesCond(series: Series<Scalar>, cond: SeriesCond): readonly boolean[] {
  if (typeof cond === "function") {
    const resolved = cond(series);
    return resolveSeriesCond(series, resolved);
  }

  if (Array.isArray(cond)) {
    return cond as readonly boolean[];
  }

  // Series<boolean> — align by label
  const boolSeries = cond as Series<boolean>;
  const labels = series.index.values as readonly Label[];
  return labels.map((label) => {
    const pos = boolSeries.index.values.indexOf(label);
    if (pos === -1) {
      return false;
    }
    const v = boolSeries.values[pos];
    return v === true;
  });
}

/**
 * Apply a positional boolean mask to `series`.
 *
 * @param series - source series
 * @param mask - `true` → keep original, `false` → use `other`
 * @param other - replacement value (default `null`)
 */
function applyMaskToSeries(
  series: Series<Scalar>,
  mask: readonly boolean[],
  other: Scalar,
): Series<Scalar> {
  const result: Scalar[] = series.values.map((v, i) => (mask[i] === true ? v : other));
  return new Series<Scalar>({ data: result, index: series.index, name: series.name });
}

// ─── Series operations ────────────────────────────────────────────────────────

/**
 * Return a new Series keeping values where `cond` is truthy, replacing all
 * other positions with `other` (default `null`).
 *
 * Mirrors `pandas.Series.where(cond, other)`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * seriesWhere(s, [true, false, true, false, true]);
 * // Series [1, null, 3, null, 5]
 *
 * seriesWhere(s, (x) => x.values.map((v) => (v as number) > 2), { other: 0 });
 * // Series [0, 0, 3, 4, 5]
 * ```
 */
export function seriesWhere(
  series: Series<Scalar>,
  cond: SeriesCond,
  options: SeriesWhereOptions = {},
): Series<Scalar> {
  const other: Scalar = options.other !== undefined ? options.other : null;
  const mask = resolveSeriesCond(series, cond);
  return applyMaskToSeries(series, mask, other);
}

/**
 * Return a new Series keeping values where `cond` is **falsy**, replacing all
 * other positions with `other` (default `null`).
 *
 * Mirrors `pandas.Series.mask(cond, other)`.
 *
 * `mask` is the exact inverse of `where`:
 * `seriesMask(s, cond) === seriesWhere(s, inverted_cond)`
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * seriesMask(s, [true, false, true, false, true]);
 * // Series [null, 2, null, 4, null]
 *
 * seriesMask(s, (x) => x.values.map((v) => (v as number) > 2), { other: -1 });
 * // Series [1, 2, -1, -1, -1]
 * ```
 */
export function seriesMask(
  series: Series<Scalar>,
  cond: SeriesCond,
  options: SeriesWhereOptions = {},
): Series<Scalar> {
  const other: Scalar = options.other !== undefined ? options.other : null;
  const mask = resolveSeriesCond(series, cond);
  // Invert: keep where cond is FALSE
  const inverted = mask.map((b) => !b);
  return applyMaskToSeries(series, inverted, other);
}

// ─── DataFrame operations ─────────────────────────────────────────────────────

/**
 * Resolve a {@link DataFrameCond} to a per-column positional boolean array map.
 *
 * For a label-aligned boolean `DataFrame`, missing column/row labels are treated
 * as `false`.
 */
function resolveDataFrameCond(df: DataFrame, cond: DataFrameCond): Map<string, readonly boolean[]> {
  const condDf: DataFrame = typeof cond === "function" ? cond(df) : cond;

  const result = new Map<string, readonly boolean[]>();
  const rowLabels = df.index.values as readonly Label[];

  for (const colName of df.columns.values) {
    if (!condDf.columns.contains(colName)) {
      // Column absent from condition → treat entire column as false
      result.set(
        colName,
        rowLabels.map(() => false),
      );
      continue;
    }

    const condCol = condDf.col(colName);
    const rowMask: boolean[] = rowLabels.map((label) => {
      const rowPos = condDf.index.values.indexOf(label);
      if (rowPos === -1) {
        return false;
      }
      return condCol.values[rowPos] === true;
    });
    result.set(colName, rowMask);
  }
  return result;
}

/**
 * Return a new DataFrame keeping values where the element-wise `cond` is
 * truthy, replacing all other positions with `other` (default `null`).
 *
 * Mirrors `pandas.DataFrame.where(cond, other)`.
 *
 * `cond` may be:
 * - A `DataFrame` of booleans (label-aligned)
 * - A callable `(df: DataFrame) => DataFrame` that returns a boolean DataFrame
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * const mask = DataFrame.fromColumns({ a: [true, false, true], b: [false, true, false] });
 * dataFrameWhere(df, mask);
 * // DataFrame { a: [1, null, 3], b: [null, 5, null] }
 *
 * dataFrameWhere(df, (d) =>
 *   DataFrame.fromColumns(
 *     Object.fromEntries(d.columns.map((c) => [c, d.col(c as string).values.map((v) => (v as number) > 2)]))
 *   )
 * );
 * // DataFrame { a: [null, null, 3], b: [4, 5, 6] }
 * ```
 */
export function dataFrameWhere(
  df: DataFrame,
  cond: DataFrameCond,
  options: DataFrameWhereOptions = {},
): DataFrame {
  const other: Scalar = options.other !== undefined ? options.other : null;
  const condMap = resolveDataFrameCond(df, cond);

  const resultCols: Record<string, Scalar[]> = {};
  for (const colName of df.columns.values) {
    const srcCol = df.col(colName);
    const mask = condMap.get(colName) ?? srcCol.values.map(() => false);
    resultCols[colName] = srcCol.values.map((v, i) => (mask[i] === true ? v : other));
  }

  return DataFrame.fromColumns(resultCols, { index: df.index });
}

/**
 * Return a new DataFrame keeping values where the element-wise `cond` is
 * **falsy**, replacing all other positions with `other` (default `null`).
 *
 * Mirrors `pandas.DataFrame.mask(cond, other)`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * dataFrameMask(df, (d) =>
 *   DataFrame.fromColumns(
 *     Object.fromEntries(d.columns.values.map((c) => [c, d.col(c).values.map((v) => (v as number) > 2)]))
 *   )
 * );
 * // DataFrame { a: [1, 2, null], b: [null, null, null] }
 * ```
 */
export function dataFrameMask(
  df: DataFrame,
  cond: DataFrameCond,
  options: DataFrameWhereOptions = {},
): DataFrame {
  const other: Scalar = options.other !== undefined ? options.other : null;
  const condMap = resolveDataFrameCond(df, cond);

  const resultCols: Record<string, Scalar[]> = {};
  for (const colName of df.columns.values) {
    const srcCol = df.col(colName);
    const mask = condMap.get(colName) ?? srcCol.values.map(() => false);
    // Invert: keep where cond is FALSE
    resultCols[colName] = srcCol.values.map((v, i) => (mask[i] !== true ? v : other));
  }

  return DataFrame.fromColumns(resultCols, { index: df.index });
}
