/**
 * reindex — align a Series or DataFrame to a new axis (index or columns).
 *
 * Mirrors `pandas.Series.reindex` / `pandas.DataFrame.reindex`:
 *
 * - {@link reindexSeries} — realign a Series to `newIndex`, inserting `fillValue`
 *   (or filling via a fill method) for labels absent in the original.
 * - {@link reindexDataFrame} — realign a DataFrame's rows (`index`), columns
 *   (`columns`), or both, with optional fill semantics.
 *
 * ### Supported fill methods
 *
 * | Method | Alias | Description |
 * |--------|-------|-------------|
 * | `"ffill"` | `"pad"` | Propagate last valid value forward |
 * | `"bfill"` | `"backfill"` | Propagate next valid value backward |
 * | `"nearest"` | — | Use the closest valid value; prefer forward on tie |
 *
 * The `limit` option caps the number of consecutive NaN slots filled when
 * using `"ffill"` or `"bfill"`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], index: new Index({ data: ["a", "b", "c"] }) });
 * reindexSeries(s, ["b", "c", "d"]);
 * // Series [20, 30, null] with index ["b", "c", "d"]
 *
 * reindexSeries(s, ["a", "x", "c"], { method: "ffill" });
 * // Series [10, 10, 30] — "x" filled forward from "a"
 * ```
 *
 * @module
 */

import type { FillMethod, Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Fill method including "nearest" (not in the base FillMethod union). */
export type ReindexMethod = FillMethod | "nearest";

/** Options for {@link reindexSeries}. */
export interface ReindexSeriesOptions {
  /** Scalar to insert for labels not found in the original index (default: `null`). */
  fillValue?: Scalar;
  /**
   * Fill method for consecutive missing entries created by reindexing.
   * - `"ffill"` / `"pad"` — propagate last valid value forward.
   * - `"bfill"` / `"backfill"` — propagate next valid value backward.
   * - `"nearest"` — use the closest valid value.
   */
  method?: ReindexMethod;
  /**
   * Maximum number of consecutive NaN values to fill when using `"ffill"`
   * or `"bfill"`. Has no effect for `"nearest"`.
   */
  limit?: number;
}

/** Options for {@link reindexDataFrame}. */
export interface ReindexDataFrameOptions extends ReindexSeriesOptions {
  /**
   * New row-index labels.  When provided, every row is realigned to this
   * index (same semantics as `Series.reindex`).
   */
  index?: readonly Label[] | Index<Label>;
  /**
   * New column labels.  When provided, the DataFrame's columns are
   * reordered / extended.  Fill methods apply per-column when rows are
   * also reindexed; for columns-only reindexing the fill value is used.
   */
  columns?: readonly Label[] | Index<Label>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Normalise a label array or Index into an `Index<Label>`. */
function toIndex(src: readonly Label[] | Index<Label>): Index<Label> {
  if (src instanceof Index) {
    return src as Index<Label>;
  }
  return new Index<Label>(src as Label[]);
}

/** Build a label → [positions] lookup for an index. */
function buildLabelMap(idx: Index<Label>): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const labels = idx.toArray();
  for (let i = 0; i < labels.length; i++) {
    const key = String(labels[i]);
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
}

/** Forward-fill: propagate last valid value to the right. */
function applyFfill(
  values: Scalar[],
  present: readonly boolean[],
  limit: number | undefined,
): Scalar[] {
  const out = values.slice();
  let lastVal: Scalar = null;
  let streak = 0;
  for (let i = 0; i < out.length; i++) {
    if (present[i]) {
      lastVal = out[i];
      streak = 0;
    } else if (!isMissing(lastVal) && (limit === undefined || streak < limit)) {
      out[i] = lastVal;
      streak++;
    } else if (!present[i]) {
      streak++;
    }
  }
  return out;
}

/** Backward-fill: propagate next valid value to the left. */
function applyBfill(
  values: Scalar[],
  present: readonly boolean[],
  limit: number | undefined,
): Scalar[] {
  const out = values.slice();
  let nextVal: Scalar = null;
  let streak = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (present[i]) {
      nextVal = out[i];
      streak = 0;
    } else if (!isMissing(nextVal) && (limit === undefined || streak < limit)) {
      out[i] = nextVal;
      streak++;
    } else if (!present[i]) {
      streak++;
    }
  }
  return out;
}

/**
 * Nearest-fill: for each missing slot, use the closest valid value.
 * On a tie (equidistant left and right), prefer the right (forward) value —
 * matching pandas' `method="nearest"` behaviour.
 */
function buildLeftNearest(
  values: Scalar[],
  present: readonly boolean[],
): { dist: number[]; val: Scalar[] } {
  const n = values.length;
  const dist: number[] = new Array(n).fill(-1);
  const val: Scalar[] = new Array(n).fill(null);
  let lastIdx = -1;
  for (let i = 0; i < n; i++) {
    if (present[i]) lastIdx = i;
    if (lastIdx >= 0) {
      dist[i] = i - lastIdx;
      val[i] = values[lastIdx];
    }
  }
  return { dist, val };
}

function buildRightNearest(
  values: Scalar[],
  present: readonly boolean[],
): { dist: number[]; val: Scalar[] } {
  const n = values.length;
  const dist: number[] = new Array(n).fill(-1);
  const val: Scalar[] = new Array(n).fill(null);
  let nextIdx = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (present[i]) nextIdx = i;
    if (nextIdx >= 0) {
      dist[i] = nextIdx - i;
      val[i] = values[nextIdx];
    }
  }
  return { dist, val };
}

