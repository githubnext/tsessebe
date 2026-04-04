/**
 * concat — combine Series or DataFrames along an axis.
 *
 * Mirrors `pandas.concat`:
 * - **axis=0** (default): stack objects row-wise (increase row count)
 * - **axis=1**: stack objects column-wise (increase column count)
 * - **join='outer'** (default): union of labels, fill missing with `null`
 * - **join='inner'**: intersection of labels only
 * - **ignoreIndex=true**: reset the result to a `RangeIndex`
 *
 * @example
 * ```ts
 * // Stack two DataFrames vertically
 * const combined = concat([df1, df2]);
 *
 * // Combine Series into a DataFrame by columns
 * const df = concat([s1, s2], { axis: 1 });
 *
 * // Inner join — keep only common columns
 * const safe = concat([df1, df2], { join: "inner" });
 * ```
 *
 * @module
 */

import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import type { JoinHow, Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link concat}. */
export interface ConcatOptions {
  /**
   * Axis along which to concatenate.
   * - `0` / `"index"` (default): stack rows
   * - `1` / `"columns"`: stack columns
   */
  readonly axis?: 0 | 1 | "index" | "columns";
  /**
   * How to handle non-shared labels on the *other* axis.
   * - `"outer"` (default): union — fill gaps with `null`
   * - `"inner"`: intersection — drop non-shared labels
   */
  readonly join?: JoinHow;
  /**
   * When `true`, ignore all incoming indexes and assign a fresh `RangeIndex`
   * to the concatenation axis of the result.
   */
  readonly ignoreIndex?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Resolve axis option to a canonical 0/1 integer. */
function resolveAxis(axis: ConcatOptions["axis"]): 0 | 1 {
  if (axis === 1 || axis === "columns") {
    return 1;
  }
  return 0;
}

/** Build the combined label index for the *other* axis (union or intersection). */
function combineIndexes(indexes: readonly Index<Label>[], join: JoinHow): Index<Label> {
  if (indexes.length === 0) {
    return new Index<Label>([]);
  }
  let result = indexes[0] as Index<Label>;
  for (let i = 1; i < indexes.length; i++) {
    const next = indexes[i] as Index<Label>;
    result = join === "inner" ? result.intersection(next) : result.union(next);
  }
  return result;
}

/**
 * Reindex `values` from `fromIndex` to `toIndex`.
 * Missing positions are filled with `null`.
 */
function reindexValues(
  values: readonly Scalar[],
  fromIndex: Index<Label>,
  toIndex: Index<Label>,
): Scalar[] {
  return toIndex.values.map((label) => {
    if (!fromIndex.contains(label)) {
      return null;
    }
    const pos = fromIndex.getLoc(label);
    const idx = typeof pos === "number" ? pos : (pos[0] as number);
    return values[idx] !== undefined ? (values[idx] as Scalar) : null;
  });
}

// ─── axis-0 helpers ───────────────────────────────────────────────────────────

/** Concat Series objects along axis=0 → Series. */
function concatSeriesAxis0(items: readonly Series<Scalar>[], ignoreIndex: boolean): Series<Scalar> {
  const values: Scalar[] = [];
  const labels: Label[] = [];

  for (const s of items) {
    for (let i = 0; i < s.length; i++) {
      values.push(s.values[i] !== undefined ? (s.values[i] as Scalar) : null);
      labels.push(s.index.values[i] !== undefined ? (s.index.values[i] as Label) : null);
    }
  }

  const index: Index<Label> = ignoreIndex
    ? (new RangeIndex(values.length) as unknown as Index<Label>)
    : new Index<Label>(labels);

  return new Series<Scalar>({ data: values, index });
}

/** Append row labels from a DataFrame to the accumulator array. */
function appendRowLabels(df: DataFrame, rowLabels: Label[]): void {
  for (let r = 0; r < df.shape[0]; r++) {
    rowLabels.push(df.index.values[r] !== undefined ? (df.index.values[r] as Label) : null);
  }
}

/** Get the values from one column of a DataFrame row-by-row, null-filling if absent. */
function getColumnValues(df: DataFrame, name: string): Scalar[] {
  if (!df.has(name)) {
    return Array.from({ length: df.shape[0] }, () => null);
  }
  const col = df.col(name);
  return Array.from({ length: df.shape[0] }, (_, r) =>
    col.values[r] !== undefined ? (col.values[r] as Scalar) : null,
  );
}

/** Append one DataFrame's column values to `colData` (null-filling absent columns). */
function appendColumnData(
  df: DataFrame,
  colNames: readonly string[],
  colData: Record<string, Scalar[]>,
): void {
  for (const name of colNames) {
    const colArr = colData[name];
    if (colArr === undefined) {
      continue;
    }
    for (const v of getColumnValues(df, name)) {
      colArr.push(v);
    }
  }
}

/** Concat DataFrame objects along axis=0 → DataFrame. */
function concatDataFramesAxis0(
  items: readonly DataFrame[],
  join: JoinHow,
  ignoreIndex: boolean,
): DataFrame {
  const colIndexes = items.map((df) => df.columns as Index<Label>);
  const combinedCols = combineIndexes(colIndexes, join);
  const colNames = combinedCols.values as string[];

  const colData: Record<string, Scalar[]> = {};
  for (const name of colNames) {
    colData[name] = [];
  }

  const rowLabels: Label[] = [];
  for (const df of items) {
    appendRowLabels(df, rowLabels);
    appendColumnData(df, colNames, colData);
  }

  const rowIndex: Index<Label> = ignoreIndex
    ? (new RangeIndex(rowLabels.length) as unknown as Index<Label>)
    : new Index<Label>(rowLabels);

  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index: rowIndex });
}

