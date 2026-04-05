/**
 * pivot — reshape a DataFrame using unique index/column pairs.
 *
 * Mirrors `pandas.DataFrame.pivot` and `pandas.pivot_table`:
 *
 * - **`pivot`**: simple reshape with no aggregation (requires unique index/column pairs)
 * - **`pivotTable`**: reshape with aggregation (like an Excel pivot table)
 *
 * @example
 * ```ts
 * // pivot — one value per (index, column) pair
 * const df = DataFrame.fromColumns({
 *   date:  ["2020-01-01","2020-01-01","2020-01-02","2020-01-02"],
 *   city:  ["NYC","LA","NYC","LA"],
 *   temp:  [50, 60, 55, 65],
 * });
 * pivot(df, { index: "date", columns: "city", values: "temp" });
 * // date        NYC  LA
 * // 2020-01-01  50   60
 * // 2020-01-02  55   65
 *
 * // pivotTable — aggregation across (index, column) combinations
 * pivotTable(df, { index: "date", columns: "city", values: "temp", aggfunc: "mean" });
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options for {@link pivot}. */
export interface PivotOptions {
  /**
   * Column to use as the new row index.
   * If omitted, the existing row index is used.
   */
  readonly index?: string;
  /**
   * Column whose unique values become the new column headers.
   */
  readonly columns: string;
  /**
   * Column(s) whose values fill the cells.
   * If a single string, the result has those column names directly.
   * If omitted, all remaining columns are used.
   */
  readonly values?: string | readonly string[];
}

/** Aggregation function name for {@link pivotTable}. */
export type AggFuncName = "mean" | "sum" | "min" | "max" | "count" | "first" | "last";

/** Options for {@link pivotTable}. */
export interface PivotTableOptions {
  /**
   * Column(s) to group by on the row axis.
   */
  readonly index: string | readonly string[];
  /**
   * Column(s) to group by on the column axis.
   */
  readonly columns: string | readonly string[];
  /**
   * Column(s) to aggregate.
   * Defaults to all remaining numeric columns.
   */
  readonly values?: string | readonly string[];
  /**
   * Aggregation function. Default `"mean"`.
   */
  readonly aggfunc?: AggFuncName;
  /**
   * Fill value for missing (NaN / null) cells. Default `null`.
   */
  readonly fill_value?: Scalar;
  /**
   * If `true`, drop all-NaN rows and columns from the result.
   * Default `false`.
   */
  readonly dropna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Normalise a string | string[] to string[]. */
function toArr(x: string | readonly string[]): string[] {
  return typeof x === "string" ? [x] : [...x];
}

/** Get a column value from a DataFrame by row position, safely. */
function getVal(df: DataFrame, col: string, ri: number): Scalar {
  return df.col(col).values[ri] ?? null;
}

/** Get all unique values from a column (preserving order of appearance). */
function uniqueValues(df: DataFrame, col: string): Scalar[] {
  const seen = new Map<string, Scalar>();
  for (const v of df.col(col).values) {
    const key = String(v);
    if (!seen.has(key)) {
      seen.set(key, v);
    }
  }
  return [...seen.values()];
}

/** Compute an aggregation over a numeric array. */
function aggregate(nums: number[], fn: AggFuncName): number {
  if (fn === "count") {
    return nums.length;
  }
  if (nums.length === 0) {
    return Number.NaN;
  }
  if (fn === "first") {
    return nums[0] as number;
  }
  if (fn === "last") {
    return nums.at(-1) as number;
  }
  if (fn === "min") {
    return Math.min(...nums);
  }
  if (fn === "max") {
    return Math.max(...nums);
  }
  if (fn === "sum") {
    return nums.reduce((s, v) => s + v, 0);
  }
  // mean
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

/** Fill a single cell in the pivot result, throwing on duplicates. */
function fillPivotCell(
  col: (Scalar | null)[],
  rowPos: number,
  value: Scalar,
  rowLabel: Scalar,
  pivotColVal: Scalar,
): void {
  if (col[rowPos] !== null) {
    throw new Error(
      `DataFrame.pivot: duplicate entry for row="${String(rowLabel)}", column="${String(pivotColVal)}"`,
    );
  }
  col[rowPos] = value;
}

/** Build composite string key from multiple columns for a given row. */
function makeKey(df: DataFrame, cols: readonly string[], ri: number): string {
  return cols.map((c) => String(getVal(df, c, ri))).join("\x00");
}

/** Collect unique keys from a key-generator function, preserving insertion order. */
function collectUniqueKeys(n: number, keyFn: (i: number) => string): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const k = keyFn(i);
    if (!seen.has(k)) {
      seen.add(k);
      order.push(k);
    }
  }
  return order;
}

