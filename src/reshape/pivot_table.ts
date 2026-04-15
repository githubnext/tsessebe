/**
 * pivot_table — full pivot table with margins (grand totals) support.
 *
 * Extends `pivotTable` from `pivot.ts` with:
 * - **`margins`**: add a grand-total row and column (default `false`)
 * - **`margins_name`**: label for the grand-total row/column (default `"All"`)
 * - **`sort`**: sort row and column labels alphabetically (default `true`)
 *
 * Mirrors `pandas.pivot_table`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   region: ["North","North","South","South"],
 *   product: ["A","B","A","B"],
 *   sales:   [100, 200, 150, 250],
 * });
 * pivotTableFull(df, {
 *   index:   "region",
 *   columns: "product",
 *   values:  "sales",
 *   aggfunc: "sum",
 *   margins: true,
 * });
 * //          A    B    All
 * // North   100  200  300
 * // South   150  250  400
 * // All     250  450  700
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";
import type { AggFuncName, PivotTableOptions } from "./pivot.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/**
 * Options for {@link pivotTableFull}.
 *
 * Extends {@link PivotTableOptions} with margins, margins_name, and sort.
 */
export interface PivotTableFullOptions extends PivotTableOptions {
  /**
   * If `true`, add a grand-total row and column to the result.
   * The totals are computed by applying `aggfunc` over all raw values
   * (not over already-aggregated cell values).
   * Default `false`.
   */
  readonly margins?: boolean;
  /**
   * Label for the grand-total row and column when `margins` is `true`.
   * Default `"All"`.
   */
  readonly margins_name?: string;
  /**
   * Sort row and column labels alphabetically before assembling the result.
   * Default `true`.
   */
  readonly sort?: boolean;
}

// ─── private helpers ──────────────────────────────────────────────────────────

/** True when a scalar is missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Normalise a string | string[] to string[]. */
function toArr(x: string | readonly string[]): string[] {
  return typeof x === "string" ? [x] : [...x];
}

/** Read a scalar from a DataFrame column by row position. */
function getVal(df: DataFrame, col: string, ri: number): Scalar {
  return df.col(col).values[ri] ?? null;
}

/** Build a composite key from multiple columns at a given row position. */
function makeKey(df: DataFrame, cols: readonly string[], ri: number): string {
  return cols.map((c) => String(getVal(df, c, ri))).join("\x00");
}

/** Collect unique keys in insertion order from a key-generation function. */
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

