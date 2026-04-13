/**
 * astype — dtype coercion for Series and DataFrame.
 *
 * Mirrors `pandas.Series.astype` and `pandas.DataFrame.astype`:
 * cast values to a target dtype, with null/NaN passthrough semantics
 * matching pandas' default `errors="raise"` behaviour.
 *
 * @module
 */

import type { DtypeName, Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isNull(v: Scalar): v is null | undefined {
  return v === null || v === undefined;
}

/** Integer clamp ranges for each integer dtype name. */
const INT_RANGES: Readonly<Record<string, { lo: number; hi: number; unsigned: boolean }>> = {
  int8: { lo: -128, hi: 127, unsigned: false },
  int16: { lo: -32768, hi: 32767, unsigned: false },
  int32: { lo: -2147483648, hi: 2147483647, unsigned: false },
  int64: { lo: Number.MIN_SAFE_INTEGER, hi: Number.MAX_SAFE_INTEGER, unsigned: false },
  uint8: { lo: 0, hi: 255, unsigned: true },
  uint16: { lo: 0, hi: 65535, unsigned: true },
  uint32: { lo: 0, hi: 4294967295, unsigned: true },
  uint64: { lo: 0, hi: Number.MAX_SAFE_INTEGER, unsigned: true },
};

/**
 * Cast a single scalar value to the target dtype.
 *
 * Rules per dtype kind:
 * - **int/uint**: `Math.trunc(Number(v))`, clamped to the dtype range. `null/undefined → null`.
 * - **float32/float64**: `Number(v)`. `null/undefined → null`. Strings that
 *   are not parsable become `NaN` (same as pandas `errors="coerce"`-like
 *   number coercion).
 * - **bool**: falsy values → `false`; truthy → `true`. `null/undefined → null`.
 * - **string**: `String(v)`. `null/undefined → null`.
 * - **datetime**: `new Date(Number(v))` for numbers; `new Date(String(v))` for
 *   strings; `null/undefined → null`.
 * - **object/category/timedelta**: value is returned as-is (no transformation).
 */
export function castScalar(v: Scalar, dtype: Dtype): Scalar {
  if (isNull(v)) {
    return null;
  }

  const k = dtype.kind;

  if (k === "int" || k === "uint") {
    if (typeof v === "boolean") {
      return v ? 1 : 0;
    }
    if (v instanceof Date) {
      return Math.trunc(v.getTime());
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      return null;
    }
    const range = INT_RANGES[dtype.name];
    if (range === undefined) {
      return Math.trunc(n);
    }
    const t = Math.trunc(n);
    return Math.max(range.lo, Math.min(range.hi, t));
  }

  if (k === "float") {
    if (typeof v === "boolean") {
      return v ? 1.0 : 0.0;
    }
    if (v instanceof Date) {
      return v.getTime();
    }
    return Number(v);
  }

  if (k === "bool") {
    if (typeof v === "number") {
      return !Number.isNaN(v) && v !== 0;
    }
    if (v instanceof Date) {
      return true;
    }
    return Boolean(v);
  }

  if (k === "string") {
    if (v instanceof Date) {
      return v.toISOString();
    }
    return String(v);
  }

  if (k === "datetime") {
    if (v instanceof Date) {
      return v;
    }
    if (typeof v === "number") {
      return new Date(v);
    }
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // object / category / timedelta — return unchanged
  return v;
}

// ─── AstypeOptions ────────────────────────────────────────────────────────────

/** Options accepted by {@link astypeSeries} and {@link astype}. */
export interface AstypeOptions {
  /**
   * When `true`, values that cannot be cast are silently replaced with
   * `null` instead of throwing.
   *
   * @default false
   */
  readonly errors?: "raise" | "ignore";
}

// ─── astypeSeries ─────────────────────────────────────────────────────────────

/**
 * Cast a Series to a different dtype.
 *
 * Returns a new Series whose values have been coerced to `dtype`.  The index
 * and name are preserved unchanged.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1.9, 2.1, 3.7], name: "x" });
 * const si = astypeSeries(s, "int64");
 * si.values; // [1, 2, 3]
 * si.dtype.name; // "int64"
 * ```
 */
export function astypeSeries(
  s: Series<Scalar>,
  dtype: DtypeName | Dtype,
  options: AstypeOptions = {},
): Series<Scalar> {
  const targetDtype = dtype instanceof Dtype ? dtype : Dtype.from(dtype as DtypeName);
  const { errors = "raise" } = options;

  const casted: Scalar[] = [];
  for (const v of s.values) {
    let out: Scalar;
    try {
      out = castScalar(v, targetDtype);
    } catch (e) {
      if (errors === "ignore") {
        out = v;
      } else {
        throw e;
      }
    }
    casted.push(out);
  }

  return new Series<Scalar>({
    data: casted,
    index: s.index,
    dtype: targetDtype,
    name: s.name,
  });
}

// ─── DataFrame astype ─────────────────────────────────────────────────────────

/**
 * Options for {@link astype} (DataFrame variant).
 */
export interface DataFrameAstypeOptions extends AstypeOptions {
  /**
   * When `true`, only the columns listed in `dtype` (when `dtype` is a
   * `Record`) are recast; other columns are carried over unchanged.
   *
   * When `false` (default) and `dtype` is a `Record`, columns not listed
   * in the map are carried over unchanged (same behaviour).
   *
   * This option exists for pandas API compatibility.
   */
  readonly copy?: boolean;
}

/**
 * Cast one or more columns in a DataFrame to the specified dtype(s).
 *
 * - Pass a single `DtypeName` or `Dtype` to cast **all** columns.
 * - Pass a `Record<string, DtypeName | Dtype>` to cast individual columns.
 *   Columns not listed are returned unchanged.
 *
 * Returns a new DataFrame; the original is not modified.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1.5, 2.7], b: ["3", "4"] });
 *
 * // Cast all columns to float64
 * astype(df, "float64");
 *
 * // Cast only column "b" to int64
 * astype(df, { b: "int64" });
 * ```
 */
export function astype(
  df: DataFrame,
  dtype: DtypeName | Dtype | Readonly<Record<string, DtypeName | Dtype>>,
  options: DataFrameAstypeOptions = {},
): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();

  const isSingleDtype = typeof dtype === "string" || dtype instanceof Dtype;

  for (const name of df.columns.values) {
    const col = df.col(name);
    if (isSingleDtype) {
      colMap.set(name, astypeSeries(col, dtype as DtypeName | Dtype, options));
    } else {
      const mapping = dtype as Readonly<Record<string, DtypeName | Dtype>>;
      const target = mapping[name];
      if (target !== undefined) {
        colMap.set(name, astypeSeries(col, target, options));
      } else {
        colMap.set(name, col);
      }
    }
  }

  return new DataFrame(colMap, df.index);
}
