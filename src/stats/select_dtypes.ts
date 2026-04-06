/**
 * select_dtypes — filter DataFrame columns by dtype.
 *
 * Mirrors `pandas.DataFrame.select_dtypes(include, exclude)`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   a: [1, 2, 3],          // int64
 *   b: [1.1, 2.2, 3.3],    // float64
 *   c: ["x", "y", "z"],    // string
 *   d: [true, false, true], // bool
 * });
 * selectDtypes(df, { include: "number" }).columns.toArray();
 * // ["a", "b"]
 * selectDtypes(df, { exclude: ["bool", "string"] }).columns.toArray();
 * // ["a", "b"]
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import type { Dtype } from "../core/dtype.ts";
import type { DtypeKind } from "../core/dtype.ts";
import type { DtypeName } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A dtype selector: one of the pandas generic aliases ("number", "integer",
 * "floating", "bool", "object", "string", "datetime", "timedelta", "category")
 * or a concrete dtype name ("int64", "float32", …).
 */
export type DtypeSelector =
  | DtypeName
  | "number"
  | "integer"
  | "signed integer"
  | "unsigned integer"
  | "floating"
  | "bool"
  | "object"
  | "string"
  | "datetime"
  | "timedelta"
  | "category";

/** Options for {@link selectDtypes}. */
export interface SelectDtypesOptions {
  /**
   * A dtype selector (or array of selectors) for columns to **keep**.
   * At least one of `include` or `exclude` must be provided.
   */
  readonly include?: DtypeSelector | readonly DtypeSelector[];
  /**
   * A dtype selector (or array of selectors) for columns to **drop**.
   * At least one of `include` or `exclude` must be provided.
   */
  readonly exclude?: DtypeSelector | readonly DtypeSelector[];
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Normalise a selector (or undefined) to an array. */
function toArray(sel: DtypeSelector | readonly DtypeSelector[] | undefined): DtypeSelector[] {
  if (sel === undefined) return [];
  return Array.isArray(sel) ? (sel as DtypeSelector[]) : [sel as DtypeSelector];
}

/**
 * Return true when `dtype` is matched by at least one selector in `selectors`.
 *
 * Supported generic aliases (mirrors pandas):
 *   - "number"           → int, uint, float
 *   - "integer"          → int, uint
 *   - "signed integer"   → int
 *   - "unsigned integer" → uint
 *   - "floating"         → float
 *   - "bool"             → bool
 *   - "object"           → object
 *   - "string"           → string
 *   - "datetime"         → datetime
 *   - "timedelta"        → timedelta
 *   - "category"         → category
 *
 * Any concrete `DtypeName` (e.g., "int32", "float64") matches that exact dtype.
 */
function matchesAny(dtype: Dtype, selectors: readonly DtypeSelector[]): boolean {
  const kind: DtypeKind = dtype.kind;
  const name: DtypeName = dtype.name;
  for (const sel of selectors) {
    switch (sel) {
      case "number":
        if (kind === "int" || kind === "uint" || kind === "float") return true;
        break;
      case "integer":
        if (kind === "int" || kind === "uint") return true;
        break;
      case "signed integer":
        if (kind === "int") return true;
        break;
      case "unsigned integer":
        if (kind === "uint") return true;
        break;
      case "floating":
        if (kind === "float") return true;
        break;
      case "bool":
        if (kind === "bool") return true;
        break;
      case "object":
        if (kind === "object") return true;
        break;
      case "string":
        if (kind === "string") return true;
        break;
      case "datetime":
        if (kind === "datetime") return true;
        break;
      case "timedelta":
        if (kind === "timedelta") return true;
        break;
      case "category":
        if (kind === "category") return true;
        break;
      default:
        // Concrete dtype name match.
        if ((sel as string) === name) return true;
    }
  }
  return false;
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Return a subset of `df` consisting only of columns whose dtype matches the
 * given `include`/`exclude` selectors.
 *
 * Rules (mirrors pandas):
 * - At least one of `include` or `exclude` must be non-empty.
 * - A column is kept when:
 *     - `include` is non-empty → dtype must match at least one include selector.
 *     - `exclude` is non-empty → dtype must NOT match any exclude selector.
 *     - Both supplied → must match include AND must not match exclude.
 * - `include` and `exclude` must not overlap (same generic alias or concrete name
 *   in both lists) — an error is thrown in that case.
 *
 * @example
 * ```ts
 * selectDtypes(df, { include: "number" })           // numeric columns only
 * selectDtypes(df, { include: ["int64", "bool"] })  // int64 + bool columns
 * selectDtypes(df, { exclude: "object" })           // drop object columns
 * ```
 */
export function selectDtypes(df: DataFrame, opts: SelectDtypesOptions): DataFrame {
  const includes = toArray(opts.include);
  const excludes = toArray(opts.exclude);

  if (includes.length === 0 && excludes.length === 0) {
    throw new Error("selectDtypes: at least one of include or exclude must be provided");
  }

  // Validate no overlap between include and exclude.
  for (const inc of includes) {
    if ((excludes as string[]).includes(inc as string)) {
      throw new Error(
        `selectDtypes: selector "${inc}" appears in both include and exclude`,
      );
    }
  }

  const keepCols: string[] = [];
  for (const colName of df.columns.toArray()) {
    const series = df.col(colName);
    const dtype = series.dtype;

    let keep = true;

    if (includes.length > 0 && !matchesAny(dtype, includes)) {
      keep = false;
    }
    if (excludes.length > 0 && matchesAny(dtype, excludes)) {
      keep = false;
    }

    if (keep) {
      keepCols.push(colName);
    }
  }

  return df.select(keepCols);
}
