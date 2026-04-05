/**
 * Random sampling — `sample` for Series and DataFrame.
 *
 * Mirrors `pandas.Series.sample` and `pandas.DataFrame.sample`.
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Simple seeded LCG pseudo-random number generator. */
class Rng {
  private state: number;

  constructor(seed?: number) {
    this.state = seed !== undefined ? seed : Math.trunc(Math.random() * 2 ** 31);
  }

  /** Returns a float in [0, 1). */
  next(): number {
    // Knuth's multiplicative LCG
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 4294967296;
  }

  /** Fisher-Yates shuffle on a copy of `arr`. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = out[i];
      const tmp2 = out[j];
      if (tmp !== undefined && tmp2 !== undefined) {
        out[i] = tmp2;
        out[j] = tmp;
      }
    }
    return out;
  }

  /** Sample `k` indices from [0, n) without replacement. */
  sampleWithout(n: number, k: number): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    const shuffled = this.shuffle(indices);
    return shuffled.slice(0, k);
  }

  /** Sample `k` indices from [0, n) with replacement. */
  sampleWith(n: number, k: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < k; i++) {
      out.push(Math.floor(this.next() * n));
    }
    return out;
  }
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for {@link sampleSeries} and {@link sampleDataFrame}. */
export interface SampleOptions {
  /** Number of items to sample. Mutually exclusive with `frac`. */
  n?: number;
  /** Fraction of items to sample. Mutually exclusive with `n`. */
  frac?: number;
  /** Sample with replacement. Default `false`. */
  replace?: boolean;
  /** Weights for each element (not normalized — relative weights). */
  weights?: readonly number[];
  /** Random seed for reproducibility. */
  random_state?: number;
  /** Axis: 0 = rows (default), 1 = columns. */
  axis?: 0 | 1;
}

/** Resolve n from options. */
function resolveN(total: number, opts: SampleOptions): number {
  if (opts.frac !== undefined) {
    return Math.round(opts.frac * total);
  }
  return opts.n ?? 1;
}

// ─── sampleSeries ─────────────────────────────────────────────────────────────

/**
 * Return a random sample of elements from a Series.
 *
 * @example
 * ```ts
 * sampleSeries(s, { n: 2, random_state: 42 });
 * ```
 */
export function sampleSeries(s: Series<Scalar>, opts: SampleOptions = {}): Series<Scalar> {
  const total = s.values.length;
  const n = resolveN(total, opts);
  const replace = opts.replace ?? false;
  const rng = new Rng(opts.random_state);

  const indices = replace ? rng.sampleWith(total, n) : rng.sampleWithout(total, n);
  const vals = s.values;
  const data: Scalar[] = indices.map((i) => vals[i] ?? null);

  return new Series<Scalar>({
    data,
    index: s.index.take(indices),
    name: s.name,
  });
}

// ─── sampleDataFrame ──────────────────────────────────────────────────────────

/**
 * Return a random sample of rows (or columns) from a DataFrame.
 *
 * @example
 * ```ts
 * sampleDataFrame(df, { n: 3, random_state: 0 });
 * ```
 */
export function sampleDataFrame(df: DataFrame, opts: SampleOptions = {}): DataFrame {
  const axis = opts.axis ?? 0;
  const replace = opts.replace ?? false;
  const rng = new Rng(opts.random_state);

  if (axis === 1) {
    return sampleColumns(df, opts, replace, rng);
  }
  return sampleRows(df, opts, replace, rng);
}

/** Sample rows from a DataFrame. */
function sampleRows(df: DataFrame, opts: SampleOptions, replace: boolean, rng: Rng): DataFrame {
  const nRows = df.shape[0];
  const n = resolveN(nRows, opts);
  const indices = replace ? rng.sampleWith(nRows, n) : rng.sampleWithout(nRows, n);

  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    const vals = (df.col(col) as Series<Scalar>).values;
    data[col] = indices.map((i) => vals[i] ?? null);
  }
  return DataFrame.fromColumns(data, { index: df.index.take(indices) });
}

/** Sample columns from a DataFrame. */
function sampleColumns(df: DataFrame, opts: SampleOptions, replace: boolean, rng: Rng): DataFrame {
  const colArr = df.columns.toArray();
  const nCols = colArr.length;
  const n = resolveN(nCols, opts);
  const indices = replace ? rng.sampleWith(nCols, n) : rng.sampleWithout(nCols, n);

  const data: Record<string, Scalar[]> = {};
  for (const i of indices) {
    const col = colArr[i];
    if (col !== undefined) {
      data[col] = (df.col(col) as Series<Scalar>).values as Scalar[];
    }
  }
  return DataFrame.fromColumns(data, { index: df.index });
}