// ─── axis-1 helpers ───────────────────────────────────────────────────────────

/** Concat Series objects along axis=1 → DataFrame (each Series = one column). */
function concatSeriesAxis1(
  items: readonly Series<Scalar>[],
  join: JoinHow,
  ignoreIndex: boolean,
): DataFrame {
  const rowIndexes = items.map((s) => s.index as Index<Label>);
  const combinedRowIndex = combineIndexes(rowIndexes, join);

  const colData: Record<string, Scalar[]> = {};

  for (let i = 0; i < items.length; i++) {
    const s = items[i] as Series<Scalar>;
    const colName = s.name !== null && s.name !== undefined ? s.name : String(i);
    const aligned = reindexValues(s.values, s.index, combinedRowIndex);
    colData[colName] = aligned;
  }

  const rowIndex: Index<Label> = ignoreIndex
    ? (new RangeIndex(combinedRowIndex.size) as unknown as Index<Label>)
    : combinedRowIndex;

  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index: rowIndex });
}

/** Concat DataFrame objects along axis=1 → DataFrame (column-wise). */
function concatDataFramesAxis1(
  items: readonly DataFrame[],
  join: JoinHow,
  ignoreIndex: boolean,
): DataFrame {
  const rowIndexes = items.map((df) => df.index as Index<Label>);
  const combinedRowIndex = combineIndexes(rowIndexes, join);

  const colData: Record<string, Scalar[]> = {};

  for (const df of items) {
    for (const colName of df.columns.values) {
      const col = df.col(colName);
      colData[colName] = reindexValues(col.values, df.index, combinedRowIndex);
    }
  }

  const rowIndex: Index<Label> = ignoreIndex
    ? (new RangeIndex(combinedRowIndex.size) as unknown as Index<Label>)
    : combinedRowIndex;

  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, { index: rowIndex });
}

// ─── public function ──────────────────────────────────────────────────────────

/**
 * Concatenate a sequence of `Series` or `DataFrame` objects along an axis.
 *
 * Behaviour mirrors `pandas.concat`:
 * - When `axis=0` (default): stack items row-wise.
 *   All-Series → Series; all-DataFrame → DataFrame.
 * - When `axis=1`: stack items column-wise.
 *   All-Series → DataFrame (each Series becomes a column);
 *   all-DataFrame → DataFrame (columns merged side by side).
 * - Mixed Series/DataFrame inputs are not supported; pass a uniform list.
 *
 * @param objs        - Non-empty array of Series or DataFrame objects to combine.
 * @param options     - Optional {@link ConcatOptions}.
 * @returns A new `Series` or `DataFrame`.
 *
 * @throws {TypeError}  When `objs` is empty, or contains a mix of Series and
 *                      DataFrame, or contains an unsupported type.
 *
 * @example
 * ```ts
 * // Vertical stack
 * const s = concat([s1, s2]);
 *
 * // Horizontal concat (Series → DataFrame)
 * const df = concat([s1, s2], { axis: 1 });
 *
 * // Inner join drops non-shared columns
 * const result = concat([df1, df2], { join: "inner" });
 * ```
 */
export function concat(
  objs: readonly (Series<Scalar> | DataFrame)[],
  options?: ConcatOptions,
): Series<Scalar> | DataFrame {
  if (objs.length === 0) {
    throw new TypeError("concat() requires at least one object");
  }

  const axis = resolveAxis(options?.axis);
  const join: JoinHow = options?.join ?? "outer";
  const ignoreIndex = options?.ignoreIndex ?? false;

  // Determine whether all items are Series or all are DataFrame
  const allSeries = objs.every((o) => o instanceof Series);
  const allFrames = objs.every((o) => o instanceof DataFrame);

  if (!(allSeries || allFrames)) {
    throw new TypeError(
      "concat() requires all objects to be Series or all to be DataFrame — mixed types are not supported",
    );
  }

  if (allSeries) {
    const series = objs as readonly Series<Scalar>[];
    if (axis === 0) {
      return concatSeriesAxis0(series, ignoreIndex);
    }
    return concatSeriesAxis1(series, join, ignoreIndex);
  }

  // allFrames
  const frames = objs as readonly DataFrame[];
  if (axis === 0) {
    return concatDataFramesAxis0(frames, join, ignoreIndex);
  }
  return concatDataFramesAxis1(frames, join, ignoreIndex);
}
