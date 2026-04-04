/**
 * pivot — reshape a DataFrame from long to wide format.
 *
 * Mirrors `pandas.DataFrame.pivot` and `pandas.pivot_table`:
 * - `pivot`: strict, no duplicates allowed.
 * - `pivotTable`: aggregate duplicates with an `aggfunc`.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Collect unique values in order of first appearance, coerced to Label. */
function uniqueLabels(vals: readonly Scalar[]): Label[] {
  const seen = new Set<string>();
  const result: Label[] = [];
  for (const v of vals) {
    const lbl = v as Label;
    const key = JSON.stringify(lbl);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(lbl);
    }
  }
  return result;
}

/** Build a composite lookup key for (rowLabel, colLabel). */
function cellKey(row: Label, col: Label): string {
  return `${JSON.stringify(row)}\x00${JSON.stringify(col)}`;
}

/** Apply an aggregation function to an array of scalar values. */
function applyAgg(vals: readonly Scalar[], fn: AggFunc): Scalar {
  const defined = vals.filter(
    (v) => v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
  );
  if (defined.length === 0) {
    return null;
  }
  if (fn === "count") {
    return defined.length;
  }
  if (fn === "first") {
    return defined[0] ?? null;
  }
  if (fn === "last") {
    return defined.at(-1) ?? null;
  }
  const nums = defined.filter((v) => typeof v === "number") as number[];
  if (nums.length === 0) {
    return null;
  }
  return applyNumericAgg(nums, fn);
}

/** Numeric-only aggregations. */
function applyNumericAgg(nums: readonly number[], fn: "mean" | "sum" | "min" | "max"): number {
  switch (fn) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    case "mean":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    default: {
      const _exhaustive: never = fn;
      return _exhaustive;
    }
  }
}

// ─── pivot ────────────────────────────────────────────────────────────────────

/** Options for {@link pivot}. */
export interface PivotOptions {
  /** Column name whose unique values become the new row index. */
  readonly index: string;
  /** Column name whose unique values become new column headers. */
  readonly columns: string;
  /** Column name to use as cell values. */
  readonly values: string;
}

/**
 * Return a reshaped DataFrame organised by the given index and column values.
 *
 * Mirrors `pandas.DataFrame.pivot`. Each unique value in the `columns` column
 * becomes a new column in the result; each unique value in the `index` column
 * becomes a row. Missing combinations are filled with `null`.
 *
 * Raises if any `(index, columns)` combination appears more than once —
 * use {@link pivotTable} for aggregation.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   date: ["2020-01", "2020-01", "2020-02", "2020-02"],
 *   city: ["A", "B", "A", "B"],
 *   temp: [10, 20, 15, 25],
 * });
 * const wide = pivot(df, { index: "date", columns: "city", values: "temp" });
 * // columns → ["A", "B"]
 * // index   → ["2020-01", "2020-02"]
 * // A col   → [10, 15]
 * // B col   → [20, 25]
 * ```
 */
export function pivot(df: DataFrame, options: PivotOptions): DataFrame {
  const { index: indexCol, columns: columnsCol, values: valuesCol } = options;

  const idxSeries = df.col(indexCol);
  const colSeries = df.col(columnsCol);
  const valSeries = df.col(valuesCol);

  const uniqueIdxVals = uniqueLabels(idxSeries.values);
  const uniqueColVals = uniqueLabels(colSeries.values);

  const n = idxSeries.values.length;
  const cellMap = new Map<string, Scalar>();

  for (let i = 0; i < n; i++) {
    const rowKey = (idxSeries.values[i] ?? null) as Label;
    const colKey = (colSeries.values[i] ?? null) as Label;
    const val = valSeries.values[i] ?? null;
    const key = cellKey(rowKey, colKey);
    if (cellMap.has(key)) {
      throw new Error(
        `pivot: duplicate entry for index='${String(rowKey)}', columns='${String(colKey)}'. Use pivotTable to aggregate duplicates.`,
      );
    }
    cellMap.set(key, val);
  }

  const resultData: Record<string, readonly Scalar[]> = {};
  for (const colVal of uniqueColVals) {
    const colName = String(colVal);
    resultData[colName] = uniqueIdxVals.map(
      (idxVal) => cellMap.get(cellKey(idxVal, colVal)) ?? null,
    );
  }

  return DataFrame.fromColumns(resultData, { index: new Index<Label>(uniqueIdxVals) });
}

// ─── pivot_table ──────────────────────────────────────────────────────────────

/** Aggregation function names supported by {@link pivotTable}. */
export type AggFunc = "mean" | "sum" | "count" | "min" | "max" | "first" | "last";

/** Options for {@link pivotTable}. */
export interface PivotTableOptions {
  /**
   * Column(s) to aggregate.
   * When a single column is specified, cells hold the aggregated scalar.
   */
  readonly values: string;
  /**
   * Column(s) to use as the new row index.
   * Multiple columns are joined with `"__"` for display.
   */
  readonly index: string | readonly string[];
  /** Column whose unique values become new column headers. */
  readonly columns: string;
  /**
   * How to aggregate multiple values per cell.
   * @default "mean"
   */
  readonly aggfunc?: AggFunc;
  /**
   * Value to substitute for missing (empty) cells.
   * @default null
   */
  readonly fillValue?: Scalar;
}

