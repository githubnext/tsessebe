/**
 * DatetimeIndex, date_range, and bdate_range.
 *
 * Mirrors `pandas.DatetimeIndex`, `pandas.date_range`, and `pandas.bdate_range`.
 *
 * A {@link DatetimeIndex} is an ordered sequence of `Date` objects suitable for
 * use as a time-series axis.  The two factory functions generate regularly-spaced
 * sequences:
 *
 * | Function | Default freq | pandas equivalent |
 * |---|---|---|
 * | {@link date_range} | `"D"` (calendar day) | `pandas.date_range` |
 * | {@link bdate_range} | `"B"` (business day) | `pandas.bdate_range` |
 *
 * **Frequency string aliases** (a subset of pandas abbreviations):
 *
 * | String | Offset |
 * |--------|--------|
 * | `"D"` | Calendar day |
 * | `"B"` | Business day (Mon–Fri) |
 * | `"H"` | Hour |
 * | `"T"` / `"min"` | Minute |
 * | `"S"` | Second |
 * | `"L"` / `"ms"` | Millisecond |
 * | `"W"` | Week |
 * | `"MS"` | Month-start (1st of month) |
 * | `"ME"` | Month-end (last day of month) |
 * | `"QS"` | Quarter-start (MonthBegin ×3) |
 * | `"QE"` | Quarter-end (MonthEnd ×3) |
 * | `"AS"` / `"YS"` | Year-start (Jan 1) |
 * | `"AE"` / `"YE"` | Year-end (Dec 31) |
 *
 * @example
 * ```ts
 * const idx = date_range({ start: "2024-01-01", end: "2024-01-05" });
 * idx.size;              // 5
 * idx.at(0).toISOString(); // "2024-01-01T00:00:00.000Z"
 *
 * const biz = bdate_range({ start: "2024-01-01", periods: 5 });
 * biz.size; // 5  (Mon–Fri only)
 * ```
 *
 * @module
 */

import {
  BusinessDay,
  Day,
  Hour,
  Milli,
  Minute,
  MonthBegin,
  MonthEnd,
  Second,
  Week,
  YearBegin,
  YearEnd,
} from "./date_offset.ts";
import type { DateOffset } from "./date_offset.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Recognised frequency string abbreviations accepted by {@link date_range} and
 * {@link bdate_range}.  A {@link DateOffset} object may always be used in place
 * of a string.
 */
export type DateRangeFreq =
  | "D"
  | "B"
  | "H"
  | "T"
  | "min"
  | "S"
  | "L"
  | "ms"
  | "W"
  | "MS"
  | "ME"
  | "QS"
  | "QE"
  | "AS"
  | "YS"
  | "AE"
  | "YE";

/** Options accepted by {@link DatetimeIndex} factory methods. */
export interface DatetimeIndexOptions {
  /** Optional name label for this axis. */
  readonly name?: string | null;
}

/** Options accepted by {@link date_range} and {@link bdate_range}. */
export interface DateRangeOptions {
  /**
   * Left bound for generating dates.  Accepts a `Date` object or an ISO-8601
   * string.
   */
  readonly start?: Date | string;
  /**
   * Right bound for generating dates (inclusive when the offset lands on it
   * exactly).  Accepts a `Date` object or an ISO-8601 string.
   */
  readonly end?: Date | string;
  /**
   * Number of periods (dates) to generate.  Must be a non-negative integer.
   */
  readonly periods?: number;
  /**
   * Step frequency.  Accepts a string alias (e.g. `"D"`, `"MS"`, `"B"`) or a
   * {@link DateOffset} instance.  Defaults to `"D"` for {@link date_range} and
   * `"B"` for {@link bdate_range}.
   */
  readonly freq?: DateRangeFreq | DateOffset;
  /**
   * When `true`, normalise start / end to midnight UTC before generating.
   * @default false
   */
  readonly normalize?: boolean;
  /** Optional name for the resulting {@link DatetimeIndex}. */
  readonly name?: string | null;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Parse a `Date | string` into a `Date`. */
function toDate(val: Date | string): Date {
  if (val instanceof Date) {
    return new Date(val.getTime());
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`Cannot parse date: "${val}"`);
  }
  return d;
}

