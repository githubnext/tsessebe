/**
 * merge_asof — ordered (nearest-key) left-join of two DataFrames.
 *
 * Mirrors `pandas.merge_asof`:
 * - Performs a left join on the **nearest** key rather than an exact match
 * - Both DataFrames **must** be sorted by the key column ascending
 * - `direction`: `"backward"` (default), `"forward"`, `"nearest"`
 * - `by`: additional columns that must match exactly before the asof key lookup
 * - `tolerance`: maximum numeric distance allowed between matched keys
 * - `allow_exact_matches`: if `false`, only strictly less-than (backward) or
 *   strictly greater-than (forward) matches are allowed
 * - `suffixes`: column-name suffixes applied to overlapping non-key columns
 *
 * @example
 * ```ts
 * import { DataFrame, mergeAsof } from "tsb";
 *
 * const trades = DataFrame.fromColumns({
 *   time:  [1, 5, 10],
 *   price: [100, 200, 300],
 * });
 * const quotes = DataFrame.fromColumns({
 *   time: [2, 6],
 *   bid:  [98, 195],
 * });
 *
 * mergeAsof(trades, quotes, { on: "time" });
 * // time | price | bid
 * //    1 |   100 | null   ← no quote ≤ 1
 * //    5 |   200 |   98   ← most recent quote ≤ 5 is at time=2
 * //   10 |   300 |  195   ← most recent quote ≤ 10 is at time=6
 * ```
 *
 * @module
 */

