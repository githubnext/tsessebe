/**
 * pct_change — percentage change between current and prior element.
 *
 * Mirrors `pandas.Series.pct_change()` / `pandas.DataFrame.pct_change()`:
 * - `pctChangeSeries(series, options)` — per-element % change
 * - `pctChangeDataFrame(df, options)` — column-wise % change
 *
 * Formula (per element i, with shift=periods):
 *   `result[i] = (x[i] - x[i-periods]) / x[i-periods]`
 *
 * When `fillMethod` is set, NaN/null values in the source are filled *before*
 * computing the ratio (matching pandas' default behaviour of `fill_method="pad"`).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Fill method applied to NaN/null before computing pct_change. */
export type PctChangeFillMethod = "pad" | "bfill";

/** Options for {@link pctChangeSeries} and {@link pctChangeDataFrame}. */
export interface PctChangeOptions {
  /**
   * Number of periods (lags) to shift when computing the ratio.
   * Positive values look backward; negative values look forward.
   * Default `1`.
   */
  readonly periods?: number;
  /**
   * How to fill NaN/null values *before* computing the ratio.
   * - `"pad"` (default): forward-fill (last valid observation carries forward).
   * - `"bfill"`: backward-fill (next valid observation fills backward).
   * - `null`: no filling — NaN/null stays as-is.
   */
  readonly fillMethod?: PctChangeFillMethod | null;
  /**
   * Maximum number of consecutive NaN/null values to fill when `fillMethod`
   * is set.  `undefined` / `null` means no limit.
   */
  readonly limit?: number | null;
}

/** Options for {@link pctChangeDataFrame} — adds an axis selector. */
export interface DataFramePctChangeOptions extends PctChangeOptions {
  /**
   * - `0` or `"index"` (default): apply operation **column-wise** (down rows).
   * - `1` or `"columns"`: apply operation **row-wise** (across columns).
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a valid number (not null, undefined, or NaN). */
function isNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v) && v !== null;
}

/**
 * Forward-fill an array of scalars in place, respecting an optional limit.
 * Returns a NEW array.
 */
function padFill(vals: readonly Scalar[], limit: number | null | undefined): Scalar[] {
  const out: Scalar[] = [...vals];
  let run = 0;
  let lastValid: Scalar = null;
  for (let i = 0; i < out.length; i++) {
    const v = out[i] as Scalar;
    if (v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v))) {
      lastValid = v;
      run = 0;
    } else if (lastValid !== null && (limit == null || run < limit)) {
      out[i] = lastValid;
      run++;
    }
  }
  return out;
}

/**
 * Backward-fill an array of scalars, respecting an optional limit.
 * Returns a NEW array.
 */
function bfillFill(vals: readonly Scalar[], limit: number | null | undefined): Scalar[] {
  const tmp = padFill([...vals].reverse(), limit);
  return tmp.reverse();
}

/** Fill NaN/null in `vals` using the requested method. */
function applyFill(
  vals: readonly Scalar[],
  method: PctChangeFillMethod | null | undefined,
  limit: number | null | undefined,
): Scalar[] {
  if (!method) return [...vals];
  return method === "pad" ? padFill(vals, limit) : bfillFill(vals, limit);
}

/** Compute pct_change on a flat array of scalars. */
function computePct(vals: readonly Scalar[], periods: number): Scalar[] {
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);
  const shift = periods;
  if (shift >= 0) {
    for (let i = shift; i < n; i++) {
      const curr = vals[i] as Scalar;
      const prev = vals[i - shift] as Scalar;
      if (isNum(curr) && isNum(prev) && prev !== 0) {
        out[i] = curr / prev - 1;
      } else if (isNum(curr) && isNum(prev) && prev === 0) {
        // 0 denominator → Infinity (same as pandas)
        out[i] = curr === 0 ? Number.NaN : curr > 0 ? Infinity : -Infinity;
      } else {
        out[i] = null;
      }
    }
  } else {
    // Negative periods: look forward
    const absShift = -shift;
    for (let i = 0; i < n - absShift; i++) {
      const curr = vals[i] as Scalar;
      const fwd = vals[i + absShift] as Scalar;
      if (isNum(curr) && isNum(fwd) && curr !== 0) {
        out[i] = fwd / curr - 1;
      } else if (isNum(curr) && isNum(fwd) && curr === 0) {
        out[i] = fwd === 0 ? Number.NaN : fwd > 0 ? Infinity : -Infinity;
      } else {
        out[i] = null;
      }
    }
  }
  return out;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute the fractional change between a Series element and the element
 * `periods` positions earlier (or later, for negative `periods`).
 *
 * Matches `pandas.Series.pct_change()`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [100, 110, 99, 121] });
 * pctChangeSeries(s); // [null, 0.1, -0.1, 0.2222…]
 * ```
 */
export function pctChangeSeries(series: Series<Scalar>, options: PctChangeOptions = {}): Series<Scalar> {
  const periods = options.periods ?? 1;
  const fillMethod = options.fillMethod !== undefined ? options.fillMethod : "pad";
  const limit = options.limit ?? null;

  const filled = applyFill(series.values, fillMethod, limit);
  const result = computePct(filled, periods);

  return new Series<Scalar>({
    data: result,
    index: series.index,
    name: series.name ?? undefined,
  });
}

/**
 * Compute percentage change for every column (or row) of a DataFrame.
 *
 * Matches `pandas.DataFrame.pct_change()`.
 *
 * @example
 * ```ts
 * const df = new DataFrame(new Map([
 *   ["a", new Series({ data: [100, 110, 121] })],
 *   ["b", new Series({ data: [200, 180, 198] })],
 * ]));
 * pctChangeDataFrame(df); // fractional change per column
 * ```
 */
export function pctChangeDataFrame(
  df: DataFrame,
  options: DataFramePctChangeOptions = {},
): DataFrame {
  const axis = options.axis ?? 0;
  const colWise = axis === 0 || axis === "index";

  if (colWise) {
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of df.columns.values) {
      colMap.set(name, pctChangeSeries(df.col(name), options));
    }
    return new DataFrame(colMap, df.index);
  }

  // Row-wise: each row across columns
  const periods = options.periods ?? 1;
  const fillMethod = options.fillMethod !== undefined ? options.fillMethod : "pad";
  const limit = options.limit ?? null;
  const nRows = df.index.length;
  const cols = df.columns.values;
  const nCols = cols.length;

  const resultCols = new Map<string, Scalar[]>();
  for (const name of cols) {
    resultCols.set(name, new Array<Scalar>(nRows).fill(null));
  }

  for (let r = 0; r < nRows; r++) {
    const row: Scalar[] = [];
    for (const name of cols) {
      row.push(df.col(name).values[r] as Scalar);
    }
    const filled = applyFill(row, fillMethod, limit);
    const pct = computePct(filled, periods);
    for (let c = 0; c < nCols; c++) {
      (resultCols.get(cols[c] as string) as Scalar[])[r] = pct[c] as Scalar;
    }
  }

  const colMap = new Map<string, Series<Scalar>>();
  for (const name of cols) {
    colMap.set(
      name,
      new Series<Scalar>({ data: resultCols.get(name) as Scalar[], index: df.index, name }),
    );
  }
  return new DataFrame(colMap, df.index);
}
