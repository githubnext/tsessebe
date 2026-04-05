/**
 * infer_objects / convert_dtypes — automatic dtype inference and conversion.
 *
 * Mirrors pandas' `Series.infer_objects()`, `DataFrame.infer_objects()`,
 * `Series.convert_dtypes()`, and `DataFrame.convert_dtypes()`.
 */

import type { Label, Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Infer the best Dtype for an array of scalars. */
interface TypeFlags {
  hasNull: boolean;
  allBool: boolean;
  allInt: boolean;
  allFloat: boolean;
  allString: boolean;
  allDate: boolean;
  empty: boolean;
}

function collectTypeFlags(values: readonly Scalar[]): TypeFlags {
  const flags: TypeFlags = {
    hasNull: false,
    allBool: true,
    allInt: true,
    allFloat: true,
    allString: true,
    allDate: true,
    empty: true,
  };
  for (const v of values) {
    if (v === null) {
      flags.hasNull = true;
      continue;
    }
    flags.empty = false;
    const t = typeof v;
    if (t !== "boolean") {
      flags.allBool = false;
    }
    if (t !== "number" || !Number.isInteger(v)) {
      flags.allInt = false;
    }
    if (t !== "number") {
      flags.allFloat = false;
    }
    if (t !== "string") {
      flags.allString = false;
    }
    if (!(v instanceof Date)) {
      flags.allDate = false;
    }
  }
  return flags;
}

export function inferDtypeFromValues(values: readonly Scalar[]): Dtype {
  const { hasNull, allBool, allInt, allFloat, allString, allDate, empty } =
    collectTypeFlags(values);
  if (empty) {
    return Dtype.object;
  }
  if (allBool) {
    return Dtype.bool;
  }
  if (allDate) {
    return Dtype.datetime;
  }
  if (allInt) {
    return hasNull ? Dtype.float64 : Dtype.int64;
  }
  if (allFloat) {
    return Dtype.float64;
  }
  if (allString) {
    return Dtype.string;
  }
  return Dtype.object;
}

function convertScalar(v: Scalar, kind: string): Scalar {
  if (v === null) {
    return null;
  }
  if (kind === "int" || kind === "uint") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (kind === "float") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (kind === "bool") {
    return Boolean(v);
  }
  if (kind === "string") {
    return String(v);
  }
  return v;
}

/** Convert scalar values to match a target dtype where possible. */
function convertValues(values: readonly Scalar[], target: Dtype): Scalar[] {
  const kind = target.kind;
  return values.map((v) => convertScalar(v, kind));
}

// ─── Series ───────────────────────────────────────────────────────────────────

/** Options for {@link inferObjectsSeries} and {@link convertDtypesSeries}. */
export interface InferObjectsOptions {
  /** Whether to return a copy even if no conversion is needed (default: true). */
  readonly copy?: boolean;
}

/**
 * Re-infer the dtype of a Series, converting object-dtype Series to the
 * best inferred type.
 *
 * Mirrors `pandas.Series.infer_objects()`.
 */
export function inferObjectsSeries<T extends Scalar>(
  series: Series<T>,
  _options?: InferObjectsOptions,
): Series<Scalar> {
  const inferred = inferDtypeFromValues(series.values as readonly Scalar[]);
  if (inferred.name === series.dtype.name) {
    return series as Series<Scalar>;
  }
  const newValues = convertValues(series.values as readonly Scalar[], inferred);
  return new Series<Scalar>({
    data: newValues,
    index: series.index,
    name: series.name ?? null,
    dtype: inferred,
  });
}

/**
 * Convert a Series to the best possible dtype.
 *
 * Mirrors `pandas.Series.convert_dtypes()`.
 */
export function convertDtypesSeries<T extends Scalar>(
  series: Series<T>,
  options?: InferObjectsOptions,
): Series<Scalar> {
  return inferObjectsSeries(series, options);
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Re-infer the dtype of each column in a DataFrame, converting object-dtype
 * columns to the best inferred type.
 *
 * Mirrors `pandas.DataFrame.infer_objects()`.
 */
export function inferObjectsDataFrame(df: DataFrame, options?: InferObjectsOptions): DataFrame {
  const cols: Record<string, readonly Scalar[]> = {};
  for (const col of df.columns.values) {
    const key = String(col as Label);
    const series = df.get(col);
    if (series === undefined) {
      continue;
    }
    const inferred = inferObjectsSeries(series, options);
    cols[key] = inferred.values as Scalar[];
  }
  return DataFrame.fromColumns(cols, { index: df.index });
}

/**
 * Convert each column of a DataFrame to the best possible dtype.
 *
 * Mirrors `pandas.DataFrame.convert_dtypes()`.
 */
export function convertDtypesDataFrame(df: DataFrame, options?: InferObjectsOptions): DataFrame {
  return inferObjectsDataFrame(df, options);
}
