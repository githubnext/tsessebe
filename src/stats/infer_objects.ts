/**
 * infer_objects — infer better dtypes for object-typed Series/DataFrame columns.
 *
 * Mirrors `pandas.Series.infer_objects` and `pandas.DataFrame.infer_objects`,
 * plus the related `pandas.api.types.convert_dtypes`.
 *
 * - {@link inferObjectsSeries}: attempt to infer a better dtype for a Series
 * - {@link inferObjectsDataFrame}: apply `inferObjectsSeries` to every column
 * - {@link convertDtypesSeries}: convert a Series to the best possible dtype
 * - {@link convertDtypesDataFrame}: apply `convertDtypesSeries` to every column
 *
 * @example
 * ```ts
 * import { Series, DataFrame, inferObjectsSeries, convertDtypesSeries } from "tsb";
 *
 * // Object-typed Series holding numeric strings → float
 * const s = new Series({ data: [1, 2, 3], dtype: Dtype.object });
 * inferObjectsSeries(s).dtype.kind; // "int"
 *
 * // All-null object series → remains object
 * const nulls = new Series({ data: [null, null] });
 * inferObjectsSeries(nulls).dtype.name; // "object"
 *
 * // String numerics → convert to float
 * convertDtypesSeries(new Series({ data: ["1", "2.5", "3"] }));
 * // Series([1, 2.5, 3], dtype=float64)
 * ```
 *
 * @module
 */

