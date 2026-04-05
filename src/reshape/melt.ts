/**
 * melt — unpivot a DataFrame from wide to long format.
 *
 * Mirrors `pandas.melt` / `DataFrame.melt`:
 * - `id_vars`: column(s) to keep as identifier variables
 * - `value_vars`: column(s) to unpivot (default: all non-id columns)
 * - `var_name`: name for the variable column (default `"variable"`)
 * - `value_name`: name for the value column (default `"value"`)
 * - `ignore_index`: when `true`, reset to `RangeIndex` (default `true`)
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ A: ["a","b"], B: [1, 2], C: [3, 4] });
 * melt(df, { id_vars: ["A"] });
 * // A  variable  value
 * // a  B         1
 * // b  B         2
 * // a  C         3
 * // b  C         4
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options for {@link melt}. */
export interface MeltOptions {
  /**
   * Column name(s) to use as identifier variables.
   * These columns are repeated for each value variable.
   * Defaults to `[]`.
   */
  readonly id_vars?: readonly string[] | string;
  /**
   * Column name(s) to unpivot.
   * Defaults to all columns not in `id_vars`.
   */
  readonly value_vars?: readonly string[] | string;
  /**
   * Name for the new column that holds the former column names.
   * Defaults to `"variable"`.
   */
  readonly var_name?: string;
  /**
   * Name for the new column that holds the unpivoted values.
   * Defaults to `"value"`.
   */
  readonly value_name?: string;
  /**
   * When `true` (default), the result row index is reset to a `RangeIndex`.
   */
  readonly ignore_index?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Normalise a string or string-array option to a string[]. */
function toStringArray(x: readonly string[] | string | undefined): string[] {
  if (x === undefined) {
    return [];
  }
  if (typeof x === "string") {
    return [x];
  }
  return [...x];
}

/** Validate that all columns exist, throw RangeError otherwise. */
function requireColumns(df: DataFrame, cols: readonly string[], role: string): void {
  for (const col of cols) {
    if (!df.has(col)) {
      throw new RangeError(`${role} column "${col}" does not exist.`);
    }
  }
}

/** Resolve which columns are being unpivoted. */
function resolveValueVars(
  df: DataFrame,
  optValueVars: readonly string[] | string | undefined,
  idSet: ReadonlySet<string>,
): string[] {
  if (optValueVars !== undefined) {
    const valueVars = toStringArray(optValueVars);
    requireColumns(df, valueVars, "value_vars");
    return valueVars;
  }
  return df.columns.values.filter((c) => !idSet.has(c));
}

/** Build a record of empty arrays, one per id column. */
function initIdColData(idVars: readonly string[]): Record<string, Scalar[]> {
  const out: Record<string, Scalar[]> = {};
  for (const id of idVars) {
    out[id] = [];
  }
  return out;
}

/** Append one row's id-column values into the accumulator. */
function appendIdRow(
  df: DataFrame,
  idVars: readonly string[],
  idColData: Record<string, Scalar[]>,
  ri: number,
): void {
  for (const id of idVars) {
    const col = idColData[id];
    if (col !== undefined) {
      col.push(df.col(id).values[ri] ?? null);
    }
  }
}

// ─── melt ─────────────────────────────────────────────────────────────────────

/**
 * Unpivot a DataFrame from wide format to long format.
 *
 * @param df      - Source DataFrame.
 * @param options - Melt options.
 * @returns       A new long-format DataFrame.
 */
export function melt(df: DataFrame, options?: MeltOptions): DataFrame {
  const idVars = toStringArray(options?.id_vars);
  const varName = options?.var_name ?? "variable";
  const valueName = options?.value_name ?? "value";
  const ignoreIndex = options?.ignore_index ?? true;

  requireColumns(df, idVars, "id_vars");

  const idSet = new Set(idVars);
  const valueVars = resolveValueVars(df, options?.value_vars, idSet);

  const nRows = df.index.size;
  const totalRows = nRows * valueVars.length;

  const idColData = initIdColData(idVars);
  const varCol: Scalar[] = [];
  const valueCol: Scalar[] = [];
  const rowIndexLabels: Label[] = [];

  for (const colName of valueVars) {
    const valueSeries = df.col(colName);
    for (let ri = 0; ri < nRows; ri++) {
      appendIdRow(df, idVars, idColData, ri);
      varCol.push(colName);
      valueCol.push(valueSeries.values[ri] ?? null);
      rowIndexLabels.push(df.index.at(ri));
    }
  }

  const outCols: Record<string, readonly Scalar[]> = {};
  for (const id of idVars) {
    const col = idColData[id];
    if (col !== undefined) {
      outCols[id] = col;
    }
  }
  outCols[varName] = varCol;
  outCols[valueName] = valueCol;

  const rowIndex: Index<Label> =
    ignoreIndex || totalRows === 0
      ? (new RangeIndex(totalRows) as unknown as Index<Label>)
      : new Index<Label>(rowIndexLabels);

  return DataFrame.fromColumns(outCols, { index: rowIndex });
}
