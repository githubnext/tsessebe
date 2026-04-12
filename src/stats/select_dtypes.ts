/**
 * select_dtypes — filter DataFrame columns by dtype.
 *
 * Mirrors `DataFrame.select_dtypes(include, exclude)` in pandas.
 * Accepts exact dtype names (`"int64"`, `"float64"`, …) and generic
 * category aliases (`"number"`, `"integer"`, `"floating"`, `"bool"`,
 * `"object"`, `"datetime"`, `"timedelta"`, `"category"`, `"string"`).
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import type { Dtype, DtypeKind } from "../core/index.ts";
import type { DtypeName } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A dtype specifier accepted by {@link selectDtypes}.
 *
 * Can be an exact dtype name (`"int64"`, `"float64"`, …) or one of the
 * generic aliases: `"number"`, `"integer"`, `"signed"`, `"unsigned"`,
 * `"floating"`, `"bool"`, `"object"`, `"datetime"`, `"timedelta"`,
 * `"category"`, `"string"`.
 */
export type DtypeSpecifier = DtypeName | DtypeAlias;

/** Generic category aliases understood by selectDtypes. */
export type DtypeAlias =
  | "number"
  | "integer"
  | "signed"
  | "unsigned"
  | "floating"
  | "bool"
  | "object"
  | "datetime"
  | "timedelta"
  | "category"
  | "string";

/** Options for {@link selectDtypes}. */
export interface SelectDtypesOptions {
  /**
   * Dtype specifiers to **include**. Only columns whose dtype matches at
   * least one specifier are retained. If omitted, all columns pass the
   * include filter.
   */
  readonly include?: readonly DtypeSpecifier[];
  /**
   * Dtype specifiers to **exclude**. Columns whose dtype matches any
   * specifier are removed. Applied after the include filter.
   * If omitted, no columns are excluded.
   */
  readonly exclude?: readonly DtypeSpecifier[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** All dtype names that belong to the "number" generic alias. */
const NUMBER_KINDS: ReadonlySet<DtypeKind> = new Set(["int", "uint", "float"]);

/**
 * Return `true` if `dtype` matches the given specifier.
 */
function matchesSpecifier(dtype: Dtype, spec: DtypeSpecifier): boolean {
  const k = dtype.kind;
  switch (spec as string) {
    case "number":
      return NUMBER_KINDS.has(k);
    case "integer":
      return k === "int" || k === "uint";
    case "signed":
      return k === "int";
    case "unsigned":
      return k === "uint";
    case "floating":
      return k === "float";
    case "bool":
      return k === "bool";
    case "object":
      return k === "object";
    case "datetime":
      return k === "datetime";
    case "timedelta":
      return k === "timedelta";
    case "category":
      return k === "category";
    case "string":
      return k === "string";
    default:
      return dtype.name === (spec as string);
  }
}

/**
 * Return `true` if `dtype` matches **any** specifier in the list.
 */
function matchesAny(dtype: Dtype, specs: readonly DtypeSpecifier[]): boolean {
  for (const s of specs) {
    if (matchesSpecifier(dtype, s)) {
      return true;
    }
  }
  return false;
}

// ─── public API ───────────────────────────────────────────────────────────────

/** Validate no specifier appears in both lists. */
function validateNoOverlap(
  include: readonly DtypeSpecifier[],
  exclude: readonly DtypeSpecifier[],
): void {
  for (const inc of include) {
    for (const exc of exclude) {
      if (inc === exc) {
        throw new TypeError(`selectDtypes: specifier "${inc}" appears in both include and exclude`);
      }
    }
  }
}

/** Decide whether a column passes the include/exclude filter. */
function columnPasses(
  dtype: Dtype,
  include: readonly DtypeSpecifier[] | undefined,
  exclude: readonly DtypeSpecifier[] | undefined,
): boolean {
  const passInclude = include === undefined || include.length === 0 || matchesAny(dtype, include);
  const passExclude = !(exclude !== undefined && exclude.length > 0 && matchesAny(dtype, exclude));
  return passInclude && passExclude;
}

/**
 * Return a new DataFrame containing only columns whose dtype satisfies
 * the `include` / `exclude` filter.
 *
 * Follows pandas semantics:
 * - When both `include` and `exclude` are given, a column must match the
 *   include list **and** not match the exclude list to be retained.
 * - Passing the same specifier in both `include` and `exclude` raises an
 *   error (as pandas does).
 * - When neither is given the original DataFrame is returned unchanged.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   a: [1, 2, 3],
 *   b: [1.1, 2.2, 3.3],
 *   c: ["x", "y", "z"],
 * });
 *
 * selectDtypes(df, { include: ["number"] }).columns.values;
 * // ["a", "b"]
 *
 * selectDtypes(df, { exclude: ["float64"] }).columns.values;
 * // ["a", "c"]
 * ```
 */
export function selectDtypes(df: DataFrame, opts: SelectDtypesOptions = {}): DataFrame {
  const { include, exclude } = opts;

  if (!((include?.length ?? 0) > 0 || (exclude?.length ?? 0) > 0)) {
    return df;
  }

  if (include !== undefined && include.length > 0 && exclude !== undefined && exclude.length > 0) {
    validateNoOverlap(include, exclude);
  }

  const kept: string[] = [];
  for (const col of df.columns.values) {
    if (columnPasses(df.col(col).dtype, include, exclude)) {
      kept.push(col);
    }
  }

  return df.select(kept);
}