/** Floor a date to midnight UTC. */
function normDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Convert a frequency string (or pass-through a `DateOffset`) to a
 * `DateOffset` with multiplier `n`.
 */
function freqToOffset(freq: DateRangeFreq | DateOffset, n = 1): DateOffset {
  if (typeof freq === "object") {
    return freq;
  }
  switch (freq) {
    case "D":
      return new Day(n);
    case "B":
      return new BusinessDay(n);
    case "H":
      return new Hour(n);
    case "T":
    case "min":
      return new Minute(n);
    case "S":
      return new Second(n);
    case "L":
    case "ms":
      return new Milli(n);
    case "W":
      return new Week(n);
    case "MS":
      return new MonthBegin(n);
    case "ME":
      return new MonthEnd(n);
    case "QS":
      return new MonthBegin(n * 3);
    case "QE":
      return new MonthEnd(n * 3);
    case "AS":
    case "YS":
      return new YearBegin(n);
    case "AE":
    case "YE":
      return new YearEnd(n);
    default: {
      const _never: never = freq;
      throw new RangeError(`Unknown frequency string: "${String(_never)}"`);
    }
  }
}

// ─── DatetimeIndex ────────────────────────────────────────────────────────────

/**
 * An ordered sequence of `Date` values — the TypeScript equivalent of
 * `pandas.DatetimeIndex`.
 *
 * Typically created via {@link date_range} or {@link bdate_range}, but can also
 * be built directly from an array of `Date` objects.
 */
export class DatetimeIndex {
  private readonly _dates: readonly Date[];

  /** Optional human-readable label for this axis. */
  readonly name: string | null;

  private constructor(dates: readonly Date[], name: string | null) {
    this._dates = Object.freeze([...dates]);
    this.name = name;
  }

  // ─── factories ───────────────────────────────────────────────────

  /**
   * Create a `DatetimeIndex` from an array of `Date` objects.
   *
   * @example
   * ```ts
   * DatetimeIndex.fromDates([new Date("2024-01-01"), new Date("2024-01-02")]);
   * ```
   */
  static fromDates(dates: readonly Date[], name: string | null = null): DatetimeIndex {
    return new DatetimeIndex(dates, name);
  }

  /**
   * Create a `DatetimeIndex` from an array of UTC millisecond timestamps.
   *
   * @example
   * ```ts
   * DatetimeIndex.fromTimestamps([0, 86_400_000]); // 1970-01-01, 1970-01-02
   * ```
   */
  static fromTimestamps(timestamps: readonly number[], name: string | null = null): DatetimeIndex {
    return new DatetimeIndex(
      timestamps.map((ms) => new Date(ms)),
      name,
    );
  }

  // ─── properties ──────────────────────────────────────────────────

  /** Number of elements. */
  get size(): number {
    return this._dates.length;
  }

  /** Shape tuple `[size]`. */
  get shape(): [number] {
    return [this._dates.length];
  }

  /** Number of dimensions (always `1`). */
  get ndim(): 1 {
    return 1;
  }

  /** `true` when the index has zero elements. */
  get empty(): boolean {
    return this._dates.length === 0;
  }

  /** Read-only view of the underlying `Date` array. */
  get values(): readonly Date[] {
    return this._dates;
  }

  // ─── element access ───────────────────────────────────────────────

  /**
   * Return the element at position `i` (0-based).
   *
   * @throws `RangeError` if `i` is out of bounds.
   */
  at(i: number): Date {
    const d = this._dates[i];
    if (d === undefined) {
      throw new RangeError(`Index ${i} out of bounds (size=${this.size})`);
    }
    return d;
  }

