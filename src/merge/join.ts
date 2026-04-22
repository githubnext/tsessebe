/**
 * join — label-based join of two DataFrames.
 *
 * Mirrors `pandas.DataFrame.join`:
 * - Joins `left` to `right` using **index labels** by default
 * - `how`: `"left"` (default), `"right"`, `"inner"`, `"outer"`
 * - `on`: use a column from `left` as the join key (matched against `right`'s index)
 * - `lsuffix` / `rsuffix`: applied to overlapping column names
 * - `sort`: sort result by join keys
 *
 * @example
 * ```ts
 * import { DataFrame, join } from "tsb";
 *
 * const left = DataFrame.fromColumns(
 *   { A: [1, 2, 3] },
 *   { index: ["K0", "K1", "K2"] },
 * );
 * const right = DataFrame.fromColumns(
 *   { B: [4, 5, 6] },
 *   { index: ["K0", "K2", "K3"] },
 * );
 *
 * join(left, right);
 * // Left join (default):
 * // A  B
 * // K0 1  4
 * // K1 2  null
 * // K2 3  5
 *
 * join(left, right, { how: "inner" });
 * // A  B
 * // K0 1  4
 * // K2 3  5
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";
import { merge } from "./merge.ts";
import type { MergeOptions } from "./merge.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link join}. */
export interface JoinOptions {
  /**
   * Column in `left` to use as the join key (matched against `right`'s index).
   * When omitted, `left`'s index is used as the join key.
   */
  readonly on?: string;
  /**
   * Join type:
   * - `"left"` (default): all rows from `left`; non-matching `right` rows dropped
   * - `"right"`: all rows from `right`; non-matching `left` rows dropped
   * - `"inner"`: only rows with matching keys in **both** DataFrames
   * - `"outer"`: all rows; missing values filled with `null`
   */
  readonly how?: "left" | "right" | "inner" | "outer";
  /**
   * Suffix appended to overlapping column names from `left`.
   * Default: `""` (empty — raise if overlap and both suffixes are empty).
   */
  readonly lsuffix?: string;
  /**
   * Suffix appended to overlapping column names from `right`.
   * Default: `""` (empty — raise if overlap and both suffixes are empty).
   */
  readonly rsuffix?: string;
  /**
   * Sort result rows by the join keys.
   * Default: `false`.
   */
  readonly sort?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Find column names that exist in both DataFrames (excluding any `on` key
 * that will become a join key and won't appear in both outputs).
 */
function overlappingCols(left: DataFrame, right: DataFrame, on: string | undefined): string[] {
  const leftCols = new Set(left.columns.values);
  const rightCols = right.columns.values;
  const overlap: string[] = [];
  for (const c of rightCols) {
    if (leftCols.has(c) && c !== on) {
      overlap.push(c);
    }
  }
  return overlap;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Join two DataFrames on their index (or a column of the left DataFrame).
 *
 * This is a convenience wrapper around {@link merge} that defaults to a
 * **left join on index labels**, matching pandas `DataFrame.join`.
 *
 * @param left - The primary DataFrame.
 * @param right - The DataFrame to join to `left`.
 * @param options - Join options.
 * @returns A new DataFrame with rows aligned by the join keys.
 *
 * @example
 * ```ts
 * const result = join(employees, departments, { how: "left" });
 * ```
 */
export function join(left: DataFrame, right: DataFrame, options?: JoinOptions): DataFrame {
  const how = options?.how ?? "left";
  const on = options?.on;
  const lsuffix = options?.lsuffix ?? "";
  const rsuffix = options?.rsuffix ?? "";
  const sort = options?.sort ?? false;

  // Validate suffixes when there are overlapping columns.
  const overlap = overlappingCols(left, right, on);
  if (overlap.length > 0 && lsuffix === "" && rsuffix === "") {
    throw new Error(
      `join: columns overlap but no suffix specified: ${overlap.join(", ")}. Pass lsuffix or rsuffix to disambiguate.`,
    );
  }

  // Build suffixes tuple — if both are empty the overlap guard above already threw.
  const suffixes: readonly [string, string] = [lsuffix, rsuffix];

  const mergeOpts: MergeOptions = {
    how,
    suffixes,
    sort,
    ...(on !== undefined ? { left_on: on } : { left_index: true }),
    right_index: true,
  };

  return merge(left, right, mergeOpts);
}

// ─── multi-join helper ────────────────────────────────────────────────────────

/**
 * Join multiple DataFrames together (left-to-right chain).
 *
 * Equivalent to `pandas.DataFrame.join([other1, other2, ...])` when called
 * as `joinAll(base, [df1, df2], options)`.
 *
 * Each join in the chain uses the same `options`; index alignment propagates
 * from left to right.
 *
 * @example
 * ```ts
 * const result = joinAll(base, [costs, names], { how: "left" });
 * ```
 */
export function joinAll(
  left: DataFrame,
  others: readonly DataFrame[],
  options?: Omit<JoinOptions, "on">,
): DataFrame {
  let result = left;
  for (const other of others) {
    result = join(result, other, options);
  }
  return result;
}

// ─── cross join ───────────────────────────────────────────────────────────────

/**
 * Produce the Cartesian product of two DataFrames (cross join).
 *
 * Equivalent to `pandas.merge(left, right, how="cross")`. Every row in
 * `left` is paired with every row in `right`. The result has
 * `left.shape[0] * right.shape[0]` rows.
 *
 * Column name conflicts are resolved with `lsuffix` / `rsuffix`.
 *
 * @example
 * ```ts
 * const colors = DataFrame.fromColumns({ color: ["red", "blue"] });
 * const sizes  = DataFrame.fromColumns({ size: ["S", "M", "L"] });
 * crossJoin(colors, sizes);
 * // color  size
 * // red    S
 * // red    M
 * // red    L
 * // blue   S
 * // blue   M
 * // blue   L
 * ```
 */
export function crossJoin(
  left: DataFrame,
  right: DataFrame,
  options?: { readonly lsuffix?: string; readonly rsuffix?: string },
): DataFrame {
  const lsuffix = options?.lsuffix ?? "";
  const rsuffix = options?.rsuffix ?? "";

  const overlap = overlappingCols(left, right, undefined);
  if (overlap.length > 0 && lsuffix === "" && rsuffix === "") {
    throw new Error(
      `crossJoin: columns overlap but no suffix specified: ${overlap.join(", ")}. Pass lsuffix or rsuffix to disambiguate.`,
    );
  }

  const nLeft = left.shape[0];
  const nRight = right.shape[0];
  const total = nLeft * nRight;

  // Build result columns.
  const leftColNames = left.columns.values;
  const rightColNames = right.columns.values;

  const rightColSet = new Set<string>(rightColNames);
  const leftColSet = new Set<string>(leftColNames);
  const resultCols: Record<string, Scalar[]> = {};

  // Left columns: row i*nRight+j gets leftVals[i]
  for (const col of leftColNames) {
    const vals = left.col(col).values;
    // Apply lsuffix to left cols that overlap with right cols
    const outName = rightColSet.has(col) && lsuffix !== "" ? col + lsuffix : col;
    const data: Scalar[] = new Array<Scalar>(total);
    for (let i = 0; i < nLeft; i++) {
      const v = vals[i] ?? null;
      for (let j = 0; j < nRight; j++) {
        data[i * nRight + j] = v;
      }
    }
    resultCols[outName] = data;
  }

  // Right columns: row i*nRight+j gets rightVals[j]
  for (const col of rightColNames) {
    const vals = right.col(col).values;
    // Apply rsuffix to right cols that overlap with left cols
    const outName = leftColSet.has(col) ? col + rsuffix : col;
    const data: Scalar[] = new Array<Scalar>(total);
    for (let i = 0; i < nLeft; i++) {
      for (let j = 0; j < nRight; j++) {
        data[i * nRight + j] = vals[j] ?? null;
      }
    }
    resultCols[outName] = data;
  }

  return DataFrame.fromColumns(resultCols);
}
