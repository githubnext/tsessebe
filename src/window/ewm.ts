/**
 * Exponentially Weighted Moving (EWM) computations for Series and DataFrame.
 *
 * Mirrors `pandas.Series.ewm` / `pandas.DataFrame.ewm`.
 *
 * Smoothing parameter `alpha` may be specified directly, or derived from:
 * - `com` (center-of-mass): α = 1 / (1 + com)
 * - `span`: α = 2 / (span + 1)
 * - `halflife`: α = 1 − exp(−ln(2) / halflife)
 *
 * Usage:
 * ```ts
 * ewm(series, { span: 10 }).mean()
 * ewm(series, { alpha: 0.3 }).std()
 * ```
 */

import type { Index } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── EWMOptions ───────────────────────────────────────────────────────────────

/**
 * Options for exponentially weighted moving calculations.
 *
 * Exactly one of `alpha`, `com`, `span`, or `halflife` must be provided.
 */
export interface EWMOptions {
  /**
   * Smoothing factor (0 < alpha ≤ 1).  Directly sets the decay parameter.
   */
  readonly alpha?: number;
  /**
   * Center-of-mass: α = 1 / (1 + com).  Must be ≥ 0.
   */
  readonly com?: number;
  /**
   * Span: α = 2 / (span + 1).  Must be ≥ 1.
   */
  readonly span?: number;
  /**
   * Half-life: α = 1 − exp(−ln(2) / halflife).  Must be > 0.
   */
  readonly halflife?: number;
  /**
   * Use the adjusted (weighted) form (default `true`).
   * When `true`, uses weights w_i = (1−α)^i, normalised.
   * When `false`, uses the recursive formula: y_t = α·x_t + (1−α)·y_{t−1}.
   */
  readonly adjust?: boolean;
  /**
   * Minimum number of non-null observations to produce a result.  Defaults to 0.
   */
  readonly minPeriods?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when scalar is considered missing (null | undefined | NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Derive alpha from the provided options (exactly one of com/span/halflife/alpha). */
function resolveAlpha(opts: EWMOptions): number {
  const { alpha, com, span, halflife } = opts;
  const provided = [alpha, com, span, halflife].filter((v) => v !== undefined).length;
  if (provided !== 1) {
    throw new Error("Exactly one of alpha, com, span, or halflife must be provided.");
  }
  if (alpha !== undefined) {
    if (alpha <= 0 || alpha > 1) {
      throw new RangeError(`alpha must be in (0, 1], got ${alpha}`);
    }
    return alpha;
  }
  if (com !== undefined) {
    if (com < 0) {
      throw new RangeError(`com must be >= 0, got ${com}`);
    }
    return 1 / (1 + com);
  }
  if (span !== undefined) {
    if (span < 1) {
      throw new RangeError(`span must be >= 1, got ${span}`);
    }
    return 2 / (span + 1);
  }
  // halflife is the only remaining option
  const hl = halflife as number;
  if (hl <= 0) {
    throw new RangeError(`halflife must be > 0, got ${hl}`);
  }
  return 1 - Math.exp(-Math.LN2 / hl);
}

/**
 * Compute EWM mean using the adjusted (weighted) formula.
 *
 * For non-null values x_{j_0}, x_{j_1}, …, x_{j_k} in positions j_0 < … < j_k ≤ i:
 *   y_i = Σ w_t · x_{j_t}  /  Σ w_t
 * where w_t = (1−α)^(k−t).
 *
 * Missing values are simply skipped.
 */
function ewmMeanAdjusted(
  data: readonly Scalar[],
  alpha: number,
  minPeriods: number,
): (number | null)[] {
  const n = data.length;
  const result: (number | null)[] = [];
  const nonMissingVals: number[] = [];

  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (!isMissing(v) && typeof v === "number") {
      nonMissingVals.push(v);
    }
    if (nonMissingVals.length < minPeriods) {
      result.push(null);
      continue;
    }
    result.push(computeAdjustedMean(nonMissingVals, alpha));
  }
  return result;
}

/** Compute adjusted EWM mean from collected non-missing values. */
function computeAdjustedMean(vals: number[], alpha: number): number {
  const k = vals.length - 1;
  let weightedSum = 0;
  let weightSum = 0;
  for (let t = 0; t <= k; t++) {
    const w = (1 - alpha) ** (k - t);
    const vt = vals[t];
    if (vt !== undefined) {
      weightedSum += w * vt;
      weightSum += w;
    }
  }
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}

/**
 * Compute EWM mean using the recursive (non-adjusted) formula:
 *   y_t = α·x_t + (1−α)·y_{t-1}
 * Missing values propagate the previous result.
 */
function ewmMeanRecursive(
  data: readonly Scalar[],
  alpha: number,
  minPeriods: number,
): (number | null)[] {
  const n = data.length;
  const result: (number | null)[] = [];
  let prevMean: number | null = null;
  let nonMissingCount = 0;

  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (!isMissing(v) && typeof v === "number") {
      nonMissingCount++;
      prevMean = prevMean === null ? v : alpha * v + (1 - alpha) * prevMean;
    }
    result.push(nonMissingCount >= minPeriods ? prevMean : null);
  }
  return result;
}

/**
 * Compute EWM variance (adjusted form, ddof=1) and optionally std.
 * Uses the adjusted weighted variance formula.
 */