import { DataFrame, RangeIndex } from "../core/index.ts";
import type { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Direction for the asof key search. */
export type AsofDirection = "backward" | "forward" | "nearest";

/** Options for {@link mergeAsof}. */
export interface MergeAsofOptions {
  /**
   * Column name present in **both** DataFrames to use as the ordered key.
   * Mutually exclusive with `left_on` / `right_on` / `left_index` / `right_index`.
   */
  readonly on?: string;
  /** Key column in the left DataFrame (use with `right_on`). */
  readonly left_on?: string;
  /** Key column in the right DataFrame (use with `left_on`). */
  readonly right_on?: string;
  /** Use left DataFrame's index as the key. */
  readonly left_index?: boolean;
  /** Use right DataFrame's index as the key. */
  readonly right_index?: boolean;
  /**
   * Column(s) that must match **exactly** before the asof key lookup.
   * Equivalent to `by` in both DataFrames.
   */
  readonly by?: string | readonly string[];
  /** `by` override for the left DataFrame only. */
  readonly left_by?: string | readonly string[];
  /** `by` override for the right DataFrame only. */
  readonly right_by?: string | readonly string[];
  /**
   * Suffixes applied to overlapping non-key column names.
   * Default: `["_x", "_y"]`.
   */
  readonly suffixes?: readonly [string, string];
  /**
   * Maximum distance (numeric) allowed between matched keys.
   * A matched row is nulled-out when `|leftKey - rightKey| > tolerance`.
   * Default: `null` (no limit).
   */
  readonly tolerance?: number | null;
  /**
   * Whether an exact key match is allowed.
   * - `true` (default): `leftKey === rightKey` is a valid match
   * - `false`: only strictly less-than (backward) / greater-than (forward) matches
   */
  readonly allow_exact_matches?: boolean;
  /**
   * Direction for the nearest-key search:
   * - `"backward"` (default): largest right key ≤ left key
   * - `"forward"`: smallest right key ≥ left key
   * - `"nearest"`: closest right key (ties broken backward)
   */
  readonly direction?: AsofDirection;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Extract numeric/string key for a given row from a DataFrame column. */
function getKeyValue(df: DataFrame, colName: string | null, rowIdx: number): Scalar {
  if (colName === null) {
    return df.index.at(rowIdx) as Scalar;
  }
  return df.col(colName).iat(rowIdx);
}

/** Convert Label/Scalar to a comparable number for asof matching. */
function toNum(v: Scalar): number {
  if (v instanceof Date) {
    return v.getTime();
  }
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? Number.NaN : n;
  }
  return Number.NaN;
}

/**
 * Binary search helpers.
 * Returns the insertion index for `target` in the sorted array `arr`.
 */
function lowerBound(arr: readonly number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((arr[mid] as number) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function upperBound(arr: readonly number[], target: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((arr[mid] as number) <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Find the right-side row index for a single left key value using the
 * pre-sorted key array and direction.
 */
function findMatch(
  leftKeyNum: number,
  rightKeys: readonly number[],
  direction: AsofDirection,
  allowExact: boolean,
): number {
  if (rightKeys.length === 0) {
    return -1;
  }

  if (direction === "backward") {
    // largest right key that is <= leftKey (or < if !allowExact)
    const bound = allowExact
      ? upperBound(rightKeys, leftKeyNum)
      : lowerBound(rightKeys, leftKeyNum);
    return bound - 1; // -1 means no match
  }

  if (direction === "forward") {
    // smallest right key that is >= leftKey (or > if !allowExact)
    const bound = allowExact
      ? lowerBound(rightKeys, leftKeyNum)
      : upperBound(rightKeys, leftKeyNum);
    return bound < rightKeys.length ? bound : -1;
  }

  // direction === "nearest": closest key; ties broken backward
  const bwdBound = upperBound(rightKeys, leftKeyNum) - 1;
  const fwdBound = lowerBound(rightKeys, leftKeyNum);

  const hasBwd = bwdBound >= 0;
  const hasFwd = fwdBound < rightKeys.length;

  // If exact match exists and allow_exact_matches, it satisfies both directions
  if (!(hasBwd || hasFwd)) {
    return -1;
  }
  if (!hasBwd) {
    return fwdBound;
  }
  if (!hasFwd) {
    return bwdBound;
  }

  const bwdDist = leftKeyNum - (rightKeys[bwdBound] as number);
  const fwdDist = (rightKeys[fwdBound] as number) - leftKeyNum;

  // Exact match: both distances are 0
  if (bwdDist === 0 && fwdDist === 0) {
    return allowExact ? bwdBound : -1;
  }
  if (bwdDist === 0) {
    return allowExact ? bwdBound : fwdBound;
  }
  if (fwdDist === 0) {
    return allowExact ? fwdBound : bwdBound;
  }

  return fwdDist < bwdDist ? fwdBound : bwdBound;
}

// ─── resolve key spec ─────────────────────────────────────────────────────────

interface KeySpec {
  readonly leftKey: string | null; // null → use index
  readonly rightKey: string | null;
  readonly leftBy: readonly string[];
  readonly rightBy: readonly string[];
}

function resolveKeySpec(left: DataFrame, right: DataFrame, opts: MergeAsofOptions): KeySpec {
  let leftKey: string | null;
  let rightKey: string | null;

  if (opts.left_index) {
    leftKey = null;
  } else if (opts.left_on != null) {
    leftKey = opts.left_on;
  } else if (opts.on != null) {
    leftKey = opts.on;
  } else {
    // infer: find common numeric column
    const common = left.columns.values.filter((c) => right.columns.values.includes(c));
    if (common.length === 0) {
      throw new Error(
        "merge_asof: no common columns found and no key specified via `on`, `left_on`/`right_on`, or `*_index`",
      );
    }
    leftKey = common[0] as string;
  }

  if (opts.right_index) {
    rightKey = null;
  } else if (opts.right_on != null) {
    rightKey = opts.right_on;
  } else if (opts.on != null) {
    rightKey = opts.on;
  } else {
    rightKey = leftKey; // inferred common column
  }

  // by columns
  const toArray = (v: string | readonly string[] | undefined): readonly string[] => {
    if (v === undefined) {
      return [];
    }
    return typeof v === "string" ? [v] : v;
  };

  const globalBy = toArray(opts.by);
  const leftBy = opts.left_by != null ? toArray(opts.left_by) : globalBy;
  const rightBy = opts.right_by != null ? toArray(opts.right_by) : globalBy;

  // Validate that left/right DataFrames actually have the by columns
  for (const col of leftBy) {
    if (!left.columns.values.includes(col)) {
      throw new Error(`merge_asof: left_by column "${col}" not found in left DataFrame`);
    }
  }
  for (const col of rightBy) {
    if (!right.columns.values.includes(col)) {
      throw new Error(`merge_asof: right_by column "${col}" not found in right DataFrame`);
    }
  }

  // Validate key columns exist
  if (leftKey !== null && !left.columns.values.includes(leftKey)) {
    throw new Error(`merge_asof: left key column "${leftKey}" not found in left DataFrame`);
  }
  if (rightKey !== null && !right.columns.values.includes(rightKey)) {
    throw new Error(`merge_asof: right key column "${rightKey}" not found in right DataFrame`);
  }

  return { leftKey, rightKey, leftBy, rightBy };
}

// ─── column plan ──────────────────────────────────────────────────────────────

interface ColEntry {
  readonly side: "left" | "right" | "key";
  readonly srcCol: string | null; // null → index
  readonly outCol: string;
}

function buildColPlan(
  left: DataFrame,
  right: DataFrame,
  keySpec: KeySpec,
  suffixes: readonly [string, string],
): readonly ColEntry[] {
  const plan: ColEntry[] = [];

  // All left columns
  for (const c of left.columns.values) {
    plan.push({ side: "left", srcCol: c, outCol: c });
  }

  // Right columns: skip the right key column; apply suffixes for overlaps
  const leftOutNames = new Set(left.columns.values);

  for (const c of right.columns.values) {
    if (c === keySpec.rightKey && keySpec.leftKey !== null) {
      // Skip the right key column when it's a named column (to avoid duplication)
      // unless left_on/right_on differ, in which case both are kept
      if (keySpec.leftKey === keySpec.rightKey) {
        continue;
      }
    }
    // Check overlap with left output names (after accounting for suffixes)
    let outCol = c;
    if (leftOutNames.has(c)) {
      // Apply suffix to both left and right
      const leftIdx = plan.findIndex((e) => e.outCol === c && e.side === "left");
      if (leftIdx >= 0) {
        const existing = plan[leftIdx];
        if (existing !== undefined) {
          plan[leftIdx] = { side: existing.side, srcCol: existing.srcCol, outCol: c + suffixes[0] };
          leftOutNames.delete(c);
          leftOutNames.add(c + suffixes[0]);
        }
      }
      outCol = c + suffixes[1];
    }
    plan.push({ side: "right", srcCol: c, outCol });
  }

  return plan;
}

// ─── public function ──────────────────────────────────────────────────────────

/**
 * Perform an ordered (nearest-key) left-join of two DataFrames.
 *
 * Mirrors `pandas.merge_asof`.
 *
 * Both DataFrames must be sorted ascending by their key column(s) before
 * calling this function.
 *
 * @param left    - Left DataFrame (must be sorted by key).
 * @param right   - Right DataFrame (must be sorted by key).
 * @param options - Join specification (see {@link MergeAsofOptions}).
 * @returns A new `DataFrame` with the same number of rows as `left`.
 *
 * @example
 * ```ts
 * // Match each trade to the most-recent quote (backward asof)
 * mergeAsof(trades, quotes, { on: "time" });
 *
 * // Forward asof: find the first quote after each trade
 * mergeAsof(trades, quotes, { on: "time", direction: "forward" });
 *
 * // Nearest: find the closest quote, with per-ticker grouping
 * mergeAsof(trades, quotes, { on: "time", by: "ticker", direction: "nearest" });
 * ```
 */
export function mergeAsof(
  left: DataFrame,
  right: DataFrame,
  options?: MergeAsofOptions,
): DataFrame {
  const opts = options ?? {};
  const suffixes: readonly [string, string] = opts.suffixes ?? ["_x", "_y"];
  const direction: AsofDirection = opts.direction ?? "backward";
  const allowExact: boolean = opts.allow_exact_matches ?? true;
  const tolerance: number | null = opts.tolerance ?? null;

  const keySpec = resolveKeySpec(left, right, opts);
  const plan = buildColPlan(left, right, keySpec, suffixes);

  const nLeft = left.shape[0];
  const nRight = right.shape[0];

  // Pre-extract right keys as numbers
  const rightKeyNums: number[] = new Array(nRight) as number[];
  for (let i = 0; i < nRight; i++) {
    rightKeyNums[i] = toNum(getKeyValue(right, keySpec.rightKey, i));
  }

  // For each left row, find the matching right row
  const rightMatchIdx: number[] = new Array(nLeft).fill(-1) as number[];

  if (keySpec.leftBy.length === 0) {
    // No by-groups: single sorted search over all of right
    for (let li = 0; li < nLeft; li++) {
      const lkNum = toNum(getKeyValue(left, keySpec.leftKey, li));
      rightMatchIdx[li] = findMatch(lkNum, rightKeyNums, direction, allowExact);
    }
  } else {
    // by-groups: group right rows by their by-key tuple, then search within each group
    // Build a map: byKey → sorted list of {rightKeyNum, rightRowIdx}
    type GroupEntry = { keyNum: number; rowIdx: number };
    const groups = new Map<string, GroupEntry[]>();

    for (let ri = 0; ri < nRight; ri++) {
      const byVals: Scalar[] = keySpec.rightBy.map((col) => right.col(col).iat(ri));
      const groupKey = JSON.stringify(byVals);
      let group = groups.get(groupKey);
      if (group === undefined) {
        group = [];
        groups.set(groupKey, group);
      }
      group.push({ keyNum: rightKeyNums[ri] as number, rowIdx: ri });
    }

    for (let li = 0; li < nLeft; li++) {
      const byVals: Scalar[] = keySpec.leftBy.map((col) => left.col(col).iat(li));
      const groupKey = JSON.stringify(byVals);
      const group = groups.get(groupKey);
      if (group === undefined || group.length === 0) {
        rightMatchIdx[li] = -1;
        continue;
      }
      const groupKeys = group.map((e) => e.keyNum);
      const lkNum = toNum(getKeyValue(left, keySpec.leftKey, li));
      const posInGroup = findMatch(lkNum, groupKeys, direction, allowExact);
      rightMatchIdx[li] = posInGroup >= 0 ? (group[posInGroup]?.rowIdx ?? -1) : -1;
    }
  }

  // Apply tolerance filter
  if (tolerance !== null) {
    for (let li = 0; li < nLeft; li++) {
      const ri = rightMatchIdx[li] as number;
      if (ri < 0) {
        continue;
      }
      const lkNum = toNum(getKeyValue(left, keySpec.leftKey, li));
      const rkNum = rightKeyNums[ri] as number;
      if (Math.abs(lkNum - rkNum) > tolerance) {
        rightMatchIdx[li] = -1;
      }
    }
  }

  // Build output columns
  const colData: Record<string, Scalar[]> = {};
  for (const entry of plan) {
    const col: Scalar[] = new Array(nLeft) as Scalar[];
    if (entry.side === "left") {
      const series = left.col(entry.srcCol as string);
      for (let li = 0; li < nLeft; li++) {
        col[li] = series.iat(li);
      }
    } else {
      // right side — use matched row or null
      const series = right.col(entry.srcCol as string);
      for (let li = 0; li < nLeft; li++) {
        const ri = rightMatchIdx[li] as number;
        col[li] = ri >= 0 ? series.iat(ri) : null;
      }
    }
    colData[entry.outCol] = col;
  }

  const index = new RangeIndex(nLeft) as unknown as Index<Label>;
  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index });
}
