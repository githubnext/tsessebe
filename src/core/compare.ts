/**
 * Comparison and boolean operations for Series and DataFrame.
 *
 * Mirrors pandas' element-wise comparison API:
 *   - `eq`, `ne`, `lt`, `gt`, `le`, `ge` return boolean Series/DataFrame
 *   - `logicalAnd`, `logicalOr`, `logicalNot` combine boolean Series
 *   - `anySeries`, `allSeries`, `anyDataFrame`, `allDataFrame` aggregate booleans
 *
 * Index alignment follows the same semantics as `ops.ts`:
 * when both operands are labeled objects the indexes are aligned (outer join),
 * missing slots become `null` before comparison (null comparisons return false
 * except `ne` which returns true).
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** One of the six comparison operators. */
export type CompareOp = "eq" | "ne" | "lt" | "gt" | "le" | "ge";

/** Options for Series comparison. */
export interface SeriesCompareOptions {
  /** Fill value substituted for missing labels when aligning two Series (default `null`). */
  readonly fillValue?: Scalar;
}

/** Options for DataFrame comparison. */
export interface DataFrameCompareOptions {
  /**
   * Which axis to align a Series `other` against when comparing with a DataFrame.
   * - `"columns"` (default) — broadcast the Series across rows, matching column names.
   * - `"index"` — broadcast the Series across columns, matching row labels.
   */
  readonly axis?: "columns" | "index";
  /** Fill value substituted for absent labels when aligning (default `null`). */
  readonly fillValue?: Scalar;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissingVal(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Apply a comparison between two scalars, handling nulls. */
function compareScalars(op: CompareOp, a: Scalar, b: Scalar): boolean {
  if (isMissingVal(a) || isMissingVal(b)) {
    return op === "ne";
  }
  switch (op) {
    case "eq":
      return a === b;
    case "ne":
      return a !== b;
    case "lt":
      return (a as number | string) < (b as number | string);
    case "gt":
      return (a as number | string) > (b as number | string);
    case "le":
      return (a as number | string) <= (b as number | string);
    default:
      return (a as number | string) >= (b as number | string);
  }
}

/** Build a label → value map for fast reindex (first occurrence wins). */
function buildLabelValueMap(s: Series<Scalar>): Map<Label, Scalar> {
  const map = new Map<Label, Scalar>();
  const labels = s.index.values;
  const vals = s.values;
  for (let i = 0; i < labels.length; i++) {
    const lbl = labels[i] as Label;
    if (!map.has(lbl)) {
      map.set(lbl, vals[i] as Scalar);
    }
  }
  return map;
}

/** Compute the outer-union index of two labeled arrays. */
function outerUnionIndex(left: Index<Label>, right: Index<Label>): Index<Label> {
  return left.union(right) as Index<Label>;
}

/** Reindex a Series to `targetIndex`, substituting `fill` for absent labels. */
function reindexSeries(s: Series<Scalar>, targetIndex: Index<Label>, fill: Scalar): Series<Scalar> {
  const map = buildLabelValueMap(s);
  const data: Scalar[] = targetIndex.values.map((lbl) => {
    const v = map.get(lbl);
    return v !== undefined ? v : fill;
  });
  return new Series<Scalar>({ data, index: targetIndex, dtype: Dtype.inferFrom(data) });
}

// ─── Series comparison ────────────────────────────────────────────────────────

/**
 * Compare a Series element-wise against another Series or a scalar.
 *
 * When `other` is a `Series`, the two series are aligned on their index
 * (outer join) before comparison. Missing slots are filled with `fillValue`
 * (default `null`), and null comparisons return `false` (or `true` for `ne`).
 *
 * Mirrors `pandas.Series.eq` / `ne` / `lt` / `gt` / `le` / `ge`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { compareSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3] });
 * compareSeries("gt", s, 2).values; // [false, false, true]
 * ```
 */
export function compareSeries(
  op: CompareOp,
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  const fill: Scalar = options?.fillValue ?? null;

  if (other instanceof Series) {
    return compareSeriesWithSeries(op, left, other, fill);
  }
  return compareSeriesWithScalar(op, left, other);
}

/** Element-wise comparison of two Series (with alignment). */
function compareSeriesWithSeries(
  op: CompareOp,
  left: Series<Scalar>,
  right: Series<Scalar>,
  fill: Scalar,
): Series<boolean> {
  const idx = outerUnionIndex(left.index as Index<Label>, right.index as Index<Label>);
  const lAligned = reindexSeries(left, idx, fill);
  const rAligned = reindexSeries(right, idx, fill);
  const result: boolean[] = lAligned.values.map((lv, i) =>
    compareScalars(op, lv as Scalar, rAligned.values[i] as Scalar),
  );
  return new Series<boolean>({ data: result, index: idx, dtype: Dtype.bool });
}

/** Element-wise comparison of a Series against a scalar. */
function compareSeriesWithScalar(
  op: CompareOp,
  left: Series<Scalar>,
  scalar: Scalar,
): Series<boolean> {
  const result: boolean[] = left.values.map((v) => compareScalars(op, v as Scalar, scalar));
  return new Series<boolean>({
    data: result,
    index: left.index,
    dtype: Dtype.bool,
  });
}

// ─── Convenience wrappers (Series) ───────────────────────────────────────────

/**
 * Element-wise equality.  Returns a boolean `Series`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { eqSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3] });
 * eqSeries(s, 2).values; // [false, true, false]
 * ```
 */
export function eqSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("eq", left, other, options);
}

/** Element-wise inequality.  Returns a boolean `Series`. */
export function neSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("ne", left, other, options);
}