/** Resolve which value columns to aggregate. */
function resolveValuesCols(
  df: DataFrame,
  optValues: PivotTableOptions["values"],
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

/** Compute an aggregation over an array of raw numeric values. */
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

/**
 * Bucket key for a (rowKey, colKey, valueCol) triple.
 * Uses \x01 as separator (different from \x00 used inside multi-col keys).
 */
function bucketKey(rk: string, ck: string, valCol: string): string {
  return `${rk}\x01${ck}\x01${valCol}`;
}

/** Build all raw-value buckets for the pivot table. */
function buildBuckets(
  df: DataFrame,
  idxCols: string[],
  colCols: string[],
  valuesCols: string[],
): {
  rowKeyOrder: string[];
  colKeyOrder: string[];
  buckets: Map<string, number[]>;
} {
  const n = df.index.size;
  const rowKeyFn = (ri: number): string => makeKey(df, idxCols, ri);
  const colKeyFn = (ri: number): string => makeKey(df, colCols, ri);

  const rowKeyOrder = collectUniqueKeys(n, rowKeyFn);
  const colKeyOrder = collectUniqueKeys(n, colKeyFn);

  const buckets = new Map<string, number[]>();

  for (let ri = 0; ri < n; ri++) {
    const rk = rowKeyFn(ri);
    const ck = colKeyFn(ri);
    for (const valCol of valuesCols) {
      const key = bucketKey(rk, ck, valCol);
      let bucket = buckets.get(key);
      if (bucket === undefined) {
        bucket = [];
        buckets.set(key, bucket);
      }
      const v = getVal(df, valCol, ri);
      if (!isMissing(v) && typeof v === "number") {
        bucket.push(v);
      }
    }
  }

  return { rowKeyOrder, colKeyOrder, buckets };
}

/** Compute the aggregated cell value, applying fill_value when empty. */
function cellValue(
  rk: string,
  ck: string,
  valCol: string,
  buckets: Map<string, number[]>,
  aggfunc: AggFuncName,
  fillValue: Scalar,
): Scalar {
  const bucket = buckets.get(bucketKey(rk, ck, valCol));
  if (bucket === undefined || bucket.length === 0) {
    return aggfunc === "count" ? 0 : fillValue;
  }
  return aggregate(bucket, aggfunc);
}

/** Compute the margin value for a (merged-key, valCol) pair by concatenating buckets. */
function marginValue(
  keys: string[],
  fixedKey: string,
  valCol: string,
  buckets: Map<string, number[]>,
  fixedIsRow: boolean,
  aggfunc: AggFuncName,
  fillValue: Scalar,
): Scalar {
  const combined: number[] = [];
  for (const k of keys) {
    const bkey = fixedIsRow ? bucketKey(fixedKey, k, valCol) : bucketKey(k, fixedKey, valCol);
    const bucket = buckets.get(bkey);
    if (bucket) {
      combined.push(...bucket);
    }
  }
  if (combined.length === 0) {
    return aggfunc === "count" ? 0 : fillValue;
  }
  return aggregate(combined, aggfunc);
}

/** Convert a composite row key to a display Label. */
function rowKeyToLabel(rk: string): Label {
  const parts = rk.split("\x00");
  // parts[0] is string | undefined; ?? null gives string | null, a subset of Label
  const single = parts[0] ?? null;
  return parts.length === 1 ? single : parts.join(", ");
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Create a full pivot table with optional grand-total margins.
 *
 * Mirrors `pandas.pivot_table` / `pandas.DataFrame.pivot_table`.
 *
 * @param df      - Source DataFrame.
 * @param options - Full pivot table options.
 * @returns       A new aggregated DataFrame.
 */
export function pivotTableFull(df: DataFrame, options: PivotTableFullOptions): DataFrame {
  const aggfunc: AggFuncName = options.aggfunc ?? "mean";
  const fillValue: Scalar = options.fill_value ?? null;
  const dropna: boolean = options.dropna ?? false;
  const margins: boolean = options.margins ?? false;
  const marginsName: string = options.margins_name ?? "All";
  const sort: boolean = options.sort ?? true;

  const idxCols = toArr(options.index);
  const colCols = toArr(options.columns);

  for (const c of [...idxCols, ...colCols]) {
    if (!df.has(c)) {
      throw new RangeError(`Column "${c}" does not exist.`);
    }
  }

  const valuesCols = resolveValuesCols(df, options.values, idxCols, colCols);
  const { rowKeyOrder, colKeyOrder, buckets } = buildBuckets(df, idxCols, colCols, valuesCols);

  // Optionally sort row and column keys
  const finalRowOrder = sort ? [...rowKeyOrder].sort() : rowKeyOrder;
  const finalColOrder = sort ? [...colKeyOrder].sort() : colKeyOrder;

  const isSingleValue = valuesCols.length === 1;

  // Build output column name list
  const outColNames: string[] = [];
  for (const ck of finalColOrder) {
    for (const valCol of valuesCols) {
      outColNames.push(isSingleValue ? ck : `${valCol}_${ck}`);
    }
  }
  if (margins) {
    for (const valCol of valuesCols) {
      outColNames.push(isSingleValue ? marginsName : `${valCol}_${marginsName}`);
    }
  }

  // Build output column arrays
  const outCols: Record<string, Scalar[]> = {};
  for (const name of outColNames) {
    outCols[name] = [];
  }

  // Fill data rows
  for (const rk of finalRowOrder) {
    for (const ck of finalColOrder) {
      for (const valCol of valuesCols) {
        const name = isSingleValue ? ck : `${valCol}_${ck}`;
        const v = cellValue(rk, ck, valCol, buckets, aggfunc, fillValue);
        outCols[name]?.push(v);
      }
    }
    if (margins) {
      // "All" column for this row: aggregate across all column groups
      for (const valCol of valuesCols) {
        const allColName = isSingleValue ? marginsName : `${valCol}_${marginsName}`;
        const v = marginValue(colKeyOrder, rk, valCol, buckets, true, aggfunc, fillValue);
        outCols[allColName]?.push(v);
      }
    }
  }

  // Build row index labels
  const rowIndexLabels: Label[] = finalRowOrder.map(rowKeyToLabel);

  // Append margins row ("All" row) if requested
  if (margins) {
    for (const ck of finalColOrder) {
      for (const valCol of valuesCols) {
        const name = isSingleValue ? ck : `${valCol}_${ck}`;
        const v = marginValue(rowKeyOrder, ck, valCol, buckets, false, aggfunc, fillValue);
        outCols[name]?.push(v);
      }
    }
    // Grand total (corner cell)
    for (const valCol of valuesCols) {
      const allColName = isSingleValue ? marginsName : `${valCol}_${marginsName}`;
      const grandBucket: number[] = [];
      for (const rk of rowKeyOrder) {
        for (const ck of colKeyOrder) {
          const bucket = buckets.get(bucketKey(rk, ck, valCol));
          if (bucket) {
            grandBucket.push(...bucket);
          }
        }
      }
      const v =
        grandBucket.length === 0
          ? aggfunc === "count"
            ? 0
            : fillValue
          : aggregate(grandBucket, aggfunc);
      outCols[allColName]?.push(v);
    }
    rowIndexLabels.push(marginsName);
  }

  // Apply dropna: remove all-missing columns and rows
  if (dropna) {
    const colsToKeep = outColNames.filter((name) => outCols[name]?.some((v) => !isMissing(v)));
    const keptCols: Record<string, Scalar[]> = {};
    for (const name of colsToKeep) {
      const c = outCols[name];
      if (c !== undefined) {
        keptCols[name] = c;
      }
    }
    const rowsToKeep = rowIndexLabels.map((_, ri) =>
      colsToKeep.some((name) => !isMissing(keptCols[name]?.[ri] ?? null)),
    );
    const keptLabels = rowIndexLabels.filter((_, ri) => rowsToKeep[ri]);
    const filteredCols: Record<string, Scalar[]> = {};
    for (const name of colsToKeep) {
      const c = keptCols[name];
      if (c !== undefined) {
        filteredCols[name] = c.filter((_, ri) => rowsToKeep[ri]);
      }
    }
    return DataFrame.fromColumns(filteredCols, {
      index: new Index<Label>(keptLabels),
    });
  }

  return DataFrame.fromColumns(outCols, {
    index: new Index<Label>(rowIndexLabels),
  });
}
