/**
 * rolling_cross_corr — cross-correlation and rolling cross-correlation at
 * multiple lags.
 *
 * Cross-correlation measures how similar two signals are when one is shifted
 * relative to the other.  For a lag `l`, the cross-correlation is the Pearson
 * correlation of `x` with `y` shifted by `l` positions:
 *
 * - Positive `l`: `y` is shifted **right** — correlation of `x[i]` with `y[i−l]`.
 * - Negative `l`: `y` is shifted **left**  — correlation of `x[i]` with `y[i+|l|]`.
 *
 * This mirrors the relationship `pandas.Series.rolling(w).corr(y.shift(-l))`.
 *
 * Two entry-points are provided:
 *
 * - **{@link crossCorr}**: overall (non-windowed) cross-correlation across the
 *   full series length for a range of lags.  Returns a `Series<Scalar>`
 *   indexed by the lag values.
 *
 * - **{@link rollingCrossCorr}**: windowed cross-correlation — for each time
 *   position `i` and each lag `l`, computes the Pearson correlation of the
 *   window `x[i−w+1 … i]` with `y[i−w+1+l … i+l]`.  Returns a DataFrame
 *   whose rows correspond to time and whose columns correspond to lags.
 *
 * @example
 * ```ts
 * import { crossCorr, rollingCrossCorr } from "tsb";
 *
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [0, 1, 2, 3, 4] });
 *
 * // y is x shifted by 1 → perfect correlation at lag = +1
 * crossCorr(x, y, { lags: [-1, 0, 1] });
 * // Series  lag_-1→NaN, lag_0→1, lag_1→1   (indexed by lag label)
 *
 * rollingCrossCorr(x, y, 3, { lags: [0, 1] });
 * // DataFrame with columns ["lag_0","lag_1"] and 5 rows
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── option types ──────────────────────────────────────────────────────────────

/** Options for {@link crossCorr}. */
export interface CrossCorrOptions {
  /**
   * Explicit list of integer lags to evaluate.  When provided, `maxLag` is
   * ignored.
   *
   * A lag `l` means: correlate `x[i]` with `y[i − l]`.
   * - `l > 0` → `y` leads `x` (positive lag).
   * - `l < 0` → `x` leads `y` (negative lag).
   */
  readonly lags?: readonly number[];
  /**
   * Maximum absolute lag when `lags` is not given.  The function evaluates
   * lags in `[−maxLag, …, +maxLag]`.
   *
   * Defaults to `Math.min(n − 1, 20)` where `n` is the series length.
   */
  readonly maxLag?: number;
  /**
   * Minimum number of valid paired observations required to produce a
   * non-null result.  Defaults to `2`.
   */
  readonly minPeriods?: number;
}

/** Options for {@link rollingCrossCorr}. */
export interface RollingCrossCorrOptions {
  /**
   * Explicit list of integer lags to evaluate.
   */
  readonly lags?: readonly number[];
  /**
   * Maximum absolute lag.  Defaults to `Math.min(window − 1, 5)`.
   */
  readonly maxLag?: number;
  /**
   * Minimum valid pairs per window.  Defaults to `2`.
   */
  readonly minPeriods?: number;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True when `v` is a missing sentinel (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build the sorted array of lags to evaluate.
 *
 * If `opts.lags` is given, use those (deduplicated and integer-rounded).
 * Otherwise generate `[−maxLag, …, +maxLag]`.
 */
function resolveLags(n: number, opts: CrossCorrOptions | RollingCrossCorrOptions, defaultMax: number): number[] {
  if (opts.lags !== undefined) {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const l of opts.lags) {
      const li = Math.round(l);
      if (!seen.has(li)) {
        seen.add(li);
        out.push(li);
      }
    }
    return out.sort((a, b) => a - b);
  }
  const maxLag = opts.maxLag !== undefined ? Math.max(0, Math.round(opts.maxLag)) : defaultMax;
  const out: number[] = [];
  for (let l = -maxLag; l <= maxLag; l++) {
    out.push(l);
  }
  return out;
}

/** Column name for a lag value. */
function lagLabel(l: number): string {
  return l < 0 ? `lag_neg${Math.abs(l)}` : `lag_${l}`;
}

/**
 * Pearson correlation of two parallel numeric arrays.
 *
 * Returns `null` when `n < 2`, `NaN` when either variance is zero.
 */
function pearsonCorr(px: readonly number[], py: readonly number[]): number | null {
  const n = px.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += px[i] as number;
    sy += py[i] as number;
  }
  const mx = sx / n;
  const my = sy / n;
  let covXY = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (px[i] as number) - mx;
    const dy = (py[i] as number) - my;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return Number.NaN;
  return covXY / Math.sqrt(varX * varY);
}

/**
 * Collect valid (x[i], y[i−lag]) pairs over the range [start, end).
 *
 * `y` is indexed at `i − lag`, i.e. a positive lag shifts `y` right in the
 * past (looking backward).
 */
