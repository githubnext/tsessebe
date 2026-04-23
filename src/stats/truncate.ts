/**
 * truncate — slice a Series or DataFrame to keep only rows (or columns)
 * between two index labels.
 *
 * Mirrors `pandas.Series.truncate` and `pandas.DataFrame.truncate`.
 *
 * The `before` and `after` bounds are **inclusive** and compared using the
 * same ordering that the underlying labels naturally support (numeric or
 * lexicographic).  Non-matching labels inside the range are kept; only
 * entries strictly outside the bounds are removed.
 *
 * - {@link truncateSeries}   — truncate a Series
 * - {@link truncateDataFrame} — truncate a DataFrame along row or column axis
 *
 * @example
 * ```ts
 * import { Series, truncateSeries } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30, 40, 50], index: [0, 1, 2, 3, 4] });
 * truncateSeries(s, 1, 3).values; // [20, 30, 40]
 * ```
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link truncateSeries} and {@link truncateDataFrame}. */
export interface TruncateOptions {
  /**
   * Keep only rows / columns **after** (inclusive) this label.
   * `undefined` means no lower bound.
   */
  readonly before?: Label;

  /**
   * Keep only rows / columns **before** (inclusive) this label.
   * `undefined` means no upper bound.
   */
  readonly after?: Label;

  /**
   * Axis to truncate along (DataFrame only).
   * - `0` or `"index"` (default): truncate rows.
   * - `1` or `"columns"`: truncate columns.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Return whether label `v` satisfies the lower bound `before` (inclusive).
 * `undefined` means no lower bound → always passes.
 */
function aboveLower(v: Label, before: Label | undefined): boolean {
  if (before === undefined) {
    return true;
  }
  // Use unknown cast for Label (which may be string | number | boolean | null)
  return (v as unknown as number) >= (before as unknown as number);
}

/**
 * Return whether label `v` satisfies the upper bound `after` (inclusive).
 * `undefined` means no upper bound → always passes.
 */
function belowUpper(v: Label, after: Label | undefined): boolean {
  if (after === undefined) {
    return true;
  }
  return (v as unknown as number) <= (after as unknown as number);
}

/**
 * Collect the positions in `idx` whose labels fall within [before, after].
 */
function filterPositions(
  idx: Index<Label>,
  before: Label | undefined,
  after: Label | undefined,
): number[] {
  const positions: number[] = [];
  for (let i = 0; i < idx.size; i++) {
    const label = idx.at(i);
    if (aboveLower(label, before) && belowUpper(label, after)) {
      positions.push(i);
    }
  }
  return positions;
}

// ─── truncateSeries ───────────────────────────────────────────────────────────

/**
 * Truncate a Series to the window of index labels `[before, after]`.
 *
 * Labels outside the window are dropped; labels inside are kept regardless
 * of monotonicity.
 *
 * @param s       - Source Series.
 * @param before  - Inclusive lower-bound label. Omit (or `undefined`) for no limit.
 * @param after   - Inclusive upper-bound label. Omit (or `undefined`) for no limit.
 * @returns New Series containing only the rows within the window.
 *
 * @example
 * ```ts
 * import { Series, truncateSeries } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30, 40, 50] });
 * truncateSeries(s, 1, 3).values; // [20, 30, 40]
 *
 * truncateSeries(s, undefined, 2).values; // [10, 20, 30]
 * truncateSeries(s, 3).values;            // [40, 50]
 * ```
 */
export function truncateSeries<T extends Scalar>(
  s: Series<T>,
  before?: Label,
  after?: Label,
): Series<T> {
  const positions = filterPositions(s.index, before, after);
  const data = positions.map((i) => s.values[i] as T);
  const labels = positions.map((i) => s.index.at(i));
  return new Series<T>({
    data,
    index: new Index<Label>(labels),
    dtype: s.dtype,
    name: s.name,
  });
}

// ─── truncateDataFrame ────────────────────────────────────────────────────────

/**
 * Truncate a DataFrame to the window of index labels `[before, after]`.
 *
 * @param df      - Source DataFrame.
 * @param before  - Inclusive lower-bound label. Omit (or `undefined`) for no limit.
 * @param after   - Inclusive upper-bound label. Omit (or `undefined`) for no limit.
 * @param options - See {@link TruncateOptions}. `axis` defaults to `0` (rows).
 * @returns New DataFrame containing only the rows (or columns) within the window.
 *
 * @example
 * ```ts
 * import { DataFrame, truncateDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { a: [1, 2, 3, 4, 5], b: [10, 20, 30, 40, 50] },
 *   { index: [0, 1, 2, 3, 4] },
 * );
 * truncateDataFrame(df, 1, 3);
 * // DataFrame with rows at index 1, 2, 3
 * ```
 */
export function truncateDataFrame(
  df: DataFrame,
  before?: Label,
  after?: Label,
  options?: TruncateOptions,
): DataFrame {
  const axisSpec = options?.axis ?? 0;
  const useRows = axisSpec === 0 || axisSpec === "index";

  if (useRows) {
    // Truncate rows
    const positions = filterPositions(df.index, before, after);
    const newIndexLabels = positions.map((i) => df.index.at(i));
    const newIndex = new Index<Label>(newIndexLabels);
    const colNames = df.columns.values as readonly string[];
    const cols = new Map<string, Series<Scalar>>();
    for (const name of colNames) {
      const col = df.col(name);
      const data = positions.map((i) => col.values[i] as Scalar);
      cols.set(name, new Series<Scalar>({ data, index: newIndex, dtype: col.dtype }));
    }
    return new DataFrame(cols, newIndex);
  }
  // Truncate columns
  const colIdx = df.columns;
  const positions = filterPositions(colIdx as unknown as Index<Label>, before, after);
  const colNames = df.columns.values as readonly string[];
  const keptNames = positions.map((i) => colNames[i]!);
  const cols = new Map<string, Series<Scalar>>();
  for (const name of keptNames) {
    const col = df.col(name);
    cols.set(
      name,
      new Series<Scalar>({ data: col.values as Scalar[], index: df.index, dtype: col.dtype }),
    );
  }
  return new DataFrame(cols, df.index);
}
