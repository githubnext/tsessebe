/**
 * merge — SQL-style join of two DataFrames.
 *
 * Mirrors `pandas.merge` / `DataFrame.merge`:
 * - **how**: `"inner"` (default), `"outer"`, `"left"`, `"right"`
 * - **on**: column name(s) present in both DataFrames
 * - **left_on** / **right_on**: join on different column names per side
 * - **left_index** / **right_index**: use the row-index as a join key
 * - **suffixes**: applied to overlapping non-key columns (default `["_x", "_y"]`)
 * - **sort**: sort result by join-key values
 *
 * @example
 * ```ts
 * // Inner join on a shared column
 * const result = merge(left, right, { on: "id" });
 *
 * // Left join, joining on different column names
 * const result = merge(left, right, {
 *   how: "left",
 *   left_on: "empId",
 *   right_on: "id",
 * });
 *
 * // Outer join with custom suffixes
 * const result = merge(left, right, {
 *   on: "key",
 *   how: "outer",
 *   suffixes: ["_left", "_right"],
 * });
 * ```
 *
 * @module
 */

import { DataFrame, Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import type { JoinHow, Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link merge}. */
export interface MergeOptions {
  /**
   * Join type:
   * - `"inner"` (default): only rows with matching keys in **both** DataFrames
   * - `"outer"`: all rows; missing values filled with `null`
   * - `"left"`: all rows from the left DataFrame; non-matching right rows dropped
   * - `"right"`: all rows from the right DataFrame; non-matching left rows dropped
   */
  readonly how?: JoinHow;
  /**
   * Column name(s) present in **both** DataFrames to join on.
   * Mutually exclusive with `left_on`/`right_on`.
   */
  readonly on?: string | readonly string[];
  /**
   * Column name(s) from the **left** DataFrame to join on.
   * Must be paired with `right_on`.
   */
  readonly left_on?: string | readonly string[];
  /**
   * Column name(s) from the **right** DataFrame to join on.
   * Must be paired with `left_on`.
   */
  readonly right_on?: string | readonly string[];
  /**
   * When `true`, use the left DataFrame's row index as the join key.
   * Can be combined with `right_on` to join index against column(s).
   */
  readonly left_index?: boolean;
  /**
   * When `true`, use the right DataFrame's row index as the join key.
   * Can be combined with `left_on` to join column(s) against index.
   */
  readonly right_index?: boolean;
  /**
   * Suffixes appended to overlapping non-key column names.
   * Default: `["_x", "_y"]`.
   */
  readonly suffixes?: readonly [string, string];
  /**
   * When `true`, sort the result by the join-key columns.
   * Default: `false`.
   */
  readonly sort?: boolean;
}

// ─── internal types ───────────────────────────────────────────────────────────

/** A pair of matched row indices (one from each side; `null` = no match). */
interface RowPair {
  left: number | null;
  right: number | null;
}

/** A single entry in the output column plan. */
interface ColPlanEntry {
  /** Output column name in the result DataFrame. */
  readonly outputName: string;
  /** Where to source the value: left-only, right-only, or coalesce left→right. */
  readonly side: "left" | "right" | "coalesce";
  /** Source column name in the left DataFrame (null if not applicable). */
  readonly leftSourceCol: string | null;
  /** Source column name in the right DataFrame (null if not applicable). */
  readonly rightSourceCol: string | null;
}

/** Resolved specification of which keys to join on. */
interface KeySpec {
  leftCols: readonly string[];
  rightCols: readonly string[];
  leftUseIndex: boolean;
  rightUseIndex: boolean;
}

/** Function that extracts a composite key (as an array of scalars) from row `i`. */
type KeyExtractor = (i: number) => Scalar[];

// ─── key extraction helpers ───────────────────────────────────────────────────

/** Build a key extractor that reads from DataFrame columns. */
function makeColExtractor(df: DataFrame, cols: readonly string[]): KeyExtractor {
  const colArrays = cols.map((c) => df.col(c).values);
  return (i: number): Scalar[] => colArrays.map((a) => a[i] ?? null);
}

/** Build a key extractor that reads from the DataFrame's row index. */
function makeIndexExtractor(df: DataFrame): KeyExtractor {
  const vals = df.index.values;
  return (i: number): Scalar[] => [vals[i] ?? null];
}

/** Build a hash-map from JSON-serialised composite key → sorted row indices. */
function buildKeyMap(n: number, extractor: KeyExtractor): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const key = JSON.stringify(extractor(i));
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
}

// ─── row-pair computation ─────────────────────────────────────────────────────

