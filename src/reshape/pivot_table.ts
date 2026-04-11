/**
 * pivot_table — enhanced pivot table with margins (row/column totals).
 *
 * Mirrors `pandas.pivot_table()` with full margins support:
 * - All aggregation functions: mean, sum, min, max, count, first, last
 * - `margins=true` adds an "All" row and "All" column with marginal aggregates
 * - `margins_name` customises the All label (default `"All"`)
 * - `sort=true` sorts row and column labels lexicographically (default `true`)
 * - `fill_value` replaces empty cells
 * - `dropna` skips rows whose column-group key is all-NaN
 *
 * @example
 * ```ts
 * import { DataFrame, pivotTableFull } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   A: ["foo","foo","foo","bar","bar","bar"],
 *   B: ["one","one","two","two","one","one"],
 *   C: ["small","large","large","small","small","large"],
 *   D: [1, 2, 2, 3, 3, 4],
 * });
 *
 * pivotTableFull(df, { index: "A", columns: "C", values: "D",
 *                       aggfunc: "sum", margins: true });
 * // C     large  small  All
 * // A
 * // bar   4      3      7
 * // foo   4      1      5
 * // All   8      4      12
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public API types ─────────────────────────────────────────────────────────

/** Aggregation function for {@link pivotTableFull}. */
export type PivotAggFunc = "mean" | "sum" | "min" | "max" | "count" | "first" | "last";

/** Options for {@link pivotTableFull}. */
export interface PivotTableFullOptions {
  /** Column(s) to use as row index. */
  readonly index: string | readonly string[];
  /** Column(s) to use as column headers. */
  readonly columns: string | readonly string[];
  /** Column(s) to aggregate. Defaults to all remaining columns. */
  readonly values?: string | readonly string[];
  /** Aggregation function. Default `"mean"`. */
  readonly aggfunc?: PivotAggFunc;
  /** Fill value for empty cells. Default `null`. */
  readonly fill_value?: Scalar;
  /** Skip rows with no non-null values. Default `false`. */
  readonly dropna?: boolean;
  /** Add row and column totals. Default `false`. */
  readonly margins?: boolean;
  /** Label for the margins row/column. Default `"All"`. */
  readonly margins_name?: string;
  /** Sort row and column labels lexicographically. Default `true`. */
  readonly sort?: boolean;
}

// ─── internal sentinel ────────────────────────────────────────────────────────

/** Internal key used to represent the margins (All) group. */
// biome-ignore lint/nursery/noSecrets: not a secret — composite delimiter for internal keying
const MARGIN_SENTINEL = "\x02\x03MARGIN\x03\x02";

// ─── utility helpers ──────────────────────────────────────────────────────────

/** Coerce string-or-array to string[]. */
function toArr(v: string | readonly string[]): string[] {
  return typeof v === "string" ? [v] : [...v];
}

/** True when a Scalar is missing (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Read a single cell from a DataFrame column. */
function readCell(df: DataFrame, col: string, ri: number): Scalar {
  return (df.col(col).values as readonly Scalar[])[ri] ?? null;
}

/** Build a composite row/column key from one or more column values. */
function makeKey(df: DataFrame, cols: string[], ri: number): string {
  return cols.map((c) => String(readCell(df, c, ri))).join("\x00");
}

/** Convert a composite key to a display label. */
function keyLabel(key: string): Label {
  const parts = key.split("\x00");
  return (parts.length === 1 ? parts[0] : parts.join(", ")) as Label;
}

/** Push a number into a map-of-arrays, creating the bucket when absent. */
function push(groups: Map<string, number[]>, key: string, v: number): void {
  let b = groups.get(key);
  if (b === undefined) {
    b = [];
    groups.set(key, b);
  }
  b.push(v);
}

/** Append to an array only when the item is not already present. */
function pushUnique(arr: string[], item: string): void {
  if (!arr.includes(item)) {
    arr.push(item);
  }
}

// ─── aggregation ──────────────────────────────────────────────────────────────