/** Element-wise less-than.  Returns a boolean `Series`. */
export function ltSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("lt", left, other, options);
}

/** Element-wise greater-than.  Returns a boolean `Series`. */
export function gtSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("gt", left, other, options);
}

/** Element-wise less-than-or-equal.  Returns a boolean `Series`. */
export function leSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("le", left, other, options);
}

/** Element-wise greater-than-or-equal.  Returns a boolean `Series`. */
export function geSeries(
  left: Series<Scalar>,
  other: Series<Scalar> | Scalar,
  options?: SeriesCompareOptions,
): Series<boolean> {
  return compareSeries("ge", left, other, options);
}

// ─── Boolean aggregation (Series) ─────────────────────────────────────────────

/**
 * Return `true` if **any** element in `s` is truthy (ignores nulls).
 *
 * Mirrors `pandas.Series.any()`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { anySeries } from "tsb";
 *
 * anySeries(new Series({ data: [false, true, false] })); // true
 * anySeries(new Series({ data: [false, false] }));       // false
 * ```
 */
export function anySeries(s: Series<Scalar>): boolean {
  return s.values.some((v) => !isMissingVal(v as Scalar) && Boolean(v));
}

/**
 * Return `true` if **all** elements in `s` are truthy (nulls treated as false).
 *
 * Mirrors `pandas.Series.all()`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { allSeries } from "tsb";
 *
 * allSeries(new Series({ data: [true, true, true] }));  // true
 * allSeries(new Series({ data: [true, null, true] }));  // false
 * ```
 */
export function allSeries(s: Series<Scalar>): boolean {
  return s.values.every((v) => !isMissingVal(v as Scalar) && Boolean(v));
}

// ─── Boolean logic (Series) ───────────────────────────────────────────────────

/**
 * Element-wise logical AND of two boolean Series.
 *
 * Mirrors `pandas.Series.__and__` (`&`).
 * Series are aligned (outer join) before the operation; absent slots become `false`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { logicalAndSeries } from "tsb";
 *
 * const a = new Series({ data: [true, true, false] });
 * const b = new Series({ data: [true, false, false] });
 * logicalAndSeries(a, b).values; // [true, false, false]
 * ```
 */
export function logicalAndSeries(left: Series<Scalar>, right: Series<Scalar>): Series<boolean> {
  return applyBoolBinaryOp(left, right, (a, b) => Boolean(a) && Boolean(b));
}

/**
 * Element-wise logical OR of two boolean Series.
 *
 * Mirrors `pandas.Series.__or__` (`|`).
 */
export function logicalOrSeries(left: Series<Scalar>, right: Series<Scalar>): Series<boolean> {
  return applyBoolBinaryOp(left, right, (a, b) => Boolean(a) || Boolean(b));
}

/**
 * Element-wise logical XOR of two boolean Series.
 *
 * Mirrors `pandas.Series.__xor__` (`^`).
 */
export function logicalXorSeries(left: Series<Scalar>, right: Series<Scalar>): Series<boolean> {
  return applyBoolBinaryOp(left, right, (a, b) => Boolean(a) !== Boolean(b));
}

/**
 * Element-wise logical NOT of a boolean Series.
 *
 * Mirrors `pandas.Series.__invert__` (`~`).
 * Null values remain null.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { logicalNotSeries } from "tsb";
 *
 * const s = new Series({ data: [true, false, null] });
 * logicalNotSeries(s).values; // [false, true, null]
 * ```
 */
