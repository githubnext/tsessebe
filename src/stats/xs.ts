/**
 * xs — cross-section selection for DataFrame and Series.
 *
 * Mirrors `pandas.DataFrame.xs` and `pandas.Series.xs`.
 *
 * A cross-section selects rows (axis=0) or columns (axis=1) matching a key
 * at a particular index level.  For a simple (flat) Index the key is compared
 * directly against index labels.  For a MultiIndex you may specify which
 * level to match against.
 *
 * - {@link xsDataFrame}  — cross-section of a DataFrame (returns Series or DataFrame)
 * - {@link xsSeries}     — cross-section of a Series  (returns Scalar or Series)
 *
 * @example
 * ```ts
 * import { DataFrame, xsDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { a: [1, 2, 3], b: [4, 5, 6] },
 *   { index: ["x", "y", "z"] },
 * );
 *
 * xsDataFrame(df, "x");
 * // Series { a: 1, b: 4 }  (indexed by column names)
 *
 * xsDataFrame(df, "a", { axis: 1 });
 * // Series { x: 1, y: 2, z: 3 }  (the "a" column)
 * ```
 *
 * @module
 */

import { DataFrame, Index, MultiIndex, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link xsDataFrame}. */
export interface XsDataFrameOptions {
  /**
   * Axis to select along.
   *
   * - `0` (default) — select rows by index key.
   * - `1`           — select a column by name.
   */
  readonly axis?: 0 | 1;

  /**
   * Level within a MultiIndex to match against.
   * Ignored for flat indexes.
   * Defaults to `0` (the outermost level).
   */
  readonly level?: number | string;

  /**
   * When `true` (default), the matched level is removed from the resulting
   * index.  Set to `false` to preserve it.
   */
  readonly dropLevel?: boolean;
}

