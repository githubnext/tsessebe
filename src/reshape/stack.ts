/**
 * stack / unstack — convert between wide and long DataFrame layouts.
 *
 * These are simplified versions of `pandas.DataFrame.stack` /
 * `pandas.DataFrame.unstack`. Because tsb does not yet support MultiIndex,
 * the output encodes the two index levels as separate columns rather than a
 * hierarchical index.
 *
 * - `stack(df, options)`: wide → long. Collapses all (or selected) columns
 *   into two new columns — one holding the original column name, one holding
 *   the value. The original row-index values are stored in a third column.
 *
 * - `unstack(df, options)`: long → wide. The inverse of `stack`. Takes the
 *   three "stacked" columns and pivots them back into a wide DataFrame.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── stack ────────────────────────────────────────────────────────────────────

/** Options for {@link stack}. */
export interface StackOptions {
  /**
   * Subset of columns to stack. All other columns are treated as identifier
   * columns (kept in their current orientation).
   * @default all columns
   */
  readonly value_vars?: readonly string[];
  /**
   * Name of the output column that holds the stacked column labels.
   * @default "variable"
   */
  readonly var_name?: string;
  /**
   * Name of the output column that holds the stacked values.
   * @default "value"
   */
  readonly value_name?: string;
  /**
   * Name of the output column that holds the original row-index values.
   * @default "_index"
   */
  readonly index_name?: string;
}

/**
 * Convert a wide DataFrame to a long (stacked) format.
 *
 * Mirrors a simplified `pandas.DataFrame.stack`. Because tsb does not yet
 * support MultiIndex, the row-index values are stored in the `index_name`
 * column (default `"_index"`) rather than becoming a second index level.
 *
 * The resulting DataFrame has one row per `(original_row, column)` pair.
 * It always uses a default `RangeIndex`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns(
 *   { A: [1, 2], B: [3, 4] },
 *   { index: new Index(["x", "y"]) },
 * );
 * const long = stack(df);
 * // _index | variable | value
 * //      x |        A |     1
 * //      x |        B |     3
 * //      y |        A |     2
 * //      y |        B |     4
 * ```
 */
export function stack(df: DataFrame, options: StackOptions = {}): DataFrame {
  const allCols = [...df.columns.values];
  const valueVars: readonly string[] = options.value_vars ?? allCols;
  const varName = options.var_name ?? "variable";
  const valueName = options.value_name ?? "value";
  const indexName = options.index_name ?? "_index";

  validateStackColumns(df, valueVars);

  const idVars = allCols.filter((c) => !valueVars.includes(c));
  const idSeriesArr = idVars.map((col) => df.col(col));
  const valSeriesArr = valueVars.map((col) => df.col(col));

  const { indexOutput, idOutput, varOutput, valueOutput } = buildStackOutputs(
    df,
    idVars,
    valueVars,
    idSeriesArr,
    valSeriesArr,
  );

  return assembleStackResult(
    indexName,
    idVars,
    varName,
    valueName,
    indexOutput,
    idOutput,
    varOutput,
    valueOutput,
  );
}

// ─── unstack ──────────────────────────────────────────────────────────────────

/** Options for {@link unstack}. */
export interface UnstackOptions {
  /**
   * Column that holds the row-index values in the stacked DataFrame.
   * @default "_index"
   */
  readonly index_col?: string;
  /**
   * Column that holds the original column names (the "variable" column).
   * @default "variable"
   */
  readonly var_col?: string;
  /**
   * Column that holds the values.
   * @default "value"
   */
  readonly value_col?: string;
  /**
   * Scalar to use for missing cells in the reconstructed wide DataFrame.
   * @default null
   */
  readonly fill_value?: Scalar;
}

/**
 * Convert a long (stacked) DataFrame back to wide format.
 *
 * The inverse of {@link stack}. Reads the `index_col`, `var_col`, and
 * `value_col` columns from `df` and produces a wide DataFrame indexed by the
 * unique values of `index_col`, with one column per unique value of `var_col`.
 *
 * This is equivalent to calling `pivot(df, { index: index_col, columns:
 * var_col, values: value_col })` with an optional fill-value step.
 *
 * @example
 * ```ts
 * const long = stack(df);
 * const wide = unstack(long); // identical to the original df (same data, RangeIndex)
 * ```
 */
