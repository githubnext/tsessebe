/**
 * notna_isna — module-level missing-value utilities.
 *
 * Mirrors the pandas top-level functions:
 * - `pd.isna(obj)`  / `pd.isnull(obj)`  — detect missing values
 * - `pd.notna(obj)` / `pd.notnull(obj)` — detect non-missing values
 * - `pd.array_isna(arr)` — convenience wrapper for arrays
 *
 * Plus standalone `fillna` and `dropna` that operate on scalars, arrays,
 * `Series`, and `DataFrame` without requiring a method call.
 *
 * ### What counts as "missing"?
 * - `null`
 * - `undefined`
 * - `NaN` (IEEE 754 `number`)
 *
 * Everything else — including `0`, `false`, `""`, `0n`, `new Date(NaN)` — is
 * treated as **not** missing.  (`Date(NaN)` has NaN time but is a valid object,
 * matching pandas semantics where `NaT` is only produced by explicit
 * datetime constructors.)
 *
 * ### Overloads
 *
 * | Input type         | Return type         |
 * |--------------------|---------------------|
 * | `Scalar`           | `boolean`           |
 * | `readonly Scalar[]`| `boolean[]`         |
 * | `Series<Scalar>`   | `Series<boolean>`   |
 * | `DataFrame`        | `DataFrame`         |
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── primitive helper ─────────────────────────────────────────────────────────

/** True when `v` is null, undefined, or NaN. */
function scalarIsna(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Union of all input types accepted by `isna` / `notna`. */
export type IsnaInput = Scalar | readonly Scalar[] | Series<Scalar> | DataFrame;

/** Options for standalone `fillna`. */
export interface FillnaOptions {
  /**
   * The value used to replace missing entries.
   * Must be compatible with the element type.
   */
  value: Scalar;
}

/** Options for standalone `dropna`. */
export interface DropnaOptions {
  /**
   * Only used for DataFrame inputs.
   * - `"any"` (default) — drop a row if **any** column is missing
   * - `"all"` — drop a row only if **all** columns are missing
   */
  how?: "any" | "all";
  /**
   * `axis=0` (default) — drop rows that contain missing values.
   * `axis=1` — drop columns that contain missing values.
   */
  axis?: 0 | 1;
}

// ─── isna overloads ───────────────────────────────────────────────────────────

/**
 * Detect missing values in a scalar, array, Series, or DataFrame.
 *
 * Returns `true` for `null`, `undefined`, and `NaN`; `false` for everything
 * else.
 *
 * @example
 * ```ts
 * import { isna } from "tsb";
 *
 * isna(null);         // true
 * isna(0);            // false
 * isna([1, null, NaN]); // [false, true, true]
 * ```
 */
export function isna(obj: Scalar): boolean;
/** @overload */
export function isna(obj: readonly Scalar[]): boolean[];
/** @overload */
export function isna(obj: Series<Scalar>): Series<boolean>;
/** @overload */
export function isna(obj: DataFrame): DataFrame;
export function isna(
  obj: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<boolean> | DataFrame {
  if (obj instanceof DataFrame) {
    return obj.isna();
  }
  if (obj instanceof Series) {
    return obj.isna();
  }
  if (Array.isArray(obj)) {
    return (obj as readonly Scalar[]).map(scalarIsna);
  }
  return scalarIsna(obj as Scalar);
}

// ─── notna overloads ──────────────────────────────────────────────────────────

/**
 * Detect non-missing values — the inverse of {@link isna}.
 *
 * Returns `false` for `null`, `undefined`, and `NaN`; `true` for everything
 * else.
 *
 * @example
 * ```ts
 * import { notna } from "tsb";
 *
 * notna(null);           // false
 * notna(42);             // true
 * notna([1, null, NaN]); // [true, false, false]
 * ```
 */
export function notna(obj: Scalar): boolean;
/** @overload */
export function notna(obj: readonly Scalar[]): boolean[];
/** @overload */
export function notna(obj: Series<Scalar>): Series<boolean>;
/** @overload */
export function notna(obj: DataFrame): DataFrame;
export function notna(
  obj: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<boolean> | DataFrame {
  if (obj instanceof DataFrame) {
    return obj.notna();
  }
  if (obj instanceof Series) {
    return obj.notna();
  }
  if (Array.isArray(obj)) {
    return (obj as readonly Scalar[]).map((v) => !scalarIsna(v));
  }
  return !scalarIsna(obj as Scalar);
}

// ─── pandas-compatible aliases ────────────────────────────────────────────────

/**
 * Alias for {@link isna}.  Mirrors `pandas.isnull`.
 * @see isna
 */
export function isnull(obj: Scalar): boolean;
/** @overload */
export function isnull(obj: readonly Scalar[]): boolean[];
/** @overload */
export function isnull(obj: Series<Scalar>): Series<boolean>;
/** @overload */
export function isnull(obj: DataFrame): DataFrame;
export function isnull(
  obj: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<boolean> | DataFrame {
  return isna(obj as Parameters<typeof isna>[0]);
}

/**
 * Alias for {@link notna}.  Mirrors `pandas.notnull`.
 * @see notna
 */
export function notnull(obj: Scalar): boolean;
/** @overload */
export function notnull(obj: readonly Scalar[]): boolean[];
/** @overload */
export function notnull(obj: Series<Scalar>): Series<boolean>;
/** @overload */
export function notnull(obj: DataFrame): DataFrame;
export function notnull(
  obj: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
): boolean | boolean[] | Series<boolean> | DataFrame {
  return notna(obj as Parameters<typeof notna>[0]);
}

// ─── standalone fillna ────────────────────────────────────────────────────────

/**
 * Replace missing values with a fill value.
 *
 * Standalone equivalent of `Series.fillna()` / `DataFrame.fillna()`.
 * Also handles bare arrays and scalars for convenience.
 *
 * @example
 * ```ts
 * import { fillna } from "tsb";
 *
 * fillna([1, null, NaN, 3], { value: 0 }); // [1, 0, 0, 3]
 * ```
 */
export function fillna(obj: Scalar, opts: FillnaOptions): Scalar;
/** @overload */
export function fillna(obj: readonly Scalar[], opts: FillnaOptions): Scalar[];
/** @overload */
export function fillna(obj: Series<Scalar>, opts: FillnaOptions): Series<Scalar>;
/** @overload */
export function fillna(obj: DataFrame, opts: FillnaOptions): DataFrame;
export function fillna(
  obj: Scalar | readonly Scalar[] | Series<Scalar> | DataFrame,
  opts: FillnaOptions,
): Scalar | Scalar[] | Series<Scalar> | DataFrame {
  const { value } = opts;
  if (obj instanceof DataFrame) {
    return obj.fillna(value);
  }
  if (obj instanceof Series) {
    return obj.fillna(value);
  }
  if (Array.isArray(obj)) {
    return (obj as readonly Scalar[]).map((v) => (scalarIsna(v) ? value : v));
  }
  const s = obj as Scalar;
  return scalarIsna(s) ? value : s;
}

// ─── standalone dropna ────────────────────────────────────────────────────────

/**
 * Remove missing values from an array, Series, or DataFrame.
 *
 * Standalone equivalent of `Series.dropna()` / `DataFrame.dropna()`.
 *
 * For DataFrames, the `how` and `axis` options control which rows/columns are
 * dropped (defaults: `how="any"`, `axis=0`).
 *
 * @example
 * ```ts
 * import { dropna } from "tsb";
 *
 * dropna([1, null, NaN, 3]); // [1, 3]
 * ```
 */
export function dropna(obj: readonly Scalar[], opts?: DropnaOptions): Scalar[];
/** @overload */
export function dropna(obj: Series<Scalar>, opts?: DropnaOptions): Series<Scalar>;
/** @overload */
export function dropna(obj: DataFrame, opts?: DropnaOptions): DataFrame;
export function dropna(
  obj: readonly Scalar[] | Series<Scalar> | DataFrame,
  opts: DropnaOptions = {},
): Scalar[] | Series<Scalar> | DataFrame {
  const how: "any" | "all" = opts.how ?? "any";
  const axis: 0 | 1 = opts.axis ?? 0;

  if (obj instanceof DataFrame) {
    return _dataFrameDropna(obj, how, axis);
  }
  if (obj instanceof Series) {
    return obj.dropna();
  }
  // plain array
  return (obj as readonly Scalar[]).filter((v) => !scalarIsna(v));
}

// ─── DataFrame dropna helpers ─────────────────────────────────────────────────

function _dataFrameDropna(df: DataFrame, how: "any" | "all", axis: 0 | 1): DataFrame {
  if (axis === 1) {
    return _dropnaColumns(df, how);
  }
  return _dropnaRows(df, how);
}

function _dropnaRows(df: DataFrame, how: "any" | "all"): DataFrame {
  const nRows = df.index.size;
  const colNames = df.columns.values as string[];
  const keep: number[] = [];

  for (let i = 0; i < nRows; i++) {
    const rowMissing: boolean[] = colNames.map((col) => scalarIsna(df.col(col).iat(i)));

    const shouldDrop = how === "any" ? rowMissing.some(Boolean) : rowMissing.every(Boolean);

    if (!shouldDrop) {
      keep.push(i);
    }
  }

  // Rebuild DataFrame with kept rows
  const colMap = new Map<string, Series<Scalar>>();
  const keptLabels: Label[] = keep.map((i) => df.index.at(i));
  const newIndex = new Index<Label>(keptLabels);
  for (const name of colNames) {
    const series = df.col(name);
    const keptValues: Scalar[] = keep.map((i) => series.iat(i));
    colMap.set(
      name,
      new Series<Scalar>({
        data: keptValues,
        index: newIndex,
        dtype: series.dtype,
        name,
      }),
    );
  }
  return new DataFrame(colMap, newIndex);
}

function _dropnaColumns(df: DataFrame, how: "any" | "all"): DataFrame {
  const colNames = df.columns.values as string[];
  const colMap = new Map<string, Series<Scalar>>();

  for (const name of colNames) {
    const series = df.col(name);
    const vals = series.values;
    const missingFlags = vals.map(scalarIsna);

    const shouldDrop = how === "any" ? missingFlags.some(Boolean) : missingFlags.every(Boolean);

    if (!shouldDrop) {
      colMap.set(name, series);
    }
  }
  return new DataFrame(colMap, df.index);
}

// ─── countna / countValid helpers ─────────────────────────────────────────────

/**
 * Count missing values in an array or Series.
 *
 * Mirrors `Series.isna().sum()` but without constructing an intermediate
 * boolean Series.
 *
 * @example
 * ```ts
 * import { countna } from "tsb";
 *
 * countna([1, null, NaN, 3]); // 2
 * ```
 */
export function countna(obj: readonly Scalar[] | Series<Scalar>): number {
  const vals: readonly Scalar[] = obj instanceof Series ? obj.values : obj;
  return vals.reduce<number>((acc, v) => acc + (scalarIsna(v) ? 1 : 0), 0);
}

/**
 * Count non-missing values in an array or Series.
 *
 * Mirrors `Series.count()`.
 *
 * @example
 * ```ts
 * import { countValid } from "tsb";
 *
 * countValid([1, null, NaN, 3]); // 2
 * ```
 */
export function countValid(obj: readonly Scalar[] | Series<Scalar>): number {
  const vals: readonly Scalar[] = obj instanceof Series ? obj.values : obj;
  return vals.reduce<number>((acc, v) => acc + (scalarIsna(v) ? 0 : 1), 0);
}
