/**
 * swaplevel / reorderLevels — reorder MultiIndex levels on Series and DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.swaplevel(i=-2, j=-1)`
 * - `DataFrame.swaplevel(i=-2, j=-1, axis=0)`
 * - `Series.reorder_levels(order)`
 * - `DataFrame.reorder_levels(order, axis=0)`
 *
 * All functions are **pure**: they return new objects and do not mutate inputs.
 *
 * - {@link swapLevelSeries}   — swap two levels in a Series MultiIndex
 * - {@link swapLevelDataFrame} — swap two levels in a DataFrame index or columns
 * - {@link reorderLevelsSeries} — reorder levels of a Series MultiIndex
 * - {@link reorderLevelsDataFrame} — reorder levels of a DataFrame index or columns
 *
 * @example
 * ```ts
 * import { MultiIndex, Series, swapLevelSeries } from "tsb";
 *
 * const mi = MultiIndex.fromTuples([["a", 1], ["a", 2], ["b", 1]]);
 * const s = new Series({ data: [10, 20, 30], index: mi as unknown as Index<Label> });
 *
 * const swapped = swapLevelSeries(s, 0, 1);
 * // index is now [(1,"a"), (2,"a"), (1,"b")]
 * ```
 *
 * @module
 */

import { DataFrame, type Index, MultiIndex, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a level specifier (positive or negative integer, or name string) to
 * a non-negative index within `nlevels`.
 */
function resolveLevel(
  spec: number | string,
  nlevels: number,
  names: readonly (string | null)[],
): number {
  if (typeof spec === "string") {
    const idx = names.indexOf(spec);
    if (idx === -1) {
      throw new Error(`swaplevel: level name "${spec}" not found`);
    }
    return idx;
  }
  const i = spec < 0 ? nlevels + spec : spec;
  if (i < 0 || i >= nlevels) {
    throw new Error(`swaplevel: level ${spec} out of range for nlevels=${nlevels}`);
  }
  return i;
}

/**
 * Create a new MultiIndex with levels `i` and `j` swapped.
 */
function swapLevelsInMultiIndex(
  mi: MultiIndex,
  i: number | string,
  j: number | string,
): MultiIndex {
  const n = mi.nlevels;
  const pi = resolveLevel(i, n, mi.names);
  const pj = resolveLevel(j, n, mi.names);
  if (pi === pj) {
    return mi;
  }

  const newLevels = [...mi.levels] as (typeof mi.levels)[number][];
  const newCodes = [...mi.codes] as (typeof mi.codes)[number][];
  const newNames = [...mi.names] as (string | null)[];

  // swap positions pi and pj
  const tmpLevel = newLevels[pi]!;
  newLevels[pi] = newLevels[pj]!;
  newLevels[pj] = tmpLevel;

  const tmpCodes = newCodes[pi]!;
  newCodes[pi] = newCodes[pj]!;
  newCodes[pj] = tmpCodes;

  const tmpName = newNames[pi]!;
  newNames[pi] = newNames[pj]!;
  newNames[pj] = tmpName;

  const arraysSwap = newLevels.map((levelIdx, idx) =>
    (newCodes[idx] as readonly number[]).map(
      (code) => (levelIdx.values as readonly Label[])[code] ?? null,
    ),
  );
  return MultiIndex.fromArrays(arraysSwap, { names: newNames });
}

/**
 * Create a new MultiIndex with levels reordered according to `order`.
 */
function reorderLevelsInMultiIndex(
  mi: MultiIndex,
  order: readonly (number | string)[],
): MultiIndex {
  const n = mi.nlevels;
  if (order.length !== n) {
    throw new Error(`reorderLevels: order length (${order.length}) must equal nlevels (${n})`);
  }
  const resolved = order.map((spec) => resolveLevel(spec, n, mi.names));

  const newLevels = resolved.map((i) => mi.levels[i]!);
  const newCodes = resolved.map((i) => mi.codes[i]!);
  const newNames = resolved.map((i) => mi.names[i] ?? null);

  const arraysReorder = newLevels.map((levelIdx, idx) =>
    (newCodes[idx] as readonly number[]).map(
      (code) => (levelIdx.values as readonly Label[])[code] ?? null,
    ),
  );
  return MultiIndex.fromArrays(arraysReorder, { names: newNames });
}

// ─── swapLevelSeries ──────────────────────────────────────────────────────────

/**
 * Swap two levels of a Series' MultiIndex.
 *
 * @param s - Source Series (must have a MultiIndex).
 * @param i - First level (number or name). Defaults to `-2`.
 * @param j - Second level (number or name). Defaults to `-1`.
 * @returns New Series with the two levels swapped.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromTuples([["a", 1], ["b", 2]]);
 * const s = new Series({ data: [10, 20], index: mi as unknown as Index<Label> });
 * const swapped = swapLevelSeries(s);
 * // index tuples are now [(1, "a"), (2, "b")]
 * ```
 */
export function swapLevelSeries<T extends Scalar>(
  s: Series<T>,
  i: number | string = -2,
  j: number | string = -1,
): Series<T> {
  const idx = s.index;
  if (!(idx instanceof MultiIndex)) {
    throw new Error("swapLevelSeries: Series must have a MultiIndex");
  }
  const newIndex = swapLevelsInMultiIndex(idx, i, j);
  return new Series<T>({
    data: s.values as T[],
    index: newIndex as unknown as Index<Label>,
    dtype: s.dtype,
    name: s.name,
  });
}

// ─── swapLevelDataFrame ───────────────────────────────────────────────────────

/**
 * Options for {@link swapLevelDataFrame}.
 */
export interface SwapLevelDataFrameOptions {
  /**
   * Axis along which to swap levels.
   * - `0` or `"index"` (default): swap row index levels.
   * - `1` or `"columns"`: swap column index levels.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

/**
 * Swap two levels of a DataFrame's MultiIndex (row or column axis).
 *
 * @param df   - Source DataFrame.
 * @param i    - First level (number or name). Defaults to `-2`.
 * @param j    - Second level (number or name). Defaults to `-1`.
 * @param options - See {@link SwapLevelDataFrameOptions}.
 * @returns New DataFrame with the two levels swapped.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromTuples([["a", 1], ["b", 2]]);
 * const df = DataFrame.fromColumns(
 *   { x: [10, 20] },
 *   { index: mi as unknown as Index<Label> }
 * );
 * const swapped = swapLevelDataFrame(df);
 * // row index tuples are now [(1,"a"), (2,"b")]
 * ```
 */
export function swapLevelDataFrame(
  df: DataFrame,
  i: number | string = -2,
  j: number | string = -1,
  options?: SwapLevelDataFrameOptions,
): DataFrame {
  const axis = options?.axis ?? 0;
  const useRows = axis === 0 || axis === "index";

  if (useRows) {
    const idx = df.index;
    if (!(idx instanceof MultiIndex)) {
      throw new Error("swapLevelDataFrame: row index must be a MultiIndex");
    }
    const newIndex = swapLevelsInMultiIndex(idx, i, j) as unknown as Index<Label>;
    // Rebuild DataFrame with new index, keeping same column data
    const colNames = df.columns.values as readonly string[];
    const cols = new Map<string, Series<Scalar>>();
    for (const name of colNames) {
      const col = df.col(name);
      cols.set(
        name,
        new Series<Scalar>({ data: col.values as Scalar[], index: newIndex, dtype: col.dtype }),
      );
    }
    return new DataFrame(cols, newIndex);
  }
  throw new Error("swapLevelDataFrame: axis=1 (column MultiIndex) is not yet supported");
}

// ─── reorderLevelsSeries ──────────────────────────────────────────────────────

/**
 * Reorder levels of a Series' MultiIndex.
 *
 * @param s     - Source Series (must have a MultiIndex).
 * @param order - New level order as an array of integers or level names.
 * @returns New Series with reordered levels.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromArrays([["a", "b"], [1, 2], ["x", "y"]]);
 * const s = new Series({ data: [10, 20], index: mi as unknown as Index<Label> });
 * const reordered = reorderLevelsSeries(s, [2, 0, 1]);
 * // index levels are now [2, 0, 1] → ["x","y"], ["a","b"], [1,2]
 * ```
 */
export function reorderLevelsSeries<T extends Scalar>(
  s: Series<T>,
  order: readonly (number | string)[],
): Series<T> {
  const idx = s.index;
  if (!(idx instanceof MultiIndex)) {
    throw new Error("reorderLevelsSeries: Series must have a MultiIndex");
  }
  const newIndex = reorderLevelsInMultiIndex(idx, order);
  return new Series<T>({
    data: s.values as T[],
    index: newIndex as unknown as Index<Label>,
    dtype: s.dtype,
    name: s.name,
  });
}

// ─── reorderLevelsDataFrame ───────────────────────────────────────────────────

/**
 * Options for {@link reorderLevelsDataFrame}.
 */
export interface ReorderLevelsDataFrameOptions {
  /**
   * Axis along which to reorder levels.
   * - `0` or `"index"` (default): reorder row index levels.
   * - `1` or `"columns"`: reorder column index levels (not yet supported).
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

/**
 * Reorder levels of a DataFrame's MultiIndex (row axis).
 *
 * @param df    - Source DataFrame (row index must be a MultiIndex).
 * @param order - New level order as array of integers or level names.
 * @param options - See {@link ReorderLevelsDataFrameOptions}.
 * @returns New DataFrame with reordered levels.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromArrays([["a", "b"], [1, 2]]);
 * const df = DataFrame.fromColumns(
 *   { x: [10, 20] },
 *   { index: mi as unknown as Index<Label> }
 * );
 * const reordered = reorderLevelsDataFrame(df, [1, 0]);
 * // row index levels are now [[1, 2], ["a", "b"]]
 * ```
 */
export function reorderLevelsDataFrame(
  df: DataFrame,
  order: readonly (number | string)[],
  options?: ReorderLevelsDataFrameOptions,
): DataFrame {
  const axis = options?.axis ?? 0;
  const useRows = axis === 0 || axis === "index";

  if (useRows) {
    const idx = df.index;
    if (!(idx instanceof MultiIndex)) {
      throw new Error("reorderLevelsDataFrame: row index must be a MultiIndex");
    }
    const newIndex = reorderLevelsInMultiIndex(idx, order) as unknown as Index<Label>;
    const colNames = df.columns.values as readonly string[];
    const cols = new Map<string, Series<Scalar>>();
    for (const name of colNames) {
      const col = df.col(name);
      cols.set(
        name,
        new Series<Scalar>({ data: col.values as Scalar[], index: newIndex, dtype: col.dtype }),
      );
    }
    return new DataFrame(cols, newIndex);
  }
  throw new Error("reorderLevelsDataFrame: axis=1 (column MultiIndex) is not yet supported");
}