function pickNearest(ld: number, rd: number, leftVal: Scalar, rightVal: Scalar): Scalar {
  if (ld === -1 && rd === -1) return null;
  if (ld === -1) return rightVal;
  if (rd === -1) return leftVal;
  return rd <= ld ? rightVal : leftVal; // prefer right on tie
}

function applyNearest(values: Scalar[], present: readonly boolean[]): Scalar[] {
  const out = values.slice();
  const left = buildLeftNearest(values, present);
  const right = buildRightNearest(values, present);
  for (let i = 0; i < values.length; i++) {
    if (!present[i]) {
      out[i] = pickNearest(
        left.dist[i] ?? -1,
        right.dist[i] ?? -1,
        left.val[i] ?? null,
        right.val[i] ?? null,
      );
    }
  }
  return out;
}

/** Apply the chosen fill method to a (values, present) pair. */
function applyFillMethod(
  values: Scalar[],
  present: readonly boolean[],
  method: ReindexMethod,
  limit: number | undefined,
): Scalar[] {
  if (method === "ffill" || method === "pad") {
    return applyFfill(values, present, limit);
  }
  if (method === "bfill" || method === "backfill") {
    return applyBfill(values, present, limit);
  }
  // nearest
  return applyNearest(values, present);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Realign a Series to a new index.
 *
 * Labels present in `newIndex` but absent in `series.index` become `fillValue`
 * (default `null`).  Labels absent in `newIndex` are dropped.
 *
 * When `method` is supplied the fill is applied after the initial alignment,
 * so only entries that were *newly missing* (not in the original index) are
 * candidates for filling — exactly matching pandas semantics.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], index: new Index({ data: [0, 1, 2] }) });
 * reindexSeries(s, [1, 3, 5], { fillValue: 0 });
 * // Series [2, 0, 0]
 *
 * reindexSeries(s, [0, 1, 2, 3, 4], { method: "ffill" });
 * // Series [1, 2, 3, 3, 3]
 * ```
 */
export function reindexSeries<T extends Scalar>(
  series: Series<T>,
  newIndex: readonly Label[] | Index<Label>,
  options: ReindexSeriesOptions = {},
): Series<T> {
  const { fillValue = null, method, limit } = options;

  const newIdx = toIndex(newIndex);
  const newLabels = newIdx.toArray();
  const n = newLabels.length;

  const labelMap = buildLabelMap(series.index);

  const resultValues: Scalar[] = new Array(n).fill(fillValue);
  const present: boolean[] = new Array(n).fill(false);

  for (let i = 0; i < n; i++) {
    const key = String(newLabels[i]);
    const positions = labelMap.get(key);
    if (positions !== undefined && positions.length > 0) {
      const pos = positions[0];
      if (pos !== undefined) {
        resultValues[i] = series.values[pos] ?? null;
        present[i] = true;
      }
    }
  }

  const finalValues =
    method !== undefined ? applyFillMethod(resultValues, present, method, limit) : resultValues;

  return new Series<T>({
    data: finalValues as T[],
    index: newIdx,
    name: series.name,
  });
}

/**
 * Realign a DataFrame's rows (`index`), columns, or both.
 *
 * Supply at least one of `index` or `columns` in the options.
 * Row reindexing reindexes each column's Series independently; column
 * reindexing reorders / adds columns (new columns filled with `fillValue`).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * reindexDataFrame(df, {
 *   index:   [0, 1, 2],
 *   columns: ["a", "b", "c"],
 *   fillValue: 0,
 * });
 * // shape [3, 3]; row 2 → [0, 0, 0]; column "c" → [0, 0, 0]
 * ```
 */
export function reindexDataFrame(df: DataFrame, options: ReindexDataFrameOptions = {}): DataFrame {
  const { index: newRowIndex, columns: newColumns, ...seriesOpts } = options;

  // Step 1 — optionally reindex rows
  let working = df;
  if (newRowIndex !== undefined) {
    const newIdx = toIndex(newRowIndex);
    const colNames = df.columns.toArray().map(String);
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of colNames) {
      colMap.set(name, reindexSeries(df.col(name), newIdx, seriesOpts));
    }
    working = new DataFrame(colMap, newIdx);
  }

  // Step 2 — optionally reindex columns
  if (newColumns !== undefined) {
    const newColIdx = toIndex(newColumns);
    const newColLabels = newColIdx.toArray().map(String);
    const existingCols = new Set(working.columns.toArray().map(String));
    const fillVal = (seriesOpts.fillValue ?? null) as Scalar;
    const colMap = new Map<string, Series<Scalar>>();
    const rowCount = working.shape[0];
    const rowIdx = working.index;

    for (const name of newColLabels) {
      if (existingCols.has(name)) {
        colMap.set(name, working.col(name));
      } else {
        colMap.set(
          name,
          new Series<Scalar>({
            data: new Array<Scalar>(rowCount).fill(fillVal),
            index: rowIdx,
            name,
          }),
        );
      }
    }
    return new DataFrame(colMap, rowIdx);
  }

  return working;
}
