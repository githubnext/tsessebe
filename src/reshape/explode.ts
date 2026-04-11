/**
 * explode — transform list-like column/Series cells into multiple rows.
 *
 * Mirrors `pandas.DataFrame.explode` / `pandas.Series.explode`:
 * - Each element of a list-valued cell becomes its own row.
 * - All other columns repeat their value for each exploded row.
 * - Scalar (non-list) values are treated as single-element lists.
 * - Empty arrays produce a single row with `null`.
 * - `null`/`undefined` values produce a single `null` row (preserved).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [[10, 20], [30]] as unknown as Scalar[] });
 * explodeDataFrame(df, "b");
 * // a  b
 * // 1  10
 * // 1  20
 * // 2  30
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options for {@link explodeSeries} and {@link explodeDataFrame}. */
export interface ExplodeOptions {
  /**
   * When `true`, the result index is reset to a default `RangeIndex`.
   * When `false` (default), the original row labels are propagated
   * (duplicated once for each element of each list value).
   */
  readonly ignore_index?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Expand a single cell value into an array of scalars.
 *
 * - Array → each element (or `[null]` if empty)
 * - `null` / `undefined` → `[null]`
 * - Any other scalar → `[value]`
 *
 * Internally widens to `unknown` before the Array.isArray check so that
 * object-typed Series cells that hold arrays at runtime are handled correctly.
 */
function expandCell(value: Scalar): Scalar[] {
  if (value === null || value === undefined) {
    return [null];
  }
  // Widen to unknown first — Series cells may hold arrays at runtime when the
  // dtype is "object", even though the static type is Scalar.
  const raw: unknown = value;
  if (!Array.isArray(raw)) {
    return [value];
  }
  const arr: unknown[] = raw;
  if (arr.length === 0) {
    return [null];
  }
  return arr.map((c) => (c ?? null) as Scalar);
}

// ─── explodeSeries ─────────────────────────────────────────────────────────────

/**
 * Explode a Series of list-like values into a longer Series.
 *
 * Each element of an array-valued cell becomes its own row.
 * Scalar values pass through unchanged (as a single row).
 * `null`/`undefined` yield a single `null` row.
 * Empty arrays yield a single `null` row.
 *
 * @param series - The Series to explode.
 * @param options - {@link ExplodeOptions}
 * @returns A new Series with list-cells expanded to individual rows.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [[1, 2], [3]] as unknown as Scalar[], name: "x" });
 * explodeSeries(s).toArray(); // [1, 2, 3]
 * ```
 */
export function explodeSeries(
  series: Series<Scalar>,
  options?: ExplodeOptions,
): Series<Scalar> {
  const ignoreIndex = options?.ignore_index ?? false;
  const outValues: Scalar[] = [];
  const outLabels: Label[] = [];

  const n = series.values.length;
  const idxVals = series.index.values;

  for (let i = 0; i < n; i++) {
    const cells = expandCell(series.values[i] ?? null);
    const label: Label = idxVals[i] ?? null;
    for (const cell of cells) {
      outValues.push(cell);
      outLabels.push(label);
    }
  }

  const resultIndex: Index<Label> = ignoreIndex
    ? (new RangeIndex(outValues.length) as unknown as Index<Label>)
    : new Index<Label>(outLabels);

  return new Series<Scalar>({
    data: outValues,
    index: resultIndex,
    name: series.name,
  });
}

// ─── explodeDataFrame ──────────────────────────────────────────────────────────

/**
 * Explode one or more list-valued columns of a DataFrame into multiple rows.
 *
 * All other columns have their values repeated to match the expanded rows.
 * Row labels are propagated (duplicated) unless `ignore_index` is `true`.
 *
 * When multiple columns are specified they must have the same list lengths per
 * row — pandas raises a `ValueError` for mismatched lengths; here each column
 * is expanded independently but they are aligned by position.  If lengths
 * differ, the shorter column is padded with `null` (consistent with
 * zip-longest behaviour pandas uses for multi-column explode).
 *
 * @param df - The DataFrame to explode.
 * @param column - Column name or array of column names to explode.
 * @param options - {@link ExplodeOptions}
 * @returns A new DataFrame with the specified column(s) exploded.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   a: [1, 2],
 *   b: [[10, 20], [30]] as unknown as Scalar[],
 * });
 * explodeDataFrame(df, "b").toRecords();
 * // [{ a: 1, b: 10 }, { a: 1, b: 20 }, { a: 2, b: 30 }]
 * ```
 */
export function explodeDataFrame(
  df: DataFrame,
  column: string | readonly string[],
  options?: ExplodeOptions,
): DataFrame {
  const ignoreIndex = options?.ignore_index ?? false;
  const explodeCols: readonly string[] =
    typeof column === "string" ? [column] : column;

  // Validate column names
  for (const col of explodeCols) {
    if (!df.columns.values.includes(col)) {
      throw new Error(`Column '${col}' not found in DataFrame`);
    }
  }

  const allCols = df.columns.values;
  const nRows = df.index.size;
  const idxVals = df.index.values;

  // For each row, determine how many output rows it produces (max of all explode columns)
  const rowExpansions: number[] = [];
  for (let i = 0; i < nRows; i++) {
    let maxLen = 1;
    for (const col of explodeCols) {
      const val = df.col(col).iat(i);
      const cells = expandCell(val);
      if (cells.length > maxLen) {
        maxLen = cells.length;
      }
    }
    rowExpansions.push(maxLen);
  }

  // Build output column arrays
  const outData: Record<string, Scalar[]> = {};
  for (const col of allCols) {
    outData[col] = [];
  }
  const outLabels: Label[] = [];

  for (let i = 0; i < nRows; i++) {
    const expansion = rowExpansions[i] ?? 1;
    const label: Label = idxVals[i] ?? null;

    for (let k = 0; k < expansion; k++) {
      outLabels.push(label);
      for (const col of allCols) {
        const colArr = outData[col];
        if (colArr === undefined) continue;
        if (explodeCols.includes(col)) {
          const val = df.col(col).iat(i);
          const cells = expandCell(val);
          colArr.push(k < cells.length ? (cells[k] ?? null) : null);
        } else {
          colArr.push(df.col(col).iat(i));
        }
      }
    }
  }

  const resultIndex: Index<Label> = ignoreIndex
    ? (new RangeIndex(outLabels.length) as unknown as Index<Label>)
    : new Index<Label>(outLabels);

  return DataFrame.fromColumns(outData, {
    index: resultIndex,
  });
}
