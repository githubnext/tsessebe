/**
 * Timedelta and TimedeltaIndex — fixed-duration time spans.
 *
 * Mirrors `pandas.Timedelta` and `pandas.TimedeltaIndex`.
 *
 * A {@link Timedelta} represents a duration (difference between two instants),
 * stored internally as a whole number of milliseconds.  It mirrors the most
 * commonly used subset of `pandas.Timedelta`:
 *
 * - Construction from component fields (`days`, `hours`, `minutes`, …)
 * - Construction from a total millisecond count
 * - Parsing an ISO-8601-like string (`"P1DT2H3M4.5S"` / `"1 days 02:03:04.500"`)
 * - Arithmetic: add, subtract, multiply (by scalar), negate, abs
 * - Comparison and equality
 * - Component accessors (`days`, `hours`, `minutes`, `seconds`, `milliseconds`)
 * - Total-unit conversions (`totalDays`, `totalHours`, `totalMinutes`, `totalSeconds`)
 * - Human-readable `toString()`
 *
 * A {@link TimedeltaIndex} is an ordered sequence of {@link Timedelta} values
 * suitable for use as a row or column index.
 *
 * @example
 * ```ts
 * const td = Timedelta.fromComponents({ days: 1, hours: 2, minutes: 30 });
 * td.toString();           // "1 days 02:30:00"
 * td.totalHours;           // 26.5
 *
 * const idx = TimedeltaIndex.fromRange(
 *   Timedelta.fromComponents({ hours: 0 }),
 *   Timedelta.fromComponents({ hours: 4 }),
 *   Timedelta.fromComponents({ hours: 1 }),
 * );
 * idx.size;                // 5
 * idx.at(2).totalHours;   // 2
 * ```
 *
 * @module
 */

// ─── types ───────────────────────────────────────────────────────────────────

/** Component fields accepted by {@link Timedelta.fromComponents}. */
export interface TimedeltaComponents {
  readonly weeks?: number;
  readonly days?: number;
  readonly hours?: number;
  readonly minutes?: number;
  readonly seconds?: number;
  readonly milliseconds?: number;
}

/** Options accepted by {@link TimedeltaIndex} factory methods. */
export interface TimedeltaIndexOptions {
  /** Optional name label for the index. */
  readonly name?: string | null;
}

// ─── internal constants ───────────────────────────────────────────────────────

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// ─── top-level regex constants ────────────────────────────────────────────────

/** ISO 8601 duration: P[nD][T[nH][nM][nS]]   (only the subset we support) */
const RE_ISO =
  /^-?P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

