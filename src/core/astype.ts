/**
 * astype — cast a Series or DataFrame to a specified dtype.
 *
 * Mirrors `pandas.Series.astype()` and `pandas.DataFrame.astype()`:
 *
 * - `astypeSeries(series, dtype)` — return a new Series with values cast to `dtype`
 * - `astypeDataFrame(df, dtype)` — return a new DataFrame with columns cast to `dtype`
 *
 * Supported targets: all `DtypeName` values (`"int64"`, `"float64"`, `"bool"`,
 * `"string"`, `"object"`, `"datetime"`, etc.).
 *
 * The `errors` option controls behaviour when a value cannot be cast:
 * - `"raise"` (default) — throw a `TypeError`.
 * - `"ignore"` — return the original value unchanged.
 *
 * @module
 */

import type { DtypeName, Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Error handling mode for failed casts. */
export type CastErrors = "raise" | "ignore";

/** Options for {@link astypeSeries}. */
export interface AstypeOptions {
  /**
   * How to handle cast failures.
   * @defaultValue `"raise"`
   */
  readonly errors?: CastErrors;
}

/** Options for {@link astypeDataFrame}. */
export type AstypeDataFrameOptions = AstypeOptions;

// ─── int clamping helpers ─────────────────────────────────────────────────────

function clampInt8(n: number): number {
  return ((((n & 0xff) + 0x80) & 0xff) - 0x80) | 0;
}

function clampInt16(n: number): number {
  return ((((n & 0xffff) + 0x8000) & 0xffff) - 0x8000) | 0;
}

function clampInt32(n: number): number {
  return n | 0;
}

function clampUint8(n: number): number {
  return (n & 0xff) >>> 0;
}

function clampUint16(n: number): number {
  return (n & 0xffff) >>> 0;
}

function clampUint32(n: number): number {
  return n >>> 0;
}

// ─── to-number helpers ────────────────────────────────────────────────────────

function stringToNumber(value: string, errors: CastErrors, targetName: DtypeName): number | null {
  const trimmed = value.trim();
  const n = Number(trimmed);
  if (trimmed === "" || Number.isNaN(n)) {
    if (errors === "raise") {
      throw new TypeError(`Cannot cast "${value}" to ${targetName}`);
    }
    return null;
  }
  return n;
}

function valueToNumber(value: Scalar, errors: CastErrors, targetName: DtypeName): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string") {
    return stringToNumber(value, errors, targetName);
  }
  if (errors === "raise") {
    throw new TypeError(`Cannot cast ${String(value)} to ${targetName}`);
  }
  return null;
}

// ─── per-kind cast helpers ────────────────────────────────────────────────────

function castToInt(value: Scalar, dtype: Dtype, errors: CastErrors): Scalar {
  const n = valueToNumber(value, errors, dtype.name);
  if (n === null) {
    return null;
  }
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    if (errors === "raise") {
      throw new TypeError(`Cannot cast ${String(value)} to integer dtype ${dtype.name}`);
    }
    return value;
  }
  const t = Math.trunc(n);
  switch (dtype.name) {
    case "int8":
      return clampInt8(t);
    case "int16":
      return clampInt16(t);
    case "int32":
      return clampInt32(t);
    case "int64":
      return t;
    case "uint8":
      return clampUint8(t);
    case "uint16":
      return clampUint16(t);
    case "uint32":
      return clampUint32(t);
    case "uint64":
      return t < 0 ? 0 : t;
    default:
      return t;
  }
}

function castToFloat(value: Scalar, dtype: Dtype, errors: CastErrors): Scalar {
  const n = valueToNumber(value, errors, dtype.name);
  if (n === null) {
    return null;
  }
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return n;
  }
  return dtype.name === "float32" ? Math.fround(n) : n;
}

function castToBool(value: Scalar, errors: CastErrors): Scalar {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0 && !Number.isNaN(value);
  }
  if (typeof value === "bigint") {
    return value !== 0n;
  }
  if (value instanceof Date) {
    return true;
  }
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "") {
      return false;
    }
    return true;
  }
  if (errors === "raise") {
    throw new TypeError(`Cannot cast ${String(value)} to bool`);
  }
  return value;
}

