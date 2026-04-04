/**
 * Timedelta — a fixed-size duration type mirroring pandas `Timedelta`.
 *
 * Stores durations as an integer number of milliseconds internally.
 * Supports arithmetic, comparison, and component access matching pandas.
 *
 * @example
 * ```ts
 * const td = new Timedelta(1, "D");
 * td.days;            // 1
 * td.total_seconds(); // 86400
 *
 * const td2 = new Timedelta("1 days 01:30:00");
 * td2.total_seconds(); // 91800
 *
 * const s = new Series({ data: [1000, 60000, 3_600_000, null] });
 * s.timedelta.total_seconds().values; // [1, 60, 3600, null]
 * s.timedelta.days.values;            // [0, 0, 0, null]
 * ```
 */

import type { Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { Series } from "./series.ts";

// ─── unit constants ────────────────────────────────────────────────────────────

/** Valid unit strings accepted by the Timedelta constructor. */
export type TimedeltaUnit = "ms" | "s" | "m" | "min" | "h" | "D" | "d" | "W" | "w";

const MS_PER_UNIT: Record<TimedeltaUnit, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  min: 60_000,
  h: 3_600_000,
  D: 86_400_000,
  d: 86_400_000,
  W: 604_800_000,
  w: 604_800_000,
};

// ─── string-parsing helpers ────────────────────────────────────────────────────

/** Regex for pandas-style strings like "1 days 01:30:00" or "-1 days +22:30:00.500". */
const PANDAS_RE =
  /^(-)?(\d+)\s+days?\s*(?:\+\s*)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/i;

/** Regex for "N unit" strings like "5 hours" or "1.5 days". */
const UNIT_RE = /^(-?\d+(?:\.\d+)?)\s*(ms|min|milliseconds?|seconds?|minutes?|hours?|days?|weeks?|[smhDdWw])$/i;

/** Map unit-name aliases to canonical TimedeltaUnit values. */
const UNIT_ALIASES: Record<string, TimedeltaUnit> = {
  millisecond: "ms",
  milliseconds: "ms",
  ms: "ms",
  second: "s",
  seconds: "s",
  s: "s",
  minute: "m",
  minutes: "m",
  min: "min",
  m: "m",
  hour: "h",
  hours: "h",
  h: "h",
  day: "D",
  days: "D",
  d: "D",
  week: "W",
  weeks: "W",
  w: "W",
};

/** Parse a timedelta string into milliseconds. */
function parseTimedeltaString(raw: string): number {
  const s = raw.trim();

  // Try pandas format: "N days HH:MM:SS[.fff]" or "-N days +HH:MM:SS"
  const pm = PANDAS_RE.exec(s);
  if (pm !== null) {
    const neg = pm[1] !== undefined;
    const days = parseInt(pm[2] ?? "0", 10);
    const hours = parseInt(pm[3] ?? "0", 10);
    const minutes = parseInt(pm[4] ?? "0", 10);
    const seconds = parseInt(pm[5] ?? "0", 10);
    const fracStr = pm[6] ?? "";
    const fracMs =
      fracStr.length > 0
        ? Math.round(parseInt(fracStr, 10) / Math.pow(10, fracStr.length - 3))
        : 0;
    const total =
      days * 86_400_000 +
      hours * 3_600_000 +
      minutes * 60_000 +
      seconds * 1_000 +
      fracMs;
    return neg ? -total : total;
  }

  // Try "N unit" format
  const um = UNIT_RE.exec(s);
  if (um !== null) {
    const value = parseFloat(um[1] ?? "0");
    const unitRaw = (um[2] ?? "ms").toLowerCase();
    const unit: TimedeltaUnit = UNIT_ALIASES[unitRaw] ?? "ms";
    return Math.round(value * MS_PER_UNIT[unit]);
  }

  // Try pure integer (milliseconds)
  const n = Number(s);
  if (!Number.isNaN(n)) {
    return Math.round(n);
  }

  throw new Error(`Cannot parse timedelta string: "${raw}"`);
}

