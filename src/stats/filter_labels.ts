/**
 * filter_labels — filter a Series or DataFrame by row/column labels.
 *
 * Mirrors `pandas.DataFrame.filter(items, like, regex, axis)`.
 *
 * Exactly one of `items`, `like`, or `regex` must be specified.
 *
 * - {@link filterDataFrame} — filter DataFrame rows or columns by label
 * - {@link filterSeries}    — filter Series index labels
 *
 * @example
 * ```ts
 * import { DataFrame, filterDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c_x: [5, 6] });
 *
 * // Keep only columns whose name is in the list
 * filterDataFrame(df, { items: ["a", "c_x"] }).columns.values;
 * // ["a", "c_x"]
 *
 * // Keep columns whose name contains "_x"
 * filterDataFrame(df, { like: "_x" }).columns.values;
 * // ["c_x"]
 *
 * // Keep columns matching regex "^[ab]$"
 * filterDataFrame(df, { regex: "^[ab]$" }).columns.values;
 * // ["a", "b"]
 * ```
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link filterDataFrame} and {@link filterSeries}. */
export interface FilterLabelsOptions {
  /**
   * Keep labels whose string representation appears in this list.
   * Mutually exclusive with `like` and `regex`.
   */
  readonly items?: readonly Label[];

  /**
   * Keep labels whose string representation **contains** this substring.
   * Mutually exclusive with `items` and `regex`.
   */
  readonly like?: string;

  /**
   * Keep labels whose string representation matches this regular expression.
   * Mutually exclusive with `items` and `like`.
   */
  readonly regex?: string;

  /**
   * Axis to filter along (DataFrame only).
   * - `0` or `"index"`: filter rows (default).
   * - `1` or `"columns"`: filter columns.
   * @default 1  (columns, matching pandas default for DataFrame.filter)
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Build a predicate for a label given the filter options.
 * Exactly one of `items`, `like`, or `regex` is expected to be set.
 */
function buildPredicate(options: FilterLabelsOptions): (label: Label) => boolean {
  const { items, like, regex } = options;
  const setCount =
    (items !== undefined ? 1 : 0) + (like !== undefined ? 1 : 0) + (regex !== undefined ? 1 : 0);
  if (setCount === 0) {
    throw new TypeError("filterDataFrame: exactly one of items, like, or regex must be specified");
  }
  if (setCount > 1) {
    throw new TypeError("filterDataFrame: only one of items, like, or regex may be specified");
  }

  if (items !== undefined) {
    const set = new Set<string>(items.map(String));
    return (label: Label): boolean => set.has(String(label));
  }
  if (like !== undefined) {
    return (label: Label): boolean => String(label).includes(like);
  }
  if (regex !== undefined) {
    const re = new RegExp(regex);
    return (label: Label): boolean => re.test(String(label));
  }
  // unreachable — setCount === 1 guarantees one branch was taken
  throw new TypeError("filterDataFrame: internal error");
}

// ─── filterDataFrame ──────────────────────────────────────────────────────────

/**
 * Filter rows or columns of a DataFrame by label.
 *
 * Pass exactly one of `items`, `like`, or `regex` in `options`.
 * The `axis` option controls whether rows (`0`/`"index"`) or columns
 * (`1`/`"columns"`) are filtered; defaults to `1` (columns), matching the
 * pandas default.
 *
 * @param df      - Source DataFrame.
 * @param options - See {@link FilterLabelsOptions}.
 * @returns New DataFrame with only the matching rows or columns.
 *
 * @example
 * ```ts
 * import { DataFrame, filterDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] },
 *   { index: [10, 20, 30] },
 * );
 *
 * // Columns
 * filterDataFrame(df, { items: ["a", "c"] }).columns.values; // ["a", "c"]
 * filterDataFrame(df, { like: "b" }).columns.values;         // ["b"]
 * filterDataFrame(df, { regex: "[ac]" }).columns.values;     // ["a", "c"]
 *
 * // Rows
 * filterDataFrame(df, { items: [10, 30], axis: 0 }).index.values; // [10, 30]
 * ```
 */
export function filterDataFrame(df: DataFrame, options: FilterLabelsOptions): DataFrame {
  const axisSpec = options.axis ?? 1;
  const filterRows = axisSpec === 0 || axisSpec === "index";
  const predicate = buildPredicate(options);

  if (filterRows) {
    const positions: number[] = [];
    for (let i = 0; i < df.index.size; i++) {
      if (predicate(df.index.at(i))) {
        positions.push(i);
      }
    }
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
  const colNames = df.columns.values as readonly string[];
  const kept = colNames.filter((name) => predicate(name));
  const cols = new Map<string, Series<Scalar>>();
  for (const name of kept) {
    const col = df.col(name);
    cols.set(
      name,
      new Series<Scalar>({ data: col.values as Scalar[], index: df.index, dtype: col.dtype }),
    );
  }
  return new DataFrame(cols, df.index);
}

// ─── filterSeries ─────────────────────────────────────────────────────────────

/**
 * Filter a Series by its index labels.
 *
 * Pass exactly one of `items`, `like`, or `regex` in `options`.
 * (The `axis` option is ignored for Series — only the index is filtered.)
 *
 * @param s       - Source Series.
 * @param options - See {@link FilterLabelsOptions}.
 * @returns New Series with only the matching index positions.
 *
 * @example
 * ```ts
 * import { Series, filterSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3], index: ["alpha", "beta", "gamma"] });
 * filterSeries(s, { like: "a" }).index.values;  // ["alpha", "gamma"]
 * filterSeries(s, { items: ["beta"] }).values;  // [2]
 * ```
 */
export function filterSeries(s: Series<Scalar>, options: FilterLabelsOptions): Series<Scalar> {
  const predicate = buildPredicate(options);
  const positions: number[] = [];
  for (let i = 0; i < s.size; i++) {
    if (predicate(s.index.at(i))) {
      positions.push(i);
    }
  }
  const data = positions.map((i) => s.values[i] as Scalar);
  const labels = positions.map((i) => s.index.at(i));
  return new Series<Scalar>({
    data,
    index: new Index<Label>(labels),
    dtype: s.dtype,
    name: s.name,
  });
}