export function logicalNotSeries(s: Series<Scalar>): Series<boolean | null> {
  const result: (boolean | null)[] = s.values.map((v) => {
    if (isMissingVal(v as Scalar)) {
      return null;
    }
    return !v;
  });
  return new Series<boolean | null>({
    data: result,
    index: s.index,
    dtype: Dtype.bool,
    ...(s.name !== null && s.name !== undefined ? { name: s.name } : {}),
  });
}

/** Apply a binary boolean operation with alignment (absent slots → false). */
function applyBoolBinaryOp(
  left: Series<Scalar>,
  right: Series<Scalar>,
  fn: (a: Scalar, b: Scalar) => boolean,
): Series<boolean> {
  const idx = outerUnionIndex(left.index as Index<Label>, right.index as Index<Label>);
  const lAligned = reindexSeries(left, idx, false);
  const rAligned = reindexSeries(right, idx, false);
  const result: boolean[] = lAligned.values.map((lv, i) =>
    fn(lv as Scalar, rAligned.values[i] as Scalar),
  );
  return new Series<boolean>({ data: result, index: idx, dtype: Dtype.bool });
}

// ─── DataFrame comparison ─────────────────────────────────────────────────────

/**
 * Compare a DataFrame element-wise against another DataFrame, a Series, or a scalar.
 *
 * - **vs DataFrame**: both row-index and column-index are aligned (outer join).
 * - **vs Series with `axis="columns"`** (default): the Series is broadcast across
 *   rows, matching column names.
 * - **vs Series with `axis="index"`**: the Series is broadcast across columns,
 *   matching row labels.
 * - **vs scalar**: every element is compared against the scalar.
 *
 * Mirrors `pandas.DataFrame.eq` / `ne` / `lt` / `gt` / `le` / `ge`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { compareDataFrame } from "tsb";
 *
 * const df = DataFrame.fromRecords([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
 * compareDataFrame("gt", df, 2).col("a").values; // [false, true]
 * ```
 */
export function compareDataFrame(
  op: CompareOp,
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  const fill: Scalar = options?.fillValue ?? null;

  if (other instanceof DataFrame) {
    return compareDataFrameWithDataFrame(op, left, other, fill);
  }
  if (other instanceof Series) {
    const axis = options?.axis ?? "columns";
    return axis === "columns"
      ? compareDataFrameSeriesColumns(op, left, other, fill)
      : compareDataFrameSeriesIndex(op, left, other, fill);
  }
  return compareDataFrameWithScalar(op, left, other);
}

/** Compare DataFrame vs DataFrame with alignment. */
function compareDataFrameWithDataFrame(
  op: CompareOp,
  left: DataFrame,
  right: DataFrame,
  fill: Scalar,
): DataFrame {
  const colIdx = outerUnionIndex(left.columns as Index<Label>, right.columns as Index<Label>);
  const rowIdx = outerUnionIndex(left.index as Index<Label>, right.index as Index<Label>);
  const colNames = colIdx.values as readonly string[];

  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const lCol: Series<Scalar> = left.has(col)
      ? (left.col(col) as Series<Scalar>)
      : buildNullSeries(left.index as Index<Label>, col);
    const rCol: Series<Scalar> = right.has(col)
      ? (right.col(col) as Series<Scalar>)
      : buildNullSeries(right.index as Index<Label>, col);

    const lAligned = reindexSeries(lCol, rowIdx, fill);
    const rAligned = reindexSeries(rCol, rowIdx, fill);

    const data: boolean[] = lAligned.values.map((lv, i) =>
      compareScalars(op, lv as Scalar, rAligned.values[i] as Scalar),
    );
    resultCols.set(
      col,
      new Series<boolean>({ data, index: rowIdx, dtype: Dtype.bool }) as unknown as Series<Scalar>,
    );
  }
  return new DataFrame(resultCols, rowIdx);
}

/** Compare DataFrame vs Series broadcast over columns (default). */
function compareDataFrameSeriesColumns(
  op: CompareOp,
  left: DataFrame,
  right: Series<Scalar>,
  fill: Scalar,
): DataFrame {
  const colIdx = outerUnionIndex(left.columns as Index<Label>, right.index as Index<Label>);
  const colNames = colIdx.values as readonly string[];
  const rightMap = buildLabelValueMap(right);

  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const rVal: Scalar = rightMap.has(col as Label) ? (rightMap.get(col as Label) ?? fill) : fill;
    const lCol: Series<Scalar> = left.has(col)
      ? (left.col(col) as Series<Scalar>)
      : buildNullSeries(left.index as Index<Label>, col);
    const data: boolean[] = lCol.values.map((lv) => compareScalars(op, lv as Scalar, rVal));
    resultCols.set(
      col,
      new Series<boolean>({
        data,
        index: lCol.index,
        dtype: Dtype.bool,
      }) as unknown as Series<Scalar>,
    );
  }
  return new DataFrame(resultCols, left.index);
}

