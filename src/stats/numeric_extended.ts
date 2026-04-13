/**
 * numeric_extended — additional numeric utility functions for arrays and Series.
 *
 * Mirrors frequently-used numpy / scipy / pandas functions not yet in tsb:
 * - `digitize(values, bins, right?)` — find bin indices (numpy.digitize)
 * - `histogram(values, options?)` — compute histogram counts and edges (numpy.histogram)
 * - `linspace(start, stop, num?)` — evenly-spaced sequence (numpy.linspace)
 * - `arange(start, stop?, step?)` — range with step (numpy.arange)
 * - `percentileOfScore(arr, score, kind?)` — percentile rank of a score (scipy.stats.percentileofscore)
 * - `zscore(series, options?)` — z-score standardisation (scipy.stats.zscore)
 * - `minMaxNormalize(series, options?)` — min-max normalisation to [0, 1] or custom range
 * - `coefficientOfVariation(series, options?)` — std / mean (dimensionless spread)
 *
 * All functions are **pure** (return new values; inputs are unchanged).
 * Missing values (null / NaN) are handled consistently: ignored in aggregates
 * and propagated in per-element outputs unless noted otherwise.
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True when `v` is a finite, non-null, non-NaN number. */
function isNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** Extract finite numbers from scalar array. */
function finiteNums(vals: readonly Scalar[]): number[] {
  return vals.filter(isNum);
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link histogram}. */
export interface HistogramOptions {
  /**
   * Number of equal-width bins to produce.  Defaults to `10`.
   * Ignored when `binEdges` is provided.
   */
  readonly bins?: number;
  /**
   * Explicit bin edges.  Must be strictly increasing and have length ≥ 2.
   * When provided, `bins` is ignored.
   */
  readonly binEdges?: readonly number[];
  /**
   * `[min, max]` range to consider.  Values outside are ignored.
   * Defaults to `[min(values), max(values)]`.
   * Only used when `binEdges` is not provided.
   */
  readonly range?: readonly [number, number];
  /**
   * If `true`, the result is normalised as a probability density so that the
   * integral over the range is 1 (like `numpy.histogram(density=True)`).
   * Defaults to `false`.
   */
  readonly density?: boolean;
}

/** Result of {@link histogram}. */
export interface HistogramResult {
  /** Bin counts (or densities when `density: true`). */
  readonly counts: readonly number[];
  /** Bin edges — always has length `counts.length + 1`. */
  readonly binEdges: readonly number[];
}

/** Options for {@link zscore}. */
export interface ZscoreOptions {
  /**
   * Degrees-of-freedom correction for std.
   * - `1` (default, matches pandas `ddof=1`): sample std
   * - `0`: population std
   */
  readonly ddof?: 0 | 1;
}

/** Options for {@link minMaxNormalize}. */
export interface MinMaxOptions {
  /**
   * Lower bound of the output range.  Defaults to `0`.
   */
  readonly featureRangeMin?: number;
  /**
   * Upper bound of the output range.  Defaults to `1`.
   */
  readonly featureRangeMax?: number;
}

/** Options for {@link coefficientOfVariation}. */
export interface CvOptions {
  /**
   * Degrees-of-freedom correction for std.
   * - `1` (default): sample std
   * - `0`: population std
   */
  readonly ddof?: 0 | 1;
}

// ─── digitize ─────────────────────────────────────────────────────────────────

/**
 * Return the indices of the bins to which each value in `values` belongs.
 *
 * Mirrors `numpy.digitize(values, bins, right=False)`.
 *
 * Each value `v` is mapped to bin index `i` such that:
 * - `right = false` (default): `bins[i-1] <= v < bins[i]`
 * - `right = true`:            `bins[i-1] < v <= bins[i]`
 *
 * Indices are 0-based (unlike numpy which uses 1-based).
 * Values below `bins[0]` map to `-1`; values at/above `bins[last]` map to
 * `bins.length - 1`.
 *
 * Missing / NaN values in `values` are mapped to `NaN`.
 *
 * @param values - array of numbers to bin (may contain null/NaN)
 * @param bins   - strictly increasing bin-edge array (length ≥ 1)
 * @param right  - if `true`, intervals are open on the left (pandas default is `false`)
 * @returns        array of integer bin indices (same length as `values`)
 *
 * @example
 * ```ts
 * digitize([0.5, 1.5, 2.5, 3.5], [1, 2, 3]);
 * // → [-1, 0, 1, 2]
 * ```
 */