/** Options for {@link xsSeries}. */
export interface XsSeriesOptions {
  /** Level within a MultiIndex to match (default `0`). */
  readonly level?: number | string;
  /** Whether to drop the matched level from the result index (default `true`). */
  readonly dropLevel?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Resolve a level name or number to a 0-based level index. */
function resolveLevel(mi: MultiIndex, level: number | string | undefined): number {
  if (level === undefined) {
    return 0;
  }
  if (typeof level === "number") {
    const n = mi.nlevels;
    const resolved = level < 0 ? n + level : level;
    if (resolved < 0 || resolved >= n) {
      throw new RangeError(`Level ${level} out of range for MultiIndex with ${n} levels.`);
    }
    return resolved;
  }
  const idx = mi.names.indexOf(level);
  if (idx === -1) {
    throw new Error(`Level name "${level}" not found in MultiIndex.`);
  }
  return idx;
}

/**
 * Find all positions in `idx` where the value at `levelIdx` equals `key`.
 * For a flat Index, `levelIdx` is ignored.
 */
function matchingRows(idx: Index<Label> | MultiIndex, key: Label, levelIdx: number): number[] {
  const positions: number[] = [];

  if (idx instanceof MultiIndex) {
    for (let i = 0; i < idx.size; i++) {
      const tuple = idx.at(i);
      if (tuple[levelIdx] === key) {
        positions.push(i);
      }
    }
  } else {
    for (let i = 0; i < idx.size; i++) {
      if (idx.at(i) === key) {
        positions.push(i);
      }
    }
  }

  if (positions.length === 0) {
    throw new Error(`KeyError: ${String(key)}`);
  }
  return positions;
}

/**
 * Build a result index for the matched positions, optionally dropping the
 * matched level.
 */
function buildResultIndex(
  idx: Index<Label> | MultiIndex,
  levelIdx: number,
  positions: readonly number[],
  drop: boolean,
): Index<Label> {
  if (idx instanceof MultiIndex) {
    if (drop) {
      const reduced = idx.droplevel(levelIdx);
      if (reduced instanceof MultiIndex) {
        const tuples = positions.map((p) => reduced.at(p));
        return MultiIndex.fromTuples(tuples, { names: reduced.names }) as unknown as Index<Label>;
      }
      // Single-level result → plain Index
      const vals = positions.map((p) => reduced.at(p));
      return new Index<Label>(vals);
    }
    // Keep all levels
    const tuples = positions.map((p) => idx.at(p));
    return MultiIndex.fromTuples(tuples, { names: idx.names }) as unknown as Index<Label>;
  }

  // Flat index
  if (drop) {
    // Return RangeIndex 0..n-1
    return new Index<Label>(positions.map((_, i) => i as Label));
  }
  return new Index<Label>(positions.map((p) => idx.at(p)));
}

// ─── xsDataFrame ─────────────────────────────────────────────────────────────

/**
 * Return a cross-section of a DataFrame.
 *
 * - `axis=0` (default): select rows where the index equals `key`.
 *   Returns a `Series` when exactly one row matches, or a `DataFrame` when
 *   multiple rows match.
 * - `axis=1`: return the column named `key` as a `Series`.
 *
 * @param df     Source DataFrame.
 * @param key    Label to match.
 * @param options See {@link XsDataFrameOptions}.
 */
export function xsDataFrame(
  df: DataFrame,
  key: Label,
  options: XsDataFrameOptions = {},
): Series<Scalar> | DataFrame {
  const { axis = 0, level, dropLevel = true } = options;

  // ── column (axis=1) ─────────────────────────────────────────────────────────
  if (axis === 1) {
    if (typeof key !== "string") {
      throw new TypeError(`Column key must be a string; got ${typeof key}.`);
    }
    const col = df.get(key);
    if (col === undefined) {
      throw new Error(`KeyError: "${key}" not found in columns.`);
    }
    return col;
  }

  // ── row (axis=0) ─────────────────────────────────────────────────────────────
  const idx = df.index as Index<Label> | MultiIndex;
  const isMulti = idx instanceof MultiIndex;
  const levelIdx = isMulti ? resolveLevel(idx as MultiIndex, level) : 0;
  const positions = matchingRows(idx, key, levelIdx);

  const colNames = df.columns.values as string[];

  if (positions.length === 1) {
    // Single row → return as a Series indexed by column names
    const rowPos = positions[0] as number;
    const data: Scalar[] = colNames.map((name) => {
      const s = df.get(name);
      return s !== undefined ? (s.values[rowPos] as Scalar) : null;
    });
    return new Series<Scalar>({
      data,
      index: new Index<Label>(colNames as Label[]),
      name: String(key),
    });
  }

  // Multiple rows → return a DataFrame
  const newIndex = buildResultIndex(idx, levelIdx, positions, dropLevel);
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.get(name);
    const vals: Scalar[] = positions.map((p) =>
      col !== undefined ? (col.values[p] as Scalar) : null,
    );
    colMap.set(name, new Series<Scalar>({ data: vals, index: newIndex }));
  }
  return new DataFrame(colMap, newIndex, colNames);
}

// ─── xsSeries ────────────────────────────────────────────────────────────────

/**
 * Return a cross-section of a Series.
 *
 * If exactly one element matches, returns the scalar value directly.
 * If multiple elements match (e.g. with a MultiIndex at an outer level),
 * returns a new Series.
 *
 * @param s      Source Series.
 * @param key    Label to match.
 * @param options See {@link XsSeriesOptions}.
 */
export function xsSeries(
  s: Series<Scalar>,
  key: Label,
  options: XsSeriesOptions = {},
): Scalar | Series<Scalar> {
  const { level, dropLevel = true } = options;

  const idx = s.index as Index<Label> | MultiIndex;
  const isMulti = idx instanceof MultiIndex;
  const levelIdx = isMulti ? resolveLevel(idx as MultiIndex, level) : 0;
  const positions = matchingRows(idx, key, levelIdx);

  if (positions.length === 1) {
    return s.values[positions[0] as number] as Scalar;
  }

  const newIndex = buildResultIndex(idx, levelIdx, positions, dropLevel);
  const data: Scalar[] = positions.map((p) => s.values[p] as Scalar);
  return new Series<Scalar>({ data, index: newIndex, name: s.name });
}
