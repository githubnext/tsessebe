/**
 * merge — database-style joining of two DataFrames.
 *
 * Mirrors `pandas.merge` / `DataFrame.merge`:
 * - **how='inner'** (default): only rows whose key values exist in both tables
 * - **how='left'**: all rows from left; fill gaps in right columns with `null`
 * - **how='right'**: all rows from right; fill gaps in left columns with `null`
 * - **how='outer'**: all rows from both; fill gaps with `null`
 *
 * Keys can be specified as shared column name(s) (`on`), different column
 * names per side (`left_on` / `right_on`), or the DataFrame indexes
 * (`left_index` / `right_index`).
 *
 * Duplicate column names (excluding key columns) are disambiguated with
 * configurable suffixes (default `"_x"` and `"_y"`).
 *
 * @example
 * ```ts
 * const left  = DataFrame.fromColumns({ id: [1, 2, 3], val: ["a", "b", "c"] });
 * const right = DataFrame.fromColumns({ id: [2, 3, 4], score: [10, 20, 30] });
 *
 * const inner = merge(left, right, { on: "id" });
 * // id  val  score
 * //  2   b    10
 * //  3   c    20
 *
 * const outer = merge(left, right, { on: "id", how: "outer" });
 * // id  val   score
 * //  1   a    null
 * //  2   b    10
 * //  3   c    20
 * //  4  null  30
 * ```
 *
 * @module
 */

import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import type { JoinHow, Label, Scalar } from "../types.ts";

// ─── public option types ──────────────────────────────────────────────────────

/** Options accepted by {@link merge}. */
export interface MergeOptions {
  /**
   * How to handle rows that don't match.
   * - `"inner"` (default): only matched rows
   * - `"left"`: all left rows
   * - `"right"`: all right rows
   * - `"outer"`: all rows from both sides
   */
  readonly how?: JoinHow;

  /**
   * Column name(s) to join on (must exist in both DataFrames).
   * Mutually exclusive with `left_on` / `right_on` and `left_index` /
   * `right_index`.
   */
  readonly on?: string | readonly string[];

  /**
   * Column name(s) from the **left** DataFrame to use as the join key.
   * Must be paired with `right_on`.
   */
  readonly left_on?: string | readonly string[];

  /**
   * Column name(s) from the **right** DataFrame to use as the join key.
   * Must be paired with `left_on`.
   */
  readonly right_on?: string | readonly string[];

  /**
   * Use the left DataFrame's index as the join key.
   * Can be combined with `right_on` or `right_index`.
   */
  readonly left_index?: boolean;

  /**
   * Use the right DataFrame's index as the join key.
   * Can be combined with `left_on` or `left_index`.
   */
  readonly right_index?: boolean;

  /**
   * Suffix applied to overlapping column names from the left DataFrame
   * (excluding key columns).  Defaults to `"_x"`.
   */
  readonly suffixes?: readonly [string, string];

  /**
   * When `true`, reset the result index to a `RangeIndex`.  Defaults to `true`.
   */
  readonly sort?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Resolve a single-or-array key spec to a readonly string array. */
function toKeyArray(k: string | readonly string[]): readonly string[] {
  return typeof k === "string" ? [k] : k;
}

/**
 * Build a composite key string for a row by concatenating key-column values.
 * Uses a delimiter unlikely to appear in data to avoid false collisions.
 */
const KEY_DELIM = "\x00";

function compositeKey(row: readonly Scalar[]): string {
  return row
    .map((v) => (isMissing(v) ? "__NULL__" : String(v)))
    .join(KEY_DELIM);
}

/** Extract key-column values for a given row position from multiple Series. */
function rowKey(seriesArr: readonly Series<Scalar>[], pos: number): string {
  const vals = seriesArr.map((s) => s.values[pos] as Scalar);
  return compositeKey(vals);
}

/**
 * Build a lookup from composite key → list of row positions.
 * Supports many-to-many joins.
 */
function buildKeyIndex(
  seriesArr: readonly Series<Scalar>[],
  len: number,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < len; i++) {
    const k = rowKey(seriesArr, i);
    const existing = map.get(k);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      map.set(k, [i]);
    }
  }
  return map;
}

/**
 * Given `left_on`, `right_on`, `left_index`, `right_index`, and `on`,
 * return the arrays of Series to use as keys for each side.
 */