export function digitize(
  values: readonly (number | null)[],
  bins: readonly number[],
  right = false,
): (number | typeof NaN)[] {
  if (bins.length === 0) {
    throw new RangeError("bins must have at least one element");
  }
  return values.map((v) => {
    if (v === null || (typeof v === "number" && Number.isNaN(v))) {
      return Number.NaN;
    }
    const n = bins.length;
    if (right) {
      // open left, closed right: bins[i-1] < v <= bins[i]
      for (let i = 0; i < n; i++) {
        if (v <= (bins[i] as number)) {
          return i - 1; // below first edge → -1
        }
      }
      return n - 1; // above last edge
    }
    // closed left, open right: bins[i-1] <= v < bins[i]
    for (let i = 0; i < n; i++) {
      if (v < (bins[i] as number)) {
        return i - 1;
      }
    }
    return n - 1; // at or above last edge
  });
}

// ─── histogram ────────────────────────────────────────────────────────────────

/**
 * Compute a histogram of `values`.
 *
 * Mirrors `numpy.histogram(values, bins=10, range=None, density=False)`.
 *
 * NaN / null values are silently ignored.
 *
 * @param values  - numeric values to bin
 * @param options - {@link HistogramOptions}
 * @returns         {@link HistogramResult} with `counts` and `binEdges`
 *
 * @example
 * ```ts
 * histogram([1, 2, 3, 4, 5], { bins: 2 });
 * // { counts: [2, 3], binEdges: [1, 3, 5] }
 * ```
 */
