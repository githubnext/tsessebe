/**
 * convert_dtypes — convert a Series or DataFrame to the best possible dtypes.
 *
 * Mirrors `pandas.Series.convert_dtypes()` and
 * `pandas.DataFrame.convert_dtypes()`.
 *
 * For each column (or the Series itself) the function inspects all non-null
 * values and selects the narrowest appropriate dtype:
 *
 * | Non-null values                          | Result dtype     |
 * |------------------------------------------|------------------|
 * | All `boolean`                            | `"bool"`         |
 * | All whole-number `number` (no fraction)  | `"int64"`        |
 * | All `number` (finite or NaN)             | `"float64"`      |
 * | All `string`                             | `"string"`       |
 * | Mix / other                              | `"object"`       |
 *
 * Null / undefined values are **always** preserved as `null` and do not affect
 * type inference.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, convertDtypes, dataFrameConvertDtypes } from "tsb";
 *
 * const s = new Series({ data: [1.0, 2.0, null, 3.0] });
 * // s.dtype.name === "float64" (raw floats)
 * const s2 = convertDtypes(s);
 * // s2.dtype.name === "int64"  (all non-null values are whole numbers)
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
 * const df2 = dataFrameConvertDtypes(df);
 * // df2.col("a").dtype.name === "int64"
 * // df2.col("b").dtype.name === "string"
 * ```
 *
 * @module
 */

import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";
import { Dtype } from "./dtype.ts";
import type { DtypeName, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options accepted by {@link convertDtypes} and {@link dataFrameConvertDtypes}. */
export interface ConvertDtypesOptions {
  /**
   * When `true` (default), attempt to infer better types for columns that are
   * currently stored as `"object"` dtype.
   * @defaultValue `true`
   */
  readonly inferObjects?: boolean;
  /**
   * When `true` (default), convert string-like columns to `"string"` dtype.
   * @defaultValue `true`
   */
  readonly convertString?: boolean;
  /**
   * When `true` (default), convert numeric columns with no fractional part to
   * integer dtype `"int64"`.
   * @defaultValue `true`
   */
  readonly convertInteger?: boolean;
  /**
   * When `true` (default), convert boolean columns to `"bool"` dtype.
   * @defaultValue `true`
   */
  readonly convertBoolean?: boolean;
  /**
   * When `true` (default), convert floating-point columns to `"float64"` dtype.
   * @defaultValue `true`
   */
  readonly convertFloating?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is null or undefined. */
function isNull(v: Scalar): v is null | undefined {
  return v === null || v === undefined;
}

/** True when the number has no fractional part (i.e. is a whole number). */
function isWholeNumber(n: number): boolean {
  return Number.isFinite(n) && Math.floor(n) === n;
}

/**
 * Infer the best dtype for an array of scalar values.
 *
 * Non-null values drive the decision; nulls are ignored.
 * Returns `null` if all values are null/undefined (the column stays as-is).
 */
function inferBestDtype(
  values: readonly Scalar[],
  opts: Required<ConvertDtypesOptions>,
): DtypeName | null {
  let allBool = true;
  let allInt = true;
  let allFloat = true;
  let allString = true;
  let hasNonNull = false;

  for (const v of values) {
    if (isNull(v)) continue;
    hasNonNull = true;

    const t = typeof v;
    if (t !== "boolean") allBool = false;
    if (t !== "number" || !isWholeNumber(v as number)) allInt = false;
    if (t !== "number") allFloat = false;
    if (t !== "string") allString = false;
  }

  if (!hasNonNull) return null;

  if (allBool && opts.convertBoolean) return "bool";
  if (allInt && opts.convertInteger) return "int64";
  // allFloat is true for whole-number columns too; check AFTER allInt so whole
  // numbers are promoted to int64, not float64.
  if (allFloat && opts.convertFloating) return "float64";
  if (allString && opts.convertString) return "string";

  return "object";
}

/** Cast a single value to the target dtype. Nulls always become null. */
function castValue(v: Scalar, dtype: DtypeName): Scalar {
  if (isNull(v)) return null;
  switch (dtype) {
    case "bool":
      return Boolean(v);
    case "int64": {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    case "float64":
      return Number(v);
    case "string":
      return String(v);
    default:
      return v;
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Convert a {@link Series} to the best possible dtype.
 *
 * @param series  - Input Series (not mutated).
 * @param options - Conversion options.
 * @returns       A new Series with the inferred dtype applied.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1.0, 2.0, 3.0] });
 * const s2 = convertDtypes(s);
 * // s2.dtype.name === "int64"
 * ```
 */
export function convertDtypes(
  series: Series<Scalar>,
  options?: ConvertDtypesOptions,
): Series<Scalar> {
  const opts: Required<ConvertDtypesOptions> = {
    inferObjects: options?.inferObjects ?? true,
    convertString: options?.convertString ?? true,
    convertInteger: options?.convertInteger ?? true,
    convertBoolean: options?.convertBoolean ?? true,
    convertFloating: options?.convertFloating ?? true,
  };

  const values = series.values;
  const dtype = inferBestDtype(values, opts);

  if (dtype === null) {
    // All-null column — return a copy with no dtype change
    return new Series<Scalar>({
      data: values.map(() => null),
      index: series.index,
      name: series.name,
      dtype: series.dtype,
    });
  }

  const cast = values.map((v) => castValue(v, dtype));
  return new Series<Scalar>({
    data: cast,
    index: series.index,
    name: series.name,
    dtype: Dtype.from(dtype),
  });
}

/**
 * Convert each column of a {@link DataFrame} to the best possible dtype.
 *
 * Applies {@link convertDtypes} independently to every column and assembles
 * a new DataFrame with the converted columns.
 *
 * @param df      - Input DataFrame (not mutated).
 * @param options - Conversion options.
 * @returns       A new DataFrame with inferred dtypes.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   a: [1.0, 2.0, 3.0],
 *   b: ["x", "y", "z"],
 *   c: [true, false, true],
 * });
 * const df2 = dataFrameConvertDtypes(df);
 * // df2.col("a").dtype.name === "int64"
 * // df2.col("b").dtype.name === "string"
 * // df2.col("c").dtype.name === "bool"
 * ```
 */
export function dataFrameConvertDtypes(
  df: DataFrame,
  options?: ConvertDtypesOptions,
): DataFrame {
  const colNames = df.columns.values as string[];
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    colMap.set(name, convertDtypes(df.col(name), options));
  }
  return new DataFrame(colMap, df.index);
}
