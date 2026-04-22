/**
 * rename_ops — rename labels, add prefix/suffix, set axis, and convert Series
 * to DataFrame.
 *
 * Mirrors the following pandas methods:
 * - `Series.rename(index)` — rename index labels via mapping or function
 * - `DataFrame.rename(columns?, index?)` — rename columns and/or index labels
 * - `DataFrame.add_prefix(prefix)` — prefix all column labels
 * - `DataFrame.add_suffix(suffix)` — suffix all column labels
 * - `Series.add_prefix(prefix)` — prefix index labels
 * - `Series.add_suffix(suffix)` — suffix index labels
 * - `Series.set_axis(labels)` — replace the index of a Series
 * - `DataFrame.set_axis(labels, axis)` — replace the column or row axis
 * - `Series.to_frame(name?)` — convert a Series to a single-column DataFrame
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** A mapper: either a `Record<string,string>` mapping or a `(label:Label)=>Label` function. */
export type LabelMapper = Readonly<Record<string, string>> | ((label: Label) => Label);

/** Options for {@link renameDataFrame}. */
export interface RenameDataFrameOptions {
  /**
   * Rename column labels.
   * Pass a `Record<oldName, newName>` or a `(name: Label) => Label` function.
   */
  readonly columns?: LabelMapper;
  /**
   * Rename row-index labels.
   * Pass a `Record<oldLabel, newLabel>` or a `(label: Label) => Label` function.
   */
  readonly index?: LabelMapper;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Apply a LabelMapper to a single label. */
function applyMapper(mapper: LabelMapper, label: Label): Label {
  if (typeof mapper === "function") {
    return mapper(label);
  }
  // TypeScript narrows mapper to Record<string,string> here
  const key = String(label);
  const mapped = mapper[key];
  return mapped !== undefined ? mapped : label;
}

/** Apply a LabelMapper to every element of an array of labels. */
function mapLabels(mapper: LabelMapper, labels: readonly Label[]): Label[] {
  return labels.map((l) => applyMapper(mapper, l));
}

// ─── renameSeriesIndex ────────────────────────────────────────────────────────

/**
 * Return a new Series with renamed index labels.
 *
 * Mirrors `pandas.Series.rename(index=...)`.
 *
 * The `mapper` argument may be:
 * - A `Record<string, string>` — each matching label is replaced; others
 *   are kept as-is.
 * - A `(label: Label) => Label` function — called for every index label.
 *
 * @example
 * ```ts
 * import { Series, renameSeriesIndex } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
 * renameSeriesIndex(s, { a: "x", c: "z" }).index.values;
 * // ["x", "b", "z"]
 * ```
 */
export function renameSeriesIndex<T extends Scalar>(
  s: Series<T>,
  mapper: LabelMapper,
): Series<T> {
  const newLabels = mapLabels(mapper, s.index.values as readonly Label[]);
  return new Series<T>({
    data: s.values,
    index: new Index<Label>(newLabels),
    name: s.name ?? undefined,
    dtype: s.dtype,
  });
}

// ─── renameDataFrame ──────────────────────────────────────────────────────────

/**
 * Return a new DataFrame with renamed column and/or row-index labels.
 *
 * Mirrors `pandas.DataFrame.rename(columns=..., index=...)`.
 *
 * @example
 * ```ts
 * import { DataFrame, renameDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * renameDataFrame(df, { columns: { a: "x", b: "y" } }).columns.values;
 * // ["x", "y"]
 * ```
 */
export function renameDataFrame(df: DataFrame, options: RenameDataFrameOptions): DataFrame {
  const colMapper = options.columns;
  const idxMapper = options.index;

  // Build new column map
  const colNames = df.columns.values as readonly string[];
  const newColNames: string[] = colMapper
    ? mapLabels(colMapper, colNames as readonly Label[]).map(String)
    : [...colNames];

  // Build new row index
  const rowLabels = df.index.values as readonly Label[];
  const newRowLabels: Label[] = idxMapper ? mapLabels(idxMapper, rowLabels) : [...rowLabels];
  const newRowIndex = new Index<Label>(newRowLabels);

  // Rebuild column map with new names but same data (reindexed rows)
  const newColMap = new Map<string, Series<Scalar>>();
  for (let i = 0; i < colNames.length; i++) {
    const oldName = colNames[i];
    const newName = newColNames[i];
    if (oldName === undefined || newName === undefined) continue;
    const col = df.col(oldName);
    const newCol = new Series<Scalar>({
      data: col.values,
      index: newRowIndex,
    });
    newColMap.set(newName, newCol);
  }

  return new DataFrame(newColMap, newRowIndex, newColNames);
}

// ─── addPrefix / addSuffix ────────────────────────────────────────────────────

/**
 * Return a new DataFrame with `prefix` prepended to every column label.
 *
 * Mirrors `pandas.DataFrame.add_prefix(prefix)`.
 *
 * @example
 * ```ts
 * import { DataFrame, addPrefixDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1], b: [2] });
 * addPrefixDataFrame(df, "col_").columns.values;
 * // ["col_a", "col_b"]
 * ```
 */
export function addPrefixDataFrame(df: DataFrame, prefix: string): DataFrame {
  return renameDataFrame(df, { columns: (label) => `${prefix}${String(label)}` });
}

/**
 * Return a new DataFrame with `suffix` appended to every column label.
 *
 * Mirrors `pandas.DataFrame.add_suffix(suffix)`.
 *
 * @example
 * ```ts
 * import { DataFrame, addSuffixDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1], b: [2] });
 * addSuffixDataFrame(df, "_v1").columns.values;
 * // ["a_v1", "b_v1"]
 * ```
 */
export function addSuffixDataFrame(df: DataFrame, suffix: string): DataFrame {
  return renameDataFrame(df, { columns: (label) => `${String(label)}${suffix}` });
}

/**
 * Return a new Series with `prefix` prepended to every index label.
 *
 * Mirrors `pandas.Series.add_prefix(prefix)`.
 *
 * @example
 * ```ts
 * import { Series, addPrefixSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2], index: ["a", "b"] });
 * addPrefixSeries(s, "x_").index.values;
 * // ["x_a", "x_b"]
 * ```
 */
export function addPrefixSeries<T extends Scalar>(s: Series<T>, prefix: string): Series<T> {
  return renameSeriesIndex(s, (label) => `${prefix}${String(label)}`);
}

/**
 * Return a new Series with `suffix` appended to every index label.
 *
 * Mirrors `pandas.Series.add_suffix(suffix)`.
 *
 * @example
 * ```ts
 * import { Series, addSuffixSeries } from "tsb";
 *
 * const s = new Series({ data: [1, 2], index: ["a", "b"] });
 * addSuffixSeries(s, "_end").index.values;
 * // ["a_end", "b_end"]
 * ```
 */
export function addSuffixSeries<T extends Scalar>(s: Series<T>, suffix: string): Series<T> {
  return renameSeriesIndex(s, (label) => `${String(label)}${suffix}`);
}

// ─── setAxisSeries ────────────────────────────────────────────────────────────

/**
 * Return a new Series with the given labels as its index.
 *
 * Mirrors `pandas.Series.set_axis(labels)`.
 *
 * @throws {RangeError} if `labels` length does not match the Series size.
 *
 * @example
 * ```ts
 * import { Series, setAxisSeries } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30] });
 * setAxisSeries(s, ["x", "y", "z"]).index.values;
 * // ["x", "y", "z"]
 * ```
 */
export function setAxisSeries<T extends Scalar>(
  s: Series<T>,
  labels: readonly Label[],
): Series<T> {
  if (labels.length !== s.size) {
    throw new RangeError(
      `set_axis: labels length ${labels.length} does not match Series size ${s.size}`,
    );
  }
  return new Series<T>({
    data: s.values,
    index: new Index<Label>(labels),
    name: s.name ?? undefined,
    dtype: s.dtype,
  });
}

/**
 * Return a new DataFrame with the given labels replacing the specified axis.
 *
 * Mirrors `pandas.DataFrame.set_axis(labels, axis=0|1)`:
 * - `axis = 0` / `"index"` (default) — replace row index labels.
 * - `axis = 1` / `"columns"` — replace column labels.
 *
 * @throws {RangeError} if `labels` length does not match the relevant axis size.
 *
 * @example
 * ```ts
 * import { DataFrame, setAxisDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * setAxisDataFrame(df, ["r0", "r1"], 0).index.values;      // ["r0", "r1"]
 * setAxisDataFrame(df, ["x", "y"], 1).columns.values;      // ["x", "y"]
 * ```
 */
export function setAxisDataFrame(
  df: DataFrame,
  labels: readonly Label[],
  axis: 0 | 1 | "index" | "columns" = 0,
): DataFrame {
  const isColumns = axis === 1 || axis === "columns";

  if (isColumns) {
    const colNames = df.columns.values as readonly string[];
    if (labels.length !== colNames.length) {
      throw new RangeError(
        `set_axis: labels length ${labels.length} does not match columns count ${colNames.length}`,
      );
    }
    return renameDataFrame(df, {
      columns: (label) => {
        const idx = colNames.indexOf(String(label));
        if (idx < 0 || idx >= labels.length) return label;
        const newLabel = labels[idx];
        return newLabel !== undefined ? newLabel : label;
      },
    });
  }

  // axis = 0: replace row index
  if (labels.length !== df.index.size) {
    throw new RangeError(
      `set_axis: labels length ${labels.length} does not match row count ${df.index.size}`,
    );
  }
  const newRowIndex = new Index<Label>(labels);
  const colNames = df.columns.values as readonly string[];
  const newColMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name);
    newColMap.set(
      name,
      new Series<Scalar>({ data: col.values, index: newRowIndex }),
    );
  }
  return new DataFrame(newColMap, newRowIndex, colNames);
}

// ─── seriesToFrame ────────────────────────────────────────────────────────────

/**
 * Convert a Series to a single-column DataFrame.
 *
 * Mirrors `pandas.Series.to_frame(name?)`:
 * - The resulting DataFrame has one column whose name is `name` (if given)
 *   or the Series name, falling back to `0`.
 * - The row index is the same as the Series index.
 *
 * @example
 * ```ts
 * import { Series, seriesToFrame } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3], name: "score" });
 * seriesToFrame(s).columns.values;         // ["score"]
 * seriesToFrame(s, "points").columns.values; // ["points"]
 * ```
 */
export function seriesToFrame<T extends Scalar>(
  s: Series<T>,
  name?: string | null,
): DataFrame {
  const colName = name !== undefined && name !== null ? name : (s.name ?? "0");
  const colMap = new Map<string, Series<Scalar>>();
  colMap.set(
    colName,
    new Series<Scalar>({ data: s.values as readonly Scalar[], index: s.index }),
  );
  return new DataFrame(colMap, s.index, [colName]);
}