export function histogram(
  values: readonly (number | null | Scalar)[],
  options?: HistogramOptions,
): HistogramResult {
  const nums = finiteNums(values as readonly Scalar[]);
  if (nums.length === 0) {
    // Return a zero-count histogram over [0, 1] when there is no data.
    const nb = options?.bins ?? 10;
    const edges: number[] = [];
    for (let i = 0; i <= nb; i++) {
      edges.push(i / nb);
    }
    const counts = new Array<number>(nb).fill(0);
    return { counts, binEdges: edges };
  }

  let edges: number[];

  if (options?.binEdges !== undefined) {
    const be = options.binEdges;
    if (be.length < 2) {
      throw new RangeError("binEdges must have at least 2 elements");
    }
    edges = [...be];
  } else {
    const nbins = options?.bins ?? 10;
    if (nbins < 1) {
      throw new RangeError("bins must be >= 1");
    }
    let lo: number;
    let hi: number;
    if (options?.range !== undefined) {
      [lo, hi] = options.range;
    } else {
      lo = Math.min(...nums);
      hi = Math.max(...nums);
    }
    if (lo === hi) {
      // Degenerate range: widen by 0.5 on each side (mirrors numpy).
      lo -= 0.5;
      hi += 0.5;
    }
    edges = [];
    for (let i = 0; i <= nbins; i++) {
      edges.push(lo + (i / nbins) * (hi - lo));
    }
  }

  const nbins = edges.length - 1;
  const counts = new Array<number>(nbins).fill(0);
  const lo = edges[0] as number;
  const hi = edges[nbins] as number;

  for (const v of nums) {
    if (v < lo || v > hi) {
      continue; // out of range
    }
    if (v === hi) {
      // Right-most value goes into the last bin.
      (counts[nbins - 1] as number)++;
      continue;
    }
    // Binary search for the bin.
    let left = 0;
    let right = nbins - 1;
    while (left < right) {
      const mid = (left + right) >> 1;
      if (v < (edges[mid + 1] as number)) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    (counts[left] as number)++;
  }

  if (options?.density === true) {
    const total = nums.length;
    const densityCounts = counts.map((c, i) => {
      const width = (edges[i + 1] as number) - (edges[i] as number);
      return c / (total * width);
    });
    return { counts: densityCounts, binEdges: edges };
  }

  return { counts, binEdges: edges };
}

// ─── linspace ─────────────────────────────────────────────────────────────────

/**
 * Return `num` evenly spaced numbers from `start` to `stop` (inclusive).
 *
 * Mirrors `numpy.linspace(start, stop, num=50, endpoint=True)`.
 *
 * @param start - first value
 * @param stop  - last value (included)
 * @param num   - number of values to generate (default `50`; must be ≥ 0)
 * @returns       array of `num` numbers
 *
 * @example
 * ```ts
 * linspace(0, 1, 5);
 * // → [0, 0.25, 0.5, 0.75, 1]
 * ```
 */
export function linspace(start: number, stop: number, num = 50): number[] {
  if (num < 0) {
    throw new RangeError("num must be >= 0");
  }
  if (num === 0) {
    return [];
  }
  if (num === 1) {
    return [start];
  }
  const step = (stop - start) / (num - 1);
  const result: number[] = [];
  for (let i = 0; i < num; i++) {
    result.push(i === num - 1 ? stop : start + i * step);
  }
  return result;
}

// ─── arange ───────────────────────────────────────────────────────────────────

/**
 * Return evenly-spaced values within a given interval.
 *
 * Mirrors `numpy.arange([start,] stop[, step])`.
 *
 * Call signatures:
 * - `arange(stop)` — values in `[0, stop)` with step `1`
 * - `arange(start, stop)` — values in `[start, stop)` with step `1`
 * - `arange(start, stop, step)` — values in `[start, stop)` with given step
 *
 * @example
 * ```ts
 * arange(5);           // [0, 1, 2, 3, 4]
 * arange(1, 5);        // [1, 2, 3, 4]
 * arange(0, 1, 0.25);  // [0, 0.25, 0.5, 0.75]
 * ```
 */
export function arange(stop: number): number[];
export function arange(start: number, stop: number): number[];
export function arange(start: number, stop: number, step: number): number[];
export function arange(startOrStop: number, stop?: number, step?: number): number[] {
  let start: number;
  let s: number;
  let st: number;

  if (stop === undefined) {
    start = 0;
    s = startOrStop;
    st = 1;
  } else if (step === undefined) {
    start = startOrStop;
    s = stop;
    st = 1;
  } else {
    start = startOrStop;
    s = stop;
    st = step;
  }

  if (st === 0) {
    throw new RangeError("step must not be zero");
  }

  const result: number[] = [];
  if (st > 0) {
    for (let v = start; v < s; v = start + result.length * st) {
      result.push(v);
    }
  } else {
    for (let v = start; v > s; v = start + result.length * st) {
      result.push(v);
    }
  }
  return result;
}

// ─── percentileOfScore ────────────────────────────────────────────────────────

/**
 * Compute the percentile rank of `score` within `arr`.
 *
 * Mirrors `scipy.stats.percentileofscore(arr, score, kind)`.
 *
 * @param arr   - numeric values (NaN/null are ignored)
 * @param score - value whose rank to compute
 * @param kind  - ranking method:
 *   - `"rank"` (default): average of `weak` and `strict` percentiles
 *   - `"weak"`:   proportion of values ≤ score
 *   - `"strict"`: proportion of values < score
 *   - `"mean"`:   mean of `weak` and `strict` (same as `"rank"`)
 * @returns  percentile in `[0, 100]` (or `NaN` when `arr` is empty)
 *
 * @example
 * ```ts
 * percentileOfScore([1, 2, 3, 4, 5], 3);   // 50
 * percentileOfScore([1, 2, 3, 4, 5], 3, "weak");   // 60
 * percentileOfScore([1, 2, 3, 4, 5], 3, "strict");  // 40
 * ```
 */
export function percentileOfScore(
  arr: readonly (number | null | Scalar)[],
  score: number,
  kind: "rank" | "weak" | "strict" | "mean" = "rank",
): number {
  const nums = finiteNums(arr as readonly Scalar[]);
  const n = nums.length;
  if (n === 0) {
    return Number.NaN;
  }
  const weakCount = nums.filter((v) => v <= score).length;
  const strictCount = nums.filter((v) => v < score).length;

  switch (kind) {
    case "weak":
      return (weakCount / n) * 100;
    case "strict":
      return (strictCount / n) * 100;
    case "rank":
    case "mean":
      return ((weakCount + strictCount) / 2 / n) * 100;
  }
}

// ─── zscore ───────────────────────────────────────────────────────────────────

/**
 * Standardise a numeric Series to zero mean and unit variance (z-score).
 *
 * Mirrors `scipy.stats.zscore(a, ddof=1)`.
 *
 * Each value is transformed as: `z = (x − mean) / std`
 *
 * Missing values (null / NaN) are propagated unchanged in the output.
 * If std is 0 (or fewer than 2 non-missing values), all outputs are `NaN`.
 *
 * @param series  - input Series (must be numeric)
 * @param options - {@link ZscoreOptions}
 * @returns         new Series of z-scores with same index
 *
 * @example
 * ```ts
 * zscore(new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] }));
 * // approximately [−1.5, −0.5, −0.5, −0.5, 0, 0, 1, 2] (normalised)
 * ```
 */
export function zscore(series: Series<Scalar>, options?: ZscoreOptions): Series<Scalar> {
  const ddof = options?.ddof ?? 1;
  const vals = series.values as readonly Scalar[];
  const nums = finiteNums(vals);
  const n = nums.length;

  if (n < 2) {
    const nanVals = vals.map(() => Number.NaN as Scalar);
    return series.withValues(nanVals) as Series<Scalar>;
  }

  const mean = nums.reduce((acc, v) => acc + v, 0) / n;
  const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - ddof);
  const std = Math.sqrt(variance);

  if (std === 0) {
    const nanVals = vals.map((v) => (isNum(v) ? Number.NaN : v) as Scalar);
    return series.withValues(nanVals) as Series<Scalar>;
  }

  const zVals = vals.map((v) => (isNum(v) ? (((v - mean) / std) as Scalar) : v));
  return series.withValues(zVals) as Series<Scalar>;
}