/** Compare DataFrame vs Series broadcast over index. */
function compareDataFrameSeriesIndex(
  op: CompareOp,
  left: DataFrame,
  right: Series<Scalar>,
  fill: Scalar,
): DataFrame {
  const rowIdx = outerUnionIndex(left.index as Index<Label>, right.index as Index<Label>);
  const rightMap = buildLabelValueMap(right);
  const colNames = left.columns.values as readonly string[];

  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const lCol: Series<Scalar> = left.col(col) as Series<Scalar>;
    const lAligned = reindexSeries(lCol, rowIdx, fill);
    const data: boolean[] = rowIdx.values.map((rowLbl, i) => {
      const rVal: Scalar = rightMap.has(rowLbl as Label)
        ? (rightMap.get(rowLbl as Label) ?? fill)
        : fill;
      return compareScalars(op, lAligned.values[i] as Scalar, rVal);
    });
    resultCols.set(
      col,
      new Series<boolean>({ data, index: rowIdx, dtype: Dtype.bool }) as unknown as Series<Scalar>,
    );
  }
  return new DataFrame(resultCols, rowIdx);
}

/** Compare DataFrame vs a scalar. */
function compareDataFrameWithScalar(op: CompareOp, left: DataFrame, scalar: Scalar): DataFrame {
  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of left.columns.values as readonly string[]) {
    const lCol = left.col(col) as Series<Scalar>;
    const data: boolean[] = lCol.values.map((lv) => compareScalars(op, lv as Scalar, scalar));
    resultCols.set(
      col,
      new Series<boolean>({
        data,
        index: lCol.index,
        dtype: Dtype.bool,
      }) as unknown as Series<Scalar>,
    );
  }
  return new DataFrame(resultCols, left.index);
}

/** Build an all-null Series of matching length, for missing columns. */
function buildNullSeries(idx: Index<Label>, name: string): Series<Scalar> {
  return new Series<Scalar>({
    data: new Array<null>(idx.size).fill(null),
    index: idx,
    dtype: Dtype.object,
    name,
  });
}

// ─── Convenience wrappers (DataFrame) ─────────────────────────────────────────

/** Element-wise equality — returns a boolean `DataFrame`. */
export function eqDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("eq", left, other, options);
}

/** Element-wise inequality — returns a boolean `DataFrame`. */
export function neDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("ne", left, other, options);
}

/** Element-wise less-than — returns a boolean `DataFrame`. */
export function ltDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("lt", left, other, options);
}

/** Element-wise greater-than — returns a boolean `DataFrame`. */
export function gtDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("gt", left, other, options);
}

/** Element-wise less-than-or-equal — returns a boolean `DataFrame`. */
export function leDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("le", left, other, options);
}

/** Element-wise greater-than-or-equal — returns a boolean `DataFrame`. */
export function geDataFrame(
  left: DataFrame,
  other: DataFrame | Series<Scalar> | Scalar,
  options?: DataFrameCompareOptions,
): DataFrame {
  return compareDataFrame("ge", left, other, options);
}

// ─── Boolean aggregation (DataFrame) ──────────────────────────────────────────

/**
 * Return a boolean Series indicating whether **any** value in each column is truthy.
 *
 * Mirrors `pandas.DataFrame.any(axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { anyDataFrame } from "tsb";
 *
 * const df = DataFrame.fromRecords([{ a: true, b: false }, { a: false, b: false }]);
 * anyDataFrame(df).values; // [true, false]
 * ```
 */
export function anyDataFrame(df: DataFrame): Series<boolean> {
  return aggregateDataFrameBool(df, anySeries);
}

/**
 * Return a boolean Series indicating whether **all** values in each column are truthy.
 *
 * Mirrors `pandas.DataFrame.all(axis=0)`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { allDataFrame } from "tsb";
 *
 * const df = DataFrame.fromRecords([{ a: true, b: true }, { a: true, b: false }]);
 * allDataFrame(df).values; // [true, false]
 * ```
 */
export function allDataFrame(df: DataFrame): Series<boolean> {
  return aggregateDataFrameBool(df, allSeries);
}

/** Apply a Series-level boolean aggregation across all columns. */
function aggregateDataFrameBool(
  df: DataFrame,
  fn: (s: Series<Scalar>) => boolean,
): Series<boolean> {
  const colNames = df.columns.values as readonly string[];
  const data: boolean[] = colNames.map((col) => fn(df.col(col) as Series<Scalar>));
  return new Series<boolean>({
    data,
    index: df.columns as unknown as Index<Label>,
    dtype: Dtype.bool,
  });
}
