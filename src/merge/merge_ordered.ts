/**
 * merge_ordered — ordered merge of two DataFrames with optional fill.
 *
 * Mirrors `pandas.merge_ordered`:
 * - Performs an ordered (sorted) merge — default `how: "outer"`
 * - Result is sorted ascending by the merge key column(s)
 * - `fill_method`: optional `"ffill"` to forward-fill NaN/null gaps in
 *   non-key columns after merging
 * - `left_by` / `right_by`: group columns — the merge is applied
 *   independently within each group combination and results are
 *   concatenated in group order
 * - `suffixes`: applied to overlapping non-key column names (default
 *   `["_x", "_y"]`)
 *
 * @example
 * ```ts
 * import { DataFrame, mergeOrdered } from "tsb";
 *
 * const left = DataFrame.fromColumns({
 *   date: [1, 3, 5],
 *   price: [10, 30, 50],
 * });
 * const right = DataFrame.fromColumns({
 *   date: [2, 3, 6],
 *   volume: [200, 300, 600],
 * });
 *
 * mergeOrdered(left, right, { on: "date" });
 * // date | price | volume
 * //    1 |    10 |   null
 * //    2 |  null |    200
 * //    3 |    30 |    300
 * //    5 |    50 |   null
 * //    6 |  null |    600
 *
 * mergeOrdered(left, right, { on: "date", fill_method: "ffill" });
 * // date | price | volume
 * //    1 |    10 |   null   ← nothing before to fill
 * //    2 |    10 |    200   ← price carried forward from row 0
 * //    3 |    30 |    300
 * //    5 |    50 |    300   ← volume carried forward from row 3
 * //    6 |    50 |    600
 * ```
 *
 * @module
 */