function castToString(value: Scalar): Scalar {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function castToDatetime(value: Scalar, errors: CastErrors): Scalar {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  if (typeof value === "bigint") {
    return new Date(Number(value));
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      if (errors === "raise") {
        throw new TypeError(`Cannot parse "${value}" as datetime`);
      }
      return value;
    }
    return d;
  }
  if (errors === "raise") {
    throw new TypeError(`Cannot cast ${String(value)} to datetime`);
  }
  return value;
}

// ─── castScalar ───────────────────────────────────────────────────────────────

/**
 * Cast a single scalar value to the given dtype.
 *
 * @throws {TypeError} when `errors === "raise"` and the cast fails.
 */
export function castScalar(value: Scalar, dtype: Dtype, errors: CastErrors = "raise"): Scalar {
  if (value === null || value === undefined) {
    return null;
  }
  const { kind } = dtype;
  if (kind === "int" || kind === "uint") {
    return castToInt(value, dtype, errors);
  }
  if (kind === "float") {
    return castToFloat(value, dtype, errors);
  }
  if (kind === "bool") {
    return castToBool(value, errors);
  }
  if (kind === "string") {
    return castToString(value);
  }
  if (kind === "datetime") {
    return castToDatetime(value, errors);
  }
  // object / category / timedelta — identity
  return value;
}

// ─── astypeSeries ────────────────────────────────────────────────────────────

/**
 * Return a new Series with all values cast to `dtype`.
 *
 * @param series  - The source series.
 * @param dtype   - Target dtype: a `DtypeName` string or a `Dtype` instance.
 * @param options - Cast behaviour options.
 *
 * @example
 * ```ts
 * import { Series, astypeSeries } from "tsb";
 *
 * const s = new Series({ data: [1.5, 2.7, 3.9], name: "x" });
 * const asInt = astypeSeries(s, "int64");
 * // → Series [1, 2, 3]
 * ```
 */
export function astypeSeries(
  series: Series<Scalar>,
  dtype: DtypeName | Dtype,
  options?: AstypeOptions,
): Series<Scalar> {
  const targetDtype = dtype instanceof Dtype ? dtype : Dtype.from(dtype);
  const errors: CastErrors = options?.errors ?? "raise";

  const castedData = series.values.map((v) => castScalar(v, targetDtype, errors));

  return new Series<Scalar>({
    data: castedData,
    index: series.index,
    dtype: targetDtype,
    name: series.name,
  });
}

// ─── astypeDataFrame ─────────────────────────────────────────────────────────

/**
 * Return a new DataFrame with columns cast to `dtype`.
 *
 * When `dtype` is a `DtypeName` or `Dtype`, **every** column is cast.
 * When `dtype` is a `Record<string, DtypeName | Dtype>`, **only the named
 * columns** are cast; all others pass through unchanged.
 *
 * @example
 * ```ts
 * import { DataFrame, astypeDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1.5, 2.7], b: ["3", "4"] });
 * const df2 = astypeDataFrame(df, "float64");        // all columns → float64
 * const df3 = astypeDataFrame(df, { b: "int64" });   // only "b" → int64
 * ```
 */
export function astypeDataFrame(
  df: DataFrame,
  dtype: DtypeName | Dtype | Readonly<Record<string, DtypeName | Dtype>>,
  options?: AstypeDataFrameOptions,
): DataFrame {
  const errors: CastErrors = options?.errors ?? "raise";

  const isPerColumn =
    !(dtype instanceof Dtype) && typeof dtype === "object" && !(dtype instanceof Date);

  const newColMap = new Map<string, Series<Scalar>>();

  for (const colName of df.columns.values) {
    const col = df.col(colName);

    if (isPerColumn) {
      const spec = (dtype as Readonly<Record<string, DtypeName | Dtype>>)[colName];
      if (spec === undefined) {
        newColMap.set(colName, col);
        continue;
      }
      const targetDtype = spec instanceof Dtype ? spec : Dtype.from(spec);
      newColMap.set(colName, astypeSeries(col, targetDtype, { errors }));
    } else {
      const targetDtype = dtype instanceof Dtype ? dtype : Dtype.from(dtype as DtypeName);
      newColMap.set(colName, astypeSeries(col, targetDtype, { errors }));
    }
  }

  return new DataFrame(newColMap, df.index);
}
