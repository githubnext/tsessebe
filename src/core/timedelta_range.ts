/**
 * timedelta_range — factory for evenly-spaced TimedeltaIndex sequences.
 *
 * Mirrors `pandas.timedelta_range`.
 *
 * Generate a fixed-frequency {@link TimedeltaIndex} by specifying at least
 * two of the four parameters: `start`, `end`, `periods`, and `freq`.
 *
 * **Freq string aliases:**
 *
 * | String | Duration |
 * |--------|----------|
 * | `"W"` | 1 week (7 days) |
 * | `"D"` | 1 calendar day |
 * | `"H"` | 1 hour |
 * | `"T"` / `"min"` | 1 minute |
 * | `"S"` | 1 second |
 * | `"L"` / `"ms"` | 1 millisecond |
 * | `"U"` / `"us"` | 1 microsecond (rounded to nearest ms) |
 * | `"N"` / `"ns"` | 1 nanosecond (rounded to nearest ms) |
 *
 * Multiplier prefixes are supported: `"2H"`, `"30min"`, `"500ms"`, etc.
 *
 * @example
 * ```ts
 * // 5 one-hour periods starting from 0
 * const idx = timedelta_range({ start: "0 days", periods: 5, freq: "H" });
 * idx.size; // 5
 * idx.at(0).totalHours; // 0
 * idx.at(4).totalHours; // 4
 *
 * // Start and end with freq
 * const idx2 = timedelta_range({ start: "1 days", end: "3 days", freq: "D" });
 * idx2.size; // 3
 *
 * // Start and end with periods (linear space)
 * const idx3 = timedelta_range({ start: "0 days", end: "4 days", periods: 5 });
 * idx3.at(2).totalDays; // 2
 * ```
 *
 * @module
 */

import { Timedelta, TimedeltaIndex } from "./timedelta.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Supported frequency alias strings for {@link timedelta_range}.
 *
 * Optionally prefixed with a positive integer multiplier, e.g. `"2H"`, `"30min"`.
 */
export type TimedeltaFreq =
  | "W"
  | "D"
  | "H"
  | "T"
  | "min"
  | "S"
  | "L"
  | "ms"
  | "U"
  | "us"
  | "N"
  | "ns"
  | string; // allows "2H", "30min", etc.

/** Closed endpoint specification. */
export type TimedeltaRangeClosed = "left" | "right" | "both" | "neither" | null;

/** Options for {@link timedelta_range}. */
export interface TimedeltaRangeOptions {
  /**
   * First value of the sequence.
   * May be a {@link Timedelta}, a parseable string, or a number of milliseconds.
   */
  readonly start?: Timedelta | string | number;
  /**
   * Last value of the sequence (inclusive unless `closed` excludes it).
   * May be a {@link Timedelta}, a parseable string, or a number of milliseconds.
   */
  readonly end?: Timedelta | string | number;
  /** Number of values to generate. */
  readonly periods?: number;
  /**
   * Frequency (step size) between values.
   * A {@link TimedeltaFreq} string such as `"H"`, `"2D"`, `"30min"`,
   * or a plain `number` of milliseconds.
   */
  readonly freq?: TimedeltaFreq | number;
  /** Optional name label for the resulting index. */
  readonly name?: string | null;
  /**
   * Which endpoints to include.
   * - `"both"` (default): include both `start` and `end`.
   * - `"left"` : include `start`, exclude `end`.
   * - `"right"` : exclude `start`, include `end`.
   * - `"neither"`: exclude both endpoints.
   * - `null`   : same as `"both"`.
   */
  readonly closed?: TimedeltaRangeClosed;
}

// ─── frequency parsing ────────────────────────────────────────────────────────

/** Map of bare unit aliases to milliseconds. */
const UNIT_MS: Record<string, number> = {
  W: 7 * 86_400_000,
  D: 86_400_000,
  H: 3_600_000,
  T: 60_000,
  min: 60_000,
  S: 1_000,
  L: 1,
  ms: 1,
  U: 0.001, // microseconds → ms (rounded later)
  us: 0.001,
  N: 1e-6, // nanoseconds → ms (rounded later)
  ns: 1e-6,
};

/** Regex: optional integer multiplier followed by unit alias. */
const RE_FREQ =
  /^(\d+(?:\.\d+)?)\s*(W|D|H|T|min|S|L|ms|U|us|N|ns)$|^(W|D|H|T|min|S|L|ms|U|us|N|ns)$/;

/**
 * Parse a freq string or number into milliseconds.
 *
 * @throws {Error} on unrecognised format.
 */
