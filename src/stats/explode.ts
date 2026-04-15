/**
 * explode — transform list-like elements into individual rows.
 *
 * Mirrors `pandas.Series.explode` and `pandas.DataFrame.explode`:
 * each element that is an array is "exploded" so that each item in the array
 * occupies its own row; all other columns (for DataFrame) or the index label
 * is repeated for each item.
 *
 * Behaviour matches pandas 2.x:
 * - `null` / `undefined` → single row with `null` value.
 * - Empty array `[]`     → single row with `null` value (NaN in pandas).
 * - Scalar (non-array)   → single row, unchanged.
 * - `ignoreIndex: true`  → replace the output index with a default RangeIndex.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [[1, 2], null, [3]] });
 * explodeSeries(s);
 * // values: [1, 2, null, 3]  index: [0, 0, 1, 2]
 *
 * const df = DataFrame.fromColumns({ a: [[1, 2], [3]], b: ["x", "y"] });
 * explodeDataFrame(df, "a");
 * // a: [1, 2, 3]  b: ["x", "x", "y"]
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// Widen Scalar to unknown so Array.isArray narrows correctly.
// A Scalar value is always assignable to unknown — no cast needed.
type MaybeList = unknown;

// ─── public types ─────────────────────────────────────────────────────────────

/** Options shared by {@link explodeSeries} and {@link explodeDataFrame}. */
export interface ExplodeOptions {
  /**
   * If `true`, the resulting index is replaced with a default integer
   * `RangeIndex` (0, 1, 2, …).  If `false` (default) the original index
   * labels are repeated for each exploded element.
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

/** Options for {@link explodeDataFrame}. */
export type ExplodeDataFrameOptions = ExplodeOptions;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a default `Index<Label>` backed by a `RangeIndex`. */
function rangeIndex(n: number): Index<Label> {
  return new RangeIndex(n) as unknown as Index<Label>;
}

/** True when `v` is a plain JS array (the explodable list-like). */
function isListLike(v: MaybeList): v is readonly MaybeList[] {
  return Array.isArray(v);
}

/**
 * Core explosion logic for a single Series-like column.
 *
 * Returns parallel arrays: the exploded values and the repeated source row
 * positions (so callers can re-build index labels and repeat other columns).
 */
function explodeColumn(values: readonly MaybeList[]): {
  outValues: Scalar[];
  sourcePositions: number[];
} {
  const outValues: Scalar[] = [];
  const sourcePositions: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (isListLike(v)) {
      if (v.length === 0) {
        // Empty array → single null row (matches pandas behaviour)
        outValues.push(null);
        sourcePositions.push(i);
      } else {
        for (const item of v) {
          outValues.push(item as Scalar);
          sourcePositions.push(i);
        }
      }
    } else {
      // null, undefined, scalar — single row unchanged
      outValues.push(v as Scalar);
      sourcePositions.push(i);
    }
  }

  return { outValues, sourcePositions };
}

// ─── explodeSeries ────────────────────────────────────────────────────────────

/**
 * Explode list-like elements of a Series into individual rows.
 *
 * Each element that is a JS array is expanded into one row per item; the
 * original index label is repeated for each item.  Null / undefined and
 * scalars become a single row unchanged.  An empty array becomes a single
 * `null` row (matching pandas' NaN behaviour).
 *
 * @param series - The Series to explode.
 * @param options - Optional settings (see {@link ExplodeOptions}).
 * @returns A new Series with exploded rows.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [[1, 2, 3], "foo", [], [3, 4]], name: "x" });
 * const out = explodeSeries(s);
 * // values: [1, 2, 3, "foo", null, 3, 4]
 * // index:  [0, 0,  0,    1,    2, 3, 3]
 * ```
 */
export function explodeSeries(series: Series<Scalar>, options?: ExplodeOptions): Series<Scalar> {
  const { ignoreIndex = false } = options ?? {};
  // Widen to readonly unknown[] (safe: readonly Scalar[] ⊆ readonly unknown[]).
  const wideValues: readonly unknown[] = series.values;
  const { outValues, sourcePositions } = explodeColumn(wideValues);

  let newIndex: Index<Label>;
  if (ignoreIndex) {
    newIndex = rangeIndex(outValues.length);
  } else {
    const idxVals = sourcePositions.map((p) => series.index.at(p) as Label);
    newIndex = new Index<Label>(idxVals);
  }

  return new Series<Scalar>({ data: outValues, index: newIndex, name: series.name });
}

