/**
 * sample — random sampling for Series and DataFrame.
 *
 * Mirrors `pandas.Series.sample()` and `pandas.DataFrame.sample()`:
 *
 * - `sampleSeries(series, options)` — random sample of elements from a Series.
 * - `sampleDataFrame(df, options)` — random sample of rows (or columns) from a DataFrame.
 *
 * Supports:
 * - Fixed count (`n`) or fraction (`frac`) sampling.
 * - With or without replacement.
 * - Weighted sampling via `weights`.
 * - Reproducible results via `randomState` (integer seed).
 * - `ignoreIndex` to reset the result index.
 * - DataFrame axis=1 to sample columns instead of rows.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link sampleSeries}. */
export interface SampleSeriesOptions {
  /**
   * Number of items to return. Mutually exclusive with `frac`.
   * If neither `n` nor `frac` is specified, defaults to `1`.
   */
  readonly n?: number;
  /**
   * Fraction of items to return (0 < frac ≤ 1, or > 1 with `replace=true`).
   * Mutually exclusive with `n`.
   */
  readonly frac?: number;
  /**
   * Sample with replacement (allows repeated selection of the same element).
   * @defaultValue `false`
   */
  readonly replace?: boolean;
  /**
   * Relative sampling weights. Must be the same length as the Series.
   * `null` / `undefined` weights are treated as 0. Weights need not sum to 1.
   */
  readonly weights?: readonly Scalar[];
  /**
   * Seed for the pseudo-random number generator.
   * Passing the same seed always produces the same sample.
   */
  readonly randomState?: number;
  /**
   * If `true`, reset the index of the result to 0, 1, 2, …
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
}

/** Options for {@link sampleDataFrame}. */
export interface SampleDataFrameOptions {
  /**
   * Number of rows (or columns when `axis=1`) to return.
   * Mutually exclusive with `frac`. Defaults to `1`.
   */
  readonly n?: number;
  /**
   * Fraction of rows (or columns when `axis=1`) to return.
   * Mutually exclusive with `n`.
   */
  readonly frac?: number;
  /**
   * Sample with replacement.
   * @defaultValue `false`
   */
  readonly replace?: boolean;
  /**
   * Relative sampling weights. Length must match the number of rows (or columns when `axis=1`).
   */
  readonly weights?: readonly Scalar[];
  /**
   * Seed for the pseudo-random number generator.
   */
  readonly randomState?: number;
  /**
   * If `true`, reset the row index of the result.
   * @defaultValue `false`
   */
  readonly ignoreIndex?: boolean;
  /**
   * Axis to sample along.
   * - `0` (default): sample rows.
   * - `1`: sample columns.
   */
  readonly axis?: 0 | 1;
}

// ─── pseudo-random number generator ──────────────────────────────────────────

/** xorshift32-based RNG. Fast, reproducible, zero external deps. */
class Rng {
  private _state: number;

  constructor(seed: number) {
    // Ensure non-zero starting state.
    this._state = seed >>> 0 || 0xdeadbeef;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let s = this._state;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this._state = s >>> 0;
    return (this._state >>> 0) / 0x1_0000_0000;
  }

  /** Returns an integer in [0, n). */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }
}

/** Build an Rng from an optional seed (falls back to time-based seed when absent). */
function makeRng(seed: number | undefined): Rng {
  if (seed !== undefined) {
    return new Rng(seed);
  }
  return new Rng((Date.now() ^ (Math.random() * 0xffff_ffff)) | 0);
}

// ─── weight helpers ───────────────────────────────────────────────────────────

/** Extract a non-negative number from a raw weight scalar. */
function extractWeight(w: Scalar, idx: number): number {
  const v = w === null || w === undefined ? 0 : (w as number);
  if (typeof v !== "number" || Number.isNaN(v) || v < 0) {
    throw new RangeError(`weights[${idx}] must be a non-negative number, got ${String(w)}`);
  }
  return v;
}

/**
 * Build a normalised CDF from a raw weights array.
 * Returns `null` if weights array is undefined (unweighted sampling).
 */
function buildCdf(weights: readonly Scalar[], n: number): readonly number[] {
  const raw: number[] = new Array<number>(n).fill(0);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = extractWeight(weights[i] as Scalar, i);
    raw[i] = v;
    total += v;
  }
  if (total === 0) {
    throw new RangeError("All sampling weights are zero or null.");
  }
  const cdf: number[] = new Array<number>(n).fill(0);
  let cumulative = 0;
  for (let i = 0; i < n; i++) {
    cumulative += (raw[i] as number) / total;
    cdf[i] = cumulative;
  }
  return cdf;
}