function freqToMs(freq: TimedeltaFreq | number): number {
  if (typeof freq === "number") {
    return freq;
  }
  const m = RE_FREQ.exec(freq);
  if (!m) {
    throw new Error(`timedelta_range: unrecognised freq "${freq}"`);
  }
  if (m[3] !== undefined) {
    // bare unit, no multiplier
    const base = UNIT_MS[m[3]];
    if (base === undefined) {
      throw new Error(`timedelta_range: unknown unit "${m[3]}"`);
    }
    return base;
  }
  // multiplier + unit
  const multiplier = Number(m[1]);
  const unit = m[2] as string;
  const base = UNIT_MS[unit];
  if (base === undefined) {
    throw new Error(`timedelta_range: unknown unit "${unit}"`);
  }
  return multiplier * base;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Coerce start/end input to milliseconds. */
function toMs(v: Timedelta | string | number): number {
  if (typeof v === "number") {
    return v;
  }
  if (v instanceof Timedelta) {
    return v.totalMilliseconds;
  }
  return Timedelta.parse(v).totalMilliseconds;
}

/** Apply closed endpoint filtering. */
function applyClosedFilter(
  values: number[],
  startMs: number | null,
  endMs: number | null,
  closed: TimedeltaRangeClosed,
): number[] {
  if (closed === null || closed === "both") {
    return values;
  }
  return values.filter((v) => {
    if (closed === "left") {
      return endMs === null || v < endMs || v === startMs;
    }
    if (closed === "right") {
      return startMs === null || v > startMs || v === endMs;
    }
    // "neither"
    const excludeStart = startMs !== null && v === startMs;
    const excludeEnd = endMs !== null && v === endMs;
    return !(excludeStart || excludeEnd);
  });
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Return a fixed-frequency {@link TimedeltaIndex}.
 *
 * At least **two** of `start`, `end`, `periods`, and `freq` must be provided.
 * When `start` and `end` are both given without `freq`, the values are linearly
 * spaced (i.e. `periods` determines the step size).
 *
 * @example
 * ```ts
 * timedelta_range({ start: "0 days", periods: 4, freq: "D" });
 * // TimedeltaIndex: [0, 1, 2, 3] days
 *
 * timedelta_range({ start: "1 days", end: "3 days", freq: "D" });
 * // TimedeltaIndex: [1, 2, 3] days
 *
 * timedelta_range({ start: "0 days", end: "2 days", periods: 5 });
 * // TimedeltaIndex: [0, 12h, 1d, 1d12h, 2d]
 * ```
 */
export function timedelta_range(options: TimedeltaRangeOptions): TimedeltaIndex {
  const { periods, name = null, closed = "both" } = options;
  const hasStart = options.start !== undefined;
  const hasEnd = options.end !== undefined;
  const hasFreq = options.freq !== undefined;
  const hasPeriods = periods !== undefined;

  const given = [hasStart, hasEnd, hasPeriods, hasFreq].filter(Boolean).length;
  if (given < 2) {
    throw new Error(
      "timedelta_range: must specify at least two of 'start', 'end', 'periods', 'freq'",
    );
  }
  if (hasPeriods && periods !== undefined && periods < 0) {
    throw new RangeError("timedelta_range: periods must be non-negative");
  }

  const startMs = hasStart ? toMs(options.start as Timedelta | string | number) : null;
  const endMs = hasEnd ? toMs(options.end as Timedelta | string | number) : null;
  const values = buildValues(options, hasStart, hasEnd, hasFreq, hasPeriods, startMs, endMs, periods);

  const filtered = applyClosedFilter(values, startMs, endMs, closed);
  const deltas = filtered.map((ms) => Timedelta.fromMilliseconds(ms));
  return TimedeltaIndex.fromTimedeltas(deltas, { name });
}

function buildValues(
  options: TimedeltaRangeOptions,
  hasStart: boolean,
  hasEnd: boolean,
  hasFreq: boolean,
  hasPeriods: boolean,
  startMs: number | null,
  endMs: number | null,
  periods: number | undefined,
): number[] {
  if (hasStart && hasEnd && !hasFreq && hasPeriods && periods !== undefined) {
    return buildLinear(startMs as number, endMs as number, periods);
  }
  if (hasStart && hasEnd && hasFreq) {
    const stepMs = freqToMs(options.freq as TimedeltaFreq | number);
    return buildStartEnd(startMs as number, endMs as number, stepMs);
  }
  if (hasStart && hasFreq && hasPeriods && periods !== undefined) {
    const stepMs = freqToMs(options.freq as TimedeltaFreq | number);
    return buildStartPeriods(startMs as number, stepMs, periods);
  }
  if (hasEnd && hasFreq && hasPeriods && periods !== undefined) {
    const stepMs = freqToMs(options.freq as TimedeltaFreq | number);
    return buildEndPeriods(endMs as number, stepMs, periods);
  }
  if (hasStart && hasEnd && !hasFreq && !hasPeriods) {
    return startMs === endMs ? [startMs as number] : [startMs as number, endMs as number];
  }
  if (hasStart && hasPeriods && !hasFreq && periods !== undefined) {
    return buildStartPeriods(startMs as number, 86_400_000, periods);
  }
  throw new Error(
    "timedelta_range: unsupported combination of parameters — " +
      "provide start+end+freq, start+periods+freq, end+periods+freq, or start+end+periods",
  );
}

// ─── internal builders ────────────────────────────────────────────────────────

/** Linearly space `n` values from `startMs` to `endMs` inclusive. */
function buildLinear(startMs: number, endMs: number, n: number): number[] {
  if (n === 0) {
    return [];
  }
  if (n === 1) {
    return [startMs];
  }
  const step = (endMs - startMs) / (n - 1);
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    values.push(startMs + i * step);
  }
  return values;
}

/** Build from `startMs` up to (inclusive) `endMs` with step `stepMs`. */
function buildStartEnd(startMs: number, endMs: number, stepMs: number): number[] {
  if (stepMs === 0) {
    throw new RangeError("timedelta_range: freq must be non-zero");
  }
  const values: number[] = [];
  const forward = stepMs > 0;
  let cur = startMs;
  const MAX = 1_000_000;
  while (values.length < MAX) {
    if (forward ? cur > endMs : cur < endMs) {
      break;
    }
    values.push(cur);
    cur += stepMs;
  }
  return values;
}

/** Build `n` values from `startMs` stepping by `stepMs`. */
function buildStartPeriods(startMs: number, stepMs: number, n: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    values.push(startMs + i * stepMs);
  }
  return values;
}

/** Build `n` values ending at `endMs` stepping by `stepMs`, in ascending order. */
function buildEndPeriods(endMs: number, stepMs: number, n: number): number[] {
  if (stepMs === 0) {
    throw new RangeError("timedelta_range: freq must be non-zero");
  }
  const values: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    values.push(endMs - i * stepMs);
  }
  return values;
}