export function unstack(df: DataFrame, options: UnstackOptions = {}): DataFrame {
  const indexCol = options.index_col ?? "_index";
  const varCol = options.var_col ?? "variable";
  const valueCol = options.value_col ?? "value";
  const fillValue = options.fill_value !== undefined ? options.fill_value : null;

  const idxSeries = df.col(indexCol);
  const varSeries = df.col(varCol);
  const valSeries = df.col(valueCol);

  const uniqueIdxVals = uniqueLabels(idxSeries.values);
  const uniqueVarVals = uniqueLabels(varSeries.values);

  // Build cell map: (idxLabel, varLabel) -> value
  const n = idxSeries.values.length;
  const cellMap = new Map<string, Scalar>();
  for (let i = 0; i < n; i++) {
    const ik = JSON.stringify((idxSeries.values[i] ?? null) as Label);
    const vk = JSON.stringify((varSeries.values[i] ?? null) as Label);
    cellMap.set(`${ik}\x00${vk}`, valSeries.values[i] ?? null);
  }

  const resultData: Record<string, readonly Scalar[]> = {};
  for (const varVal of uniqueVarVals) {
    const colName = String(varVal);
    const vk = JSON.stringify(varVal);
    resultData[colName] = uniqueIdxVals.map((idxVal) => {
      const ik = JSON.stringify(idxVal);
      return cellMap.get(`${ik}\x00${vk}`) ?? fillValue;
    });
  }

  return DataFrame.fromColumns(resultData, { index: new Index<Label>(uniqueIdxVals) });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Collect unique values in appearance order, coerced to Label. */
function uniqueLabels(vals: readonly Scalar[]): Label[] {
  const seen = new Set<string>();
  const result: Label[] = [];
  for (const v of vals) {
    const lbl = v as Label;
    const k = JSON.stringify(lbl);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(lbl);
    }
  }
  return result;
}

/** Validate that stack columns exist in the DataFrame. */
function validateStackColumns(df: DataFrame, valueVars: readonly string[]): void {
  for (const col of valueVars) {
    if (!df.columns.values.includes(col)) {
      throw new Error(`stack: column '${col}' not found in DataFrame`);
    }
  }
}

/** Output buffers from {@link buildStackOutputs}. */
interface StackOutputs {
  indexOutput: Scalar[];
  idOutput: Scalar[][];
  varOutput: Scalar[];
  valueOutput: Scalar[];
}

/** Build output buffers for the stack operation. */
function buildStackOutputs(
  df: DataFrame,
  idVars: readonly string[],
  valueVars: readonly string[],
  idSeriesArr: readonly Series<Scalar>[],
  valSeriesArr: readonly Series<Scalar>[],
): StackOutputs {
  const nRows = df.index.size;
  const indexOutput: Scalar[] = [];
  const idOutput: Scalar[][] = idVars.map(() => []);
  const varOutput: Scalar[] = [];
  const valueOutput: Scalar[] = [];
  for (let ri = 0; ri < nRows; ri++) {
    const rowLabel = df.index.values[ri] ?? null;
    for (let ci = 0; ci < valueVars.length; ci++) {
      indexOutput.push(rowLabel);
      for (let ii = 0; ii < idVars.length; ii++) {
        (idOutput[ii] as Scalar[]).push(idSeriesArr[ii]?.values[ri] ?? null);
      }
      varOutput.push(valueVars[ci] ?? null);
      valueOutput.push(valSeriesArr[ci]?.values[ri] ?? null);
    }
  }
  return { indexOutput, idOutput, varOutput, valueOutput };
}

/** Assemble the result DataFrame from stack output buffers. */
function assembleStackResult(
  indexName: string,
  idVars: readonly string[],
  varName: string,
  valueName: string,
  indexOutput: readonly Scalar[],
  idOutput: readonly (readonly Scalar[])[],
  varOutput: readonly Scalar[],
  valueOutput: readonly Scalar[],
): DataFrame {
  const resultData: Record<string, readonly Scalar[]> = {};
  resultData[indexName] = indexOutput;
  for (let ii = 0; ii < idVars.length; ii++) {
    const col = idVars[ii];
    if (col !== undefined) {
      resultData[col] = idOutput[ii] ?? [];
    }
  }
  resultData[varName] = varOutput;
  resultData[valueName] = valueOutput;
  return DataFrame.fromColumns(resultData);
}
