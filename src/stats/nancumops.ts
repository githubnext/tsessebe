/**
 * nancumops — nan-ignoring aggregate functions for arrays and Series.
 *
 * Mirrors the following numpy / pandas utilities:
 * - `nansum(data, options?)` — sum, ignoring NaN / null
 * - `nanmean(data, options?)` — mean, ignoring NaN / null
 * - `nanmedian(data, options?)` — median, ignoring NaN / null
 * - `nanstd(data, options?)` — standard deviation, ignoring NaN / null
 * - `nanvar(data, options?)` — variance, ignoring NaN / null
 * - `nanmin(data, options?)` — minimum, ignoring NaN / null
 * - `nanmax(data, options?)` — maximum, ignoring NaN / null
 * - `nanprod(data, options?)` — product, ignoring NaN / null
 * - `nancount(data)` — count of non-NaN numeric values
 *
 * All functions accept `readonly Scalar[]` **or** a `Series<Scalar>` and
 * return a `number`.  Non-numeric scalars (strings, booleans, Dates) are
 * treated as if they were NaN and excluded.
 *
 * @module
 */

import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Input accepted by every nan-aggregate function. */
export type NanInput = readonly Scalar[] | Series<Scalar>;

/** Options shared by most nan-aggregate functions. */
export interface NanAggOptions {
  /**
   * Degrees of freedom for std / var (default `1` — matches numpy and
   * pandas default for `ddof`).
   *
   * Only meaningful for {@link nanstd} and {@link nanvar}.
   */
  readonly ddof?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns the underlying array from a Series or passes the array through. */
function toValues(input: NanInput): readonly Scalar[] {
  if (Array.isArray(input)) {
    return input as readonly Scalar[];
  }
  // Series<Scalar> — read via .values
  return (input as Series<Scalar>).values;
}

/** Returns only the finite numeric values from the input (NaN, null, undefined,
 *  non-numeric scalars are all dropped). */
function numericValues(input: NanInput): number[] {
  const raw = toValues(input);
  const out: number[] = [];
  for (const v of raw) {
    if (typeof v === "number" && !Number.isNaN(v)) {
      out.push(v);
    }
  }
  return out;
}

/** Sorts an array of numbers in ascending order (returns a new array). */
function sortedAsc(xs: number[]): number[] {
  return xs.slice().sort((a, b) => a - b);
}

// ─── public functions ─────────────────────────────────────────────────────────

/**
 * Count of non-NaN numeric values in `input`.
 *
 * @example
 * ```ts
 * nancount([1, 2, NaN, null, 3]); // 3
 * ```
 */
export function nancount(input: NanInput): number {
  return numericValues(input).length;
}

/**
 * Sum of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `0` when there are no valid values (matches numpy behaviour).
 *
 * @example
 * ```ts
 * nansum([1, 2, NaN, null, 3]); // 6
 * ```
 */
export function nansum(input: NanInput): number {
  const xs = numericValues(input);
  if (xs.length === 0) {
    return 0;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s;
}

/**
 * Arithmetic mean of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `Number.NaN` when there are no valid values.
 *
 * @example
 * ```ts
 * nanmean([1, 2, NaN, 3]); // 2
 * ```
 */
export function nanmean(input: NanInput): number {
  const xs = numericValues(input);
  if (xs.length === 0) {
    return Number.NaN;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/**
 * Median of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `Number.NaN` when there are no valid values.
 *
 * @example
 * ```ts
 * nanmedian([1, 3, 2, NaN]); // 2
 * ```
 */
export function nanmedian(input: NanInput): number {
  const xs = sortedAsc(numericValues(input));
  const n = xs.length;
  if (n === 0) {
    return Number.NaN;
  }
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return xs[mid] as number;
  }
  return ((xs[mid - 1] as number) + (xs[mid] as number)) / 2;
}

/**
 * Variance of numeric values in `input`, ignoring NaN / null.
 *
 * @param input - Array or Series of scalars.
 * @param options - `ddof` (degrees of freedom, default `1`).
 *
 * Returns `Number.NaN` when there are fewer valid values than `ddof + 1`.
 *
 * @example
 * ```ts
 * nanvar([2, 4, 4, 4, 5, 5, 7, 9], { ddof: 1 }); // 4.571...
 * ```
 */
export function nanvar(input: NanInput, options: NanAggOptions = {}): number {
  const ddof = options.ddof ?? 1;
  const xs = numericValues(input);
  const n = xs.length;
  if (n <= ddof) {
    return Number.NaN;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  const mean = s / n;
  let ss = 0;
  for (const x of xs) {
    const diff = x - mean;
    ss += diff * diff;
  }
  return ss / (n - ddof);
}

/**
 * Standard deviation of numeric values in `input`, ignoring NaN / null.
 *
 * @param input - Array or Series of scalars.
 * @param options - `ddof` (degrees of freedom, default `1`).
 *
 * Returns `Number.NaN` when there are fewer valid values than `ddof + 1`.
 *
 * @example
 * ```ts
 * nanstd([2, 4, 4, 4, 5, 5, 7, 9], { ddof: 1 }); // 2.138...
 * ```
 */
export function nanstd(input: NanInput, options: NanAggOptions = {}): number {
  return Math.sqrt(nanvar(input, options));
}

/**
 * Minimum of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `Number.NaN` when there are no valid values.
 *
 * @example
 * ```ts
 * nanmin([3, 1, NaN, 2]); // 1
 * ```
 */
export function nanmin(input: NanInput): number {
  const xs = numericValues(input);
  if (xs.length === 0) {
    return Number.NaN;
  }
  let m = xs[0] as number;
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i] as number;
    if (v < m) {
      m = v;
    }
  }
  return m;
}

/**
 * Maximum of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `Number.NaN` when there are no valid values.
 *
 * @example
 * ```ts
 * nanmax([3, 1, NaN, 2]); // 3
 * ```
 */
export function nanmax(input: NanInput): number {
  const xs = numericValues(input);
  if (xs.length === 0) {
    return Number.NaN;
  }
  let m = xs[0] as number;
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i] as number;
    if (v > m) {
      m = v;
    }
  }
  return m;
}

/**
 * Product of numeric values in `input`, ignoring NaN / null.
 *
 * Returns `1` when there are no valid values (matches numpy behaviour for
 * an empty product — identity element).
 *
 * @example
 * ```ts
 * nanprod([1, 2, NaN, 3]); // 6
 * ```
 */
export function nanprod(input: NanInput): number {
  const xs = numericValues(input);
  if (xs.length === 0) {
    return 1;
  }
  let p = 1;
  for (const x of xs) {
    p *= x;
  }
  return p;
}
