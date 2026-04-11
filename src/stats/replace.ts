/**
 * replace — value substitution for Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.replace(to_replace, value)` / `Series.replace(mapping)`
 * - `DataFrame.replace(to_replace, value)` / `DataFrame.replace(mapping)`
 *
 * Supported replacement specs:
 * - **Scalar → Scalar**: replace every occurrence of one value with another.
 * - **Array → Scalar**: replace every value in the array with a single value.
 * - **Array → Array**: pair-wise replacement (must be same length).
 * - **Record / Map**: lookup-table replacement (`{ old: new, ... }`).
 *
 * All functions are **pure** (return new objects; inputs are unchanged).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** A lookup table mapping old values to new values. */
export type ReplaceMapping = Readonly<Record<string, Scalar>> | ReadonlyMap<Scalar, Scalar>;

/**
 * Replacement specification accepted by {@link replaceSeries} /
 * {@link replaceDataFrame}.
 *
 * Mirrors the first two positional args of `pandas.Series.replace`.
 */
export type ReplaceSpec =
  | { readonly toReplace: Scalar; readonly value: Scalar }
  | { readonly toReplace: readonly Scalar[]; readonly value: Scalar }
  | { readonly toReplace: readonly Scalar[]; readonly value: readonly Scalar[] }
  | { readonly toReplace: ReplaceMapping };

/** Options shared by {@link replaceSeries} and {@link replaceDataFrame}. */
export interface ReplaceOptions {
  /**
   * When `true`, treat `NaN` values as equal for matching purposes.
   * Default `true`.
   */
  readonly matchNaN?: boolean;
}

/** Options for {@link replaceDataFrame}. */
export interface DataFrameReplaceOptions extends ReplaceOptions {
  /**
   * If provided, only replace values in these column names.
   * By default all columns are processed.
   */
  readonly columns?: readonly string[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `a` and `b` are equal (with optional NaN=NaN equality). */
function scalarEq(a: Scalar, b: Scalar, matchNaN: boolean): boolean {
  if (
    matchNaN &&
    typeof a === "number" &&
    typeof b === "number" &&
    Number.isNaN(a) &&
    Number.isNaN(b)
  ) {
    return true;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return a === b;
}

/**
 * Build a replacement function from a {@link ReplaceSpec}.
 * Returns `(v) => new_value` or `v` unchanged if no match.
 */
function buildReplacer(spec: ReplaceSpec, matchNaN: boolean): (v: Scalar) => Scalar {
  // Mapping variant
  if (
    "toReplace" in spec &&
    !Array.isArray(spec.toReplace) &&
    typeof spec.toReplace === "object" &&
    spec.toReplace !== null &&
    !(spec.toReplace instanceof Map) &&
    !("value" in spec)
  ) {
    // Record<string, Scalar>
    const rec = spec.toReplace as Readonly<Record<string, Scalar>>;
    return (v: Scalar): Scalar => {
      const key = String(v);
      return Object.prototype.hasOwnProperty.call(rec, key) ? (rec[key] as Scalar) : v;
    };
  }

  if ("toReplace" in spec && spec.toReplace instanceof Map) {
    const map = spec.toReplace as ReadonlyMap<Scalar, Scalar>;
    return (v: Scalar): Scalar => {
      for (const [k, val] of map) {
        if (scalarEq(v, k, matchNaN)) {
          return val;
        }
      }
      return v;
    };
  }

  // Mapping passed via { toReplace: mapping } shape
  if ("toReplace" in spec && !("value" in spec)) {
    const mapping = spec.toReplace as ReplaceMapping;
    if (mapping instanceof Map) {
      const map = mapping as ReadonlyMap<Scalar, Scalar>;
      return (v: Scalar): Scalar => {
        for (const [k, val] of map) {
          if (scalarEq(v, k, matchNaN)) {
            return val;
          }
        }
        return v;
      };
    }
    const rec = mapping as Readonly<Record<string, Scalar>>;
    return (v: Scalar): Scalar => {
      const key = String(v);
      return Object.prototype.hasOwnProperty.call(rec, key) ? (rec[key] as Scalar) : v;
    };
  }

  const s = spec as { toReplace: Scalar | readonly Scalar[]; value: Scalar | readonly Scalar[] };

  if (!Array.isArray(s.toReplace)) {
    // Scalar → Scalar
    const old = s.toReplace as Scalar;
    const newVal = s.value as Scalar;
    return (v: Scalar): Scalar => (scalarEq(v, old, matchNaN) ? newVal : v);
  }

  const oldArr = s.toReplace as readonly Scalar[];

  if (!Array.isArray(s.value)) {
    // Array → Scalar
    const newVal = s.value as Scalar;
    return (v: Scalar): Scalar => {
      for (const old of oldArr) {
        if (scalarEq(v, old, matchNaN)) {
          return newVal;
        }
      }
      return v;
    };
  }

  // Array → Array (pair-wise)
  const newArr = s.value as readonly Scalar[];
  if (oldArr.length !== newArr.length) {
    throw new RangeError(
      `replace: toReplace and value arrays must have the same length (got ${oldArr.length} and ${newArr.length})`,
    );
  }
  return (v: Scalar): Scalar => {
    for (let i = 0; i < oldArr.length; i++) {
      if (scalarEq(v, oldArr[i] as Scalar, matchNaN)) {
        return newArr[i] as Scalar;
      }
    }
    return v;
  };
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * Replace values in a Series according to `spec`.
 *
 * @example
 * ```ts
 * import { Series } from "tsb";
 * import { replaceSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, 2, 1] });
 * const r = replaceSeries(s, { toReplace: 2, value: 99 });
 * // r.values → [1, 99, 3, 99, 1]
 * ```
 */
export function replaceSeries(
  series: Series<Scalar>,
  spec: ReplaceSpec,
  options: ReplaceOptions = {},
): Series<Scalar> {
  const matchNaN = options.matchNaN ?? true;
  const replacer = buildReplacer(spec, matchNaN);
  const newData = Array.from({ length: series.size }, (_, i) =>
    replacer(series.values[i] as Scalar),
  );
  return new Series<Scalar>({ data: newData, index: series.index, name: series.name });
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Replace values in a DataFrame according to `spec`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { replaceDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 2, 4] });
 * const r = replaceDataFrame(df, { toReplace: 2, value: 0 });
 * // r.col("a").values → [1, 0, 3]
 * // r.col("b").values → [0, 0, 4]
 * ```
 */
export function replaceDataFrame(
  df: DataFrame,
  spec: ReplaceSpec,
  options: DataFrameReplaceOptions = {},
): DataFrame {
  const matchNaN = options.matchNaN ?? true;
  const replacer = buildReplacer(spec, matchNaN);
  const targetCols = new Set(options.columns ?? df.columns.values);

  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name) as Series<Scalar>;
    if (targetCols.has(name)) {
      const newData = Array.from({ length: col.size }, (_, i) => replacer(col.values[i] as Scalar));
      colMap.set(name, new Series<Scalar>({ data: newData, index: col.index, name: col.name }));
    } else {
      colMap.set(name, col);
    }
  }
  return new DataFrame(colMap, df.index);
}
