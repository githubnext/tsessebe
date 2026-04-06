/**
 * duplicated / drop_duplicates — find and remove duplicate rows.
 *
 * Mirrors:
 * - `pandas.DataFrame.duplicated(subset, keep)` — boolean mask of duplicate rows
 * - `pandas.DataFrame.drop_duplicates(subset, keep)` — remove duplicate rows
 * - `pandas.Series.duplicated(keep)` — boolean mask of duplicate values
 * - `pandas.Series.drop_duplicates(keep)` — remove duplicate values
 *
 * @module
 *
 * @example
 * ```ts
 * import { duplicatedDataFrame, dropDuplicatesDataFrame } from "tsb";
 * import { DataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   a: [1, 2, 1, 3],
 *   b: ["x", "y", "x", "z"],
 * });
 *
 * // Mark duplicate rows (first occurrence kept by default)
 * duplicatedDataFrame(df).values; // [false, false, true, false]
 *
 * // Remove duplicates
 * dropDuplicatesDataFrame(df).shape; // [3, 2]
 *
 * // Only consider column "a" when checking for duplicates
 * duplicatedDataFrame(df, { subset: ["a"] }).values; // [false, false, true, false]
 *
 * // keep="last" — mark all but the last occurrence
 * duplicatedDataFrame(df, { keep: "last" }).values; // [true, false, false, false]
 *
 * // keep=false — mark ALL occurrences of any duplicate
 * duplicatedDataFrame(df, { keep: false }).values; // [true, false, true, false]
 * ```
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Which occurrence of a duplicate to *keep* (not mark as duplicate).
 *
 * - `"first"` — keep the first occurrence (default)
 * - `"last"` — keep the last occurrence
 * - `false` — mark **all** duplicates
 */
export type KeepPolicy = "first" | "last" | false;

/** Options for {@link duplicatedDataFrame} and {@link dropDuplicatesDataFrame}. */
export interface DuplicatedDataFrameOptions {
  /**
   * Subset of columns to consider. If omitted, all columns are used.
   */
  readonly subset?: readonly string[];
  /**
   * Which occurrence to keep.
   * @defaultValue `"first"`
   */
  readonly keep?: KeepPolicy;
}

/** Options for {@link duplicatedSeries} and {@link dropDuplicatesSeries}. */
export interface DuplicatedSeriesOptions {
  /**
   * Which occurrence to keep.
   * @defaultValue `"first"`
   */
  readonly keep?: KeepPolicy;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Produce a deterministic string key for a row given the column values.
 * Uses JSON-like encoding to avoid key collisions across types.
 */
function rowKey(values: readonly (Scalar | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return "\x00null";
      if (typeof v === "number" && Number.isNaN(v)) return "\x00nan";
      return JSON.stringify(v);
    })
    .join("\x01");
}

/**
 * Compute a boolean mask indicating which positions are duplicates.
 *
 * @param keys  - Ordered array of row/value keys.
 * @param keep  - Which occurrence to keep.
 * @returns     - `true` at positions that are considered duplicate.
 */
function computeDuplicateMask(keys: readonly string[], keep: KeepPolicy): boolean[] {
  const n = keys.length;
  const mask = new Array<boolean>(n).fill(false);

  if (keep === false) {
    // Mark ALL occurrences of keys that appear more than once.
    const counts = new Map<string, number>();
    for (const k of keys) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      if (k !== undefined && (counts.get(k) ?? 0) > 1) {
        mask[i] = true;
      }
    }
  } else if (keep === "first") {
    // Mark all occurrences after the first.
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      if (k !== undefined) {
        if (seen.has(k)) {
          mask[i] = true;
        } else {
          seen.add(k);
        }
      }
    }
  } else {
    // keep === "last" — mark all occurrences before the last.
    const seen = new Set<string>();
    for (let i = n - 1; i >= 0; i--) {
      const k = keys[i];
      if (k !== undefined) {
        if (seen.has(k)) {
          mask[i] = true;
        } else {
          seen.add(k);
        }
      }
    }
  }

  return mask;
}

// ─── Series variants ──────────────────────────────────────────────────────────