/** Drop all-null rows and columns from accumulated output columns. */
function applyDropna(
  outColNames: string[],
  outCols: Record<string, Scalar[]>,
  rowIndexLabels: Label[],
): DataFrame {
  const colsToKeep = outColNames.filter((name) => outCols[name]?.some((v) => !isMissing(v)));
  const filteredCols: Record<string, Scalar[]> = {};
  for (const name of colsToKeep) {
    const col = outCols[name];
    if (col !== undefined) {
      filteredCols[name] = col;
    }
  }
  const rowsToKeep = rowIndexLabels.map((_, ri) =>
    colsToKeep.some((name) => !isMissing(filteredCols[name]?.[ri] ?? null)),
  );
  const keptLabels = rowIndexLabels.filter((_, ri) => rowsToKeep[ri]);
  const keptCols: Record<string, Scalar[]> = {};
  for (const name of colsToKeep) {
    const col = filteredCols[name];
    if (col !== undefined) {
      keptCols[name] = col.filter((_, ri) => rowsToKeep[ri]);
    }
  }
  return DataFrame.fromColumns(keptCols, { index: new Index<Label>(keptLabels as Label[]) });
}

// ─── pivot ────────────────────────────────────────────────────────────────────

/**
 * Reshape a DataFrame by pivoting on unique index/column pairs.
 *
 * @param df      - Source DataFrame.
 * @param options - Pivot options.
 * @returns       A reshaped DataFrame.
 */
export function pivot(df: DataFrame, options: PivotOptions): DataFrame {
  const { columns: colCol, index: idxCol, values: valuesCfg } = options;

  const rowLabels: Scalar[] =
    idxCol !== undefined ? uniqueValues(df, idxCol) : [...df.index.values];
  const rowLabelSet = new Map<string, number>();
  rowLabels.forEach((lbl, i) => rowLabelSet.set(String(lbl), i));

  const colHeaders = uniqueValues(df, colCol);

  let valuesCols: string[];
  if (valuesCfg !== undefined) {
    valuesCols = toArr(valuesCfg);
  } else {
    const exclude = new Set<string>([colCol, ...(idxCol !== undefined ? [idxCol] : [])]);
    valuesCols = df.columns.values.filter((c) => !exclude.has(c));
  }

  const isSingleValue = valuesCols.length === 1;
  const resultCols = new Map<string, (Scalar | null)[]>();

  // Outer: valuesCols, inner: colHeaders — matches pandas MultiIndex column ordering
  for (const valCol of valuesCols) {
    for (const colHdr of colHeaders) {
      const name = isSingleValue ? String(colHdr) : `${valCol}_${String(colHdr)}`;
      resultCols.set(name, new Array<Scalar | null>(rowLabels.length).fill(null));
    }
  }

  fillPivotCells(df, colCol, idxCol, rowLabelSet, valuesCols, isSingleValue, resultCols);

  const outCols: Record<string, readonly Scalar[]> = {};
  for (const [name, arr] of resultCols) {
    outCols[name] = arr;
  }
  return DataFrame.fromColumns(outCols, { index: new Index<Label>(rowLabels as Label[]) });
}

/** Fill all cells in the pivot result map. */
function fillPivotCells(
  df: DataFrame,
  colCol: string,
  idxCol: string | undefined,
  rowLabelSet: Map<string, number>,
  valuesCols: string[],
  isSingleValue: boolean,
  resultCols: Map<string, (Scalar | null)[]>,
): void {
  const nSrcRows = df.index.size;
  for (let ri = 0; ri < nSrcRows; ri++) {
    const pivotColVal = getVal(df, colCol, ri);
    const rowLabel = idxCol !== undefined ? getVal(df, idxCol, ri) : df.index.at(ri);
    const rowPos = rowLabelSet.get(String(rowLabel));
    if (rowPos === undefined) {
      continue;
    }
    for (const valCol of valuesCols) {
      const resultColName = isSingleValue
        ? String(pivotColVal)
        : `${valCol}_${String(pivotColVal)}`;
      const col = resultCols.get(resultColName);
      if (col !== undefined) {
        fillPivotCell(col, rowPos, getVal(df, valCol, ri), rowLabel, pivotColVal);
      }
    }
  }
}

// ─── pivotTable ───────────────────────────────────────────────────────────────

/**
 * Create a pivot table with aggregation.
 *
 * @param df      - Source DataFrame.
 * @param options - PivotTable options.
 * @returns       A new aggregated pivot DataFrame.
 */
export function pivotTable(df: DataFrame, options: PivotTableOptions): DataFrame {
  const aggfunc: AggFuncName = options.aggfunc ?? "mean";
  const fillValue: Scalar = options.fill_value ?? null;
  const dropna: boolean = options.dropna ?? false;

  const idxCols = toArr(options.index);
  const colCols = toArr(options.columns);

  for (const c of [...idxCols, ...colCols]) {
    if (!df.has(c)) {
      throw new RangeError(`Column "${c}" does not exist.`);
    }
  }

  const valuesCols = resolveValuesCols(df, options.values, idxCols, colCols);
  const { rowKeyOrder, colKeyOrder, groups } = buildGroups(df, idxCols, colCols, valuesCols);
  return assembleResult(rowKeyOrder, colKeyOrder, valuesCols, groups, aggfunc, fillValue, dropna);
}