import { DataFrame, Dtype, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value is null/undefined/NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** True when the value is a whole-number finite number or bigint. */
function isInteger(v: Scalar): boolean {
  if (typeof v === "bigint") {
    return true;
  }
  if (typeof v === "number") {
    return Number.isFinite(v) && Math.floor(v) === v;
  }
  return false;
}

/** True when the value is a finite float (not whole). */
function isFloat(v: Scalar): boolean {
  return typeof v === "number" && Number.isFinite(v) && Math.floor(v) !== v;
}

/**
 * Determine the best `Dtype` for an array of values.
 *
 * Returns `null` if the array is empty or all-null (no inference possible).
 */
function inferBestDtype(values: readonly Scalar[]): Dtype | null {
  let hasInt = false;
  let hasFloat = false;
  let hasBool = false;
  let hasString = false;
  let hasOther = false;
  let nonNullCount = 0;

  for (const v of values) {
    if (isMissing(v)) {
      continue;
    }
    nonNullCount++;
    if (typeof v === "boolean") {
      hasBool = true;
    } else if (typeof v === "string") {
      hasString = true;
    } else if (isFloat(v)) {
      hasFloat = true;
    } else if (isInteger(v)) {
      hasInt = true;
    } else {
      hasOther = true;
    }
  }

  if (nonNullCount === 0) {
    return null;
  }
  if (hasOther) {
    return null; // objects, dates, etc. — can't safely infer
  }

  const typeCount = (hasBool ? 1 : 0) + (hasString ? 1 : 0) + (hasInt ? 1 : 0) + (hasFloat ? 1 : 0);
  if (typeCount > 1) {
    return null; // mixed types
  }

  if (hasBool) {
    return Dtype.from("bool");
  }
  if (hasInt) {
    return Dtype.from("int64");
  }
  if (hasFloat) {
    return Dtype.from("float64");
  }
  if (hasString) {
    return Dtype.from("string");
  }

  return null;
}

/**
 * Try to convert a string value to a number.
 * Returns the number if successful, null otherwise.
 */
function tryParseNumber(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "nan" || trimmed === "NaN") {
    return Number.NaN;
  }
  if (trimmed === "inf" || trimmed === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }
  if (trimmed === "-inf" || trimmed === "-Infinity") {
    return Number.NEGATIVE_INFINITY;
  }
  const n = Number(trimmed);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

// ─── infer_objects ────────────────────────────────────────────────────────────

/**
 * Options for {@link inferObjectsSeries} and {@link inferObjectsDataFrame}.
 */
export interface InferObjectsOptions {
  /**
   * Only convert `object`-dtype columns/Series.
   * When `false`, attempt inference on all columns regardless of dtype.
   * Default: `true` (mirrors pandas default).
   */
  readonly objectOnly?: boolean;
}

/**
 * Attempt to infer a better dtype for an object-typed Series.
 *
 * Mirrors `pandas.Series.infer_objects`. For non-object Series, returns the
 * original unchanged (unless `options.objectOnly` is `false`).
 *
 * @param s - The Series to process.
 * @param options - Optional settings.
 * @returns A new Series with an inferred dtype, or the original if no better
 *          type can be determined.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], dtype: Dtype.object });
 * inferObjectsSeries(s).dtype.kind; // "int"
 * ```
 */
export function inferObjectsSeries(
  s: Series<Scalar>,
  options?: InferObjectsOptions,
): Series<Scalar> {
  const objectOnly = options?.objectOnly ?? true;

  if (objectOnly && s.dtype.kind !== "object") {
    return s;
  }

  const inferred = inferBestDtype(s.values);
  if (inferred === null || inferred === s.dtype) {
    return s;
  }

  return new Series<Scalar>({
    data: s.values,
    index: s.index,
    dtype: inferred,
    name: s.name,
  });
}

/**
 * Attempt to infer better dtypes for all columns in a DataFrame.
 *
 * Mirrors `pandas.DataFrame.infer_objects`. Each column is processed
 * independently via {@link inferObjectsSeries}.
 *
 * @param df - The DataFrame to process.
 * @param options - Optional settings.
 * @returns A new DataFrame with inferred dtypes for each column.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 * inferObjectsDataFrame(df); // same data, refined dtypes
 * ```
 */
export function inferObjectsDataFrame(df: DataFrame, options?: InferObjectsOptions): DataFrame {
  const colData: Record<string, readonly Scalar[]> = {};
  for (const col of df.columns.values) {
    const inferred = inferObjectsSeries(df.col(col), options);
    colData[col] = inferred.values;
  }
  return DataFrame.fromColumns(colData, { index: df.index });
}

// ─── convert_dtypes ───────────────────────────────────────────────────────────

/**
 * Options for {@link convertDtypesSeries} and {@link convertDtypesDataFrame}.
 */
export interface ConvertDtypesOptions {
  /**
   * When `true`, attempt to parse string values as numbers.
   * Default: `true`.
   */
  readonly convertString?: boolean;
  /**
   * When `true`, convert integer columns to float when nulls are present
   * (since null cannot be represented in integer arrays — mirrors pandas NA
   * handling for nullable integers).
   * Default: `false` (keep as int; null stays as null).
   */
  readonly convertIntegerToFloat?: boolean;
}

/**
 * Convert a Series to the best possible dtype.
 *
 * Mirrors `pandas.Series.convert_dtypes`:
 * - `object` → tries bool, int, float, string
 * - `string` → tries to parse as number (if `convertString`)
 * - `int` or `float` → returns unchanged (already best numeric type)
 * - `bool` → returns unchanged
 *
 * Unlike pandas, this does not require nullable-int or StringDtype extensions.
 * All conversions stay within the existing tsb type system.
 *
 * @param s - The Series to convert.
 * @param options - Conversion options.
 * @returns A new Series with the best inferred dtype.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["1", "2.5", "3"] });
 * convertDtypesSeries(s).dtype.kind; // "float"
 * convertDtypesSeries(s).values;     // [1, 2.5, 3]
 * ```
 */
export function convertDtypesSeries(
  s: Series<Scalar>,
  options?: ConvertDtypesOptions,
): Series<Scalar> {
  const convertString = options?.convertString ?? true;
  const convertIntToFloat = options?.convertIntegerToFloat ?? false;

  const kind = s.dtype.kind;

  // Numeric / bool: check if we need to convert ints to float for null values.
  if (kind === "int" || kind === "uint") {
    if (convertIntToFloat) {
      const hasNull = s.values.some(isMissing);
      if (hasNull) {
        return new Series<Scalar>({
          data: s.values.map((v) => (isMissing(v) ? null : (v as unknown as number))),
          index: s.index,
          dtype: Dtype.from("float64"),
          name: s.name,
        });
      }
    }
    return s;
  }

  if (kind === "float" || kind === "bool") {
    return s;
  }

  // String dtype: try numeric parse.
  if (kind === "string") {
    if (!convertString) {
      return s;
    }
    return tryConvertStringToNumeric(s);
  }

  // Object dtype: try full inference, including string → numeric.
  if (kind === "object") {
    // First try direct type inference (handles int/float/bool already).
    const inferred = inferObjectsSeries(s, { objectOnly: false });
    if (inferred.dtype !== s.dtype) {
      if (convertString && inferred.dtype.kind === "string") {
        return tryConvertStringToNumeric(inferred);
      }
      return inferred;
    }

    // If the values are all strings (or null), try string → numeric.
    if (convertString) {
      const allStringOrNull = s.values.every((v) => isMissing(v) || typeof v === "string");
      if (allStringOrNull) {
        const asSeries = new Series<Scalar>({
          data: s.values,
          index: s.index,
          dtype: Dtype.from("string"),
          name: s.name,
        });
        return tryConvertStringToNumeric(asSeries);
      }
    }

    return inferred;
  }

  // datetime, timedelta, category: return unchanged.
  return s;
}

/** Internal: try converting a string-typed Series to float or int. */
function tryConvertStringToNumeric(s: Series<Scalar>): Series<Scalar> {
  const values = s.values;
  const converted: Scalar[] = new Array<Scalar>(values.length);
  let allInt = true;
  let allNumeric = true;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isMissing(v)) {
      converted[i] = null;
      continue;
    }
    if (typeof v !== "string") {
      allNumeric = false;
      break;
    }
    const n = tryParseNumber(v);
    if (n === null) {
      allNumeric = false;
      break;
    }
    converted[i] = n;
    if (!(Number.isNaN(n) || Number.isFinite(n))) {
      // Infinity — treat as float
      allInt = false;
    } else if (Number.isFinite(n) && Math.floor(n) !== n) {
      allInt = false;
    }
  }

  if (!allNumeric) {
    return s;
  }

  const dtype = allInt ? Dtype.from("int64") : Dtype.from("float64");
  return new Series<Scalar>({
    data: converted,
    index: s.index,
    dtype,
    name: s.name,
  });
}

/**
 * Convert all columns in a DataFrame to their best possible dtypes.
 *
 * Mirrors `pandas.DataFrame.convert_dtypes`.
 *
 * @param df - The DataFrame to convert.
 * @param options - Conversion options.
 * @returns A new DataFrame with each column converted.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: ["1", "2"], b: [true, false] });
 * convertDtypesDataFrame(df).col("a").dtype.kind; // "int"
 * ```
 */
export function convertDtypesDataFrame(df: DataFrame, options?: ConvertDtypesOptions): DataFrame {
  const colData: Record<string, readonly Scalar[]> = {};
  for (const col of df.columns.values) {
    const converted = convertDtypesSeries(df.col(col), options);
    colData[col] = converted.values;
  }
  return DataFrame.fromColumns(colData, { index: df.index });
}