function resolveKeys(
  left: DataFrame,
  right: DataFrame,
  opts: MergeOptions,
): {
  leftKeySeries: Series<Scalar>[];
  rightKeySeries: Series<Scalar>[];
  leftKeyNames: string[];
  rightKeyNames: string[];
} {
  const { on, left_on, right_on, left_index = false, right_index = false } = opts;

  let leftKeyNames: string[] = [];
  let rightKeyNames: string[] = [];
  let leftKeySeries: Series<Scalar>[] = [];
  let rightKeySeries: Series<Scalar>[] = [];

  if (on !== undefined) {
    const keys = toKeyArray(on);
    leftKeyNames = [...keys];
    rightKeyNames = [...keys];
    leftKeySeries = keys.map((k) => left.col(k));
    rightKeySeries = keys.map((k) => right.col(k));
  } else if (left_on !== undefined || right_on !== undefined) {
    if (left_on === undefined || right_on === undefined) {
      throw new Error("merge: must specify both left_on and right_on together");
    }
    leftKeyNames = [...toKeyArray(left_on)];
    rightKeyNames = [...toKeyArray(right_on)];
    leftKeySeries = leftKeyNames.map((k) => left.col(k));
    rightKeySeries = rightKeyNames.map((k) => right.col(k));
  } else if (left_index && right_index) {
    leftKeyNames = [];
    rightKeyNames = [];
    leftKeySeries = [
      new Series<Scalar>({ data: left.index.values as Scalar[], name: "__index__" }),
    ];
    rightKeySeries = [
      new Series<Scalar>({ data: right.index.values as Scalar[], name: "__index__" }),
    ];
  } else if (left_index && right_on !== undefined) {
    leftKeyNames = [];
    rightKeyNames = [...toKeyArray(right_on)];
    leftKeySeries = [
      new Series<Scalar>({ data: left.index.values as Scalar[], name: "__index__" }),
    ];
    rightKeySeries = rightKeyNames.map((k) => right.col(k));
  } else if (right_index && left_on !== undefined) {
    leftKeyNames = [...toKeyArray(left_on)];
    rightKeyNames = [];
    leftKeySeries = leftKeyNames.map((k) => left.col(k));
    rightKeySeries = [
      new Series<Scalar>({ data: right.index.values as Scalar[], name: "__index__" }),
    ];
  } else {
    // Default: find common column names and join on them
    const leftCols = new Set(left.columns.values);
    const commonKeys = right.columns.values.filter((c) => leftCols.has(c));
    if (commonKeys.length === 0) {
      throw new Error(
        "merge: no common columns found; specify 'on', 'left_on'/'right_on', or 'left_index'/'right_index'",
      );
    }
    leftKeyNames = [...commonKeys];
    rightKeyNames = [...commonKeys];
    leftKeySeries = leftKeyNames.map((k) => left.col(k));
    rightKeySeries = rightKeyNames.map((k) => right.col(k));
  }

  return { leftKeySeries, rightKeySeries, leftKeyNames, rightKeyNames };
}

/** Determine output column names, applying suffixes for conflicts. */
function resolveOutputColumns(
  left: DataFrame,
  right: DataFrame,
  leftKeyNames: readonly string[],
  rightKeyNames: readonly string[],
  suffixes: readonly [string, string],
  left_index: boolean,
  right_index: boolean,
): {
  leftOutputCols: string[];
  rightOutputCols: string[];
  keyCols: string[];
} {
  const leftKeySet = new Set(leftKeyNames);
  const rightKeySet = new Set(rightKeyNames);

  // Key columns that appear in the output (using the left-side name)
  const keyCols: string[] = [];
  if (!left_index || !right_index) {
    // When joining on columns, include key columns in output once
    const seenKeys = new Set<string>();
    for (let i = 0; i < leftKeyNames.length; i++) {
      const lk = leftKeyNames[i] as string;
      if (!seenKeys.has(lk)) {
        seenKeys.add(lk);
        keyCols.push(lk);
      }
    }
  }

  // Non-key columns from left
  const leftNonKeys = left.columns.values.filter((c) => !leftKeySet.has(c));
  // Non-key columns from right
  const rightNonKeys = right.columns.values.filter((c) => !rightKeySet.has(c));

  const leftNonKeySet = new Set(leftNonKeys);
  const rightNonKeySet = new Set(rightNonKeys);

  // Find overlapping non-key columns → apply suffixes
  const overlap = new Set(leftNonKeys.filter((c) => rightNonKeySet.has(c)));

  const leftOutputCols = leftNonKeys.map((c) => (overlap.has(c) ? `${c}${suffixes[0]}` : c));
  const rightOutputCols = rightNonKeys.map((c) => (overlap.has(c) ? `${c}${suffixes[1]}` : c));

  return { leftOutputCols, rightOutputCols, keyCols };
}

// ─── merge implementation ──────────────────────────────────────────────────────

/**
 * Perform a database-style join of two DataFrames.
 *
 * @param left   - Left DataFrame.
 * @param right  - Right DataFrame.
 * @param options - Join configuration.
 * @returns A new DataFrame containing the merged result.
 */