/** Rebuild CDF from mutable weights (used for weighted without-replacement). */
function rebuildCdf(rawWeights: number[]): readonly number[] {
  let total = 0;
  for (const w of rawWeights) {
    total += w;
  }
  if (total === 0) {
    throw new RangeError("All remaining sampling weights are zero.");
  }
  const cdf: number[] = new Array<number>(rawWeights.length).fill(0);
  let cumulative = 0;
  for (let i = 0; i < rawWeights.length; i++) {
    cumulative += (rawWeights[i] as number) / total;
    cdf[i] = cumulative;
  }
  return cdf;
}

/** Sample one index from [0, cdf.length) using the CDF and a random value in [0, 1). */
function sampleFromCdf(cdf: readonly number[], r: number): number {
  const idx = (cdf as number[]).findIndex((v) => r < v);
  return idx === -1 ? cdf.length - 1 : idx;
}

// ─── sampling core ────────────────────────────────────────────────────────────

/** Resolve sample count from `n` / `frac` options. */
function resolveCount(
  total: number,
  n: number | undefined,
  frac: number | undefined,
  replace: boolean,
): number {
  if (n !== undefined && frac !== undefined) {
    throw new TypeError("Cannot specify both `n` and `frac`.");
  }
  let count: number;
  if (frac !== undefined) {
    if (frac < 0) {
      throw new RangeError("`frac` must be non-negative.");
    }
    count = Math.round(frac * total);
  } else {
    count = n !== undefined ? n : 1;
  }
  if (count < 0) {
    throw new RangeError("`n` must be non-negative.");
  }
  if (!replace && count > total) {
    throw new RangeError(
      `Cannot sample ${count} items without replacement from a collection of size ${total}.`,
    );
  }
  return count;
}

/**
 * Draw `count` indices from [0, pool) without replacement.
 * Unweighted: partial Fisher-Yates shuffle.
 * Weighted: iterative CDF draw with weight zeroing.
 */
function sampleWithoutReplacement(
  pool: number,
  count: number,
  rng: Rng,
  rawWeights: number[] | null,
): readonly number[] {
  if (rawWeights !== null) {
    return weightedWithoutReplacement(pool, count, rng, rawWeights);
  }
  return fisherYatesSample(pool, count, rng);
}

/** Partial Fisher-Yates for unweighted without-replacement sampling. */
function fisherYatesSample(pool: number, count: number, rng: Rng): readonly number[] {
  const indices: number[] = Array.from({ length: pool }, (_, i) => i);
  const chosen: number[] = [];
  for (let i = 0; i < count; i++) {
    const remaining = pool - i;
    const j = i + rng.nextInt(remaining);
    const tmp = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = tmp;
    chosen.push(indices[i] as number);
  }
  return chosen;
}

/**
 * Weighted without-replacement: draw one item per step by rebuilding CDF
 * after zeroing the selected item's weight.
 */
function weightedWithoutReplacement(
  _pool: number,
  count: number,
  rng: Rng,
  initialWeights: number[],
): readonly number[] {
  const mutableWeights: number[] = [...initialWeights];
  const chosen: number[] = [];
  for (let i = 0; i < count; i++) {
    const cdf = rebuildCdf(mutableWeights);
    const idx = sampleFromCdf(cdf, rng.next());
    chosen.push(idx);
    mutableWeights[idx] = 0;
  }
  return chosen;
}

/**
 * Draw `count` indices from [0, pool) with replacement.
 */
function sampleWithReplacement(
  pool: number,
  count: number,
  rng: Rng,
  cdf: readonly number[] | null,
): readonly number[] {
  return Array.from({ length: count }, () =>
    cdf !== null ? sampleFromCdf(cdf, rng.next()) : rng.nextInt(pool),
  );
}

/**
 * Resolve weights to raw number[] for weighted operations,
 * or return null for unweighted sampling.
 */
function resolveWeights(weights: readonly Scalar[] | undefined, pool: number): number[] | null {
  if (weights === undefined) {
    return null;
  }
  const raw: number[] = new Array<number>(pool).fill(0);
  for (let i = 0; i < pool; i++) {
    raw[i] = extractWeight(weights[i] as Scalar, i);
  }
  return raw;
}

