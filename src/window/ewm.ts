/**
 * ewm — Exponentially Weighted Moving aggregations for Series.
 *
 * Mirrors `pandas.Series.ewm()`:
 * - `EWM` — EWM aggregations for a single Series-like object.
 *
 * Supported aggregations: `mean`, `std`, `var`, `cov`, `corr`, `apply`.
 *
 * Decay can be specified via `span`, `com`, `halflife`, or directly as `alpha`.
 *
 * For DataFrame EWM, see `DataFrameEwm` in `core/frame.ts`.
 *
 * @module
 */

import type { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── option types ─────────────────────────────────────────────────────────────

/**
 * Options for {@link EWM}.
 *
 * Exactly **one** of `span`, `com`, `halflife`, or `alpha` must be provided.
 */
export interface EwmOptions {
  /**
   * Specify decay in terms of span `s` ≥ 1.
   * `alpha = 2 / (s + 1)`.
   */
  readonly span?: number;
  /**
   * Specify decay in terms of center of mass `c` ≥ 0.
   * `alpha = 1 / (1 + c)`.
   */
  readonly com?: number;
  /**
   * Specify decay in terms of half-life `h` > 0.
   * `alpha = 1 − exp(−ln(2) / h)`.
   */
  readonly halflife?: number;
  /**
   * Smoothing factor `0 < alpha ≤ 1` (directly specified).
   */
  readonly alpha?: number;
  /**
   * Divide by decaying adjustment factor to account for imbalance in
   * relative weightings at the beginning of the series.
   *
   * Defaults to `true` (matching pandas).
   */
  readonly adjust?: boolean;
  /**
   * Ignore missing values (null / NaN) when computing weights.
   *
   * - `false` (default): missing observations do not contribute to the
   *   numerator but their time-step still causes the exponential weight
   *   of earlier observations to decay.
   * - `true`: missing observations are skipped entirely — they have no
   *   effect on weights or the rolling state.
   */
  readonly ignoreNa?: boolean;
  /**
   * Minimum number of valid (non-null / non-NaN) observations required
   * to produce a non-null result.
   *
   * Defaults to `0` (matching pandas EWM default — a single observation
   * is enough to produce a result with `adjust=true`).
   */
  readonly minPeriods?: number;
}

// ─── forward-declared Series interface ────────────────────────────────────────

/**
 * Minimal interface for the Series type needed by EWM.
 * The real `Series<T>` class satisfies this interface.
 */
export interface EwmSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  /** Create a new Series with the given data, preserving index and name. */
  withValues(data: readonly Scalar[], name?: string | null): EwmSeriesLike;
  /** Return the values as a plain array. */
  toArray(): readonly Scalar[];
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True when a scalar is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Resolve the decay factor `alpha` from EwmOptions. */
function resolveAlpha(opts: EwmOptions): number {
  const defined = [opts.span, opts.com, opts.halflife, opts.alpha].filter((v) => v !== undefined);
  if (defined.length !== 1) {
    throw new Error(
      `EWM: exactly one of span, com, halflife, or alpha must be provided (got ${defined.length === 0 ? "none" : "multiple"})`,
    );
  }
  if (opts.span !== undefined) {
    if (opts.span < 1) {
      throw new RangeError(`EWM span must be >= 1, got ${opts.span}`);
    }
    return 2 / (opts.span + 1);
  }
  if (opts.com !== undefined) {
    if (opts.com < 0) {
      throw new RangeError(`EWM com must be >= 0, got ${opts.com}`);
    }
    return 1 / (1 + opts.com);
  }
  if (opts.halflife !== undefined) {
    if (opts.halflife <= 0) {
      throw new RangeError(`EWM halflife must be > 0, got ${opts.halflife}`);
    }
    return 1 - Math.exp(-Math.log(2) / opts.halflife);
  }
  // alpha directly specified
  const a = opts.alpha as number;
  if (a <= 0 || a > 1) {
    throw new RangeError(`EWM alpha must be in (0, 1], got ${a}`);
  }
  return a;
}

// ─── EWM state helpers ────────────────────────────────────────────────────────

/**
 * State for the online EWM mean computation (adjust=true).
 *
 * Maintains `S` (weighted sum of x) and `W` (sum of weights) so that
 * `mean = S / W`.  Also tracks `S2` (weighted sum of x²) and `W2`
 * (sum of squared weights) for variance computation.
 */
interface EwmState {
  S: number; // sum_i w_i * x_i
  W: number; // sum_i w_i
  S2: number; // sum_i w_i * x_i^2
  W2: number; // sum_i w_i^2
  nValid: number; // count of non-missing observations
}

/** Advance state by one time-step when the new observation is missing. */
function advanceMissing(state: EwmState, decay: number): EwmState {
  return {
    S: decay * state.S,
    W: decay * state.W,
    S2: decay * state.S2,
    W2: decay * decay * state.W2,
    nValid: state.nValid,
  };
}

/** Advance state by one time-step with a new valid observation `x`. */
function advanceValid(state: EwmState, x: number, decay: number): EwmState {
  return {
    S: x + decay * state.S,
    W: 1 + decay * state.W,
    S2: x * x + decay * state.S2,
    W2: 1 + decay * decay * state.W2,
    nValid: state.nValid + 1,
  };
}

/** Compute the biased-corrected variance from state. Returns NaN if < 2 valid obs. */
function ewmVar(state: EwmState): number {
  if (state.nValid < 2) {
    return Number.NaN;
  }
  const { S, W, S2, W2 } = state;
  const mean = S / W;
  const biasedVar = S2 / W - mean * mean;
  const denom = W * W - W2;
  if (denom <= 0) {
    return Number.NaN;
  }
  return (biasedVar * W * W) / denom;
}

/**
 * Compute the (un)biased covariance from running sums.
 * Returns null if denominator is non-positive for unbiased case.
 */
function computeCov(
  Sx: number,
  Sy: number,
  Sxy: number,
  W: number,
  W2: number,
  bias: boolean,
): number | null {
  const meanX = Sx / W;
  const meanY = Sy / W;
  const biasedCov = Sxy / W - meanX * meanY;
  if (bias) {
    return biasedCov;
  }
  const denom = W * W - W2;
  if (denom <= 0) {
    return null;
  }
  return (biasedCov * W * W) / denom;
}

/**
 * Compute the EWM Pearson correlation from running sums.
 * Returns null if variances are zero or denominator is non-positive.
 */
function computeCorr(
  Sx: number,
  Sy: number,
  Sx2: number,
  Sy2: number,
  Sxy: number,
  W: number,
  W2: number,
): number | null {
  const denom = W * W - W2;
  if (denom <= 0) {
    return null;
  }
  const scale = (W * W) / denom;
  const meanX = Sx / W;
  const meanY = Sy / W;
  const covXY = (Sxy / W - meanX * meanY) * scale;
  const varX = (Sx2 / W - meanX * meanX) * scale;
  const varY = (Sy2 / W - meanY * meanY) * scale;
  const denom2 = Math.sqrt(varX * varY);
  if (denom2 === 0) {
    return null;
  }
  return covXY / denom2;
}

// ─── EWM (adjust=false) helpers ───────────────────────────────────────────────

/** State for adjust=false (simple IIR). */
interface EwmIirState {
  mean: number;
  nValid: number;
}

// ─── EWM ─────────────────────────────────────────────────────────────────────

/**
 * Exponentially Weighted Moving aggregations for a single Series.
 *
 * Obtain via {@link Series.ewm}:
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4, 5] });
 * s.ewm({ span: 3 }).mean().toArray();
 * // [1, 1.666..., 2.428..., 3.266..., 4.161...]
 * ```
 *
 * Decay can be specified via:
 * - `span` ≥ 1 → `alpha = 2 / (span + 1)`
 * - `com` ≥ 0 → `alpha = 1 / (1 + com)`
 * - `halflife` > 0 → `alpha = 1 − exp(−ln(2) / halflife)`
 * - `alpha` ∈ (0, 1]
 */
export class EWM {
  private readonly _series: EwmSeriesLike;
  private readonly _alpha: number;
  private readonly _decay: number; // 1 - alpha
  private readonly _adjust: boolean;
  private readonly _ignoreNa: boolean;
  private readonly _minPeriods: number;

  /**
   * @param series  - Source Series (any dtype; non-numeric values treated as missing).
   * @param options - {@link EwmOptions} specifying the decay parameter.
   */
  constructor(series: EwmSeriesLike, options: EwmOptions) {
    this._series = series;
    this._alpha = resolveAlpha(options);
    this._decay = 1 - this._alpha;
    this._adjust = options.adjust ?? true;
    this._ignoreNa = options.ignoreNa ?? false;
    this._minPeriods = options.minPeriods ?? 0;
  }

  // ─── mean ──────────────────────────────────────────────────────────────────

  /** Exponentially weighted mean. */
  mean(): EwmSeriesLike {
    if (this._adjust) {
      return this._meanAdjusted();
    }
    return this._meanIir();
  }

  /** adjust=true: use weighted sum / sum-of-weights formulation. */
  private _meanAdjusted(): EwmSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    let state: EwmState = { S: 0, W: 0, S2: 0, W2: 0, nValid: 0 };

    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (isMissing(v)) {
        if (!this._ignoreNa) {
          state = advanceMissing(state, this._decay);
        }
        result[i] = null;
        continue;
      }
      state = advanceValid(state, v as number, this._decay);
      if (state.nValid >= Math.max(1, this._minPeriods)) {
        result[i] = state.S / state.W;
      }
    }

    return this._series.withValues(result);
  }

  /** adjust=false: simple IIR filter. */
  private _meanIir(): EwmSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    let state: EwmIirState = { mean: 0, nValid: 0 };
    let initialized = false;

    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (isMissing(v)) {
        result[i] = null;
        continue;
      }
      const x = v as number;
      if (initialized) {
        state = {
          mean: this._alpha * x + this._decay * state.mean,
          nValid: state.nValid + 1,
        };
      } else {
        state = { mean: x, nValid: 1 };
        initialized = true;
      }
      if (state.nValid >= Math.max(1, this._minPeriods)) {
        result[i] = state.mean;
      }
    }

    return this._series.withValues(result);
  }

  // ─── var / std ─────────────────────────────────────────────────────────────

  /**
   * Exponentially weighted variance.
   *
   * @param bias - Whether to use biased (population) variance.
   *               Defaults to `false` (sample variance, matching pandas).
   */
  var(bias = false): EwmSeriesLike {
    return this._applyVarLike(bias, false);
  }

  /**
   * Exponentially weighted standard deviation.
   *
   * @param bias - Whether to use biased (population) std.
   *               Defaults to `false` (sample std, matching pandas).
   */
  std(bias = false): EwmSeriesLike {
    const varSeries = this._applyVarLike(bias, false);
    const varVals = varSeries.values;
    const result: Scalar[] = varVals.map((v) => {
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return null;
      }
      return Math.sqrt(v as number);
    });
    return this._series.withValues(result);
  }

  /** Compute EWM variance (or biased) using adjust=true formulation. */
  private _applyVarLike(bias: boolean, _forCov: boolean): EwmSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    let state: EwmState = { S: 0, W: 0, S2: 0, W2: 0, nValid: 0 };

    const minObs = bias ? 1 : 2;

    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (isMissing(v)) {
        if (!this._ignoreNa) {
          state = advanceMissing(state, this._decay);
        }
        result[i] = null;
        continue;
      }
      state = advanceValid(state, v as number, this._decay);

      const needed = Math.max(minObs, this._minPeriods);
      if (state.nValid < needed) {
        result[i] = null;
        continue;
      }

      if (bias) {
        // Biased (population) variance: no Bessel correction
        const mean = state.S / state.W;
        result[i] = state.S2 / state.W - mean * mean;
      } else {
        const v2 = ewmVar(state);
        result[i] = Number.isNaN(v2) ? null : v2;
      }
    }

    return this._series.withValues(result);
  }

  // ─── cov ──────────────────────────────────────────────────────────────────

  /**
   * Pairwise exponentially weighted covariance with another Series.
   *
   * @param other - A second Series (must have the same length).
   * @param bias  - Whether to use biased covariance. Defaults to `false`.
   */
  cov(other: EwmSeriesLike, bias = false): EwmSeriesLike {
    return this._covImpl(other, bias);
  }

  private _covImpl(other: EwmSeriesLike, bias: boolean): EwmSeriesLike {
    const xs = this._series.values;
    const ys = other.values;
    const n = xs.length;
    if (ys.length !== n) {
      throw new RangeError(`EWM.cov: series lengths differ (${n} vs ${ys.length})`);
    }
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    let Sxy = 0;
    let W = 0;
    let W2 = 0;
    let Sx = 0;
    let Sy = 0;
    let nValid = 0;

    for (let i = 0; i < n; i++) {
      const xv = xs[i];
      const yv = ys[i];
      if (isMissing(xv) || isMissing(yv)) {
        if (!this._ignoreNa) {
          Sxy *= this._decay;
          Sx *= this._decay;
          Sy *= this._decay;
          W *= this._decay;
          W2 *= this._decay * this._decay;
        }
        result[i] = null;
        continue;
      }
      const x = xv as number;
      const y = yv as number;
      Sxy = x * y + this._decay * Sxy;
      Sx = x + this._decay * Sx;
      Sy = y + this._decay * Sy;
      W = 1 + this._decay * W;
      W2 = 1 + this._decay * this._decay * W2;
      nValid += 1;

      const needed = Math.max(bias ? 1 : 2, this._minPeriods);
      if (nValid < needed) {
        result[i] = null;
        continue;
      }

      result[i] = computeCov(Sx, Sy, Sxy, W, W2, bias);
    }

    return this._series.withValues(result);
  }

  // ─── corr ─────────────────────────────────────────────────────────────────

  /**
   * Pairwise exponentially weighted Pearson correlation with another Series.
   *
   * @param other - A second Series (must have the same length).
   */
  corr(other: EwmSeriesLike): EwmSeriesLike {
    const xs = this._series.values;
    const ys = other.values;
    const n = xs.length;
    if (ys.length !== n) {
      throw new RangeError(`EWM.corr: series lengths differ (${n} vs ${ys.length})`);
    }

    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    let Sxy = 0;
    let Sx = 0;
    let Sy = 0;
    let Sx2 = 0;
    let Sy2 = 0;
    let W = 0;
    let W2 = 0;
    let nValid = 0;

    for (let i = 0; i < n; i++) {
      const xv = xs[i];
      const yv = ys[i];
      if (isMissing(xv) || isMissing(yv)) {
        if (!this._ignoreNa) {
          const d = this._decay;
          const d2 = d * d;
          Sxy *= d;
          Sx *= d;
          Sy *= d;
          Sx2 *= d;
          Sy2 *= d;
          W *= d;
          W2 *= d2;
        }
        result[i] = null;
        continue;
      }
      const x = xv as number;
      const y = yv as number;
      const d = this._decay;
      const d2 = d * d;
      Sxy = x * y + d * Sxy;
      Sx = x + d * Sx;
      Sy = y + d * Sy;
      Sx2 = x * x + d * Sx2;
      Sy2 = y * y + d * Sy2;
      W = 1 + d * W;
      W2 = 1 + d2 * W2;
      nValid += 1;

      if (nValid < Math.max(2, this._minPeriods)) {
        result[i] = null;
        continue;
      }

      result[i] = computeCorr(Sx, Sy, Sx2, Sy2, Sxy, W, W2);
    }

    return this._series.withValues(result);
  }

  // ─── apply ────────────────────────────────────────────────────────────────

  /**
   * Apply a custom function to the exponentially weighted values.
   *
   * The function receives an array of valid values accumulated up to and
   * including the current position, along with their corresponding EW weights
   * `w_i = (1−alpha)^(t−i)` (unnormalized, oldest-first order).
   *
   * @param fn - Function receiving `(values, weights)` and returning a scalar.
   *             Called only when `minPeriods` valid observations are available.
   */
  apply(fn: (values: readonly number[], weights: readonly number[]) => number): EwmSeriesLike {
    const vals = this._series.values;
    const n = vals.length;
    const result: Scalar[] = Array.from({ length: n }, (): Scalar => null);

    // Collect valid values and their time-positions (for weight computation)
    const validValues: number[] = [];
    const validPositions: number[] = [];

    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (isMissing(v)) {
        result[i] = null;
        continue;
      }
      validValues.push(v as number);
      validPositions.push(i);

      if (validValues.length < Math.max(1, this._minPeriods)) {
        result[i] = null;
        continue;
      }

      // Compute weights: w_j = decay^(i - pos_j) for each valid observation j
      const weights: number[] = validPositions.map((pos) => {
        if (this._ignoreNa) {
          // Weight based on rank in valid sequence (not absolute position)
          return this._decay ** (validValues.length - 1 - validPositions.indexOf(pos));
        }
        return this._decay ** (i - pos);
      });

      result[i] = fn([...validValues], weights);
    }

    return this._series.withValues(result);
  }
}