import { DataFrame, RangeIndex } from "../core/index.ts";
import type { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Fill method applied to non-key columns after the ordered merge. */
export type OrderedFillMethod = "ffill";

/** Options for {@link mergeOrdered}. */
export interface MergeOrderedOptions {
  /**
   * Column name present in **both** DataFrames to use as the ordered key.
   * Mutually exclusive with `left_on` / `right_on`.
   */
  readonly on?: string | readonly string[];
  /** Key column(s) in the left DataFrame (use with `right_on`). */
  readonly left_on?: string | readonly string[];
  /** Key column(s) in the right DataFrame (use with `left_on`). */
  readonly right_on?: string | readonly string[];
  /**
   * Column(s) in the left DataFrame to group by before merging.
   * The merge is applied independently per group and results concatenated.
   */
  readonly left_by?: string | readonly string[];
  /**
   * Column(s) in the right DataFrame to group by before merging.
   * Must have the same number of columns as `left_by` when both are provided.
   */
  readonly right_by?: string | readonly string[];
  /**
   * How to join the two DataFrames.
   * Default: `"outer"`.
   */
  readonly how?: "inner" | "outer" | "left" | "right";
  /**
   * Fill method to apply to non-key columns after merging.
   * - `"ffill"`: forward-fill null/undefined values within each column
   * - `null` / omitted: no filling (default)
   */
  readonly fill_method?: OrderedFillMethod | null;
  /**
   * Suffixes applied to overlapping non-key column names.
   * Default: `["_x", "_y"]`.
   */
  readonly suffixes?: readonly [string, string];
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Normalise a string | readonly string[] | undefined into string[]. */
function toCols(v: string | readonly string[] | undefined): string[] {
  if (v === undefined) {
    return [];
  }
  return typeof v === "string" ? [v] : [...v];
}

/** Read scalar from a DataFrame column. */
function getVal(df: DataFrame, col: string, row: number): Scalar {
  return df.col(col).at(row) as Scalar;
}

/** Build a composite key string from multiple columns for one row. */
function makeGroupKey(df: DataFrame, cols: readonly string[], row: number): string {
  return cols.map((c) => String(getVal(df, c, row))).join("\x00");
}

/** Compare two Scalar values for sort ordering (ascending). */
function compareScalar(a: Scalar, b: Scalar): number {
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

/** Apply forward-fill to an array of scalars (in-place mutating). */
function ffillArray(arr: Scalar[]): void {
  let last: Scalar = null;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === null || v === undefined) {
      arr[i] = last;
    } else {
      last = v;
    }
  }
}

// ─── core ordered merge ───────────────────────────────────────────────────────

/**
 * Column plan entry: which side provides a column, what key it reads, what
 * name it gets in the output.
 */
interface ColEntry {
  readonly outputName: string;
  readonly side: "left" | "right" | "coalesce";
  readonly leftCol: string | null;
  readonly rightCol: string | null;
}

/** Resolve key column names (left and right may differ). */
function resolveKeys(
  left: DataFrame,
  right: DataFrame,
  opts: MergeOrderedOptions,
): { leftKeys: string[]; rightKeys: string[] } {
  const onCols = toCols(opts.on);
  if (onCols.length > 0) {
    return { leftKeys: onCols, rightKeys: onCols };
  }
  const leftKeys = toCols(opts.left_on);
  const rightKeys = toCols(opts.right_on);
  if (leftKeys.length > 0 && rightKeys.length > 0) {
    return { leftKeys, rightKeys };
  }
  // Auto-detect shared columns
  const leftCols = new Set(left.columns.values as string[]);
  const shared = (right.columns.values as string[]).filter((c) => leftCols.has(c));
  if (shared.length === 0) {
    throw new Error("mergeOrdered: no common columns and no on/left_on/right_on specified");
  }
  return { leftKeys: shared, rightKeys: shared };
}

/** Build the output column plan for an ordered merge. */
function buildPlan(
  left: DataFrame,
  right: DataFrame,
  leftKeys: readonly string[],
  rightKeys: readonly string[],
  leftBy: readonly string[],
  rightBy: readonly string[],
  suffixes: readonly [string, string],
): ColEntry[] {
  const leftKeysSet = new Set(leftKeys);
  const rightKeysSet = new Set(rightKeys);
  const leftBySet = new Set(leftBy);
  const rightBySet = new Set(rightBy);

  const plan: ColEntry[] = [];

  // 1. Coalesced key columns (using left key names in output)
  for (let i = 0; i < leftKeys.length; i++) {
    const lk = leftKeys[i]!;
    const rk = rightKeys[i]!;
    plan.push({ outputName: lk, side: "coalesce", leftCol: lk, rightCol: rk });
  }

  // 2. By columns
  for (let i = 0; i < leftBy.length; i++) {
    const lc = leftBy[i]!;
    const rc = rightBy[i];
    if (rc === lc) {
      plan.push({ outputName: lc, side: "coalesce", leftCol: lc, rightCol: rc });
    } else {
      plan.push({ outputName: lc, side: "left", leftCol: lc, rightCol: null });
    }
  }

  // 3. Right-by columns (from right only) — only if different names from left_by
  for (let i = 0; i < rightBy.length; i++) {
    const rc = rightBy[i]!;
    const lc = leftBy[i];
    if (rc !== lc) {
      plan.push({ outputName: rc, side: "right", leftCol: null, rightCol: rc });
    }
  }

  // 4. Non-key, non-by left columns
  const leftNonKey = (left.columns.values as string[]).filter(
    (c) => !(leftKeysSet.has(c) || leftBySet.has(c)),
  );
  // 5. Non-key, non-by right columns
  const rightNonKey = (right.columns.values as string[]).filter(
    (c) => !(rightKeysSet.has(c) || rightBySet.has(c)),
  );

  const rightNonKeySet = new Set(rightNonKey);

  for (const lc of leftNonKey) {
    if (rightNonKeySet.has(lc)) {
      // Overlap: emit both with suffixes
      plan.push({ outputName: lc + suffixes[0], side: "left", leftCol: lc, rightCol: null });
    } else {
      plan.push({ outputName: lc, side: "left", leftCol: lc, rightCol: null });
    }
  }
  for (const rc of rightNonKey) {
    if (leftNonKey.includes(rc)) {
      plan.push({ outputName: rc + suffixes[1], side: "right", leftCol: null, rightCol: rc });
    } else {
      plan.push({ outputName: rc, side: "right", leftCol: null, rightCol: rc });
    }
  }

  return plan;
}

/**
 * Merge a subset of rows from left and right into an ordered result.
 * Both subsets are already sorted by the key columns.
 */
function mergeSubset(
  left: DataFrame,
  right: DataFrame,
  leftRows: readonly number[],
  rightRows: readonly number[],
  leftKeys: readonly string[],
  rightKeys: readonly string[],
  plan: readonly ColEntry[],
  how: "inner" | "outer" | "left" | "right",
): Record<string, Scalar[]> {
  // Build merged key + row-pair list via a sorted merge of the two row-sets
  type RowPair = { leftRow: number | null; rightRow: number | null; keyVal: Scalar[] };

  const pairs: RowPair[] = [];

  let li = 0;
  let ri = 0;

  while (li < leftRows.length && ri < rightRows.length) {
    const lr = leftRows[li]!;
    const rr = rightRows[ri]!;

    // Build composite key arrays
    const lKeyVals = leftKeys.map((k) => getVal(left, k, lr));
    const rKeyVals = rightKeys.map((k) => getVal(right, k, rr));

    // Compare first key dimension
    const cmp = compareScalar(lKeyVals[0] ?? null, rKeyVals[0] ?? null);

    if (cmp === 0) {
      // exact match — may need to handle many-to-many
      // Find all left rows with same key
      let li2 = li + 1;
      while (li2 < leftRows.length) {
        const nextLr = leftRows[li2]!;
        const nextKey = leftKeys.map((k) => getVal(left, k, nextLr));
        if (compareScalar(nextKey[0] ?? null, lKeyVals[0] ?? null) !== 0) {
          break;
        }
        li2++;
      }
      let ri2 = ri + 1;
      while (ri2 < rightRows.length) {
        const nextRr = rightRows[ri2]!;
        const nextKey = rightKeys.map((k) => getVal(right, k, nextRr));
        if (compareScalar(nextKey[0] ?? null, rKeyVals[0] ?? null) !== 0) {
          break;
        }
        ri2++;
      }
      // Cartesian product of matching rows
      for (let a = li; a < li2; a++) {
        for (let b = ri; b < ri2; b++) {
          pairs.push({
            leftRow: leftRows[a] ?? null,
            rightRow: rightRows[b] ?? null,
            keyVal: lKeyVals,
          });
        }
      }
      li = li2;
      ri = ri2;
    } else if (cmp < 0) {
      // left key is smaller
      if (how === "outer" || how === "left") {
        pairs.push({ leftRow: lr, rightRow: null, keyVal: lKeyVals });
      }
      li++;
    } else {
      // right key is smaller
      if (how === "outer" || how === "right") {
        pairs.push({ leftRow: null, rightRow: rr, keyVal: rKeyVals });
      }
      ri++;
    }
  }

  // Remaining left rows
  if (how === "outer" || how === "left") {
    while (li < leftRows.length) {
      const lr = leftRows[li]!;
      const lKeyVals = leftKeys.map((k) => getVal(left, k, lr));
      pairs.push({ leftRow: lr, rightRow: null, keyVal: lKeyVals });
      li++;
    }
  }

  // Remaining right rows
  if (how === "outer" || how === "right") {
    while (ri < rightRows.length) {
      const rr = rightRows[ri]!;
      const rKeyVals = rightKeys.map((k) => getVal(right, k, rr));
      pairs.push({ leftRow: null, rightRow: rr, keyVal: rKeyVals });
      ri++;
    }
  }

  // Build output columns
  const outCols: Record<string, Scalar[]> = {};
  for (const e of plan) {
    outCols[e.outputName] = [];
  }

  for (const pair of pairs) {
    for (const e of plan) {
      let val: Scalar = null;
      if (e.side === "coalesce") {
        if (pair.leftRow !== null && e.leftCol !== null) {
          val = getVal(left, e.leftCol, pair.leftRow);
        } else if (pair.rightRow !== null && e.rightCol !== null) {
          val = getVal(right, e.rightCol, pair.rightRow);
        }
      } else if (e.side === "left") {
        if (pair.leftRow !== null && e.leftCol !== null) {
          val = getVal(left, e.leftCol, pair.leftRow);
        }
      } else {
        // right
        if (pair.rightRow !== null && e.rightCol !== null) {
          val = getVal(right, e.rightCol, pair.rightRow);
        }
      }
      (outCols[e.outputName] as Scalar[]).push(val);
    }
  }

  return outCols;
}

/** Concatenate record-of-arrays column-wise by appending rows. */
function appendRows(
  dest: Record<string, Scalar[]>,
  src: Record<string, Scalar[]>,
  keys: readonly string[],
): void {
  for (const k of keys) {
    const d = dest[k];
    const s = src[k];
    if (d !== undefined && s !== undefined) {
      for (const v of s) {
        d.push(v);
      }
    }
  }
}

// ─── public function ──────────────────────────────────────────────────────────

/**
 * Perform an ordered merge of two DataFrames, optionally filling gaps.
 *
 * Mirrors `pandas.merge_ordered`.
 *
 * @param left    - Left DataFrame (must be sorted by the key column).
 * @param right   - Right DataFrame (must be sorted by the key column).
 * @param options - Merge specification (see {@link MergeOrderedOptions}).
 * @returns A new `DataFrame` with rows sorted ascending by the key column(s).
 *
 * @throws {Error}  When no join keys can be determined.
 *
 * @example
 * ```ts
 * const left = DataFrame.fromColumns({
 *   k: [1, 3, 5],
 *   a: [10, 30, 50],
 * });
 * const right = DataFrame.fromColumns({
 *   k: [2, 3, 6],
 *   b: [20, 30, 60],
 * });
 *
 * mergeOrdered(left, right, { on: "k" });
 * // k | a    | b
 * // 1 | 10   | null
 * // 2 | null | 20
 * // 3 | 30   | 30
 * // 5 | 50   | null
 * // 6 | null | 60
 *
 * mergeOrdered(left, right, { on: "k", fill_method: "ffill" });
 * // k | a    | b
 * // 1 | 10   | null
 * // 2 | 10   | 20
 * // 3 | 30   | 30
 * // 5 | 50   | 30
 * // 6 | 50   | 60
 * ```
 */
export function mergeOrdered(
  left: DataFrame,
  right: DataFrame,
  options?: MergeOrderedOptions,
): DataFrame {
  const opts = options ?? {};
  const how = opts.how ?? "outer";
  const suffixes: readonly [string, string] = opts.suffixes ?? ["_x", "_y"];
  const fillMethod = opts.fill_method ?? null;

  const { leftKeys, rightKeys } = resolveKeys(left, right, opts);

  const leftBy = toCols(opts.left_by);
  const rightBy = toCols(opts.right_by);

  // Validate by columns
  if (leftBy.length > 0 && rightBy.length > 0 && leftBy.length !== rightBy.length) {
    throw new Error("mergeOrdered: left_by and right_by must have the same number of columns");
  }
  const hasBy = leftBy.length > 0 || rightBy.length > 0;
  const effectiveLeftBy = leftBy.length > 0 ? leftBy : rightBy;
  const effectiveRightBy = rightBy.length > 0 ? rightBy : leftBy;

  const plan = buildPlan(
    left,
    right,
    leftKeys,
    rightKeys,
    effectiveLeftBy,
    effectiveRightBy,
    suffixes,
  );
  const outputColNames = plan.map((e) => e.outputName);

  // ── No-group case ─────────────────────────────────────────────────────────

  if (!hasBy) {
    // Sort both DFs by key then merge
    const leftSorted = sortByKeys(left, leftKeys);
    const rightSorted = sortByKeys(right, rightKeys);

    const leftAllRows = Array.from({ length: leftSorted.shape[0] }, (_, i) => i);
    const rightAllRows = Array.from({ length: rightSorted.shape[0] }, (_, i) => i);

    const colData = mergeSubset(
      leftSorted,
      rightSorted,
      leftAllRows,
      rightAllRows,
      leftKeys,
      rightKeys,
      plan,
      how,
    );

    if (fillMethod === "ffill") {
      for (const name of outputColNames) {
        // Don't fill key columns
        if (!leftKeys.includes(name)) {
          const arr = colData[name];
          if (arr !== undefined) {
            ffillArray(arr);
          }
        }
      }
    }

    return buildDataFrame(colData, outputColNames);
  }

  // ── Group-by case ─────────────────────────────────────────────────────────

  // Group left and right rows by their by-column keys
  const leftGroups = groupRows(left, effectiveLeftBy);
  const rightGroups = groupRows(right, effectiveRightBy);

  // Collect all group keys from both sides
  const allGroupKeys = new Set([...leftGroups.keys(), ...rightGroups.keys()]);

  // Initialise output column arrays
  const colData: Record<string, Scalar[]> = {};
  for (const name of outputColNames) {
    colData[name] = [];
  }

  for (const gk of allGroupKeys) {
    const lRows = leftGroups.get(gk) ?? [];
    const rRows = rightGroups.get(gk) ?? [];

    // Sort row indices by key columns within each group
    const leftSortedRows = sortRowIndices(left, lRows, leftKeys);
    const rightSortedRows = sortRowIndices(right, rRows, rightKeys);

    const groupCols = mergeSubset(
      left,
      right,
      leftSortedRows,
      rightSortedRows,
      leftKeys,
      rightKeys,
      plan,
      how,
    );

    if (fillMethod === "ffill") {
      for (const name of outputColNames) {
        if (
          !(
            leftKeys.includes(name) ||
            effectiveLeftBy.includes(name) ||
            effectiveRightBy.includes(name)
          )
        ) {
          const arr = groupCols[name];
          if (arr !== undefined) {
            ffillArray(arr);
          }
        }
      }
    }

    appendRows(colData, groupCols, outputColNames);
  }

  return buildDataFrame(colData, outputColNames);
}

// ─── sorting helpers ──────────────────────────────────────────────────────────

/** Sort a DataFrame by key columns (returns new DataFrame). */
function sortByKeys(df: DataFrame, keys: readonly string[]): DataFrame {
  if (keys.length === 0) {
    return df;
  }
  const n = df.shape[0];
  const rows = Array.from({ length: n }, (_, i) => i);
  rows.sort((a, b) => {
    for (const k of keys) {
      const va = getVal(df, k, a);
      const vb = getVal(df, k, b);
      const c = compareScalar(va, vb);
      if (c !== 0) {
        return c;
      }
    }
    return 0;
  });

  const colData: Record<string, Scalar[]> = {};
  for (const c of df.columns.values as string[]) {
    colData[c] = rows.map((r) => getVal(df, c, r));
  }

  const idx = new RangeIndex(n) as unknown as Index<Label>;
  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index: idx });
}

/** Sort an array of row-indices by key columns. */
function sortRowIndices(df: DataFrame, rows: readonly number[], keys: readonly string[]): number[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const k of keys) {
      const va = getVal(df, k, a);
      const vb = getVal(df, k, b);
      const c = compareScalar(va, vb);
      if (c !== 0) {
        return c;
      }
    }
    return 0;
  });
  return sorted;
}

/** Group row indices by the composite value of by-columns. */
function groupRows(df: DataFrame, byCols: readonly string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < df.shape[0]; i++) {
    const k = makeGroupKey(df, byCols, i);
    let arr = map.get(k);
    if (arr === undefined) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(i);
  }
  return map;
}

/** Build a DataFrame from a column-data record and an ordered list of column names. */
function buildDataFrame(colData: Record<string, Scalar[]>, colNames: readonly string[]): DataFrame {
  const n = colNames.length > 0 ? (colData[colNames[0]!] as Scalar[]).length : 0;
  const idx = new RangeIndex(n) as unknown as Index<Label>;
  const data: Record<string, readonly Scalar[]> = {};
  for (const c of colNames) {
    data[c] = colData[c] as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: idx });
}