/** pandas-style: "N days HH:MM:SS[.mmm]" */
const RE_PANDAS = /^(-)?(\d+) days? (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/i;

/** Simple "HH:MM:SS[.mmm]" with optional sign */
const RE_HHMMSS = /^(-)?(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Floor-divide `a` by `b`, returning a non-negative remainder. */
function floorDiv(a: number, b: number): [quotient: number, remainder: number] {
  const q = Math.floor(a / b);
  return [q, a - q * b];
}

/** Parse a fractional-seconds or sub-second string (up to 3 ms digits). */
function parseFrac(frac: string | undefined): number {
  if (frac === undefined || frac === "") {
    return 0;
  }
  // Pad / truncate to exactly 3 digits → milliseconds
  return Number(frac.slice(0, 3).padEnd(3, "0"));
}

/** Zero-pad a number to at least 2 digits. */
function pad2(n: number): string {
  return String(Math.abs(n)).padStart(2, "0");
}

// ─── Timedelta ────────────────────────────────────────────────────────────────

/**
 * A fixed-duration time span, stored as a whole number of milliseconds.
 *
 * Construct via {@link fromComponents}, {@link fromMilliseconds}, or
 * {@link parse}.
 */
export class Timedelta {
  /** Total duration in milliseconds (may be negative). */
  readonly totalMilliseconds: number;

  private constructor(ms: number) {
    if (!Number.isFinite(ms)) {
      throw new RangeError(`Timedelta: milliseconds must be finite, got ${ms}`);
    }
    this.totalMilliseconds = Math.trunc(ms);
  }

  // ── factories ────────────────────────────────────────────────────────────

  /**
   * Create a Timedelta from individual component fields.
   *
   * All fields default to `0`.  Values may be fractional or negative.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ days: 1, hours: 12 }).totalHours; // 36
   * ```
   */
  static fromComponents(c: TimedeltaComponents): Timedelta {
    const ms =
      (c.weeks ?? 0) * MS_PER_WEEK +
      (c.days ?? 0) * MS_PER_DAY +
      (c.hours ?? 0) * MS_PER_HOUR +
      (c.minutes ?? 0) * MS_PER_MINUTE +
      (c.seconds ?? 0) * MS_PER_SECOND +
      (c.milliseconds ?? 0);
    return new Timedelta(ms);
  }

  /**
   * Create a Timedelta from a total millisecond count.
   *
   * @example
   * ```ts
   * Timedelta.fromMilliseconds(3_600_000).totalHours; // 1
   * ```
   */
  static fromMilliseconds(ms: number): Timedelta {
    return new Timedelta(ms);
  }

  /**
   * Parse a string representation into a Timedelta.
   *
   * Supported formats:
   * - ISO 8601 subset: `"P1DT2H3M4S"`, `"PT1.5H"`, `"-P1D"`
   * - pandas-style: `"1 days 02:03:04"`, `"2 days 06:30:00.500"`
   * - HH:MM:SS[.mmm]: `"01:30:00"`, `"-02:15:00.250"`
   *
   * @throws {SyntaxError} When the string cannot be parsed.
   */
  static parse(s: string): Timedelta {
    const trimmed = s.trim();

    // ISO 8601
    const iso = RE_ISO.exec(trimmed);
    if (iso !== null) {
      const sign = trimmed.startsWith("-") ? -1 : 1;
      const [, wStr, dStr, hStr, mStr, sStr] = iso;
      const ms =
        Number(wStr ?? 0) * MS_PER_WEEK +
        Number(dStr ?? 0) * MS_PER_DAY +
        Number(hStr ?? 0) * MS_PER_HOUR +
        Number(mStr ?? 0) * MS_PER_MINUTE +
        Number(sStr ?? 0) * MS_PER_SECOND;
      return new Timedelta(sign * ms);
    }

    // pandas-style "N days HH:MM:SS[.mmm]"
    const pandas = RE_PANDAS.exec(trimmed);
    if (pandas !== null) {
      const [, signStr, daysStr, hStr, mStr, sStr, fracStr] = pandas;
      const sign = signStr === "-" ? -1 : 1;
      const ms =
        Number(daysStr) * MS_PER_DAY +
        Number(hStr) * MS_PER_HOUR +
        Number(mStr) * MS_PER_MINUTE +
        Number(sStr) * MS_PER_SECOND +
        parseFrac(fracStr);
      return new Timedelta(sign * ms);
    }

    // HH:MM:SS[.mmm]
    const hms = RE_HHMMSS.exec(trimmed);
    if (hms !== null) {
      const [, signStr, hStr, mStr, sStr, fracStr] = hms;
      const sign = signStr === "-" ? -1 : 1;
      const ms =
        Number(hStr) * MS_PER_HOUR +
        Number(mStr) * MS_PER_MINUTE +
        Number(sStr) * MS_PER_SECOND +
        parseFrac(fracStr);
      return new Timedelta(sign * ms);
    }

    throw new SyntaxError(`Timedelta.parse: cannot parse "${s}"`);
  }

  // ── component accessors ──────────────────────────────────────────────────

  /**
   * Whole days component (floor towards zero).
   *
   * For negative durations the sign is preserved (e.g. -1 for −23 h).
   */
  get days(): number {
    return Math.trunc(this.totalMilliseconds / MS_PER_DAY);
  }

  /** Hours component (0–23), always non-negative within the day. */
  get hours(): number {
    return Math.floor(Math.abs(this.totalMilliseconds % MS_PER_DAY) / MS_PER_HOUR);
  }

  /** Minutes component (0–59). */
  get minutes(): number {
    return Math.floor((Math.abs(this.totalMilliseconds) % MS_PER_HOUR) / MS_PER_MINUTE);
  }

  /** Seconds component (0–59). */
  get seconds(): number {
    return Math.floor((Math.abs(this.totalMilliseconds) % MS_PER_MINUTE) / MS_PER_SECOND);
  }

  /** Milliseconds component (0–999). */
  get milliseconds(): number {
    return Math.abs(this.totalMilliseconds) % MS_PER_SECOND;
  }

  // ── total-unit conversions ────────────────────────────────────────────────

  /** Duration expressed in whole + fractional days. */
  get totalDays(): number {
    return this.totalMilliseconds / MS_PER_DAY;
  }

  /** Duration expressed in whole + fractional hours. */
  get totalHours(): number {
    return this.totalMilliseconds / MS_PER_HOUR;
  }

  /** Duration expressed in whole + fractional minutes. */
  get totalMinutes(): number {
    return this.totalMilliseconds / MS_PER_MINUTE;
  }

  /** Duration expressed in whole + fractional seconds. */
  get totalSeconds(): number {
    return this.totalMilliseconds / MS_PER_SECOND;
  }

  // ── arithmetic ────────────────────────────────────────────────────────────

  /**
   * Return `this + other`.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ hours: 1 })
   *   .add(Timedelta.fromComponents({ minutes: 30 }))
   *   .totalMinutes; // 90
   * ```
   */
  add(other: Timedelta): Timedelta {
    return new Timedelta(this.totalMilliseconds + other.totalMilliseconds);
  }

  /**
   * Return `this - other`.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ hours: 2 })
   *   .sub(Timedelta.fromComponents({ hours: 1 }))
   *   .totalHours; // 1
   * ```
   */
  sub(other: Timedelta): Timedelta {
    return new Timedelta(this.totalMilliseconds - other.totalMilliseconds);
  }

  /**
   * Return `this * scalar`.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ hours: 1 }).mul(3).totalHours; // 3
   * ```
   */
  mul(scalar: number): Timedelta {
    return new Timedelta(this.totalMilliseconds * scalar);
  }

  /**
   * Return the negation of this duration.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ hours: 1 }).negate().totalHours; // -1
   * ```
   */
  negate(): Timedelta {
    return new Timedelta(-this.totalMilliseconds);
  }

  /**
   * Return the absolute value of this duration.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ hours: -3 }).abs().totalHours; // 3
   * ```
   */
  abs(): Timedelta {
    return new Timedelta(Math.abs(this.totalMilliseconds));
  }

  /**
   * Divide by another Timedelta, returning the ratio as a plain number.
   *
   * @throws {RangeError} When `other` is zero.
   */
  divBy(other: Timedelta): number {
    if (other.totalMilliseconds === 0) {
      throw new RangeError("Timedelta.divBy: cannot divide by zero duration");
    }
    return this.totalMilliseconds / other.totalMilliseconds;
  }

  // ── comparison ────────────────────────────────────────────────────────────

  /**
   * Compare two Timedeltas.
   *
   * Returns `< 0` if `this < other`, `0` if equal, `> 0` if `this > other`.
   */
  compareTo(other: Timedelta): number {
    return this.totalMilliseconds - other.totalMilliseconds;
  }

  /** Return `true` if `this` represents the same duration as `other`. */
  equals(other: Timedelta): boolean {
    return this.totalMilliseconds === other.totalMilliseconds;
  }

  // ── string representation ─────────────────────────────────────────────────

  /**
   * Return a pandas-compatible string: `"N days HH:MM:SS[.mmm]"`.
   *
   * For negative durations the sign is shown as a leading `-`.
   * The millisecond part is omitted when it is zero.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ days: 1, hours: 2, minutes: 3, seconds: 4 })
   *   .toString(); // "1 days 02:03:04"
   * Timedelta.fromComponents({ hours: -25 })
   *   .toString(); // "-1 days 01:00:00"
   * ```
   */
  toString(): string {
    const totalMs = this.totalMilliseconds;
    const sign = totalMs < 0 ? "-" : "";
    const absMs = Math.abs(totalMs);

    const [daysQ, remAfterDays] = floorDiv(absMs, MS_PER_DAY);
    const [hoursQ, remAfterHours] = floorDiv(remAfterDays, MS_PER_HOUR);
    const [minutesQ, remAfterMinutes] = floorDiv(remAfterHours, MS_PER_MINUTE);
    const [secondsQ, msQ] = floorDiv(remAfterMinutes, MS_PER_SECOND);

    const time = `${pad2(hoursQ)}:${pad2(minutesQ)}:${pad2(secondsQ)}`;
    const fracPart = msQ === 0 ? "" : `.${String(msQ).padStart(3, "0")}`;
    return `${sign}${daysQ} days ${time}${fracPart}`;
  }

  /**
   * Return an ISO 8601 duration string.
   *
   * @example
   * ```ts
   * Timedelta.fromComponents({ days: 1, hours: 2 }).toISOString(); // "P1DT2H"
   * Timedelta.fromComponents({ hours: -1 }).toISOString();          // "-PT1H"
   * ```
   */
  toISOString(): string {
    const absMs = Math.abs(this.totalMilliseconds);
    const sign = this.totalMilliseconds < 0 ? "-" : "";

    const [daysQ, remAfterDays] = floorDiv(absMs, MS_PER_DAY);
    const [hoursQ, remAfterHours] = floorDiv(remAfterDays, MS_PER_HOUR);
    const [minutesQ, remAfterMinutes] = floorDiv(remAfterHours, MS_PER_MINUTE);
    const [secondsQ, msQ] = floorDiv(remAfterMinutes, MS_PER_SECOND);

    let timePart = "";
    if (hoursQ !== 0) {
      timePart += `${hoursQ}H`;
    }
    if (minutesQ !== 0) {
      timePart += `${minutesQ}M`;
    }
    if (secondsQ !== 0 || msQ !== 0) {
      const fracSec = msQ === 0 ? `${secondsQ}S` : `${secondsQ}.${String(msQ).padStart(3, "0")}S`;
      timePart += fracSec;
    }

    const datePart = daysQ !== 0 ? `${daysQ}D` : "";
    const tSection = timePart !== "" ? `T${timePart}` : "";

    if (datePart === "" && tSection === "") {
      return "PT0S";
    }
    return `${sign}P${datePart}${tSection}`;
  }
}

// ─── TimedeltaIndex ───────────────────────────────────────────────────────────

/**
 * An ordered array of {@link Timedelta} values for use as a row / column index.
 *
 * @example
 * ```ts
 * const idx = TimedeltaIndex.fromTimedeltas([
 *   Timedelta.fromComponents({ hours: 0 }),
 *   Timedelta.fromComponents({ hours: 1 }),
 *   Timedelta.fromComponents({ hours: 2 }),
 * ]);
 * idx.size;                  // 3
 * idx.at(1).totalHours;     // 1
 * ```
 */
export class TimedeltaIndex {
  private readonly _data: readonly Timedelta[];

  /** Optional label for this index. */
  readonly name: string | null;

  private constructor(data: readonly Timedelta[], name: string | null) {
    this._data = data;
    this.name = name;
  }

  // ── factories ────────────────────────────────────────────────────────────

  /**
   * Create a TimedeltaIndex from an array of {@link Timedelta} values.
   *
   * @example
   * ```ts
   * const idx = TimedeltaIndex.fromTimedeltas([
   *   Timedelta.fromComponents({ hours: 0 }),
   *   Timedelta.fromComponents({ hours: 1 }),
   * ]);
   * ```
   */
  static fromTimedeltas(
    deltas: readonly Timedelta[],
    options?: TimedeltaIndexOptions,
  ): TimedeltaIndex {
    return new TimedeltaIndex([...deltas], options?.name ?? null);
  }

  /**
   * Create a range of evenly-spaced Timedeltas (inclusive of both endpoints).
   *
   * @param start - First value.
   * @param stop - Last value (inclusive when `step` divides evenly).
   * @param step - Interval between values.
   * @throws {RangeError} When `step` is zero or would produce an infinite sequence.
   *
   * @example
   * ```ts
   * const idx = TimedeltaIndex.fromRange(
   *   Timedelta.fromComponents({ hours: 0 }),
   *   Timedelta.fromComponents({ hours: 4 }),
   *   Timedelta.fromComponents({ hours: 1 }),
   * );
   * idx.size; // 5
   * ```
   */
  static fromRange(
    start: Timedelta,
    stop: Timedelta,
    step: Timedelta,
    options?: TimedeltaIndexOptions,
  ): TimedeltaIndex {
    if (step.totalMilliseconds === 0) {
      throw new RangeError("TimedeltaIndex.fromRange: step must be non-zero");
    }
    const deltas: Timedelta[] = [];
    let current = start.totalMilliseconds;
    const stopMs = stop.totalMilliseconds;
    const stepMs = step.totalMilliseconds;
    const forward = stepMs > 0;
    while (forward ? current <= stopMs : current >= stopMs) {
      deltas.push(Timedelta.fromMilliseconds(current));
      current += stepMs;
    }
    return new TimedeltaIndex(deltas, options?.name ?? null);
  }

  /**
   * Create a TimedeltaIndex by parsing an array of strings.
   *
   * Each string is forwarded to {@link Timedelta.parse}.
   *
   * @example
   * ```ts
   * TimedeltaIndex.fromStrings(["0 days 01:00:00", "0 days 02:00:00"]);
   * ```
   */
  static fromStrings(strings: readonly string[], options?: TimedeltaIndexOptions): TimedeltaIndex {
    const deltas = strings.map((s) => Timedelta.parse(s));
    return new TimedeltaIndex(deltas, options?.name ?? null);
  }

  // ── accessors ────────────────────────────────────────────────────────────

  /** Number of elements in this index. */
  get size(): number {
    return this._data.length;
  }

  /**
   * Return the Timedelta at position `i` (0-based).
   *
   * @throws {RangeError} When `i` is out of bounds.
   */
  at(i: number): Timedelta {
    if (i < 0 || i >= this._data.length) {
      throw new RangeError(`TimedeltaIndex.at: index ${i} out of bounds [0, ${this._data.length})`);
    }
    // biome-ignore lint/style/noNonNullAssertion: bounds checked above
    return this._data[i]!;
  }

  /** Return all values as a plain array. */
  toArray(): Timedelta[] {
    return [...this._data];
  }

  // ── operations ────────────────────────────────────────────────────────────

  /**
   * Return a new TimedeltaIndex sorted in ascending order.
   *
   * @example
   * ```ts
   * idx.sort().at(0).totalMilliseconds; // smallest duration
   * ```
   */
  sort(options?: { ascending?: boolean }): TimedeltaIndex {
    const asc = options?.ascending ?? true;
    const sorted = [...this._data].sort((a, b) => {
      const diff = a.totalMilliseconds - b.totalMilliseconds;
      return asc ? diff : -diff;
    });
    return new TimedeltaIndex(sorted, this.name);
  }

  /**
   * Return a new TimedeltaIndex with duplicates removed (first occurrence kept).
   */
  unique(): TimedeltaIndex {
    const seen = new Set<number>();
    const unique: Timedelta[] = [];
    for (const td of this._data) {
      if (!seen.has(td.totalMilliseconds)) {
        seen.add(td.totalMilliseconds);
        unique.push(td);
      }
    }
    return new TimedeltaIndex(unique, this.name);
  }

  /**
   * Shift every element by adding `delta` to each value.
   *
   * @example
   * ```ts
   * idx.shift(Timedelta.fromComponents({ hours: 1 }));
   * ```
   */
  shift(delta: Timedelta): TimedeltaIndex {
    const shifted = this._data.map((td) => td.add(delta));
    return new TimedeltaIndex(shifted, this.name);
  }

  /**
   * Return the minimum Timedelta in this index.
   *
   * @throws {RangeError} When the index is empty.
   */
  min(): Timedelta {
    const first = this._data[0];
    if (first === undefined) {
      throw new RangeError("TimedeltaIndex.min: empty index");
    }
    let best = first;
    for (const td of this._data) {
      if (td.totalMilliseconds < best.totalMilliseconds) {
        best = td;
      }
    }
    return best;
  }

  /**
   * Return the maximum Timedelta in this index.
   *
   * @throws {RangeError} When the index is empty.
   */
  max(): Timedelta {
    const first = this._data[0];
    if (first === undefined) {
      throw new RangeError("TimedeltaIndex.max: empty index");
    }
    let best = first;
    for (const td of this._data) {
      if (td.totalMilliseconds > best.totalMilliseconds) {
        best = td;
      }
    }
    return best;
  }

  /**
   * Return a new index containing only elements that satisfy `predicate`.
   */
  filter(predicate: (td: Timedelta, i: number) => boolean): TimedeltaIndex {
    return new TimedeltaIndex(this._data.filter(predicate), this.name);
  }

  /**
   * Return all string representations as an array.
   */
  toStrings(): string[] {
    return this._data.map((td) => td.toString());
  }

  /**
   * Return a new TimedeltaIndex with the given `name`.
   */
  rename(name: string | null): TimedeltaIndex {
    return new TimedeltaIndex(this._data, name);
  }
}