/** Add matched cross-product pairs; returns the set of matched keys. */
function addMatchedPairs(
  leftMap: Map<string, number[]>,
  rightMap: Map<string, number[]>,
  pairs: RowPair[],
): Set<string> {
  const matched = new Set<string>();
  for (const [key, leftIdxs] of leftMap) {
    const rightIdxs = rightMap.get(key);
    if (rightIdxs === undefined) {
      continue;
    }
    matched.add(key);
    for (const li of leftIdxs) {
      for (const ri of rightIdxs) {
        pairs.push({ left: li, right: ri });
      }
    }
  }
  return matched;
}

/** Add left rows that had no match in the right map. */
function addLeftUnmatched(
  leftMap: Map<string, number[]>,
  matched: ReadonlySet<string>,
  pairs: RowPair[],
): void {
  for (const [key, leftIdxs] of leftMap) {
    if (matched.has(key)) {
      continue;
    }
    for (const li of leftIdxs) {
      pairs.push({ left: li, right: null });
    }
  }
}

/** Add right rows that had no match in the left map. */
function addRightUnmatched(
  rightMap: Map<string, number[]>,
  matched: ReadonlySet<string>,
  pairs: RowPair[],
): void {
  for (const [key, rightIdxs] of rightMap) {
    if (matched.has(key)) {
      continue;
    }
    for (const ri of rightIdxs) {
      pairs.push({ left: null, right: ri });
    }
  }
}

/** Compute all (left, right) row-index pairs for the requested join type. */
function computePairs(
  leftMap: Map<string, number[]>,
  rightMap: Map<string, number[]>,
  how: JoinHow,
): RowPair[] {
  if (how === "left") {
    const pairs: RowPair[] = [];
    for (const [key, leftIdxs] of leftMap) {
      const rightIdxs = rightMap.get(key);
      if (rightIdxs === undefined) {
        for (const li of leftIdxs) {
          pairs.push({ left: li, right: null });
        }
        continue;
      }
      for (const li of leftIdxs) {
        for (const ri of rightIdxs) {
          pairs.push({ left: li, right: ri });
        }
      }
    }
    return pairs;
  }
  if (how === "right") {
    const pairs: RowPair[] = [];
    for (const [key, rightIdxs] of rightMap) {
      const leftIdxs = leftMap.get(key);
      if (leftIdxs === undefined) {
        for (const ri of rightIdxs) {
          pairs.push({ left: null, right: ri });
        }
        continue;
      }
      for (const li of leftIdxs) {
        for (const ri of rightIdxs) {
          pairs.push({ left: li, right: ri });
        }
      }
    }
    return pairs;
  }
  const pairs: RowPair[] = [];
  const matched = addMatchedPairs(leftMap, rightMap, pairs);
  if (how === "outer") {
    addLeftUnmatched(leftMap, matched, pairs);
  }
  if (how === "outer") {
    addRightUnmatched(rightMap, matched, pairs);
  }
  return pairs;
}

// ─── key-spec resolution ──────────────────────────────────────────────────────

/** Normalise a string-or-array option to a readonly string array. */
function toStringArray(val: string | readonly string[] | undefined): readonly string[] {
  if (val === undefined) {
    return [];
  }
  if (typeof val === "string") {
    return [val];
  }
  return val;
}

/** Auto-detect shared column names when no explicit key is given. */
function autoDetectKeys(left: DataFrame, right: DataFrame): readonly string[] {
  const leftSet = new Set(left.columns.values);
  const shared = right.columns.values.filter((c) => leftSet.has(c));
  if (shared.length === 0) {
    throw new Error(
      "merge: no common columns found; specify 'on', 'left_on'/'right_on', or 'left_index'/'right_index'",
    );
  }
  return shared;
}

/** Resolve which columns / index sides to join on. */
function resolveKeySpec(left: DataFrame, right: DataFrame, options: MergeOptions): KeySpec {
  const leftIndex = options.left_index === true;
  const rightIndex = options.right_index === true;

  if (leftIndex || rightIndex) {
    return {
      leftCols: toStringArray(options.left_on),
      rightCols: toStringArray(options.right_on),
      leftUseIndex: leftIndex,
      rightUseIndex: rightIndex,
    };
  }

  const onCols = toStringArray(options.on);
  if (onCols.length > 0) {
    return { leftCols: onCols, rightCols: onCols, leftUseIndex: false, rightUseIndex: false };
  }

  const leftOn = toStringArray(options.left_on);
  const rightOn = toStringArray(options.right_on);
  if (leftOn.length > 0 || rightOn.length > 0) {
    return { leftCols: leftOn, rightCols: rightOn, leftUseIndex: false, rightUseIndex: false };
  }

  const shared = autoDetectKeys(left, right);
  return { leftCols: shared, rightCols: shared, leftUseIndex: false, rightUseIndex: false };
}

// ─── column-plan helpers ──────────────────────────────────────────────────────