// ─── minMaxNormalize ──────────────────────────────────────────────────────────

/**
 * Scale a numeric Series to a fixed range using min-max normalisation.
 *
 * Mirrors `sklearn.preprocessing.MinMaxScaler` applied to a 1-D array.
 *
 * `x_scaled = (x − min) / (max − min) × (rangeMax − rangeMin) + rangeMin`
 *
 * Missing values (null / NaN) are propagated unchanged.
 * If all values are equal, returns a Series of the midpoint of the target range.
 *
 * @param series  - input Series (must be numeric)
 * @param options - {@link MinMaxOptions}
 * @returns         new Series normalised to `[featureRangeMin, featureRangeMax]`
 *
 * @example
 * ```ts
 * minMaxNormalize(new Series({ data: [0, 5, 10] }));
 * // → Series([0, 0.5, 1])
 * ```
 */
export function minMaxNormalize(series: Series<Scalar>, options?: MinMaxOptions): Series<Scalar> {
  const rMin = options?.featureRangeMin ?? 0;
  const rMax = options?.featureRangeMax ?? 1;
  if (rMin >= rMax) {
    throw new RangeError("featureRangeMin must be less than featureRangeMax");
  }

  const vals = series.values as readonly Scalar[];
  const nums = finiteNums(vals);
  if (nums.length === 0) {
    return series.withValues(vals.map(() => Number.NaN as Scalar)) as Series<Scalar>;
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;

  if (span === 0) {
    const mid = (rMin + rMax) / 2;
    const midVals = vals.map((v) => (isNum(v) ? (mid as Scalar) : v));
    return series.withValues(midVals) as Series<Scalar>;
  }

  const scaled = vals.map((v) =>
    isNum(v) ? ((((v - min) / span) * (rMax - rMin) + rMin) as Scalar) : v,
  );
  return series.withValues(scaled) as Series<Scalar>;
}

// ─── coefficientOfVariation ───────────────────────────────────────────────────

/**
 * Compute the coefficient of variation (CV) — std / |mean| — as a unitless
 * measure of relative dispersion.
 *
 * NaN / null values are ignored in aggregation.
 * Returns `NaN` when mean is 0 or fewer than 2 valid values exist.
 *
 * @param series  - numeric Series
 * @param options - {@link CvOptions}
 * @returns         ratio std / |mean|
 *
 * @example
 * ```ts
 * coefficientOfVariation(new Series({ data: [10, 20, 30] }));
 * // ≈ 0.5
 * ```
 */
export function coefficientOfVariation(series: Series<Scalar>, options?: CvOptions): number {
  const ddof = options?.ddof ?? 1;
  const vals = series.values as readonly Scalar[];
  const nums = finiteNums(vals);
  const n = nums.length;

  if (n < 2) {
    return Number.NaN;
  }

  const mean = nums.reduce((acc, v) => acc + v, 0) / n;
  if (mean === 0) {
    return Number.NaN;
  }

  const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - ddof);
  const std = Math.sqrt(variance);
  return std / Math.abs(mean);
}

// ─── seriesDigitize ───────────────────────────────────────────────────────────

/**
 * Apply {@link digitize} to a Series, returning a new numeric Series of bin indices.
 *
 * @param series - Series of numeric values
 * @param bins   - strictly increasing bin-edge array
 * @param right  - if `true`, intervals are open on the left
 * @returns        new Series of bin indices (integer or NaN for missing values)
 *
 * @example
 * ```ts
 * seriesDigitize(new Series({ data: [0.5, 1.5, 2.5] }), [1, 2]);
 * // → Series([-1, 0, 1])
 * ```
 */
export function seriesDigitize(
  series: Series<Scalar>,
  bins: readonly number[],
  right = false,
): Series<number> {
  const vals = series.values as readonly (number | null)[];
  const indices = digitize(vals, bins, right);
  return new Series<number>({
    data: indices as number[],
    index: series.index as import("../core/index.ts").Index<Label>,
    name: series.name,
  });
}
