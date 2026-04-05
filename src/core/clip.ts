/**
 * Clip operations — clamp Series/DataFrame values to [lower, upper] bounds.
 *
 * Mirrors `pandas.Series.clip` and `pandas.DataFrame.clip`.
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True if v is a finite number. */
function isNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Clip a single value to [lower, upper]. */
function clipValue(v: Scalar, lower: number | null, upper: number | null): Scalar {
  if (!isNum(v)) {
    return v;
  }
  if (lower !== null && v < lower) {
    return lower;
  }
  if (upper !== null && v > upper) {
    return upper;
  }
  return v;
}

// ─── clipSeries ───────────────────────────────────────────────────────────────

/** Options for {@link clipSeries}. */
export interface ClipOptions {
  /** Lower bound. Values below this are set to `lower`. Default: no lower bound. */
  lower?: number | null;
  /** Upper bound. Values above this are set to `upper`. Default: no upper bound. */
  upper?: number | null;
}

/**
 * Clip values in a Series to a range `[lower, upper]`.
 *
 * @example
 * ```ts
 * clipSeries(new Series({ data: [-1, 0, 5, 10] }), { lower: 0, upper: 5 });
 * // => Series([0, 0, 5, 5])
 * ```
 */
export function clipSeries(s: Series<Scalar>, opts: ClipOptions = {}): Series<Scalar> {
  const lower = opts.lower ?? null;
  const upper = opts.upper ?? null;
  const out: Scalar[] = s.values.map((v) => clipValue(v ?? null, lower, upper));
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── clipDataFrame ────────────────────────────────────────────────────────────

/**
 * Clip all numeric values in a DataFrame to `[lower, upper]`.
 *
 * @example
 * ```ts
 * clipDataFrame(df, { lower: 0, upper: 100 });
 * ```
 */
export function clipDataFrame(df: DataFrame, opts: ClipOptions = {}): DataFrame {
  const lower = opts.lower ?? null;
  const upper = opts.upper ?? null;
  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    const s = df.col(col) as Series<Scalar>;
    data[col] = s.values.map((v) => clipValue(v ?? null, lower, upper));
  }
  return DataFrame.fromColumns(data, { index: df.index });
}
