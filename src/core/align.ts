/**
 * align — realign two Series or DataFrames to a common axis.
 *
 * Mirrors `pandas.Series.align()` / `pandas.DataFrame.align()`:
 *
 * - {@link alignSeries} — align two `Series<T>` on their row indices.
 * - {@link alignDataFrame} — align two `DataFrame` objects on rows, columns,
 *   or both axes simultaneously.
 *
 * ### Join policies
 *
 * | `join`    | Result index                                      |
 * |-----------|---------------------------------------------------|
 * | `"outer"` | Union of the two index sets (default)             |
 * | `"inner"` | Intersection of the two index sets               |
 * | `"left"`  | Left object's index                               |
 * | `"right"` | Right object's index                              |
 *
 * ### Axis (DataFrame only)
 *
 * | `axis`        | Aligned axes                                    |
 * |---------------|-------------------------------------------------|
 * | `0` / `"index"` | Row index only                               |
 * | `1` / `"columns"` | Columns only                              |
 * | `null` / `undefined` | Both rows **and** columns (default)   |
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
 * const b = new Series({ data: [10, 20], index: new Index(["b", "c"]) });
 *
 * const [left, right] = alignSeries(a, b, { join: "inner" });
 * // left  → Series [2, 3] with index ["b", "c"]
 * // right → Series [10, 20] with index ["b", "c"]
 *
 * const [lo, ro] = alignSeries(a, b, { join: "outer", fillValue: 0 });
 * // left  → Series [1, 2, 3]  with index ["a", "b", "c"]
 * // right → Series [0, 10, 20] with index ["a", "b", "c"]
 * ```
 *
 * @module
 */

import { Index } from "./base-index.ts";
import { Series } from "./series.ts";
import { DataFrame } from "./frame.ts";
import { reindexSeries, reindexDataFrame } from "./reindex.ts";
import type { Label, Scalar, JoinHow, Axis } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link alignSeries}. */
export interface AlignSeriesOptions {
  /**
   * How to determine the result index.
   * - `"outer"` (default) — union of both indices.
   * - `"inner"` — intersection of both indices.
   * - `"left"` — left Series' index.
   * - `"right"` — right Series' index.
   */
  join?: JoinHow;
  /**
   * Scalar to use for labels that exist in the result index but are absent
   * from one of the inputs (default: `null`).
   */
  fillValue?: Scalar;
}

/** Options for {@link alignDataFrame}. */
export interface AlignDataFrameOptions extends AlignSeriesOptions {
  /**
   * Which axes to align.
   * - `null` / `undefined` (default) — align both rows and columns.
   * - `0` / `"index"` — rows only.
   * - `1` / `"columns"` — columns only.
   */
  axis?: Axis | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the target index from `left` and `right` according to `join`.
 */
function resolveIndex(
  left: Index<Label>,
  right: Index<Label>,
  join: JoinHow,
): Index<Label> {
  switch (join) {
    case "outer":
      return left.union(right);
    case "inner":
      return left.intersection(right);
    case "left":
      return left;
    case "right":
      return right;
  }
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * Align two Series on their row indices.
 *
 * Returns `[alignedLeft, alignedRight]` — a tuple of two Series that share the
 * same index (determined by `join`).  Labels absent in either original are
 * filled with `fillValue` (default `null`).
 *
 * @param left  - First Series.
 * @param right - Second Series.
 * @param options - Alignment options (join policy, fill value).
 * @returns Tuple `[alignedLeft, alignedRight]`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3], index: new Index(["x", "y", "z"]) });
 * const b = new Series({ data: [10, 30], index: new Index(["x", "z"]) });
 * const [la, ra] = alignSeries(a, b);
 * // la: [1, 2, 3]   ra: [10, null, 30]   index: ["x", "y", "z"]
 * ```
 */
export function alignSeries<L extends Scalar, R extends Scalar>(
  left: Series<L>,
  right: Series<R>,
  options: AlignSeriesOptions = {},
): [Series<L>, Series<R>] {
  const { join = "outer", fillValue = null } = options;
  const targetIdx = resolveIndex(left.index, right.index, join);

  const alignedLeft = reindexSeries(left, targetIdx, { fillValue });
  const alignedRight = reindexSeries(right, targetIdx, { fillValue });

  return [alignedLeft, alignedRight];
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Align two DataFrames on their row index, column index, or both.
 *
 * Returns `[alignedLeft, alignedRight]` — a tuple of two DataFrames sharing the
 * same shape (row labels and/or column labels), filled with `fillValue` where
 * labels are absent.
 *
 * @param left  - First DataFrame.
 * @param right - Second DataFrame.
 * @param options - Alignment options (join, axis, fill value).
 * @returns Tuple `[alignedLeft, alignedRight]`.
 *
 * @example
 * ```ts
 * const a = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] }, { index: ["r0", "r1"] });
 * const b = DataFrame.fromColumns({ y: [10], z: [20] }, { index: ["r1"] });
 * const [la, ra] = alignDataFrame(a, b);
 * // shape [2, 3]; columns ["x", "y", "z"]; rows ["r0", "r1"]
 * ```
 */
export function alignDataFrame(
  left: DataFrame,
  right: DataFrame,
  options: AlignDataFrameOptions = {},
): [DataFrame, DataFrame] {
  const { join = "outer", fillValue = null, axis } = options;

  // Normalise axis: null/undefined → align both
  const normalised: 0 | 1 | null =
    axis === null || axis === undefined
      ? null
      : axis === 0 || axis === "index"
        ? 0
        : 1;

  const alignRows = normalised === null || normalised === 0;
  const alignCols = normalised === null || normalised === 1;

  // Compute target row index
  const targetRowIdx: Index<Label> | undefined = alignRows
    ? resolveIndex(left.index, right.index, join)
    : undefined;

  // Compute target column index (string labels)
  const targetColIdx: Index<string> | undefined = alignCols
    ? (resolveIndex(
        left.columns as Index<Label>,
        right.columns as Index<Label>,
        join,
      ) as Index<string>)
    : undefined;

  const alignedLeft = reindexDataFrame(left, {
    ...(targetRowIdx !== undefined ? { index: targetRowIdx } : {}),
    ...(targetColIdx !== undefined ? { columns: targetColIdx } : {}),
    fillValue,
  });

  const alignedRight = reindexDataFrame(right, {
    ...(targetRowIdx !== undefined ? { index: targetRowIdx } : {}),
    ...(targetColIdx !== undefined ? { columns: targetColIdx } : {}),
    fillValue,
  });

  return [alignedLeft, alignedRight];
}