  /** Shallow copy as a plain mutable array. */
  toArray(): Date[] {
    return [...this._dates];
  }

  // ─── statistics ───────────────────────────────────────────────────

  /**
   * Earliest date in the index, or `null` if empty.
   *
   * @example
   * ```ts
   * DatetimeIndex.fromDates([new Date("2024-03-01"), new Date("2024-01-01")]).min()
   * //→ Date("2024-01-01")
   * ```
   */
  min(): Date | null {
    if (this._dates.length === 0) {
      return null;
    }
    let best = this._dates[0] as Date;
    for (const d of this._dates) {
      if (d.getTime() < best.getTime()) {
        best = d;
      }
    }
    return best;
  }

  /**
   * Latest date in the index, or `null` if empty.
   *
   * @example
   * ```ts
   * DatetimeIndex.fromDates([new Date("2024-01-01"), new Date("2024-03-01")]).max()
   * //→ Date("2024-03-01")
   * ```
   */
  max(): Date | null {
    if (this._dates.length === 0) {
      return null;
    }
    let best = this._dates[0] as Date;
    for (const d of this._dates) {
      if (d.getTime() > best.getTime()) {
        best = d;
      }
    }
    return best;
  }

  // ─── transformation ───────────────────────────────────────────────

  /**
   * Return a sorted copy.
   *
   * @param ascending - Sort direction; defaults to `true`.
   */
  sort(ascending = true): DatetimeIndex {
    const sorted = [...this._dates].sort((a, b) =>
      ascending ? a.getTime() - b.getTime() : b.getTime() - a.getTime(),
    );
    return new DatetimeIndex(sorted, this.name);
  }

  /**
   * Return a new index with duplicate timestamps removed (first occurrence kept).
   */
  unique(): DatetimeIndex {
    const seen = new Set<number>();
    const out: Date[] = [];
    for (const d of this._dates) {
      const ms = d.getTime();
      if (!seen.has(ms)) {
        seen.add(ms);
        out.push(d);
      }
    }
    return new DatetimeIndex(out, this.name);
  }

  /**
   * Return a new index with elements that satisfy `predicate`.
   */
  filter(predicate: (d: Date, i: number) => boolean): DatetimeIndex {
    return new DatetimeIndex(
      this._dates.filter((d, i) => predicate(d, i)),
      this.name,
    );
  }

  /**
   * Normalise all timestamps to midnight UTC (floor to day boundary).
   *
   * @example
   * ```ts
   * DatetimeIndex.fromDates([new Date("2024-03-15T14:30:00Z")]).normalize().at(0)
   * //→ Date("2024-03-15T00:00:00.000Z")
   * ```
   */
  normalize(): DatetimeIndex {
    return new DatetimeIndex(this._dates.map(normDate), this.name);
  }

  /**
   * Return a new index where each date has been shifted by `n` applications of
   * `freq`.  Negative `n` shifts backward.
   *
   * @example
   * ```ts
   * const idx = date_range({ start: "2024-01-01", periods: 3 });
   * idx.shift(7, "D").at(0).toISOString(); // "2024-01-08T00:00:00.000Z"
   * idx.shift(-1, "D").at(0).toISOString(); // "2023-12-31T00:00:00.000Z"
   * ```
   */
  shift(n: number, freq: DateRangeFreq | DateOffset): DatetimeIndex {
    if (n === 0) {
      return new DatetimeIndex(this._dates, this.name);
    }
    const offset = freqToOffset(freq, n);
    return new DatetimeIndex(
      this._dates.map((d) => offset.apply(d)),
      this.name,
    );
  }