// ─── floor-division helpers ────────────────────────────────────────────────────

/** Python-style floor division (always rounds toward −∞). */
function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/** Python-style modulo (result has same sign as divisor). */
function floorMod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

// ─── Timedelta ─────────────────────────────────────────────────────────────────

/**
 * A duration type mirroring pandas `Timedelta`.
 *
 * Internally stores the duration as an integer number of milliseconds.
 * Components (`days`, `seconds`, `microseconds`) match pandas semantics:
 * each is non-negative and the decomposition satisfies
 * `td.days * 86400 + td.seconds + td.microseconds / 1e6 === td.total_seconds()`.
 */
export class Timedelta {
  /** Internal value in milliseconds (rounded integer). */
  private readonly _ms: number;

  /**
   * Construct a Timedelta.
   *
   * @param value - A numeric duration **or** a pandas-style string such as
   *   `"1 days 01:30:00"`, `"-2 days +22:00:00"`, `"5 hours"`, `"90 minutes"`.
   * @param unit - Time unit applied to a numeric `value` (ignored for strings).
   *   Defaults to `"ms"` (milliseconds).
   */
  constructor(value: number | string, unit: TimedeltaUnit = "ms") {
    if (typeof value === "string") {
      this._ms = parseTimedeltaString(value);
    } else {
      this._ms = Math.round(value * MS_PER_UNIT[unit]);
    }
  }

  // ─── component accessors ─────────────────────────────────────────────────────

  /**
   * Complete-days component (floor division; may be negative).
   *
   * Matches pandas `Timedelta.days`.
   */
  get days(): number {
    return floorDiv(this._ms, 86_400_000);
  }

  /**
   * Seconds component after extracting complete days (0 … 86399).
   *
   * Matches pandas `Timedelta.seconds`.
   */
  get seconds(): number {
    const rem = floorMod(this._ms, 86_400_000);
    return floorDiv(rem, 1_000);
  }

  /**
   * Microseconds component (0 … 999000, multiples of 1000 because we store ms).
   *
   * Matches pandas `Timedelta.microseconds`.
   */
  get microseconds(): number {
    const rem = floorMod(this._ms, 86_400_000);
    return floorMod(rem, 1_000) * 1_000;
  }

  /**
   * Milliseconds component (0 … 999).
   *
   * Not in pandas' public API but useful in JavaScript contexts.
   */
  get milliseconds(): number {
    return floorMod(this._ms, 1_000);
  }

  // ─── methods ──────────────────────────────────────────────────────────────────

  /**
   * Total duration expressed as seconds (may be fractional).
   *
   * Matches pandas `Timedelta.total_seconds()`.
   */
  total_seconds(): number {
    return this._ms / 1_000;
  }

  /** Raw internal millisecond value. */
  toMilliseconds(): number {
    return this._ms;
  }

  /** Return a new `Timedelta` whose value is `|this|`. */
  abs(): Timedelta {
    return Timedelta.fromMilliseconds(Math.abs(this._ms));
  }

  // ─── arithmetic ───────────────────────────────────────────────────────────────

  /** Add another Timedelta. */
  add(other: Timedelta): Timedelta {
    return Timedelta.fromMilliseconds(this._ms + other._ms);
  }

  /** Subtract another Timedelta. */
  sub(other: Timedelta): Timedelta {
    return Timedelta.fromMilliseconds(this._ms - other._ms);
  }

  /** Multiply by a numeric scalar. */
  mul(factor: number): Timedelta {
    return Timedelta.fromMilliseconds(Math.round(this._ms * factor));
  }

  /** Divide by a numeric scalar, returning a new Timedelta. */
  divScalar(factor: number): Timedelta {
    return Timedelta.fromMilliseconds(Math.round(this._ms / factor));
  }

  /**
   * Divide by another Timedelta, returning the unitless ratio.
   *
   * Matches pandas `td1 / td2`.
   */
  divTimedelta(other: Timedelta): number {
    return this._ms / other._ms;
  }

