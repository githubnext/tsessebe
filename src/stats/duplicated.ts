/**
 * duplicated — detect and remove duplicate rows/values in Series and DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.duplicated(keep='first')`
 * - `pandas.DataFrame.duplicated(subset, keep='first')`
 * - `pandas.Series.drop_duplicates(keep='first')`
 * - `pandas.DataFrame.drop_duplicates(subset, keep='first')`
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Controls which duplicate to mark:
 * - `"first"` — mark all duplicates except the first occurrence.
 * - `"last"`  — mark all duplicates except the last occurrence.
 * - `false`   — mark ALL occurrences (i.e., any row that appears >1 time).
 */
export type KeepPolicy = "first" | "last" | false;

/** Options for {@link duplicatedSeries} and {@link dropDuplicatesSeries}. */
export interface DuplicatedOptions {
  /**
   * Which duplicates to mark/keep.
   * @defaultValue `"first"`
   */
  readonly keep?: KeepPolicy;
}

/** Options for {@link duplicatedDataFrame} and {@link dropDuplicatesDataFrame}. */
export interface DataFrameDuplicatedOptions extends DuplicatedOptions {
  /**
   * Subset of column names to consider. When omitted, all columns are used.
   */
  readonly subset?: readonly string[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Stable string key for any Scalar (same logic as value_counts). */
function scalarKey(v: Scalar): string {
  if (v === null || v === undefined) {
    return "\x00null";
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return "\x00nan";
  }
  if (v instanceof Date) {
    return `\x01date:${v.getTime().toString()}`;
  }
  return `\x02${typeof v}:${String(v)}`;
}

/** Build a composite row key from the values of the selected columns at row `i`. */
function rowKey(df: DataFrame, colNames: readonly string[], i: number): string {
  const parts: string[] = [];
  for (const name of colNames) {
    const s = df.get(name);
    const v: Scalar = s !== undefined ? (s.values[i] ?? null) : null;
    parts.push(scalarKey(v));
  }
  return parts.join("|");
}

/**
 * Core algorithm: return a boolean array where `true` = duplicate.
 *
 * @param keys     Array of string keys (one per element/row)
 * @param keep     Keep policy
 */
function markDuplicates(keys: readonly string[], keep: KeepPolicy): boolean[] {
  const n = keys.length;
  const result = new Array<boolean>(n).fill(false);

  if (keep === false) {
    // Mark ALL occurrences where the key appears more than once
    const counts = new Map<string, number>();
    for (const k of keys) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      if (k !== undefined) {
        result[i] = (counts.get(k) ?? 0) > 1;
      }
    }
    return result;
  }

  if (keep === "first") {
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) {
      const k = keys[i];
      if (k !== undefined) {
        if (seen.has(k)) {
          result[i] = true;
        } else {
          seen.add(k);
        }
      }
    }
    return result;
  }

  // keep === "last": iterate in reverse
  const seen = new Set<string>();
  for (let i = n - 1; i >= 0; i--) {
    const k = keys[i];
    if (k !== undefined) {
      if (seen.has(k)) {
        result[i] = true;
      } else {
        seen.add(k);
      }
    }
  }
  return result;
}

// ─── Series duplicated ────────────────────────────────────────────────────────

/**
 * Return a boolean Series indicating duplicated values.
 *
 * `true` marks a value as a duplicate (according to `keep`).
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 1, 3, 2] });
 * duplicatedSeries(s).values; // [false, false, true, false, true]
 * ```
 */
export function duplicatedSeries(
  series: Series<Scalar>,
  options?: DuplicatedOptions,
): Series<boolean> {
  const keep = options?.keep ?? "first";
  const keys = series.values.map(scalarKey);
  const flags = markDuplicates(keys, keep);
  return new Series<boolean>({
    data: flags,
    index: series.index,
    name: series.name ?? undefined,
  });
}

// ─── DataFrame duplicated ─────────────────────────────────────────────────────

/**
 * Return a boolean Series indicating duplicated rows.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([
 *   { a: 1, b: 2 }, { a: 1, b: 2 }, { a: 3, b: 4 },
 * ]);
 * duplicatedDataFrame(df).values; // [false, true, false]
 * ```
 */
export function duplicatedDataFrame(
  df: DataFrame,
  options?: DataFrameDuplicatedOptions,
): Series<boolean> {
  const keep = options?.keep ?? "first";
  const colNames = resolveSubset(df, options?.subset);
  const nRows = df.shape[0];

  const keys: string[] = [];
  for (let i = 0; i < nRows; i++) {
    keys.push(rowKey(df, colNames, i));
  }

  const flags = markDuplicates(keys, keep);
  return new Series<boolean>({
    data: flags,
    index: df.index,
  });
}

// ─── Series drop_duplicates ───────────────────────────────────────────────────

/**
 * Return a new Series with duplicate values removed.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 1, 3, 2] });
 * dropDuplicatesSeries(s).values; // [1, 2, 3]
 * ```
 */
export function dropDuplicatesSeries(
  series: Series<Scalar>,
  options?: DuplicatedOptions,
): Series<Scalar> {
  const dupFlags = duplicatedSeries(series, options);
  const keepPositions: number[] = [];
  for (let i = 0; i < dupFlags.values.length; i++) {
    if (dupFlags.values[i] === false) {
      keepPositions.push(i);
    }
  }
  const newValues: Scalar[] = keepPositions.map((i) => series.values[i] ?? null);
  const newLabels: Label[] = keepPositions.map((i) => series.index.at(i) ?? null);
  return new Series<Scalar>({
    data: newValues,
    index: new Index<Label>(newLabels),
    name: series.name ?? undefined,
  });
}

// ─── DataFrame drop_duplicates ────────────────────────────────────────────────

/**
 * Return a new DataFrame with duplicate rows removed.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([
 *   { a: 1, b: 2 }, { a: 1, b: 2 }, { a: 3, b: 4 },
 * ]);
 * dropDuplicatesDataFrame(df).shape; // [2, 2]
 * ```
 */
export function dropDuplicatesDataFrame(
  df: DataFrame,
  options?: DataFrameDuplicatedOptions,
): DataFrame {
  const dupFlags = duplicatedDataFrame(df, options);
  const keepPositions: number[] = [];
  for (let i = 0; i < dupFlags.values.length; i++) {
    if (dupFlags.values[i] === false) {
      keepPositions.push(i);
    }
  }
  return selectRows(df, keepPositions);
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Resolve the subset of columns, defaulting to all columns. */
function resolveSubset(df: DataFrame, subset: readonly string[] | undefined): readonly string[] {
  if (subset !== undefined && subset.length > 0) {
    return subset;
  }
  return df.columns.values;
}

/** Build a new DataFrame containing only the specified row positions. */
function selectRows(df: DataFrame, positions: readonly number[]): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  const newLabels: Label[] = positions.map((i) => df.index.at(i) ?? null);
  const newIndex = new Index<Label>(newLabels);

  for (const name of df.columns.values) {
    const col = df.col(name);
    const newVals: Scalar[] = positions.map((i) => col.values[i] ?? null);
    colMap.set(
      name,
      new Series<Scalar>({
        data: newVals,
        index: newIndex,
        dtype: col.dtype,
      }),
    );
  }
  return new DataFrame(colMap, newIndex);
}