/** Core sampling logic: returns an array of chosen positions. */
function drawPositions(
  pool: number,
  count: number,
  replace: boolean,
  weights: readonly Scalar[] | undefined,
  rng: Rng,
): readonly number[] {
  const rawWeights = resolveWeights(weights, pool);
  if (replace) {
    const cdf = rawWeights !== null ? buildCdf(weights as readonly Scalar[], pool) : null;
    return sampleWithReplacement(pool, count, rng, cdf);
  }
  return sampleWithoutReplacement(pool, count, rng, rawWeights);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return a random sample of elements from `series`.
 *
 * Mirrors `pandas.Series.sample()`.
 *
 * @param series  - Input Series to sample from.
 * @param options - Sampling options (n, frac, replace, weights, randomState, ignoreIndex).
 * @returns A new Series containing the sampled elements.
 *
 * @example
 * ```ts
 * import { Series, sampleSeries } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30, 40, 50] });
 * sampleSeries(s, { n: 3, randomState: 42 }).size; // 3
 * ```
 */
export function sampleSeries(
  series: Series<Scalar>,
  options: SampleSeriesOptions = {},
): Series<Scalar> {
  const { n, frac, replace = false, weights, randomState, ignoreIndex = false } = options;
  const total = series.size;
  const count = resolveCount(total, n, frac, replace);
  if (count === 0) {
    return new Series<Scalar>({ data: [], name: series.name, dtype: series.dtype });
  }
  const rng = makeRng(randomState);
  const positions = drawPositions(total, count, replace, weights, rng);
  const data: Scalar[] = positions.map((i) => series.values[i] as Scalar);
  const idxVals: Label[] = ignoreIndex
    ? positions.map((_, k) => k)
    : positions.map((i) => series.index.at(i));
  return new Series<Scalar>({
    data,
    index: idxVals,
    name: series.name,
    dtype: series.dtype,
  });
}

/**
 * Return a random sample of rows (or columns) from `df`.
 *
 * Mirrors `pandas.DataFrame.sample()`.
 *
 * @param df      - Input DataFrame to sample from.
 * @param options - Sampling options.
 *   - `axis=0` (default): sample rows.
 *   - `axis=1`: sample columns.
 * @returns A new DataFrame containing the sampled rows or columns.
 *
 * @example
 * ```ts
 * import { DataFrame, sampleDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
 * sampleDataFrame(df, { n: 2, randomState: 0 }).index.size; // 2
 * ```
 */
export function sampleDataFrame(df: DataFrame, options: SampleDataFrameOptions = {}): DataFrame {
  const { n, frac, replace = false, weights, randomState, ignoreIndex = false, axis = 0 } = options;

  if (axis === 1) {
    return sampleColumns(df, n, frac, replace, weights, randomState);
  }
  return sampleRows(df, n, frac, replace, weights, randomState, ignoreIndex);
}

// ─── DataFrame row sampling ───────────────────────────────────────────────────

function sampleRows(
  df: DataFrame,
  n: number | undefined,
  frac: number | undefined,
  replace: boolean,
  weights: readonly Scalar[] | undefined,
  randomState: number | undefined,
  ignoreIndex: boolean,
): DataFrame {
  const total = df.index.size;
  const count = resolveCount(total, n, frac, replace);
  if (count === 0) {
    return df.iloc([]);
  }
  const rng = makeRng(randomState);
  const positions = drawPositions(total, count, replace, weights, rng);
  const result = df.iloc(positions as number[]);
  if (!ignoreIndex) {
    return result;
  }
  return resetDfIndex(result);
}

// ─── DataFrame column sampling ────────────────────────────────────────────────

function sampleColumns(
  df: DataFrame,
  n: number | undefined,
  frac: number | undefined,
  replace: boolean,
  weights: readonly Scalar[] | undefined,
  randomState: number | undefined,
): DataFrame {
  const colNames = df.columns.values;
  const total = colNames.length;
  const count = resolveCount(total, n, frac, replace);
  if (count === 0) {
    return DataFrame.fromColumns({});
  }
  const rng = makeRng(randomState);
  const positions = drawPositions(total, count, replace, weights, rng);
  const colsObj: Record<string, Scalar[]> = {};
  for (const pos of positions) {
    const name = colNames[pos] as string;
    // When replace=true the same column may appear multiple times; suffix with position.
    const colKey = colsObj[name] !== undefined ? `${name}_dup${pos}` : name;
    colsObj[colKey] = [...df.col(name).values];
  }
  return DataFrame.fromColumns(colsObj);
}

// ─── helper: reset row index ──────────────────────────────────────────────────

/** Rebuild a DataFrame with a default RangeIndex (0, 1, 2, …). */
function resetDfIndex(df: DataFrame): DataFrame {
  const colsObj: Record<string, Scalar[]> = {};
  for (const name of df.columns.values) {
    colsObj[name as string] = [...df.col(name as string).values];
  }
  return DataFrame.fromColumns(colsObj);
}