// ─── explodeDataFrame ─────────────────────────────────────────────────────────

/**
 * Explode one or more list-like columns of a DataFrame into individual rows.
 *
 * For each row, the specified column(s) must contain arrays of equal length.
 * Each element of those arrays becomes its own row; all other columns repeat
 * their value for every exploded row.
 *
 * When multiple columns are provided they are exploded simultaneously (all
 * must have the same list length in each row — matching pandas 1.3+ behaviour).
 *
 * @param df - The DataFrame to explode.
 * @param column - Column name(s) to explode.
 * @param options - Optional settings (see {@link ExplodeDataFrameOptions}).
 * @returns A new DataFrame with exploded rows.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [[1, 2], [3, 4]], b: [10, 20] });
 * const out = explodeDataFrame(df, "a");
 * // a: [1, 2, 3, 4]  b: [10, 10, 20, 20]
 * // index: [0, 0, 1, 1]
 * ```
 */
export function explodeDataFrame(
  df: DataFrame,
  column: string | readonly string[],
  options?: ExplodeDataFrameOptions,
): DataFrame {
  const { ignoreIndex = false } = options ?? {};
  const colNames = typeof column === "string" ? [column] : [...column];

  // Validate column names
  for (const c of colNames) {
    if (!df.has(c)) {
      throw new Error(`Column "${c}" not found in DataFrame`);
    }
  }

  const nRows = df.index.size;

  // For multi-column explode, use the first explode column to drive positions.
  // Single explode column (most common case).
  if (colNames.length === 1) {
    const explodeCol = colNames[0] as string;
    // Widen to readonly unknown[] (safe: readonly Scalar[] ⊆ readonly unknown[]).
    const wideVals: readonly unknown[] = df.col(explodeCol).values;
    const { outValues, sourcePositions } = explodeColumn(wideVals);
    const outLen = outValues.length;

    // Build output map
    const outMap = new Map<string, Series<Scalar>>();
    for (const name of df.columns.values) {
      if (name === explodeCol) {
        outMap.set(name, new Series<Scalar>({ data: outValues, name }));
      } else {
        const srcVals = df.col(name).values;
        const repeated: Scalar[] = sourcePositions.map((p) => srcVals[p] as Scalar);
        outMap.set(name, new Series<Scalar>({ data: repeated, name }));
      }
    }

    const newIndex = ignoreIndex
      ? rangeIndex(outLen)
      : new Index<Label>(sourcePositions.map((p) => df.index.at(p) as Label));

    return new DataFrame(outMap, newIndex);
  }

  // Multi-column simultaneous explode
  // Compute per-column explosion; then merge source positions (must agree per row).
  const firstCol = colNames[0] as string;
  const firstWide: readonly unknown[] = df.col(firstCol).values;
  const { outValues: firstOut, sourcePositions: firstPos } = explodeColumn(firstWide);

  // Build per-explodeCol output arrays
  const explodedCols = new Map<string, Scalar[]>();
  explodedCols.set(firstCol, firstOut);

  for (let ci = 1; ci < colNames.length; ci++) {
    const cname = colNames[ci] as string;
    const wideColVals: readonly unknown[] = df.col(cname).values;
    const out: Scalar[] = [];

    for (let row = 0; row < nRows; row++) {
      const v = wideColVals[row];
      if (isListLike(v)) {
        if (v.length === 0) {
          out.push(null);
        } else {
          for (const item of v) {
            out.push(item as Scalar);
          }
        }
      } else {
        out.push(v as Scalar);
      }
    }
    explodedCols.set(cname, out);
  }

  const outLen = firstOut.length;
  const outMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const explodedData = explodedCols.get(name);
    if (explodedData !== undefined) {
      outMap.set(name, new Series<Scalar>({ data: explodedData, name }));
    } else {
      const srcVals = df.col(name).values;
      const repeated: Scalar[] = firstPos.map((p) => srcVals[p] as Scalar);
      outMap.set(name, new Series<Scalar>({ data: repeated, name }));
    }
  }

  const newIndex = ignoreIndex
    ? rangeIndex(outLen)
    : new Index<Label>(firstPos.map((p) => df.index.at(p) as Label));

  return new DataFrame(outMap, newIndex);
}