/**
 * Return a pivot table DataFrame applying an aggregation function.
 *
 * Mirrors `pandas.pivot_table`. Unlike {@link pivot}, duplicate
 * `(index, columns)` combinations are aggregated by `aggfunc` (default: `"mean"`).
 *
 * @example
 * ```ts
 * const pt = pivotTable(df, {
 *   index: "region", columns: "product", values: "revenue", aggfunc: "sum",
 * });
 * ```
 */
export function pivotTable(df: DataFrame, options: PivotTableOptions): DataFrame {
  const {
    values: valuesCol,
    index: indexCols,
    columns: columnsCol,
    aggfunc = "mean",
    fillValue = null,
  } = options;

  const indexColArr: readonly string[] = typeof indexCols === "string" ? [indexCols] : indexCols;
  const colSeries = df.col(columnsCol);
  const valSeries = df.col(valuesCol);
  const indexSeriesArr = indexColArr.map((col) => df.col(col));
  const nRows = df.index.size;

  const uniqueColVals = uniqueLabels(colSeries.values);
  const { uniqueRowKeys, rowKeyToLabel } = collectRowKeys(indexSeriesArr, nRows);
  const cellAccum = accumulateCells(indexSeriesArr, colSeries, valSeries, nRows);

  const rowLabels = uniqueRowKeys.map((k) => rowKeyToLabel.get(k) ?? k) as Label[];
  const resultData = buildPivotTableData(
    uniqueRowKeys,
    uniqueColVals,
    cellAccum,
    aggfunc,
    fillValue,
  );

  return DataFrame.fromColumns(resultData, { index: new Index<Label>(rowLabels) });
}

// ─── pivotTable helpers ───────────────────────────────────────────────────────

/** Result type from {@link collectRowKeys}. */
interface RowKeyInfo {
  uniqueRowKeys: string[];
  rowKeyToLabel: Map<string, string>;
}

/** Build a composite key for row `i` using the given index Series array. */
function makeRowKey(indexSeriesArr: readonly Series<Scalar>[], i: number): string {
  return indexSeriesArr.map((s) => JSON.stringify(s.values[i] ?? null)).join("\x00");
}

/** Collect unique row keys in appearance order and map them to display labels. */
function collectRowKeys(indexSeriesArr: readonly Series<Scalar>[], nRows: number): RowKeyInfo {
  const uniqueRowKeys: string[] = [];
  const rowKeySeen = new Set<string>();
  const rowKeyToLabel = new Map<string, string>();
  for (let i = 0; i < nRows; i++) {
    const key = makeRowKey(indexSeriesArr, i);
    if (!rowKeySeen.has(key)) {
      rowKeySeen.add(key);
      uniqueRowKeys.push(key);
      const parts = indexSeriesArr.map((s) => String(s.values[i] ?? ""));
      rowKeyToLabel.set(key, parts.length === 1 ? (parts[0] ?? "") : parts.join("__"));
    }
  }
  return { uniqueRowKeys, rowKeyToLabel };
}

/** Accumulate cell values into a Map keyed by `"rowKey\x01colKey"`. */
function accumulateCells(
  indexSeriesArr: readonly Series<Scalar>[],
  colSeries: Series<Scalar>,
  valSeries: Series<Scalar>,
  nRows: number,
): Map<string, Scalar[]> {
  const cellAccum = new Map<string, Scalar[]>();
  for (let i = 0; i < nRows; i++) {
    const rk = makeRowKey(indexSeriesArr, i);
    const ck = JSON.stringify((colSeries.values[i] ?? null) as Label);
    const key = `${rk}\x01${ck}`;
    const bucket = cellAccum.get(key);
    if (bucket !== undefined) {
      bucket.push(valSeries.values[i] ?? null);
    } else {
      cellAccum.set(key, [valSeries.values[i] ?? null]);
    }
  }
  return cellAccum;
}

/** Build the result data record from accumulated cells. */
function buildPivotTableData(
  uniqueRowKeys: readonly string[],
  uniqueColVals: readonly Label[],
  cellAccum: ReadonlyMap<string, Scalar[]>,
  aggfunc: AggFunc,
  fillValue: Scalar,
): Record<string, readonly Scalar[]> {
  const resultData: Record<string, readonly Scalar[]> = {};
  for (const colVal of uniqueColVals) {
    const colName = String(colVal);
    const ck = JSON.stringify(colVal);
    resultData[colName] = uniqueRowKeys.map((rk) => {
      const bucket = cellAccum.get(`${rk}\x01${ck}`);
      if (bucket === undefined || bucket.length === 0) {
        return fillValue;
      }
      return applyAgg(bucket, aggfunc);
    });
  }
  return resultData;
}