  /** Return the negated Timedelta. */
  neg(): Timedelta {
    return Timedelta.fromMilliseconds(-this._ms);
  }

  // ─── comparison ───────────────────────────────────────────────────────────────

  /** Equal. */
  eq(other: Timedelta): boolean {
    return this._ms === other._ms;
  }

  /** Not equal. */
  ne(other: Timedelta): boolean {
    return this._ms !== other._ms;
  }

  /** Less than. */
  lt(other: Timedelta): boolean {
    return this._ms < other._ms;
  }

  /** Less than or equal. */
  le(other: Timedelta): boolean {
    return this._ms <= other._ms;
  }

  /** Greater than. */
  gt(other: Timedelta): boolean {
    return this._ms > other._ms;
  }

  /** Greater than or equal. */
  ge(other: Timedelta): boolean {
    return this._ms >= other._ms;
  }

  // ─── display ──────────────────────────────────────────────────────────────────

  /**
   * Human-readable string mirroring pandas `Timedelta.__str__`.
   *
   * - Positive: `"N days HH:MM:SS"` or `"N days HH:MM:SS.mmm"`
   * - Negative with time remainder: `"-N days +HH:MM:SS"`
   */
  toString(): string {
    const d = this.days;
    const rem = floorMod(this._ms, 86_400_000);
    const h = floorDiv(rem, 3_600_000);
    const m = floorDiv(rem % 3_600_000, 60_000);
    const sec = floorDiv(rem % 60_000, 1_000);
    const ms = rem % 1_000;

    const pad2 = (n: number): string => String(n).padStart(2, "0");
    const pad3 = (n: number): string => String(n).padStart(3, "0");

    const timeStr =
      ms > 0
        ? `${pad2(h)}:${pad2(m)}:${pad2(sec)}.${pad3(ms)}`
        : `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;

    if (d < 0 && rem > 0) {
      return `${d} days +${timeStr}`;
    }
    const dayLabel = Math.abs(d) === 1 ? "1 day" : `${d} days`;
    return `${dayLabel} ${timeStr}`;
  }

  // ─── static factories ─────────────────────────────────────────────────────────

  /**
   * Construct a Timedelta from a raw millisecond value.
   *
   * @example
   * ```ts
   * Timedelta.fromMilliseconds(3600000).hours; // 1
   * ```
   */
  static fromMilliseconds(ms: number): Timedelta {
    return new Timedelta(Math.round(ms), "ms");
  }

  /**
   * Parse a timedelta string.
   *
   * @example
   * ```ts
   * Timedelta.parse("2 hours 30 minutes").total_seconds(); // 9000
   * ```
   */
  static parse(s: string): Timedelta {
    return new Timedelta(s);
  }
}

// ─── accessor helpers ──────────────────────────────────────────────────────────

/**
 * Coerce a Scalar to milliseconds, or return null for missing/unparseable values.
 *
 * - `number` is treated as milliseconds directly.
 * - `string` is parsed as a timedelta string.
 * - `null` / `undefined` → `null`.
 * - All other types (boolean, bigint, Date) → `null`.
 */
function scalarToMs(v: Scalar): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number") {
    return Number.isNaN(v) ? null : v;
  }
  if (typeof v === "string") {
    try {
      return parseTimedeltaString(v);
    } catch {
      return null;
    }
  }
  return null;
}

// ─── TimedeltaAccessor ────────────────────────────────────────────────────────

/**
 * Vectorized timedelta operations for `Series`.
 *
 * Accessible via `Series.timedelta`. Operates on Series whose values are
 * numbers (interpreted as milliseconds) or pandas-style timedelta strings.
 * Null / undefined / unparseable values propagate as `null`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1000, 60_000, 3_600_000, null] });
 * s.timedelta.total_seconds().values; // [1, 60, 3600, null]
 * s.timedelta.days.values;            // [0, 0, 0, null]
 *
 * const s2 = new Series({ data: ["1 days 01:00:00", "30 minutes"] });
 * s2.timedelta.total_seconds().values; // [90000, 1800]
 * ```
 */
export class TimedeltaAccessor {
  private readonly _series: Series<Scalar>;

  /** @internal */
  constructor(series: Series<Scalar>) {
    this._series = series;
  }

  /** Apply a numeric extractor to each element; propagate null. */
  private _mapNum(fn: (ms: number) => number): Series<Scalar> {
    const data = this._series.values.map((v) => {
      const ms = scalarToMs(v);
      return ms === null ? null : fn(ms);
    });
    return new Series<Scalar>({ data, index: this._series.index, dtype: Dtype.float64 });
  }

  /** Apply a Timedelta transform to each element, returning ms values; propagate null. */
  private _mapTd(fn: (td: Timedelta) => Timedelta): Series<Scalar> {
    const data = this._series.values.map((v) => {
      const ms = scalarToMs(v);
      return ms === null ? null : fn(Timedelta.fromMilliseconds(ms)).toMilliseconds();
    });
    return new Series<Scalar>({ data, index: this._series.index, dtype: Dtype.float64 });
  }

  // ─── component properties ─────────────────────────────────────────────────────

  /**
   * Complete-days component for each element (may be negative).
   *
   * Matches pandas `Series.dt.days`.
   */
  get days(): Series<Scalar> {
    return this._mapNum((ms) => floorDiv(ms, 86_400_000));
  }

  /**
   * Seconds component (0 … 86399) for each element.
   *
   * Matches pandas `Series.dt.seconds`.
   */
  get seconds(): Series<Scalar> {
    return this._mapNum((ms) => floorDiv(floorMod(ms, 86_400_000), 1_000));
  }

  /**
   * Microseconds component (0 … 999000, multiples of 1000) for each element.
   *
   * Matches pandas `Series.dt.microseconds`.
   */
  get microseconds(): Series<Scalar> {
    return this._mapNum((ms) => floorMod(floorMod(ms, 86_400_000), 1_000) * 1_000);
  }

  /**
   * Milliseconds component (0 … 999) for each element.
   */
  get milliseconds(): Series<Scalar> {
    return this._mapNum((ms) => floorMod(ms, 1_000));
  }

  // ─── methods ──────────────────────────────────────────────────────────────────

  /**
   * Total seconds for each element (may be fractional).
   *
   * Matches pandas `Series.dt.total_seconds()`.
   */
  total_seconds(): Series<Scalar> {
    return this._mapNum((ms) => ms / 1_000);
  }

  /**
   * Absolute value of each element (result in milliseconds).
   */
  abs(): Series<Scalar> {
    return this._mapTd((td) => td.abs());
  }

  /**
   * Negated value of each element (result in milliseconds).
   */
  neg(): Series<Scalar> {
    return this._mapTd((td) => td.neg());
  }

  /**
   * Floor each element to the nearest `freq` milliseconds.
   *
   * @param freq - Frequency in milliseconds (e.g. `1000` for seconds, `60_000` for minutes).
   */
  floor(freq: number): Series<Scalar> {
    return this._mapTd((td) =>
      Timedelta.fromMilliseconds(floorDiv(td.toMilliseconds(), freq) * freq),
    );
  }

  /**
   * Ceil each element to the nearest `freq` milliseconds.
   *
   * @param freq - Frequency in milliseconds.
   */
  ceil(freq: number): Series<Scalar> {
    return this._mapTd((td) =>
      Timedelta.fromMilliseconds(Math.ceil(td.toMilliseconds() / freq) * freq),
    );
  }

  /**
   * Round each element to the nearest `freq` milliseconds.
   *
   * @param freq - Frequency in milliseconds.
   */
  round(freq: number): Series<Scalar> {
    return this._mapTd((td) =>
      Timedelta.fromMilliseconds(Math.round(td.toMilliseconds() / freq) * freq),
    );
  }
}
