/**
 * sample — random sampling from Series and DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.sample(n, frac, replace, weights, random_state, axis)`
 * - `pandas.DataFrame.sample(n, frac, replace, weights, random_state, axis)`
 *
 * @module
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link sampleSeries} and {@link sampleDataFrame}. */
export interface SampleOptions {
  /**
   * Number of items to return. Mutually exclusive with `frac`.
   * @defaultValue `1` (when neither `n` nor `frac` is provided)
   */
  readonly n?: number;
  /**
   * Fraction of items to return (e.g. `0.5` for 50%).
   * Mutually exclusive with `n`.
   */
  readonly frac?: number;
  /**
   * Allow sampling with replacement (the same item may appear multiple times).
   * @defaultValue `false`
   */
  readonly replace?: boolean;
  /**
   * Weights for each item. Must have the same length as the Series/DataFrame.
   * Weights do not need to sum to 1 — they are normalized internally.
   * Missing weights (null/undefined/NaN) are treated as 0.
   */
  readonly weights?: readonly (number | null | undefined)[];
  /**
   * Seed for the random number generator.  When provided, sampling is
   * deterministic (same seed + same data → same result).
   * Uses a simple LCG (linear congruential generator).
   */
  readonly randomState?: number;
  /**
   * Axis to sample along (DataFrame only).
   * - `0` or `"index"` (default): sample rows.
   * - `1` or `"columns"`: sample columns.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── seeded RNG ───────────────────────────────────────────────────────────────

/**
 * Minimal LCG-based PRNG (Knuth constants).
 * Returns a new seed and a float in [0, 1).
 */
function lcgNext(seed: number): [number, number] {
  // LCG parameters (Numerical Recipes)
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  const nextSeed = ((a * seed + c) >>> 0) % m;
  return [nextSeed, nextSeed / m];
}

/** Build a seeded random float generator that returns [0,1). */
function makeRng(seed: number | undefined): () => number {
  if (seed === undefined) {
    return () => Math.random();
  }
  let s = seed >>> 0; // ensure 32-bit unsigned
  return () => {
    const [ns, r] = lcgNext(s);
    s = ns;
    return r;
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Resolve how many items to sample from a pool of size `poolSize`. */
function resolveN(poolSize: number, n: number | undefined, frac: number | undefined): number {
  if (n !== undefined && frac !== undefined) {
    throw new Error("Sample: specify either `n` or `frac`, not both.");
  }
  if (frac !== undefined) {
    if (frac < 0) {
      throw new RangeError("Sample: `frac` must be >= 0.");
    }
    return Math.floor(frac * poolSize);
  }
  if (n !== undefined) {
    if (n < 0) {
      throw new RangeError("Sample: `n` must be >= 0.");
    }
    return n;
  }
  return 1;
}

/** Normalize weights to probabilities summing to 1. */
function normalizeWeights(
  rawWeights: readonly (number | null | undefined)[],
  poolSize: number,
): number[] {
  if (rawWeights.length !== poolSize) {
    throw new RangeError(
      `Sample: weights length (${rawWeights.length}) must equal pool size (${poolSize}).`,
    );
  }
  const ws = rawWeights.map((w) => {
    const v = w ?? 0;
    if (typeof v !== "number" || Number.isNaN(v) || v < 0) {
      return 0;
    }
    return v;
  });
  const total = ws.reduce((s, v) => s + v, 0);
  if (total === 0) {
    throw new Error("Sample: all weights are zero.");
  }
  return ws.map((w) => w / total);
}

/**
 * Weighted random sample without replacement using the alias method.
 * Falls back to basic weighted sampling when `replace=true`.
 */
function weightedSampleWithoutReplacement(
  poolSize: number,
  k: number,
  probs: number[],
  rng: () => number,
): number[] {
  // Use reservoir sampling with exponential keys: assign key = rand^(1/w), take top-k
  const keys: Array<[number, number]> = probs.map((p, i) => {
    const r = rng();
    const key = p > 0 ? r ** (1 / p) : 0;
    return [key, i];
  });
  keys.sort((a, b) => b[0] - a[0]);
  return keys.slice(0, k).map(([, i]) => i);
}

/**
 * Weighted sample WITH replacement: pick `k` indices based on cumulative probabilities.
 */
function weightedSampleWithReplacement(k: number, probs: number[], rng: () => number): number[] {
  const cumulative: number[] = [];
  let sum = 0;
  for (const p of probs) {
    sum += p;
    cumulative.push(sum);
  }

  const result: number[] = [];
  for (let i = 0; i < k; i++) {
    const r = rng();
    let idx = cumulative.findIndex((c) => c >= r);
    if (idx < 0) {
      idx = probs.length - 1;
    }
    result.push(idx);
  }
  return result;
}

/**
 * Fisher-Yates shuffle (unweighted, without replacement) — pick the first `k` elements.
 */
function fisherYatesSample(poolSize: number, k: number, rng: () => number): number[] {
  const indices = Array.from({ length: poolSize }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (poolSize - i));
    const tmp = indices[i];
    const jVal = indices[j];
    if (tmp !== undefined && jVal !== undefined) {
      indices[i] = jVal;
      indices[j] = tmp;
    }
  }
  return indices.slice(0, k);
}

/**
 * Sample with replacement (unweighted): draw `k` integers in [0, poolSize).
 */
function uniformSampleWithReplacement(poolSize: number, k: number, rng: () => number): number[] {
  const result: number[] = [];
  for (let i = 0; i < k; i++) {
    result.push(Math.floor(rng() * poolSize));
  }
  return result;
}

/** Core sampling logic: return an array of selected positions. */
function samplePositions(
  poolSize: number,
  k: number,
  replace: boolean,
  weights: readonly (number | null | undefined)[] | undefined,
  rng: () => number,
): number[] {
  if (poolSize === 0 || k === 0) {
    return [];
  }
  if (!replace && k > poolSize) {
    throw new RangeError(
      `Sample: cannot sample ${k} items without replacement from a pool of ${poolSize}.`,
    );
  }

  if (weights !== undefined) {
    const probs = normalizeWeights(weights, poolSize);
    if (replace) {
      return weightedSampleWithReplacement(k, probs, rng);
    }
    return weightedSampleWithoutReplacement(poolSize, k, probs, rng);
  }

  if (replace) {
    return uniformSampleWithReplacement(poolSize, k, rng);
  }
  return fisherYatesSample(poolSize, k, rng);
}

// ─── Series sample ────────────────────────────────────────────────────────────

/**
 * Return a random sample of items from a Series.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30, 40, 50] });
 * sampleSeries(s, { n: 3, randomState: 42 }).values; // [30, 10, 50] (deterministic)
 * ```
 */
export function sampleSeries(series: Series<Scalar>, options?: SampleOptions): Series<Scalar> {
  const opts = options ?? {};
  const k = resolveN(series.values.length, opts.n, opts.frac);
  const replace = opts.replace ?? false;
  const rng = makeRng(opts.randomState);

  const positions = samplePositions(series.values.length, k, replace, opts.weights, rng);
  const newValues: Scalar[] = positions.map((i) => series.values[i] ?? null);
  const newLabels: Label[] = positions.map((i) => series.index.at(i) ?? null);

  return new Series<Scalar>({
    data: newValues,
    index: new Index<Label>(newLabels),
    name: series.name ?? null,
    dtype: series.dtype,
  });
}

/**
 * Return a random sample of rows (or columns) from a DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([
 *   { a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 },
 * ]);
 * sampleDataFrame(df, { n: 2, randomState: 0 }).shape; // [2, 1]
 * ```
 */
export function sampleDataFrame(df: DataFrame, options?: SampleOptions): DataFrame {
  const opts = options ?? {};
  const axis = opts.axis ?? 0;
  const isColAxis = axis === 1 || axis === "columns";

  if (isColAxis) {
    return sampleDataFrameColumns(df, opts);
  }
  return sampleDataFrameRows(df, opts);
}

/** Sample rows from a DataFrame. */
function sampleDataFrameRows(df: DataFrame, opts: SampleOptions): DataFrame {
  const nRows = df.shape[0];
  const k = resolveN(nRows, opts.n, opts.frac);
  const replace = opts.replace ?? false;
  const rng = makeRng(opts.randomState);

  const positions = samplePositions(nRows, k, replace, opts.weights, rng);
  const newLabels: Label[] = positions.map((i) => df.index.at(i) ?? null);
  const newIndex = new Index<Label>(newLabels);

  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const newVals: Scalar[] = positions.map((i) => col.values[i] ?? null);
    colMap.set(
      name,
      new Series<Scalar>({
        data: newVals,
        index: newIndex,
        dtype: col.dtype,
      }),
    );
  }
  return new DataFrame(colMap, newIndex);
}

/** Sample columns from a DataFrame. */
function sampleDataFrameColumns(df: DataFrame, opts: SampleOptions): DataFrame {
  const allCols = df.columns.values;
  const nCols = allCols.length;
  const k = resolveN(nCols, opts.n, opts.frac);
  const replace = opts.replace ?? false;
  const rng = makeRng(opts.randomState);

  const positions = samplePositions(nCols, k, replace, opts.weights, rng);

  const colMap = new Map<string, Series<Scalar>>();
  for (const pos of positions) {
    const name = allCols[pos];
    if (name !== undefined) {
      const col = df.col(name);
      colMap.set(name, col);
    }
  }
  return new DataFrame(colMap, df.index);
}