  /**
   * Snap each date to the nearest anchor of `freq` via `rollforward`.
   *
   * @example
   * ```ts
   * DatetimeIndex.fromDates([new Date("2024-01-15")]).snap("MS").at(0).toISOString();
   * // "2024-02-01T00:00:00.000Z"
   * ```
   */
  snap(freq: DateRangeFreq | DateOffset): DatetimeIndex {
    const offset = freqToOffset(freq);
    return new DatetimeIndex(
      this._dates.map((d) => offset.rollforward(d)),
      this.name,
    );
  }

  /**
   * Return a slice `[start, stop)`.
   *
   * @param start - Inclusive start index (0-based).
   * @param stop  - Exclusive stop index; defaults to `this.size`.
   */
  slice(start: number, stop?: number): DatetimeIndex {
    return new DatetimeIndex(this._dates.slice(start, stop), this.name);
  }

  /**
   * Return a new index formed by appending `other` after this index.
   */
  concat(other: DatetimeIndex): DatetimeIndex {
    return new DatetimeIndex([...this._dates, ...other._dates], this.name);
  }

  /**
   * Return `true` if any element has the same UTC millisecond value as `date`.
   */
  contains(date: Date): boolean {
    const ms = date.getTime();
    return this._dates.some((d) => d.getTime() === ms);
  }

  /**
   * Convert each date to its ISO-8601 string representation.
   *
   * @example
   * ```ts
   * date_range({ start: "2024-01-01", periods: 2 }).toStrings();
   * // ["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"]
   * ```
   */
  toStrings(): string[] {
    return this._dates.map((d) => d.toISOString());
  }

  // ─── iteration ───────────────────────────────────────────────────

  [Symbol.iterator](): Iterator<Date> {
    return this._dates[Symbol.iterator]();
  }
}

// ─── resolveFreq ─────────────────────────────────────────────────────────────

/**
 * Convert a frequency string or existing `DateOffset` to a `DateOffset`
 * instance with multiplier `n` (defaults to `1`).
 *
 * @example
 * ```ts
 * resolveFreq("MS");     // MonthBegin(1)
 * resolveFreq("QS", 2);  // MonthBegin(6)
 * ```
 */
export function resolveFreq(freq: DateRangeFreq | DateOffset, n = 1): DateOffset {
  return freqToOffset(freq, n);
}

// ─── date_range / bdate_range ────────────────────────────────────────────────

/**
 * Return a fixed-frequency {@link DatetimeIndex}.
 *
 * You must supply at least two of `start`, `end`, and `periods`:
 *
 * | start | end | periods | behaviour |
 * |-------|-----|---------|-----------|
 * | ✓ | ✓ | — | generate from `start` up to and including `end` (if reachable) |
 * | ✓ | — | ✓ | generate `periods` dates forward from `start` |
 * | — | ✓ | ✓ | generate `periods` dates backward ending at `end` |
 *
 * @example
 * ```ts
 * // 5 daily dates
 * date_range({ start: "2024-01-01", end: "2024-01-05" }).size; // 5
 *
 * // 4 hourly dates from a starting point
 * date_range({ start: "2024-01-01", periods: 4, freq: "H" }).size; // 4
 *
 * // 3 dates ending on Jan 10
 * date_range({ end: "2024-01-10", periods: 3 }).at(2).toISOString();
 * // "2024-01-10T00:00:00.000Z"
 * ```
 */
export function date_range(options: DateRangeOptions): DatetimeIndex {
  return buildRange(options, "D");
}

/**
 * Return a fixed-frequency {@link DatetimeIndex} of **business days**.
 *
 * Identical to {@link date_range} but defaults to `freq: "B"` (Mon–Fri).
 *
 * @example
 * ```ts
 * // 5 business days starting 2024-01-01 (Mon)
 * bdate_range({ start: "2024-01-01", periods: 5 }).size; // 5
 * ```
 */
export function bdate_range(options: DateRangeOptions): DatetimeIndex {
  return buildRange(options, "B");
}

// ─── internal builder ─────────────────────────────────────────────────────────

const MAX_ITER = 1_000_000;