/** Reduce a non-empty numeric array with the given aggregation function. */
function applyAggFunc(nums: number[], fn: PivotAggFunc): number {
  if (fn === "count") {
    return nums.length;
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
  const total = nums.reduce((a, b) => a + b, 0);
  if (fn === "sum") {
    return total;
  }
  return total / nums.length; // mean
}

/** Aggregate the bucket for a cell key, or return fill value when empty. */
function aggregateCell(
  groups: Map<string, number[]>,
  cellKey: string,
  fn: PivotAggFunc,
  fillValue: Scalar,
): Scalar {
  const bucket = groups.get(cellKey);
  if (bucket === undefined || bucket.length === 0) {
    return fn === "count" ? 0 : fillValue;
  }
  return applyAggFunc(bucket, fn);
}

// ─── group collection ─────────────────────────────────────────────────────────

/** Collect the observation at (rk, ck, valCol) into all relevant buckets. */
function collectObservation(
  groups: Map<string, number[]>,
  rk: string,
  ck: string,
  valCol: string,
  v: number,
  withMargins: boolean,
): void {
  push(groups, `${rk}\x01${ck}\x01${valCol}`, v);
  if (withMargins) {
    push(groups, `${rk}\x01${MARGIN_SENTINEL}\x01${valCol}`, v);
    push(groups, `${MARGIN_SENTINEL}\x01${ck}\x01${valCol}`, v);
    push(groups, `${MARGIN_SENTINEL}\x01${MARGIN_SENTINEL}\x01${valCol}`, v);
  }
}

interface GroupsData {
  readonly rowKeys: string[];
  readonly colKeys: string[];
  readonly groups: Map<string, number[]>;
}

/** Scan the DataFrame and populate all group buckets. */
function collectGroups(
  df: DataFrame,
  idxCols: string[],
  colCols: string[],
  valuesCols: string[],
  withMargins: boolean,
): GroupsData {
  const nRows = df.index.size;
  const rowKeys: string[] = [];
  const colKeys: string[] = [];
  const groups: Map<string, number[]> = new Map();

  for (let ri = 0; ri < nRows; ri++) {
    const rk = makeKey(df, idxCols, ri);
    const ck = makeKey(df, colCols, ri);
    pushUnique(rowKeys, rk);
    pushUnique(colKeys, ck);
    for (const valCol of valuesCols) {
      const v = readCell(df, valCol, ri);
      if (!isMissing(v) && typeof v === "number") {
        collectObservation(groups, rk, ck, valCol, v, withMargins);
      }
    }
  }

  return { rowKeys, colKeys, groups };
}

// ─── result construction ──────────────────────────────────────────────────────

/** Build the ordered list of output column names. */
function buildColumnNames(
  colKeys: string[],
  valuesCols: string[],
  isSingle: boolean,
  withMargins: boolean,
  marginsName: string,
): string[] {
  const keys = withMargins ? [...colKeys, MARGIN_SENTINEL] : colKeys;
  const names: string[] = [];
  for (const ck of keys) {
    const label = ck === MARGIN_SENTINEL ? marginsName : ck;
    for (const vc of valuesCols) {
      names.push(isSingle ? label : `${vc}_${label}`);
    }
  }
  return names;
}

/** Compute one data row for a given row key. */
function computeRow(
  rk: string,
  colKeys: string[],
  valuesCols: string[],
  isSingle: boolean,
  groups: Map<string, number[]>,
  fn: PivotAggFunc,
  fillValue: Scalar,
  withMargins: boolean,
  marginsName: string,
): Record<string, Scalar> {
  const keys = withMargins ? [...colKeys, MARGIN_SENTINEL] : colKeys;
  const row: Record<string, Scalar> = {};
  for (const ck of keys) {
    const label = ck === MARGIN_SENTINEL ? marginsName : ck;
    for (const vc of valuesCols) {
      const colName = isSingle ? label : `${vc}_${label}`;
      row[colName] = aggregateCell(groups, `${rk}\x01${ck}\x01${vc}`, fn, fillValue);
    }
  }
  return row;
}

/** Check whether every value in a row record is missing. */
function rowIsAllMissing(row: Record<string, Scalar>): boolean {
  return Object.values(row).every((v) => isMissing(v));
}

interface AssembleOptions {
  readonly rowKeys: string[];
  readonly colKeys: string[];
  readonly valuesCols: string[];
  readonly groups: Map<string, number[]>;
  readonly fn: PivotAggFunc;
  readonly fillValue: Scalar;
  readonly dropna: boolean;
  readonly withMargins: boolean;
  readonly marginsName: string;
  readonly sort: boolean;
}

/** Build the output DataFrame from aggregated groups. */
function assembleDataFrame(opts: AssembleOptions): DataFrame {
  const orderedRows = opts.sort ? [...opts.rowKeys].sort() : opts.rowKeys;
  const orderedCols = opts.sort ? [...opts.colKeys].sort() : opts.colKeys;
  const isSingle = opts.valuesCols.length === 1;

  const colNames = buildColumnNames(
    orderedCols,
    opts.valuesCols,
    isSingle,
    opts.withMargins,
    opts.marginsName,
  );

  const dataRows: Record<string, Scalar>[] = [];
  const rowLabels: Label[] = [];

  const allRowKeys = opts.withMargins ? [...orderedRows, MARGIN_SENTINEL] : orderedRows;
  for (const rk of allRowKeys) {
    const row = computeRow(
      rk,
      orderedCols,
      opts.valuesCols,
      isSingle,
      opts.groups,
      opts.fn,
      opts.fillValue,
      opts.withMargins,
      opts.marginsName,
    );
    if (opts.dropna && rk !== MARGIN_SENTINEL && rowIsAllMissing(row)) {
      continue;
    }
    dataRows.push(row);
    rowLabels.push(rk === MARGIN_SENTINEL ? (opts.marginsName as Label) : keyLabel(rk));
  }

  const outCols: Record<string, readonly Scalar[]> = {};
  for (const name of colNames) {
    outCols[name] = dataRows.map((r) => r[name] ?? null);
  }

  return DataFrame.fromColumns(outCols, { index: new Index<Label>(rowLabels) });
}

// ─── values resolution ────────────────────────────────────────────────────────

/** Determine which columns to aggregate (explicit or all non-index/column cols). */
function resolveValues(
  df: DataFrame,
  optValues: PivotTableFullOptions["values"],
  idxCols: string[],
  colCols: string[],
): string[] {
  if (optValues !== undefined) {
    const cols = toArr(optValues);
    for (const c of cols) {
      if (!df.has(c)) {
        throw new RangeError(`values column "${c}" does not exist.`);
      }
    }
    return cols;
  }
  const exclude = new Set<string>([...idxCols, ...colCols]);
  return df.columns.values.filter((c) => !exclude.has(c));
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Create a pivot table with optional row/column margin totals.
 *
 * Mirrors `pandas.pivot_table()` — an enhanced version of {@link pivotTable}
 * that adds `margins`, `margins_name`, and `sort` options.
 *
 * @param df      - Source DataFrame.
 * @param options - Pivot table options.
 * @returns         Aggregated pivot DataFrame, with optional All row/column.
 *
 * @example
 * ```ts
 * import { DataFrame, pivotTableFull } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   A: ["foo","foo","foo","bar","bar","bar"],
 *   C: ["small","large","large","small","small","large"],
 *   D: [1, 2, 2, 3, 3, 4],
 * });
 *
 * pivotTableFull(df, { index: "A", columns: "C", values: "D",
 *                       aggfunc: "sum", margins: true });
 * // rows: foo, bar, All
 * // cols: large, small, All
 * ```
 */
export function pivotTableFull(df: DataFrame, options: PivotTableFullOptions): DataFrame {
  const idxCols = toArr(options.index);
  const colCols = toArr(options.columns);

  for (const c of [...idxCols, ...colCols]) {
    if (!df.has(c)) {
      throw new RangeError(`Column "${c}" does not exist.`);
    }
  }

  const valuesCols = resolveValues(df, options.values, idxCols, colCols);
  const withMargins = options.margins === true;

  const { rowKeys, colKeys, groups } = collectGroups(df, idxCols, colCols, valuesCols, withMargins);

  return assembleDataFrame({
    rowKeys,
    colKeys,
    valuesCols,
    groups,
    fn: options.aggfunc ?? "mean",
    fillValue: options.fill_value ?? null,
    dropna: options.dropna === true,
    withMargins,
    marginsName: options.margins_name ?? "All",
    sort: options.sort !== false,
  });
}
