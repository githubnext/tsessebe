/**
 * Shift and diff operations — shift values by a number of periods,
 * compute first-order differences.
 *
 * Mirrors `pandas.Series.shift`, `pandas.Series.diff`,
 * `pandas.DataFrame.shift`, `pandas.DataFrame.diff`.
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── Series shift ─────────────────────────────────────────────────────────────

/**
 * Shift a Series by `periods` positions (positive = forward, negative = back).
 * Introduced elements are filled with `fillValue` (default `null`).
 *
 * @example
 * ```ts
 * shiftSeries(new Series({ data: [1, 2, 3] }), 1); // [null, 1, 2]
 * shiftSeries(new Series({ data: [1, 2, 3] }), -1); // [2, 3, null]
 * ```
 */
export function shiftSeries<T extends Scalar>(
  s: Series<T>,
  periods: number,
  fillValue: Scalar = null,
): Series<Scalar> {
  const vals = s.values as readonly Scalar[];
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(fillValue);
  if (periods > 0) {
    for (let i = periods; i < n; i++) {
      out[i] = vals[i - periods] ?? null;
    }
  } else if (periods < 0) {
    for (let i = 0; i < n + periods; i++) {
      out[i] = vals[i - periods] ?? null;
    }
  } else {
    for (let i = 0; i < n; i++) {
      out[i] = vals[i] ?? null;
    }
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── Series diff ──────────────────────────────────────────────────────────────

/** True when v is a number (not NaN). */
function isFiniteNumber(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Compute first differences of a numeric Series.
 *
 * @param periods - Lag to diff over (default 1). Negative = forward diff.
 *
 * @example
 * ```ts
 * diffSeries(new Series({ data: [1, 3, 6] }), 1); // [null, 2, 3]
 * ```
 */
export function diffSeries(s: Series<Scalar>, periods = 1): Series<Scalar> {
  const vals = s.values;
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);
  const abs = Math.abs(periods);
  if (periods > 0) {
    for (let i = abs; i < n; i++) {
      const cur = vals[i];
      const prev = vals[i - abs];
      out[i] = isFiniteNumber(cur) && isFiniteNumber(prev) ? cur - prev : null;
    }
  } else if (periods < 0) {
    for (let i = 0; i < n - abs; i++) {
      const cur = vals[i];
      const next = vals[i + abs];
      out[i] = isFiniteNumber(cur) && isFiniteNumber(next) ? cur - next : null;
    }
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── DataFrame shift ──────────────────────────────────────────────────────────

/**
 * Shift every column of a DataFrame by `periods` positions.
 *
 * @example
 * ```ts
 * shiftDataFrame(df, 1);
 * ```
 */
export function shiftDataFrame(
  df: DataFrame,
  periods: number,
  fillValue: Scalar = null,
): DataFrame {
  const cols = df.columns;
  const data: Record<string, Scalar[]> = {};
  for (const col of cols) {
    const s = df.col(col) as Series<Scalar>;
    data[col] = shiftSeries(s, periods, fillValue).values as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

// ─── DataFrame diff ───────────────────────────────────────────────────────────

/**
 * First differences for every numeric column in a DataFrame.
 *
 * @example
 * ```ts
 * diffDataFrame(df, 1);
 * ```
 */
export function diffDataFrame(df: DataFrame, periods = 1): DataFrame {
  const cols = df.columns;
  const data: Record<string, Scalar[]> = {};
  for (const col of cols) {
    const s = df.col(col) as Series<Scalar>;
    data[col] = diffSeries(s, periods).values as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

// ─── pct_change ───────────────────────────────────────────────────────────────

/**
 * Percentage change between current and prior element.
 *
 * @example
 * ```ts
 * pctChangeSeries(new Series({ data: [100, 110, 99] }));
 * // => [null, 0.1, -0.1]
 * ```
 */
export function pctChangeSeries(s: Series<Scalar>, periods = 1): Series<Scalar> {
  const vals = s.values;
  const n = vals.length;
  const out: Scalar[] = new Array<Scalar>(n).fill(null);
  for (let i = periods; i < n; i++) {
    const cur = vals[i];
    const prev = vals[i - periods];
    if (isFiniteNumber(cur) && isFiniteNumber(prev) && prev !== 0) {
      out[i] = (cur - prev) / prev;
    }
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

/** Options for {@link shiftSeries}. */
export interface ShiftOptions {
  /** Number of periods to shift (positive = forward, negative = backward). */
  periods: number;
  /** Value to use for introduced missing elements. Default: `null`. */
  fillValue?: Scalar;
}

/** Type alias for label. */