function buildRange(options: DateRangeOptions, defaultFreq: DateRangeFreq): DatetimeIndex {
  const { start, end, periods, normalize = false, name = null } = options;
  const freq = options.freq ?? defaultFreq;
  const offset = freqToOffset(freq);

  if (start === undefined && end === undefined) {
    throw new Error("date_range: at least one of 'start' or 'end' must be provided");
  }

  let startDate = start !== undefined ? toDate(start) : null;
  let endDate = end !== undefined ? toDate(end) : null;

  if (normalize) {
    if (startDate !== null) {
      startDate = normDate(startDate);
    }
    if (endDate !== null) {
      endDate = normDate(endDate);
    }
  }

  let dates: Date[];

  if (startDate !== null && endDate !== null && periods === undefined) {
    dates = rangeStartEnd(startDate, endDate, offset);
  } else if (startDate !== null && periods !== undefined) {
    dates = rangeStartPeriods(startDate, periods, offset);
  } else if (endDate !== null && periods !== undefined) {
    dates = rangeEndPeriods(endDate, periods, offset);
  } else {
    throw new Error("date_range: provide at least two of 'start', 'end', 'periods'");
  }

  return DatetimeIndex.fromDates(dates, name);
}

/** Forward from start; stop when next date would exceed end. */
function rangeStartEnd(start: Date, end: Date, offset: DateOffset): Date[] {
  if (start.getTime() > end.getTime()) {
    return [];
  }
  const out: Date[] = [start];
  let cur = start;
  for (let i = 0; i < MAX_ITER; i++) {
    const next = offset.apply(cur);
    if (next.getTime() > end.getTime()) {
      break;
    }
    if (next.getTime() === cur.getTime()) {
      break; // non-progressing guard
    }
    out.push(next);
    cur = next;
  }
  return out;
}

/** Forward from start for exactly `periods` dates. */
function rangeStartPeriods(start: Date, periods: number, offset: DateOffset): Date[] {
  if (periods <= 0) {
    return [];
  }
  const out: Date[] = [start];
  let cur = start;
  while (out.length < periods) {
    const next = offset.apply(cur);
    if (next.getTime() === cur.getTime()) {
      break; // non-progressing guard
    }
    out.push(next);
    cur = next;
  }
  return out;
}

/** Backward from end for exactly `periods` dates, then reverse. */
function rangeEndPeriods(end: Date, periods: number, offset: DateOffset): Date[] {
  if (periods <= 0) {
    return [];
  }
  // Create a negated offset: same class, n negated
  const negOffset = negateOffset(offset);
  const out: Date[] = [end];
  let cur = end;
  while (out.length < periods) {
    const prev = negOffset.apply(cur);
    if (prev.getTime() === cur.getTime()) {
      break; // non-progressing guard
    }
    out.push(prev);
    cur = prev;
  }
  out.reverse();
  return out;
}

/** Return a new offset that steps in the opposite direction. */
function negateOffset(offset: DateOffset): DateOffset {
  const n = offset.n;
  const name = offset.name;
  switch (name) {
    case "Day":
      return new Day(-n);
    case "BusinessDay":
      return new BusinessDay(-n);
    case "Hour":
      return new Hour(-n);
    case "Minute":
      return new Minute(-n);
    case "Second":
      return new Second(-n);
    case "Milli":
      return new Milli(-n);
    case "Week":
      return new Week(-n);
    case "MonthBegin":
      return new MonthBegin(-n);
    case "MonthEnd":
      return new MonthEnd(-n);
    case "YearBegin":
      return new YearBegin(-n);
    case "YearEnd":
      return new YearEnd(-n);
    default:
      // For unknown offset types (custom user-provided), negate n heuristically
      throw new RangeError(
        `negateOffset: unsupported offset type "${name}". Provide 'start' + 'periods' instead of 'end' + 'periods'.`,
      );
  }
}