/** Append key-column entries to the plan for the index×index case. */
function addIndexIndexKeyPlan(_plan: ColPlanEntry[]): void {
  // When both sides use index, no key column is added to the result
  // (the result gets a fresh RangeIndex).
}

/** Append key-column entries for the index×column or column×index case. */
function addMixedIndexKeyPlan(keySpec: KeySpec, plan: ColPlanEntry[]): void {
  if (keySpec.leftUseIndex) {
    for (const col of keySpec.rightCols) {
      plan.push({ outputName: col, side: "right", leftSourceCol: null, rightSourceCol: col });
    }
  } else {
    for (const col of keySpec.leftCols) {
      plan.push({ outputName: col, side: "left", leftSourceCol: col, rightSourceCol: null });
    }
  }
}

/** Append key-column entries for the column×column case. */
function addColColKeyPlan(keySpec: KeySpec, plan: ColPlanEntry[]): void {
  const len = Math.min(keySpec.leftCols.length, keySpec.rightCols.length);
  for (let i = 0; i < len; i++) {
    const lc = keySpec.leftCols[i] ?? "";
    const rc = keySpec.rightCols[i] ?? "";
    if (lc === rc) {
      plan.push({ outputName: lc, side: "coalesce", leftSourceCol: lc, rightSourceCol: rc });
    } else {
      plan.push({ outputName: lc, side: "left", leftSourceCol: lc, rightSourceCol: null });
      plan.push({ outputName: rc, side: "right", leftSourceCol: null, rightSourceCol: rc });
    }
  }
}

/** Build the key-column section of the output column plan. */
function buildKeyColPlan(keySpec: KeySpec): ColPlanEntry[] {
  const plan: ColPlanEntry[] = [];
  if (keySpec.leftUseIndex && keySpec.rightUseIndex) {
    addIndexIndexKeyPlan(plan);
  } else if (keySpec.leftUseIndex || keySpec.rightUseIndex) {
    addMixedIndexKeyPlan(keySpec, plan);
  } else {
    addColColKeyPlan(keySpec, plan);
  }
  return plan;
}

/** Build the non-key-column section of the output column plan. */
function buildNonKeyColPlan(
  left: DataFrame,
  right: DataFrame,
  leftKeyCols: ReadonlySet<string>,
  rightKeyCols: ReadonlySet<string>,
  suffixes: readonly [string, string],
): ColPlanEntry[] {
  const plan: ColPlanEntry[] = [];
  const leftNonKey = left.columns.values.filter((c) => !leftKeyCols.has(c));
  const rightNonKey = right.columns.values.filter((c) => !rightKeyCols.has(c));
  const rightNonKeySet = new Set(rightNonKey);
  const leftNonKeySet = new Set(leftNonKey);

  for (const col of leftNonKey) {
    const outName = rightNonKeySet.has(col) ? col + suffixes[0] : col;
    plan.push({ outputName: outName, side: "left", leftSourceCol: col, rightSourceCol: null });
  }
  for (const col of rightNonKey) {
    const outName = leftNonKeySet.has(col) ? col + suffixes[1] : col;
    plan.push({ outputName: outName, side: "right", leftSourceCol: null, rightSourceCol: col });
  }
  return plan;
}

/** Build the full output column plan for the merge result. */
function buildColPlan(
  left: DataFrame,
  right: DataFrame,
  keySpec: KeySpec,
  suffixes: readonly [string, string],
): ColPlanEntry[] {
  const keyPlan = buildKeyColPlan(keySpec);
  const leftKeyCols = new Set(keySpec.leftUseIndex ? [] : keySpec.leftCols);
  const rightKeyCols = new Set(keySpec.rightUseIndex ? [] : keySpec.rightCols);
  const nonKeyPlan = buildNonKeyColPlan(left, right, leftKeyCols, rightKeyCols, suffixes);
  return [...keyPlan, ...nonKeyPlan];
}

// ─── result-building helpers ──────────────────────────────────────────────────

/** Get the scalar value at `rowIdx` from a DataFrame column (or `null`). */
function getColValue(df: DataFrame, col: string, rowIdx: number | null): Scalar {
  if (rowIdx === null) {
    return null;
  }
  const arr = df.col(col).values;
  return arr[rowIdx] ?? null;
}

/** Build the coalesced key-column value: prefer left row, fall back to right. */
function coalesceValue(
  left: DataFrame,
  right: DataFrame,
  entry: ColPlanEntry,
  pair: RowPair,
): Scalar {
  if (pair.left !== null && entry.leftSourceCol !== null) {
    return getColValue(left, entry.leftSourceCol, pair.left);
  }
  if (pair.right !== null && entry.rightSourceCol !== null) {
    return getColValue(right, entry.rightSourceCol, pair.right);
  }
  return null;
}

