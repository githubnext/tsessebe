/**
 * melt — unpivot a DataFrame from wide to long format.
 *
 * Mirrors `pandas.DataFrame.melt` / `pandas.melt`:
 *   - identifier columns remain as columns
 *   - "value" columns are gathered into two new columns: one holding the
 *     original column name and one holding the original value
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Options accepted by {@link melt}. */
export interface MeltOptions {
  /**
   * Column(s) to keep as identifier variables.
   * All other columns become value columns unless `value_vars` is given.
   * @default []
   */
  readonly id_vars?: readonly string[];
  /**
   * Column(s) to unpivot into the variable/value columns.
   * Defaults to all columns not in `id_vars`.
   */
  readonly value_vars?: readonly string[];
  /**
   * Name of the new column that holds the original column headers.
   * @default "variable"
   */
  readonly var_name?: string;
  /**
   * Name of the new column that holds the original cell values.
   * @default "value"
   */
  readonly value_name?: string;
}

// ─── melt ─────────────────────────────────────────────────────────────────────

/**
 * Unpivot a DataFrame from wide format to long format.
 *
 * Mirrors `pandas.DataFrame.melt`. The resulting DataFrame has:
 * - One row per `(original_row, value_column)` combination.
 * - The `id_vars` columns are repeated for every value column.
 * - A `var_name` column (default `"variable"`) holding original column names.
 * - A `value_name` column (default `"value"`) holding the original values.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ id: [1, 2], A: [10, 20], B: [30, 40] });
 *
 * const long = melt(df, { id_vars: ["id"] });
 * // id | variable | value
 * //  1 | A        | 10
 * //  1 | B        | 30
 * //  2 | A        | 20
 * //  2 | B        | 40
 * ```
 */
export function melt(df: DataFrame, options: MeltOptions = {}): DataFrame {
  const allCols = [...df.columns.values];
  const idVars: readonly string[] = options.id_vars ?? [];
  const valueVars: readonly string[] =
    options.value_vars ?? allCols.filter((c) => !idVars.includes(c));
  const varName = options.var_name ?? "variable";
  const valueName = options.value_name ?? "value";

  validateColumns(df, idVars, valueVars, varName, valueName);

  const idSeriesArr = idVars.map((col) => df.col(col));
  const valSeriesArr = valueVars.map((col) => df.col(col));
  const { idOutput, varOutput, valueOutput } = buildMeltOutputs(
    df.index.size,
    idVars,
    valueVars,
    idSeriesArr,
    valSeriesArr,
  );

  const resultData: Record<string, readonly Scalar[]> = {};
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

// ─── validation helper ────────────────────────────────────────────────────────

/** Output buffers from {@link buildMeltOutputs}. */
interface MeltOutputs {
  idOutput: Scalar[][];
  varOutput: Scalar[];
  valueOutput: Scalar[];
}

/** Build the three output column buffers for a melt operation. */
function buildMeltOutputs(
  nRows: number,
  idVars: readonly string[],
  valueVars: readonly string[],
  idSeriesArr: readonly Series<Scalar>[],
  valSeriesArr: readonly Series<Scalar>[],
): MeltOutputs {
  const idOutput: Scalar[][] = idVars.map(() => []);
  const varOutput: Scalar[] = [];
  const valueOutput: Scalar[] = [];
  for (let ri = 0; ri < nRows; ri++) {
    for (let ci = 0; ci < valueVars.length; ci++) {
      for (let ii = 0; ii < idVars.length; ii++) {
        (idOutput[ii] as Scalar[]).push(idSeriesArr[ii]?.values[ri] ?? null);
      }
      varOutput.push(valueVars[ci] ?? null);
      valueOutput.push(valSeriesArr[ci]?.values[ri] ?? null);
    }
  }
  return { idOutput, varOutput, valueOutput };
}

/** Validate column references and output name conflicts. */
function validateColumns(
  df: DataFrame,
  idVars: readonly string[],
  valueVars: readonly string[],
  varName: string,
  valueName: string,
): void {
  for (const col of idVars) {
    if (!df.columns.values.includes(col)) {
      throw new Error(`melt: id_vars column '${col}' not found in DataFrame`);
    }
  }
  for (const col of valueVars) {
    if (!df.columns.values.includes(col)) {
      throw new Error(`melt: value_vars column '${col}' not found in DataFrame`);
    }
  }
  if (varName === valueName) {
    throw new Error(`melt: var_name and value_name must differ (both are '${varName}')`);
  }
}
