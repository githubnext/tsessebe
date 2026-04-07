/**
 * stack / unstack — pivot column labels to/from the row index.
 *
 * Mirrors `pandas.DataFrame.stack` and `pandas.Series.unstack`:
 * - {@link stack}: rotates column labels into the row index, producing a `Series`
 *   whose index labels are `"${rowLabel}${sep}${colName}"`.
 * - {@link unstack}: reverses `stack`, recovering a `DataFrame` from the
 *   compound string index labels.
 *
 * **Limitation**: Because tsb does not yet have `MultiIndex` support, the
 * compound-label approach is used.  Ensure that neither row-index labels nor
 * column names contain the chosen separator (default `"|"`).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── constants ────────────────────────────────────────────────────────────────

/** Default separator used to join row-label and column-name. */
export const STACK_DEFAULT_SEP = "|";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link stack}. */
export interface StackOptions {
  /**
   * Separator inserted between the row-index label and the column name in
   * each output index label.  Must not appear in any row-index label or
   * column name.  Defaults to `"|"`.
   */
  readonly sep?: string;
  /**
   * When `true` (default, matches pandas), cells whose value is
   * `null`, `undefined`, or `NaN` are omitted from the output.
   */
  readonly dropna?: boolean;
}

/** Options for {@link unstack}. */
export interface UnstackOptions {
  /**
   * Separator used when parsing compound index labels produced by
   * {@link stack}.  Must match the separator passed to `stack`.
   * Defaults to `"|"`.
   */
  readonly sep?: string;
  /**
   * Scalar used to fill missing `(row, column)` combinations.
   * Defaults to `null`.
   */
  readonly fill_value?: Scalar;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Split a compound label on the FIRST occurrence of `sep`. */
function splitLabel(label: string, sep: string): [string, string] {
  const idx = label.indexOf(sep);
  if (idx === -1) {
    throw new RangeError(
      `Index label "${label}" does not contain separator "${sep}". Was this Series produced by stack() with a different sep?`,
    );
  }
  return [label.slice(0, idx), label.slice(idx + sep.length)];
}

/** Return an array of unique items in their first-seen order. */
function uniqueOrdered(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/** Build a cell-lookup key from (rowLabel, colName, sep). */
function cellKey(row: string, col: string, sep: string): string {
  return `${row}${sep}${col}`;
}

/** Build a lookup map from compound key → scalar value. */
function buildCellMap(
  series: Series<Scalar>,
  rowParts: readonly string[],
  colParts: readonly string[],
  sep: string,
): Map<string, Scalar> {
  const map = new Map<string, Scalar>();
  for (let i = 0; i < series.index.size; i++) {
    const row = rowParts[i] ?? "";
    const col = colParts[i] ?? "";
    map.set(cellKey(row, col, sep), series.values[i] ?? null);
  }
  return map;
}

/** Build output column arrays from the cell lookup map. */
function buildOutputCols(
  uniqueRows: readonly string[],
  uniqueCols: readonly string[],
  cellMap: ReadonlyMap<string, Scalar>,
  fillValue: Scalar,
  sep: string,
): Record<string, readonly Scalar[]> {
  const out: Record<string, readonly Scalar[]> = {};
  for (const col of uniqueCols) {
    out[col] = uniqueRows.map((row) => cellMap.get(cellKey(row, col, sep)) ?? fillValue);
  }
  return out;
}

// ─── stack ────────────────────────────────────────────────────────────────────

/**
 * Pivot column labels into a level of the row index, producing a `Series`.
 *
 * Each `(row, column)` cell in `df` becomes one element of the output
 * `Series`.  Index labels take the form `"${rowLabel}${sep}${colName}"`.
 * Use {@link unstack} to reverse the operation.
 *
 * **Limitation**: Neither row-index labels nor column names may contain
 * `sep` (default `"|"`).  Choose a different separator if needed.
 *
 * @param df      - Source DataFrame.
 * @param options - {@link StackOptions}.
 * @returns       A `Series<Scalar>` with compound string index labels.
 *
 * @example
 * ```ts
 * import { DataFrame, stack, unstack } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { A: [1, 2], B: [3, 4] },
 *   { index: ["x", "y"] },
 * );
 * const s = stack(df);
 * s.index.values; // ["x|A", "x|B", "y|A", "y|B"]
 * s.values;       // [1, 3, 2, 4]
 * ```
 */
export function stack(df: DataFrame, options?: StackOptions): Series<Scalar> {
  const sep = options?.sep ?? STACK_DEFAULT_SEP;
  const dropna = options?.dropna ?? true;

  const labels: Label[] = [];
  const values: Scalar[] = [];
  const nRows = df.index.size;
  const colNames = df.columns.values;

  for (let ri = 0; ri < nRows; ri++) {
    const rowLabel = df.index.at(ri);
    for (const colName of colNames) {
      const val = df.col(colName).values[ri] ?? null;
      if (dropna && isMissing(val)) {
        continue;
      }
      labels.push(`${String(rowLabel)}${sep}${colName}`);
      values.push(val);
    }
  }

  return new Series<Scalar>({ data: values, index: new Index<Label>(labels) });
}

// ─── unstack ──────────────────────────────────────────────────────────────────

/**
 * Pivot a stacked `Series` back into a `DataFrame`.
 *
 * Parses compound index labels (produced by {@link stack}) to recover the
 * original `(rowLabel, colName) → value` grid.  Missing `(row, col)`
 * combinations are filled with `options.fill_value` (default `null`).
 *
 * @param series  - `Series` produced by {@link stack}.
 * @param options - {@link UnstackOptions}.
 * @returns       A `DataFrame` with the recovered row × column structure.
 *
 * @example
 * ```ts
 * import { DataFrame, stack, unstack } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { A: [1, 2], B: [3, 4] },
 *   { index: ["x", "y"] },
 * );
 * const recovered = unstack(stack(df, { dropna: false }));
 * recovered.toRecords(); // [{ A: 1, B: 3 }, { A: 2, B: 4 }]
 * ```
 */
export function unstack(series: Series<Scalar>, options?: UnstackOptions): DataFrame {
  const sep = options?.sep ?? STACK_DEFAULT_SEP;
  const fillValue: Scalar = options?.fill_value ?? null;

  if (series.index.size === 0) {
    return DataFrame.fromColumns({});
  }

  const rowParts: string[] = [];
  const colParts: string[] = [];

  for (let i = 0; i < series.index.size; i++) {
    const label = String(series.index.at(i));
    const [row, col] = splitLabel(label, sep);
    rowParts.push(row);
    colParts.push(col);
  }

  const uniqueRows = uniqueOrdered(rowParts);
  const uniqueCols = uniqueOrdered(colParts);
  const cellMap = buildCellMap(series, rowParts, colParts, sep);
  const outCols = buildOutputCols(uniqueRows, uniqueCols, cellMap, fillValue, sep);

  const rowIndex = new Index<Label>(uniqueRows);
  return DataFrame.fromColumns(outCols, { index: rowIndex });
}