/** Resolve the value for one (entry, pair) combination. */
function resolveValue(
  left: DataFrame,
  right: DataFrame,
  entry: ColPlanEntry,
  pair: RowPair,
): Scalar {
  if (entry.side === "left") {
    return getColValue(left, entry.leftSourceCol ?? "", pair.left);
  }
  if (entry.side === "right") {
    return getColValue(right, entry.rightSourceCol ?? "", pair.right);
  }
  return coalesceValue(left, right, entry, pair);
}

/** Build one output column as a `Scalar[]` array. */
function buildResultColumn(
  left: DataFrame,
  right: DataFrame,
  pairs: readonly RowPair[],
  entry: ColPlanEntry,
): Scalar[] {
  return pairs.map((p) => resolveValue(left, right, entry, p));
}

/** Assemble the final DataFrame from row pairs and the column plan. */
function buildResultDataFrame(
  left: DataFrame,
  right: DataFrame,
  pairs: readonly RowPair[],
  plan: readonly ColPlanEntry[],
  keySpec: KeySpec,
): DataFrame {
  const colData: Record<string, Scalar[]> = {};
  for (const entry of plan) {
    colData[entry.outputName] = buildResultColumn(left, right, pairs, entry);
  }
  let index = new RangeIndex(pairs.length) as unknown as Index<Label>;
  if (keySpec.leftUseIndex && keySpec.rightUseIndex) {
    const labels: Label[] = pairs.map((p) => {
      if (p.left !== null) {
        return (left.index.values[p.left] ?? null) as Label;
      }
      if (p.right !== null) {
        return (right.index.values[p.right] ?? null) as Label;
      }
      return null;
    });
    index = new Index<Label>(labels);
  }
  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index });
}

// ─── key names for sort ───────────────────────────────────────────────────────

/** Return the output column names that represent the join keys (for sort). */
function keySortCols(plan: readonly ColPlanEntry[]): string[] {
  return plan
    .filter((e) => e.side === "coalesce" || e.side === "left")
    .map((e) => e.outputName)
    .slice(0, 1); // sort by first key column only
}

// ─── public function ──────────────────────────────────────────────────────────

/**
 * Perform a SQL-style join of two DataFrames.
 *
 * Mirrors `pandas.merge` / `DataFrame.merge`.
 *
 * @param left    - Left DataFrame.
 * @param right   - Right DataFrame.
 * @param options - Join specification (see {@link MergeOptions}).
 * @returns A new `DataFrame` containing the joined rows and columns.
 *
 * @throws {Error}  When no join keys can be determined (no common columns and
 *                  no explicit `on`/`left_on`/`right_on`/index options).
 *
 * @example
 * ```ts
 * const orders = DataFrame.fromColumns({
 *   orderId:  [1, 2, 3],
 *   customerId: [10, 20, 10],
 *   amount: [100, 200, 150],
 * });
 * const customers = DataFrame.fromColumns({
 *   customerId: [10, 20, 30],
 *   name: ["Alice", "Bob", "Carol"],
 * });
 *
 * // Inner join (default)
 * merge(orders, customers, { on: "customerId" });
 * // orderId | customerId | amount | name
 * //       1 |         10 |    100 | Alice
 * //       2 |         20 |    200 | Bob
 * //       3 |         10 |    150 | Alice
 *
 * // Left join — keeps all orders, fills missing customer data with null
 * merge(orders, customers, { on: "customerId", how: "left" });
 * ```
 */
export function merge(left: DataFrame, right: DataFrame, options?: MergeOptions): DataFrame {
  const how: JoinHow = options?.how ?? "inner";
  const suffixes: readonly [string, string] = options?.suffixes ?? ["_x", "_y"];
  const sort = options?.sort ?? false;

  const keySpec = resolveKeySpec(left, right, options ?? {});

  const leftExtractor = keySpec.leftUseIndex
    ? makeIndexExtractor(left)
    : makeColExtractor(left, keySpec.leftCols);

  const rightExtractor = keySpec.rightUseIndex
    ? makeIndexExtractor(right)
    : makeColExtractor(right, keySpec.rightCols);

  const leftMap = buildKeyMap(left.shape[0], leftExtractor);
  const rightMap = buildKeyMap(right.shape[0], rightExtractor);

  const pairs = computePairs(leftMap, rightMap, how);

  const plan = buildColPlan(left, right, keySpec, suffixes);

  const result = buildResultDataFrame(left, right, pairs, plan, keySpec);

  if (sort && plan.length > 0) {
    const sortCols = keySortCols(plan);
    if (sortCols.length > 0) {
      return result.sortValues(sortCols);
    }
  }

  return result;
}