function ewmVarAdjusted(
  data: readonly Scalar[],
  alpha: number,
  minPeriods: number,
): (number | null)[] {
  const n = data.length;
  const result: (number | null)[] = [];
  const nonMissingVals: number[] = [];

  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (!isMissing(v) && typeof v === "number") {
      nonMissingVals.push(v);
    }
    if (nonMissingVals.length < Math.max(minPeriods, 2)) {
      result.push(null);
      continue;
    }
    result.push(computeAdjustedVar(nonMissingVals, alpha));
  }
  return result;
}

/** Compute adjusted EWM variance from collected non-missing values. */
function computeAdjustedVar(vals: number[], alpha: number): number {
  const k = vals.length - 1;
  let w2sum = 0;
  let wsum = 0;
  let weightedSumX = 0;
  let weightedSumX2 = 0;
  for (let t = 0; t <= k; t++) {
    const w = (1 - alpha) ** (k - t);
    const vt = vals[t];
    if (vt !== undefined) {
      wsum += w;
      w2sum += w * w;
      weightedSumX += w * vt;
      weightedSumX2 += w * vt * vt;
    }
  }
  if (wsum === 0) {
    return Number.NaN;
  }
  const mean = weightedSumX / wsum;
  const rawVar = weightedSumX2 / wsum - mean * mean;
  // bias correction: multiply by wsum^2 / (wsum^2 - w2sum)
  const denom = wsum * wsum - w2sum;
  if (denom <= 0) {
    return Number.NaN;
  }
  return (rawVar * (wsum * wsum)) / denom;
}

/** Build a Series<number | null> result with the same index as `source`. */
function buildResult(source: Series<Scalar>, values: (number | null)[]): Series<number | null> {
  return new Series<number | null>({
    data: values,
    index: source.index,
    name: source.name ?? undefined,
  });
}

// ─── SeriesEWM ────────────────────────────────────────────────────────────────

/**
 * Exponentially Weighted Moving view of a Series.
 *
 * @example
 * ```ts
 * ewm(series, { span: 5 }).mean();
 * ```
 */
export class SeriesEWM {
  private readonly _source: Series<Scalar>;
  private readonly _alpha: number;
  private readonly _adjust: boolean;
  private readonly _minPeriods: number;

  constructor(source: Series<Scalar>, options: EWMOptions) {
    this._source = source;
    this._alpha = resolveAlpha(options);
    this._adjust = options.adjust ?? true;
    this._minPeriods = options.minPeriods ?? 0;
  }

  /** Compute exponentially weighted mean. */
  mean(): Series<number | null> {
    const data = this._source.values;
    const values = this._adjust
      ? ewmMeanAdjusted(data, this._alpha, this._minPeriods)
      : ewmMeanRecursive(data, this._alpha, this._minPeriods);
    return buildResult(this._source, values);
  }

  /** Compute exponentially weighted variance (ddof=1). */
  var(): Series<number | null> {
    const values = ewmVarAdjusted(this._source.values, this._alpha, this._minPeriods);
    return buildResult(this._source, values);
  }

  /** Compute exponentially weighted standard deviation (ddof=1). */
  std(): Series<number | null> {
    const varVals = ewmVarAdjusted(this._source.values, this._alpha, this._minPeriods);
    const stdVals = varVals.map((v) => (v === null ? null : Math.sqrt(v)));
    return buildResult(this._source, stdVals);
  }
}

// ─── DataFrameEWM ─────────────────────────────────────────────────────────────

/**
 * Exponentially Weighted Moving view of a DataFrame (column-wise).
 */
export class DataFrameEWM {
  private readonly _df: DataFrame;
  private readonly _options: EWMOptions;

  constructor(df: DataFrame, options: EWMOptions) {
    this._df = df;
    this._options = options;
  }

  /** Compute EWM mean for each column. */
  mean(): DataFrame {
    return this._applyColumns((e) => e.mean());
  }

  /** Compute EWM variance for each column. */
  var(): DataFrame {
    return this._applyColumns((e) => e.var());
  }

  /** Compute EWM std for each column. */
  std(): DataFrame {
    return this._applyColumns((e) => e.std());
  }

  private _applyColumns(fn: (e: SeriesEWM) => Series<number | null>): DataFrame {
    const colNames = [...this._df.columns.values()];
    const colData: Record<string, readonly Scalar[]> = {};
    for (const name of colNames) {
      const col = this._df.get(name);
      if (col !== undefined) {
        const result = fn(new SeriesEWM(col, this._options));
        colData[name] = result.values;
      }
    }
    return DataFrame.fromColumns(colData, { index: this._df.index as Index<Label> });
  }
}

// ─── factory functions ────────────────────────────────────────────────────────

/**
 * Create an EWM view of a Series.
 *
 * @param source - The input Series.
 * @param options - EWM configuration (one of: alpha, com, span, halflife).
 *
 * @example
 * ```ts
 * ewm(series, { span: 10 }).mean();
 * ewm(series, { alpha: 0.3, adjust: false }).mean();
 * ```
 */
export function ewm(source: Series<Scalar>, options: EWMOptions): SeriesEWM;

/**
 * Create an EWM view of a DataFrame (column-wise).
 *
 * @param source - The input DataFrame.
 * @param options - EWM configuration.
 */
export function ewm(source: DataFrame, options: EWMOptions): DataFrameEWM;

export function ewm(
  source: Series<Scalar> | DataFrame,
  options: EWMOptions,
): SeriesEWM | DataFrameEWM {
  if (source instanceof DataFrame) {
    return new DataFrameEWM(source, options);
  }
  return new SeriesEWM(source, options);
}