/**
 * Return a `Series<boolean>` indicating which elements of `series` are
 * duplicates of earlier (or later, depending on `keep`) elements.
 *
 * Mirrors `pandas.Series.duplicated(keep)`.
 *
 * @param series  - Input series.
 * @param options - Options controlling which occurrences to mark.
 * @returns       - Boolean series with `true` at duplicate positions.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 1, 3, 2] });
 * duplicatedSeries(s).values; // [false, false, true, false, true]
 * ```
 */
export function duplicatedSeries<T extends Scalar>(
  series: Series<T>,
  options?: DuplicatedSeriesOptions,
): Series<boolean> {
  const keep: KeepPolicy = options?.keep ?? "first";
  const keys = (series.values as readonly T[]).map((v) => rowKey([v]));
  const mask = computeDuplicateMask(keys, keep);
  return new Series<boolean>({
    data: mask,
    index: series.index as Index<Label>,
    name: series.name,
  });
}

/**
 * Return a new `Series` with duplicate values removed.
 *
 * Mirrors `pandas.Series.drop_duplicates(keep)`.
 *
 * @param series  - Input series.
 * @param options - Options controlling which occurrences to keep.
 * @returns       - Series with duplicates removed.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 1, 3, 2] });
 * dropDuplicatesSeries(s).values; // [1, 2, 3]
 * ```
 */
export function dropDuplicatesSeries<T extends Scalar>(
  series: Series<T>,
  options?: DuplicatedSeriesOptions,
): Series<T> {
  const dupMask = duplicatedSeries(series, options);
  const keepPositions: number[] = [];
  for (let i = 0; i < dupMask.size; i++) {
    if (!dupMask.values[i]) keepPositions.push(i);
  }
  const newData = keepPositions.map((i) => (series.values as readonly T[])[i] as T);
  const newIndex = new Index<Label>(
    keepPositions.map((i) => series.index.at(i) as Label),
  );
  return new Series<T>({ data: newData, index: newIndex, name: series.name });
}

// ─── DataFrame variants ───────────────────────────────────────────────────────

/**
 * Return a `Series<boolean>` indicating which rows of `df` are duplicates.
 *
 * Mirrors `pandas.DataFrame.duplicated(subset, keep)`.
 *
 * @param df      - Input DataFrame.
 * @param options - Options: `subset` (column names) and `keep` policy.
 * @returns       - Boolean series with `true` at duplicate row positions.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 1], b: ["x", "y", "x"] });
 * duplicatedDataFrame(df).values; // [false, false, true]
 * ```
 */
export function duplicatedDataFrame(
  df: DataFrame,
  options?: DuplicatedDataFrameOptions,
): Series<boolean> {
  const keep: KeepPolicy = options?.keep ?? "first";
  const colNames = options?.subset ?? [...df.columns.values];

  // Validate subset columns exist.
  for (const col of colNames) {
    if (!df.has(col)) {
      throw new RangeError(`Column "${col}" not found in DataFrame`);
    }
  }

  // Pre-fetch column arrays for performance.
  const colArrays: ReadonlyArray<readonly Scalar[]> = colNames.map(
    (name) => df.col(name).values as readonly Scalar[],
  );

  const nRows = df.shape[0];
  const keys: string[] = [];
  for (let i = 0; i < nRows; i++) {
    const rowVals = colArrays.map((arr) => arr[i]);
    keys.push(rowKey(rowVals));
  }

  const mask = computeDuplicateMask(keys, keep);
  return new Series<boolean>({
    data: mask,
    index: df.index as Index<Label>,
  });
}

/**
 * Return a new `DataFrame` with duplicate rows removed.
 *
 * Mirrors `pandas.DataFrame.drop_duplicates(subset, keep)`.
 *
 * @param df      - Input DataFrame.
 * @param options - Options: `subset` (column names) and `keep` policy.
 * @returns       - DataFrame with duplicate rows removed.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 1], b: ["x", "y", "x"] });
 * dropDuplicatesDataFrame(df).shape; // [2, 2]
 * ```
 */
export function dropDuplicatesDataFrame(
  df: DataFrame,
  options?: DuplicatedDataFrameOptions,
): DataFrame {
  const dupMask = duplicatedDataFrame(df, options);
  const keepMask = (dupMask.values as readonly boolean[]).map((v) => !v);
  return df.filter(keepMask);
}