/** Determine which columns to aggregate. */
function resolveValuesCols(
  df: DataFrame,
  optValues: PivotTableOptions["values"],
  idxCols: string[],
  colCols: string[],
): string[] {
  if (optValues !== undefined) {
    const valuesCols = toArr(optValues);
    for (const c of valuesCols) {
      if (!df.has(c)) {
        throw new RangeError(`values column "${c}" does not exist.`);
      }
    }
    return valuesCols;
  }
  const exclude = new Set<string>([...idxCols, ...colCols]);
  return df.columns.values.filter((c) => !exclude.has(c));
}

/** Collect unique row/col keys and group values. */
function buildGroups(
  df: DataFrame,
  idxCols: string[],
  colCols: string[],
  valuesCols: string[],
): { rowKeyOrder: string[]; colKeyOrder: string[]; groups: Map<string, number[]> } {
  const nSrcRows = df.index.size;
  const rowKeyFn = (ri: number): string => makeKey(df, idxCols, ri);
  const colKeyFn = (ri: number): string => makeKey(df, colCols, ri);

  const rowKeyOrder = collectUniqueKeys(nSrcRows, rowKeyFn);
  const colKeyOrder = collectUniqueKeys(nSrcRows, colKeyFn);

  const groups = new Map<string, number[]>();
  for (let ri = 0; ri < nSrcRows; ri++) {
    const rk = rowKeyFn(ri);
    const ck = colKeyFn(ri);
    for (const valCol of valuesCols) {
      const cell = `${rk}\x01${ck}\x01${valCol}`;
      let bucket = groups.get(cell);
      if (bucket === undefined) {
        bucket = [];
        groups.set(cell, bucket);
      }
      const v = getVal(df, valCol, ri);
      if (!isMissing(v) && typeof v === "number") {
        bucket.push(v);
      }
    }
  }
  return { rowKeyOrder, colKeyOrder, groups };
}

/** Build the output column names for a pivot table. */
function buildOutColNames(
  colKeyOrder: string[],
  valuesCols: string[],
  isSingleValue: boolean,
): string[] {
  const names: string[] = [];
  for (const ck of colKeyOrder) {
    for (const valCol of valuesCols) {
      names.push(isSingleValue ? ck : `${valCol}_${ck}`);
    }
  }
  return names;
}

/** Fill one row of output columns from aggregated groups. */
function fillOutRow(
  rk: string,
  colKeyOrder: string[],
  valuesCols: string[],
  isSingleValue: boolean,
  groups: Map<string, number[]>,
  aggfunc: AggFuncName,
  fillValue: Scalar,
  outCols: Record<string, Scalar[]>,
): void {
  for (const ck of colKeyOrder) {
    for (const valCol of valuesCols) {
      const outName = isSingleValue ? ck : `${valCol}_${ck}`;
      const cell = `${rk}\x01${ck}\x01${valCol}`;
      const bucket = groups.get(cell);
      let cellVal: Scalar;
      if (bucket === undefined || bucket.length === 0) {
        cellVal = aggfunc === "count" ? 0 : fillValue;
      } else {
        cellVal = aggregate(bucket, aggfunc);
      }
      outCols[outName]?.push(cellVal);
    }
  }
}

/** Assemble the final DataFrame from groups. */
function assembleResult(
  rowKeyOrder: string[],
  colKeyOrder: string[],
  valuesCols: string[],
  groups: Map<string, number[]>,
  aggfunc: AggFuncName,
  fillValue: Scalar,
  dropna: boolean,
): DataFrame {
  const isSingleValue = valuesCols.length === 1;
  const outColNames = buildOutColNames(colKeyOrder, valuesCols, isSingleValue);

  const outCols: Record<string, Scalar[]> = {};
  for (const name of outColNames) {
    outCols[name] = [];
  }

  for (const rk of rowKeyOrder) {
    fillOutRow(rk, colKeyOrder, valuesCols, isSingleValue, groups, aggfunc, fillValue, outCols);
  }

  const rowIndexLabels: Label[] = rowKeyOrder.map((rk) => {
    const parts = rk.split("\x00");
    return parts.length === 1 ? ((parts[0] ?? null) as Label) : (parts.join(", ") as Label);
  });

  if (dropna) {
    return applyDropna(outColNames, outCols, rowIndexLabels);
  }
  return DataFrame.fromColumns(outCols, { index: new Index<Label>(rowIndexLabels as Label[]) });
}