function collectPairs(
  xs: readonly Scalar[],
  ys: readonly Scalar[],
  start: number,
  end: number,
  lag: number,
): { px: number[]; py: number[] } {
  const n = ys.length;
  const px: number[] = [];
  const py: number[] = [];
  for (let i = start; i < end; i++) {
    const yi = i - lag;
    if (yi < 0 || yi >= n) continue;
    const xv = xs[i];
    const yv = ys[yi];
    if (
      !isMissing(xv) &&
      typeof xv === "number" &&
      !isMissing(yv) &&
      typeof yv === "number"
    ) {
      px.push(xv);
      py.push(yv);
    }
  }
  return { px, py };
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute the full (non-windowed) cross-correlation between two Series at
 * multiple lags.
 *
 * For each lag `l`, all valid pairs `(x[i], y[i − l])` across the entire
 * length of the series are collected and their Pearson correlation is
 * computed.  The result is a `Series<Scalar>` indexed by lag labels.
 *
 * @param x - First Series.
 * @param y - Second Series (must have the same length as `x`).
 * @param options - Optional configuration (lags, maxLag, minPeriods).
 * @returns A `Series<Scalar>` indexed by lag labels, containing Pearson
 *   correlation values (`null` below `minPeriods`, `NaN` for zero variance).
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [0, 1, 2, 3, 4] });
 * crossCorr(x, y, { lags: [0, 1] });
 * // lag_0 → 1 (perfectly correlated at zero lag)
 * // lag_1 → 1 (y is x shifted by 1 → also perfect at lag 1)
 * ```
 */
export function crossCorr(
  x: Series<Scalar>,
  y: Series<Scalar>,
  options?: CrossCorrOptions,
): Series<Scalar> {
  const n = x.values.length;
  if (y.values.length !== n) {
    throw new RangeError(
      `crossCorr: x and y must have the same length (${n} vs ${y.values.length})`,
    );
  }
  const opts = options ?? {};
  const minPeriods = opts.minPeriods ?? 2;
  const defaultMax = Math.min(n > 0 ? n - 1 : 0, 20);
  const lags = resolveLags(n, opts, defaultMax);
  const xs = x.values as readonly Scalar[];
  const ys = y.values as readonly Scalar[];

  const data: Scalar[] = [];
  const labels: Label[] = [];
  for (const l of lags) {
    labels.push(lagLabel(l));
    const { px, py } = collectPairs(xs, ys, 0, n, l);
    if (px.length < minPeriods) {
      data.push(null);
    } else {
      data.push(pearsonCorr(px, py));
    }
  }
  return new Series<Scalar>({ data, index: new Index(labels) });
}

/**
 * Compute rolling cross-correlation between two Series at multiple lags.
 *
 * For each time position `i` and each lag `l`, the Pearson correlation of
 * the trailing window `x[i−w+1 … i]` with `y[i−w+1+l … i+l]` is computed.
 * The result is a DataFrame whose rows align with the input series and whose
 * columns correspond to the lag labels.
 *
 * This mirrors `pandas.Series.rolling(window).corr(y.shift(-l))` for each
 * lag `l` in the requested set.
 *
 * @param x - First Series (`n` elements).
 * @param y - Second Series (same length as `x`).
 * @param window - Size of the trailing rolling window (≥ 1).
 * @param options - Optional configuration (lags, maxLag, minPeriods).
 * @returns A DataFrame with `n` rows and one column per lag.  Cells are
 *   `null` when the window has fewer than `minPeriods` valid pairs, `NaN`
 *   when either sub-window has zero variance.
 *
 * @example
 * ```ts
 * const x = new Series({ data: [1, 2, 3, 4, 5] });
 * const y = new Series({ data: [0, 1, 2, 3, 4] });
 * const df = rollingCrossCorr(x, y, 3, { lags: [0, 1] });
 * // df.col("lag_0"): [null, null, 1, 1, 1]
 * // df.col("lag_1"): [null, null, 1, 1, 1]
 * ```
 */
export function rollingCrossCorr(
  x: Series<Scalar>,
  y: Series<Scalar>,
  window: number,
  options?: RollingCrossCorrOptions,
): DataFrame {
  if (window < 1) {
    throw new RangeError(`rollingCrossCorr: window must be ≥ 1, got ${window}`);
  }
  const n = x.values.length;
  if (y.values.length !== n) {
    throw new RangeError(
      `rollingCrossCorr: x and y must have the same length (${n} vs ${y.values.length})`,
    );
  }
  const opts = options ?? {};
  const minPeriods = opts.minPeriods ?? 2;
  const defaultMax = Math.min(window > 0 ? window - 1 : 0, 5);
  const lags = resolveLags(n, opts, defaultMax);
  const xs = x.values as readonly Scalar[];
  const ys = y.values as readonly Scalar[];

  const colMap = new Map<string, Series<Scalar>>();
  for (const l of lags) {
    const col = lagLabel(l);
    const data: Scalar[] = [];
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - window + 1);
      const { px, py } = collectPairs(xs, ys, start, i + 1, l);
      if (px.length < minPeriods) {
        data.push(null);
      } else {
        data.push(pearsonCorr(px, py));
      }
    }
    colMap.set(col, new Series<Scalar>({ data, index: x.index }));
  }
  return new DataFrame(colMap, x.index);
}
