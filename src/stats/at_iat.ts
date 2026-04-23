/**
 * at_iat — fast scalar access for Series and DataFrame.
 *
 * Mirrors the pandas `.at` and `.iat` indexers:
 *
 * - `seriesAt(s, label)` — value by label (`Series.at[label]`)
 * - `seriesIat(s, i)` — value by integer position (`Series.iat[i]`)
 * - `dataFrameAt(df, rowLabel, colLabel)` — scalar by row-label × col-label (`DataFrame.at[row, col]`)
 * - `dataFrameIat(df, rowInt, colInt)` — scalar by integer position (`DataFrame.iat[row, col]`)
 *
 * All four are **read-only** accessors optimised for single-cell lookups.
 * They are equivalent to the equivalent `.loc`/`.iloc` calls but make the
 * intent clearer and avoid the overhead of allocating a new Series or
 * DataFrame for a single value.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, seriesAt, seriesIat, dataFrameAt, dataFrameIat } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
 * seriesAt(s, "b");   // 20
 * seriesIat(s, 2);    // 30
 *
 * const df = DataFrame.fromColumns(
 *   { x: [1, 2], y: [3, 4] },
 *   { index: ["r0", "r1"] },
 * );
 * dataFrameAt(df, "r1", "x");   // 2
 * dataFrameIat(df, 0, 1);       // 3
 * ```
 *
 * @module
 */

import type { DataFrame, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── Series accessors ─────────────────────────────────────────────────────────

/**
 * Return the value of `s` at `label` (label-based fast scalar access).
 *
 * Mirrors `pandas.Series.at[label]`.
 *
 * @throws {RangeError} when `label` is not in the index.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
 * seriesAt(s, "b"); // 20
 * ```
 */
export function seriesAt(s: Series<Scalar>, label: Label): Scalar {
  try {
    return s.at(label);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("KeyError:")) {
      throw new RangeError(error.message);
    }
    throw error;
  }
}

/**
 * Return the value of `s` at integer position `i` (positional fast scalar access).
 *
 * Mirrors `pandas.Series.iat[i]`. Supports negative indexing: `-1` is the
 * last element.
 *
 * @throws {RangeError} when `i` is out of bounds.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30] });
 * seriesIat(s, 2);  // 30
 * seriesIat(s, -1); // 30
 * ```
 */
export function seriesIat(s: Series<Scalar>, i: number): Scalar {
  return s.iat(i);
}

// ─── DataFrame accessors ──────────────────────────────────────────────────────

/**
 * Return the scalar value of `df` at row `rowLabel` / column `colLabel`
 * (label-based fast scalar access).
 *
 * Mirrors `pandas.DataFrame.at[rowLabel, colLabel]`.
 *
 * @throws {RangeError} when `rowLabel` is not in the row index.
 * @throws {Error} when `colLabel` is not a column name.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] }, { index: ["r0", "r1"] });
 * dataFrameAt(df, "r1", "x"); // 2
 * ```
 */
export function dataFrameAt(df: DataFrame, rowLabel: Label, colLabel: string): Scalar {
  try {
    return df.col(colLabel).at(rowLabel);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("KeyError:")) {
      throw new RangeError(error.message);
    }
    throw error;
  }
}

/**
 * Return the scalar value of `df` at integer row position `rowInt` / column
 * position `colInt` (positional fast scalar access).
 *
 * Mirrors `pandas.DataFrame.iat[rowInt, colInt]`. Both `rowInt` and `colInt`
 * support negative indexing.
 *
 * @throws {RangeError} when either position is out of bounds.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] }, { index: ["r0", "r1"] });
 * dataFrameIat(df, 0, 1); // 3  (row 0, col 1 = "y")
 * ```
 */
export function dataFrameIat(df: DataFrame, rowInt: number, colInt: number): Scalar {
  const nCols = df.columns.size;
  const normCol = colInt < 0 ? nCols + colInt : colInt;
  if (normCol < 0 || normCol >= nCols) {
    throw new RangeError(
      `Column index ${colInt} out of bounds for DataFrame with ${nCols} columns`,
    );
  }
  const colName = df.columns.at(normCol);
  return df.col(colName).iat(rowInt);
}