export function merge(left: DataFrame, right: DataFrame, options: MergeOptions = {}): DataFrame {
  const how: JoinHow = options.how ?? "inner";
  const suffixes: readonly [string, string] = options.suffixes ?? ["_x", "_y"];
  const left_index = options.left_index ?? false;
  const right_index = options.right_index ?? false;

  const { leftKeySeries, rightKeySeries, leftKeyNames, rightKeyNames } = resolveKeys(
    left,
    right,
    options,
  );

  const nLeft = left.shape[0];
  const nRight = right.shape[0];

  // Build lookup from right-side key → row positions
  const rightKeyIndex = buildKeyIndex(rightKeySeries, nRight);

  // Match left rows against right lookup
  const leftRows: number[] = [];
  const rightRows: (number | null)[] = []; // null = no match (left/outer fill)

  for (let li = 0; li < nLeft; li++) {
    const k = rowKey(leftKeySeries, li);
    const matches = rightKeyIndex.get(k);

    if (matches !== undefined && matches.length > 0) {
      for (const ri of matches) {
        leftRows.push(li);
        rightRows.push(ri);
      }
    } else if (how === "left" || how === "outer") {
      leftRows.push(li);
      rightRows.push(null);
    }
    // inner/right: skip unmatched left rows
  }

  // For right/outer: also add right rows with no left match
  if (how === "right" || how === "outer") {
    const leftKeyIndex = buildKeyIndex(leftKeySeries, nLeft);
    for (let ri = 0; ri < nRight; ri++) {
      const k = rowKey(rightKeySeries, ri);
      if (!leftKeyIndex.has(k)) {
        leftRows.push(-1); // sentinel: no left match
        rightRows.push(ri);
      }
    }
  }

  const { leftOutputCols, rightOutputCols, keyCols } = resolveOutputColumns(
    left,
    right,
    leftKeyNames,
    rightKeyNames,
    suffixes,
    left_index,
    right_index,
  );

  const nRows = leftRows.length;
  const resultCols = new Map<string, Series<Scalar>>();
  const resultRowIndex = new RangeIndex(nRows) as unknown as Index<Label>;

  // ── Key columns ────────────────────────────────────────────────────────────
  for (let ki = 0; ki < keyCols.length; ki++) {
    const colName = keyCols[ki] as string;
    const lkSeries = leftKeySeries[ki] as Series<Scalar>;
    const rkSeries = rightKeySeries[ki] as Series<Scalar>;

    const data: Scalar[] = new Array(nRows);
    for (let r = 0; r < nRows; r++) {
      const li = leftRows[r] as number;
      const ri = rightRows[r];
      if (li !== -1) {
        data[r] = lkSeries.values[li] as Scalar;
      } else if (ri !== null) {
        // right-only row: use right key value
        data[r] = rkSeries.values[ri] as Scalar;
      } else {
        data[r] = null;
      }
    }
    resultCols.set(colName, new Series<Scalar>({ data, index: resultRowIndex, name: colName }));
  }

  // ── Left non-key columns ───────────────────────────────────────────────────
  const leftNonKeyColNames = left.columns.values.filter(
    (c) => !(leftKeyNames as string[]).includes(c),
  );
  for (let ci = 0; ci < leftNonKeyColNames.length; ci++) {
    const srcName = leftNonKeyColNames[ci] as string;
    const outName = leftOutputCols[ci] as string;
    const src = left.col(srcName);
    const data: Scalar[] = new Array(nRows);
    for (let r = 0; r < nRows; r++) {
      const li = leftRows[r] as number;
      data[r] = li !== -1 ? (src.values[li] as Scalar) : null;
    }
    resultCols.set(outName, new Series<Scalar>({ data, index: resultRowIndex, name: outName }));
  }

  // ── Right non-key columns ──────────────────────────────────────────────────
  const rightNonKeyColNames = right.columns.values.filter(
    (c) => !(rightKeyNames as string[]).includes(c),
  );
  for (let ci = 0; ci < rightNonKeyColNames.length; ci++) {
    const srcName = rightNonKeyColNames[ci] as string;
    const outName = rightOutputCols[ci] as string;
    const src = right.col(srcName);
    const data: Scalar[] = new Array(nRows);
    for (let r = 0; r < nRows; r++) {
      const ri = rightRows[r];
      data[r] = ri !== null ? (src.values[ri] as Scalar) : null;
    }
    resultCols.set(outName, new Series<Scalar>({ data, index: resultRowIndex, name: outName }));
  }

  return new DataFrame(resultCols, resultRowIndex);
}
