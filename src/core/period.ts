/**
 * Period and PeriodIndex — fixed-frequency time spans.
 *
 * Mirrors `pandas.Period` and `pandas.PeriodIndex`.
 *
 * A {@link Period} represents a single time span at a fixed frequency.
 * A {@link PeriodIndex} is an ordered sequence of such spans, suitable for
 * use as a row / column index.
 *
 * **Supported frequencies:**
 * | Code | Description                        |
 * |------|------------------------------------|
 * | `"A"` | Calendar year (alias `"Y"`)       |
 * | `"Q"` | Calendar quarter                   |
 * | `"M"` | Calendar month                     |
 * | `"W"` | ISO week (Monday start, Sunday end) |
 * | `"D"` | Day                                |
 * | `"H"` | Hour                               |
 * | `"T"` | Minute (alias `"min"`)             |
 * | `"S"` | Second                             |
 *
 * @example
 * ```ts
 * const p = Period.fromDate(new Date("2024-03-15T00:00:00Z"), "M");
 * p.toString();         // "2024-03"
 * p.add(2).toString();  // "2024-05"
 *
 * const idx = PeriodIndex.fromRange(
 *   Period.fromDate(new Date("2024-01-01T00:00:00Z"), "Q"),
 *   Period.fromDate(new Date("2024-12-31T00:00:00Z"), "Q"),
 * );
 * idx.size;             // 4
 * idx.at(0).toString(); // "2024Q1"
 * ```
 *
 * @module
 */

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Supported period frequencies.
 *
 * `"Y"` is accepted as an alias for `"A"` (annual).
 * `"min"` is accepted as an alias for `"T"` (minute).
 */
export type PeriodFreq = "A" | "Q" | "M" | "W" | "D" | "H" | "T" | "S";

/** Options accepted by {@link PeriodIndex} factory methods. */
export interface PeriodIndexOptions {
  /** Optional name label for the index. */
  readonly name?: string | null;
}

// ─── internal constants ───────────────────────────────────────────────────────

const MS_S = 1_000;
const MS_MIN = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

/**
 * 1970-01-01 is a Thursday (Monday = 0, Thursday = 3).
 * Week ordinal 0 starts on Monday 1969-12-29.
 * Offset = 3 days bridges 1969-12-29 → 1970-01-01.
 */
const WEEK_OFFSET = 3;

/** Canonical ordered list of supported frequencies for validation. */
const VALID_FREQS = ["A", "Q", "M", "W", "D", "H", "T", "S"] as const;

// ─── top-level regex constants ────────────────────────────────────────────────

const RE_QUARTER = /^(\d{4})Q([1-4])$/i;
const RE_YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const RE_YEAR = /^\d{4}$/;

// ─── frequency helpers ────────────────────────────────────────────────────────

/** Normalise a user-supplied frequency string to a canonical {@link PeriodFreq}. */
function normFreq(freq: string): PeriodFreq {
  const upper = freq.toUpperCase();
  if (upper === "MIN") {
    return "T";
  }
  if (upper === "Y") {
    return "A";
  }
  for (const v of VALID_FREQS) {
    if (v === upper) {
      return v;
    }
  }
  throw new Error(`Unsupported PeriodFreq: "${freq}". Valid: A (Y), Q, M, W, D, H, T (min), S`);
}

// ─── ordinal ↔ Date conversion ────────────────────────────────────────────────

/**
 * Compute the integer ordinal for a given Date and frequency.
 * Ordinal 0 corresponds to the period containing 1970-01-01T00:00:00Z.
 */
function dateToOrdinal(date: Date, freq: PeriodFreq): number {
  const ms = date.getTime();
  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth(); // 0-based
  const dayOrd = Math.floor(ms / MS_DAY);
  switch (freq) {
    case "S":
      return Math.floor(ms / MS_S);
    case "T":
      return Math.floor(ms / MS_MIN);
    case "H":
      return Math.floor(ms / MS_HOUR);
    case "D":
      return dayOrd;
    case "W":
      return Math.floor((dayOrd + WEEK_OFFSET) / 7);
    case "M":
      return (y - 1970) * 12 + mo;
    case "Q":
      return (y - 1970) * 4 + Math.floor(mo / 3);
    case "A":
      return y - 1970;
    default:
      throw new Error(`Unreachable: unknown freq "${freq}"`);
  }
}

/** Start-of-period timestamp in ms since Unix epoch for the given ordinal. */
function ordinalToStartMs(ordinal: number, freq: PeriodFreq): number {
  switch (freq) {
    case "S":
      return ordinal * MS_S;
    case "T":
      return ordinal * MS_MIN;
    case "H":
      return ordinal * MS_HOUR;
    case "D":
      return ordinal * MS_DAY;
    case "W":
      return (ordinal * 7 - WEEK_OFFSET) * MS_DAY;
    case "M": {
      const y = 1970 + Math.floor(ordinal / 12);
      const mo = ((ordinal % 12) + 12) % 12;
      return Date.UTC(y, mo, 1);
    }
    case "Q": {
      const y = 1970 + Math.floor(ordinal / 4);
      const q = ((ordinal % 4) + 4) % 4;
      return Date.UTC(y, q * 3, 1);
    }
    case "A":
      return Date.UTC(1970 + ordinal, 0, 1);
    default:
      throw new Error(`Unreachable: unknown freq "${freq}"`);
  }
}

/** End-of-period timestamp (last ms) for the given ordinal. */
function ordinalToEndMs(ordinal: number, freq: PeriodFreq): number {
  return ordinalToStartMs(ordinal + 1, freq) - 1;
}

// ─── formatting ───────────────────────────────────────────────────────────────

/** Zero-pad a number to exactly 2 decimal digits. */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Period ordinal as a human-readable string for the given frequency. */
function formatPeriod(ordinal: number, freq: PeriodFreq): string {
  const start = new Date(ordinalToStartMs(ordinal, freq));
  const y = start.getUTCFullYear();
  const mo = pad2(start.getUTCMonth() + 1);
  const d = pad2(start.getUTCDate());
  const h = pad2(start.getUTCHours());
  const mi = pad2(start.getUTCMinutes());
  const s = pad2(start.getUTCSeconds());
  switch (freq) {
    case "A":
      return `${y}`;
    case "Q": {
      const q = Math.floor(start.getUTCMonth() / 3) + 1;
      return `${y}Q${q}`;
    }
    case "M":
      return `${y}-${mo}`;
    case "W": {
      const end = new Date(ordinalToEndMs(ordinal, freq));
      const ey = end.getUTCFullYear();
      const emo = pad2(end.getUTCMonth() + 1);
      const ed = pad2(end.getUTCDate());
      return `${y}-${mo}-${d}/${ey}-${emo}-${ed}`;
    }
    case "D":
      return `${y}-${mo}-${d}`;
    case "H":
      return `${y}-${mo}-${d} ${h}:00`;
    case "T":
      return `${y}-${mo}-${d} ${h}:${mi}`;
    case "S":
      return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
    default:
      throw new Error(`Unreachable: unknown freq "${freq}"`);
  }
}

// ─── parsing ──────────────────────────────────────────────────────────────────

/** Attempt to parse "2024Q1" → Date(2024-01-01). Returns null on mismatch. */
function tryParseQuarter(s: string): Date | null {
  const m = RE_QUARTER.exec(s);
  if (m === null) {
    return null;
  }
  const year = Number(m[1] ?? "1970");
  const q = Number(m[2] ?? "1");
  return new Date(Date.UTC(year, (q - 1) * 3, 1));
}

/** Attempt to parse "2024-03" → Date(2024-03-01). Returns null on mismatch. */
function tryParseYearMonth(s: string): Date | null {
  const m = RE_YEAR_MONTH.exec(s);
  if (m === null) {
    return null;
  }
  const year = Number(m[1] ?? "1970");
  const month = Number(m[2] ?? "1") - 1;
  return new Date(Date.UTC(year, month, 1));
}

/** Attempt to parse "2024" → Date(2024-01-01). Returns null on mismatch. */
function tryParseYear(s: string): Date | null {
  const m = RE_YEAR.exec(s);
  if (m === null) {
    return null;
  }
  return new Date(Date.UTC(Number(s), 0, 1));
}

/** Attempt to parse "YYYY-MM-DD/YYYY-MM-DD" → start Date. Returns null on mismatch. */
function tryParseWeekRange(s: string): Date | null {
  const slash = s.indexOf("/");
  if (slash < 0) {
    return null;
  }
  return new Date(`${s.slice(0, slash)}T00:00:00Z`);
}

/** Normalise a plain ISO date string to ensure UTC parsing. */
function normIso(s: string): string {
  if (s.includes("T") || s.endsWith("Z")) {
    return s;
  }
  const withT = s.replace(" ", "T");
  return withT.length <= 10 ? `${withT}T00:00:00Z` : `${withT}Z`;
}

/** Parse a period string into a Date for the given frequency. */
function parsePeriodString(s: string, freq: PeriodFreq): Date {
  if (freq === "A") {
    const d = tryParseYear(s);
    if (d !== null) {
      return d;
    }
  }
  if (freq === "Q") {
    const d = tryParseQuarter(s);
    if (d !== null) {
      return d;
    }
  }
  if (freq === "M") {
    const d = tryParseYearMonth(s);
    if (d !== null) {
      return d;
    }
  }
  if (freq === "W") {
    const d = tryParseWeekRange(s);
    if (d !== null) {
      return d;
    }
  }
  const d = new Date(normIso(s));
  if (!Number.isFinite(d.getTime())) {
    throw new Error(`Cannot parse "${s}" as Period with freq "${freq}"`);
  }
  return d;
}

// ─── Period ───────────────────────────────────────────────────────────────────

/**
 * A single time span at a fixed frequency.
 *
 * Mirrors `pandas.Period`. Internally stores an integer `ordinal` (number
 * of periods elapsed since the Unix epoch for that frequency) together with
 * the frequency code.
 *
 * Periods are **immutable**: all mutation methods return a new `Period`.
 */
export class Period {
  /** Integer ordinal — number of complete periods since the Unix epoch. */
  readonly ordinal: number;

  /** Canonical frequency code. */
  readonly freq: PeriodFreq;

  /**
   * Construct a Period directly from its ordinal and frequency.
   *
   * @param ordinal - Integer period count since the Unix epoch.
   * @param freq    - Frequency code (case-insensitive; `"Y"` and `"min"` accepted).
   */
  constructor(ordinal: number, freq: PeriodFreq | string) {
    if (!Number.isInteger(ordinal)) {
      throw new Error(`Period ordinal must be an integer, got ${ordinal}`);
    }
    this.ordinal = ordinal;
    this.freq = normFreq(freq as string);
  }

  /**
   * Create a Period from a `Date` object.
   *
   * The period that *contains* `date` at the given frequency is returned.
   */
  static fromDate(date: Date, freq: PeriodFreq | string): Period {
    const f = normFreq(freq as string);
    return new Period(dateToOrdinal(date, f), f);
  }

  /**
   * Create a Period from a string representation.
   *
   * Accepted formats depend on the frequency:
   * - `"A"`: `"2024"`
   * - `"Q"`: `"2024Q1"`
   * - `"M"`: `"2024-03"`
   * - `"W"`: `"2024-01-01/2024-01-07"` or any date string in the week
   * - `"D"`: `"2024-01-15"`
   * - `"H"`: `"2024-01-15T12:00:00Z"`
   * - `"T"`: `"2024-01-15T12:30:00Z"`
   * - `"S"`: `"2024-01-15T12:30:45Z"`
   */
  static fromString(s: string, freq: PeriodFreq | string): Period {
    const f = normFreq(freq as string);
    return new Period(dateToOrdinal(parsePeriodString(s, f), f), f);
  }

  /** Date marking the start of this period (UTC, inclusive). */
  get startTime(): Date {
    return new Date(ordinalToStartMs(this.ordinal, this.freq));
  }

  /** Date marking the end of this period (UTC, inclusive, last millisecond). */
  get endTime(): Date {
    return new Date(ordinalToEndMs(this.ordinal, this.freq));
  }

  /** Duration of this period in milliseconds. */
  get durationMs(): number {
    return ordinalToEndMs(this.ordinal, this.freq) - ordinalToStartMs(this.ordinal, this.freq) + 1;
  }

  /**
   * Return true if the given `Date` falls within this period (inclusive of
   * both endpoints).
   */
  contains(date: Date): boolean {
    const ms = date.getTime();
    return (
      ms >= ordinalToStartMs(this.ordinal, this.freq) &&
      ms <= ordinalToEndMs(this.ordinal, this.freq)
    );
  }

  /**
   * Return a new Period shifted `n` periods forward (`n > 0`) or backward
   * (`n < 0`) at the same frequency.
   */
  add(n: number): Period {
    return new Period(this.ordinal + n, this.freq);
  }

  /**
   * Return the number of periods between `this` and `other` (`this - other`).
   *
   * Both periods must share the same frequency.
   */
  diff(other: Period): number {
    if (other.freq !== this.freq) {
      throw new Error(
        `Cannot diff periods with different frequencies: "${this.freq}" vs "${other.freq}"`,
      );
    }
    return this.ordinal - other.ordinal;
  }

  /**
   * Compare two periods.  Returns negative / zero / positive just like
   * `Array.prototype.sort` comparators.
   *
   * Both periods must share the same frequency.
   */
  compareTo(other: Period): number {
    if (other.freq !== this.freq) {
      throw new Error(
        `Cannot compare periods with different frequencies: "${this.freq}" vs "${other.freq}"`,
      );
    }
    return this.ordinal - other.ordinal;
  }

  /** Structural equality — same ordinal and same frequency. */
  equals(other: Period): boolean {
    return this.ordinal === other.ordinal && this.freq === other.freq;
  }

  /**
   * Convert this period to a different frequency.
   *
   * The `how` parameter controls which point within this period is used:
   * - `"start"` (default) — use the start of the current period
   * - `"end"` — use the end of the current period
   */
  asfreq(freq: PeriodFreq | string, how: "start" | "end" = "start"): Period {
    const f = normFreq(freq as string);
    const ms =
      how === "end"
        ? ordinalToEndMs(this.ordinal, this.freq)
        : ordinalToStartMs(this.ordinal, this.freq);
    return new Period(dateToOrdinal(new Date(ms), f), f);
  }

  /** Human-readable string representation (matches pandas output). */
  toString(): string {
    return formatPeriod(this.ordinal, this.freq);
  }

  /** JSON serialisation delegates to {@link toString}. */
  toJSON(): string {
    return this.toString();
  }
}

// ─── PeriodIndex ──────────────────────────────────────────────────────────────

/**
 * An ordered sequence of {@link Period} values at a uniform frequency.
 *
 * Mirrors `pandas.PeriodIndex`. Internally stores integer ordinals for
 * efficiency; {@link Period} objects are created on demand by {@link at}.
 *
 * @example
 * ```ts
 * const idx = PeriodIndex.periodRange(
 *   Period.fromDate(new Date("2024-01-01T00:00:00Z"), "M"),
 *   6,
 * );
 * idx.size;             // 6
 * idx.at(0).toString(); // "2024-01"
 * idx.at(5).toString(); // "2024-06"
 * idx.getLoc(Period.fromString("2024-03", "M")); // 2
 * ```
 */
export class PeriodIndex {
  private readonly _ordinals: readonly number[];

  /** Frequency shared by all periods in this index. */
  readonly freq: PeriodFreq;

  /** Optional name label. */
  readonly name: string | null;

  private constructor(ordinals: readonly number[], freq: PeriodFreq, name?: string | null) {
    this._ordinals = ordinals;
    this.freq = freq;
    this.name = name ?? null;
  }

  // ─── factory methods ──────────────────────────────────────────────────────

  /**
   * Build a PeriodIndex from an array of {@link Period} objects.
   *
   * All periods must share the same frequency; the frequency of the first
   * element is used (an error is thrown on mismatch).
   */
  static fromPeriods(periods: readonly Period[], options?: PeriodIndexOptions): PeriodIndex {
    if (periods.length === 0) {
      throw new Error("Cannot construct PeriodIndex from an empty array");
    }
    const first = periods[0];
    if (first === undefined) {
      throw new Error("Cannot construct PeriodIndex from an empty array");
    }
    const freq = first.freq;
    const ordinals: number[] = [];
    for (const p of periods) {
      if (p.freq !== freq) {
        throw new Error(
          `PeriodIndex.fromPeriods: all periods must share the same frequency. Expected "${freq}", got "${p.freq}"`,
        );
      }
      ordinals.push(p.ordinal);
    }
    return new PeriodIndex(ordinals, freq, options?.name);
  }

  /**
   * Build a PeriodIndex covering every period from `start` to `end` inclusive.
   *
   * `start` and `end` must share the same frequency.
   */
  static fromRange(start: Period, end: Period, options?: PeriodIndexOptions): PeriodIndex {
    if (start.freq !== end.freq) {
      throw new Error(
        `PeriodIndex.fromRange: start and end must share the same frequency ("${start.freq}" vs "${end.freq}")`,
      );
    }
    if (start.ordinal > end.ordinal) {
      throw new Error(`PeriodIndex.fromRange: start (${start}) must be ≤ end (${end})`);
    }
    const ordinals: number[] = [];
    for (let i = start.ordinal; i <= end.ordinal; i++) {
      ordinals.push(i);
    }
    return new PeriodIndex(ordinals, start.freq, options?.name);
  }

  /**
   * Generate a PeriodIndex by stepping `periods` periods forward from `start`.
   *
   * `periods` must be a positive integer.
   */
  static periodRange(start: Period, periods: number, options?: PeriodIndexOptions): PeriodIndex {
    if (!Number.isInteger(periods) || periods <= 0) {
      throw new Error(
        `PeriodIndex.periodRange: "periods" must be a positive integer, got ${periods}`,
      );
    }
    const ordinals: number[] = [];
    for (let i = 0; i < periods; i++) {
      ordinals.push(start.ordinal + i);
    }
    return new PeriodIndex(ordinals, start.freq, options?.name);
  }

  // ─── properties ───────────────────────────────────────────────────────────

  /** Number of periods in the index. */
  get size(): number {
    return this._ordinals.length;
  }

  /** Shape tuple `[size]`. */
  get shape(): [number] {
    return [this._ordinals.length];
  }

  /** Always 1 — a PeriodIndex is one-dimensional. */
  get ndim(): 1 {
    return 1;
  }

  /** True when the index contains no periods. */
  get empty(): boolean {
    return this._ordinals.length === 0;
  }

  // ─── element access ───────────────────────────────────────────────────────

  /**
   * Return the {@link Period} at position `i` (0-based).
   *
   * Negative indices are supported (Python-style).
   */
  at(i: number): Period {
    const len = this._ordinals.length;
    const idx = i < 0 ? len + i : i;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Index ${i} out of bounds for PeriodIndex of size ${len}`);
    }
    const ordinal = this._ordinals[idx];
    if (ordinal === undefined) {
      throw new RangeError(`Index ${i} out of bounds for PeriodIndex of size ${len}`);
    }
    return new Period(ordinal, this.freq);
  }

  /**
   * Return the 0-based position of the first occurrence of `period`.
   *
   * Throws if the period is not found or has a different frequency.
   */
  getLoc(period: Period): number {
    if (period.freq !== this.freq) {
      throw new Error(
        `getLoc: period frequency "${period.freq}" does not match index frequency "${this.freq}"`,
      );
    }
    const idx = this._ordinals.indexOf(period.ordinal);
    if (idx < 0) {
      throw new Error(`Period ${period} not found in index`);
    }
    return idx;
  }

  /**
   * Return true if `period` appears in this index.
   */
  contains(period: Period): boolean {
    if (period.freq !== this.freq) {
      return false;
    }
    return this._ordinals.includes(period.ordinal);
  }

  /**
   * Return an array of all {@link Period} objects in this index.
   */
  toArray(): Period[] {
    return this._ordinals.map((ord) => new Period(ord, this.freq));
  }

  // ─── transformation ───────────────────────────────────────────────────────

  /**
   * Return a new PeriodIndex shifted `n` periods forward (`n > 0`) or
   * backward (`n < 0`).
   */
  shift(n: number): PeriodIndex {
    return new PeriodIndex(
      this._ordinals.map((ord) => ord + n),
      this.freq,
      this.name,
    );
  }

  /**
   * Convert all periods to a different frequency.
   *
   * The `how` parameter controls which point within each period is used:
   * - `"start"` (default) — start of each current period
   * - `"end"` — end of each current period
   */
  asfreq(freq: PeriodFreq | string, how: "start" | "end" = "start"): PeriodIndex {
    const newFreq = normFreq(freq as string);
    const newOrdinals = this._ordinals.map((ord) => {
      const ms = how === "end" ? ordinalToEndMs(ord, this.freq) : ordinalToStartMs(ord, this.freq);
      return dateToOrdinal(new Date(ms), newFreq);
    });
    return new PeriodIndex(newOrdinals, newFreq, this.name);
  }

  /**
   * Return a new PeriodIndex sorted in ascending order of ordinal.
   */
  sort(): PeriodIndex {
    const sorted = [...this._ordinals].sort((a, b) => a - b);
    return new PeriodIndex(sorted, this.freq, this.name);
  }

  /**
   * Return a copy of this index with duplicates removed (first occurrence wins).
   */
  unique(): PeriodIndex {
    const seen = new Set<number>();
    const unique: number[] = [];
    for (const ord of this._ordinals) {
      if (!seen.has(ord)) {
        seen.add(ord);
        unique.push(ord);
      }
    }
    return new PeriodIndex(unique, this.freq, this.name);
  }

  /**
   * Return the start {@link Date} for every period in the index.
   */
  toDatetimeStart(): Date[] {
    return this._ordinals.map((ord) => new Date(ordinalToStartMs(ord, this.freq)));
  }

  /**
   * Return the end {@link Date} (last ms) for every period in the index.
   */
  toDatetimeEnd(): Date[] {
    return this._ordinals.map((ord) => new Date(ordinalToEndMs(ord, this.freq)));
  }

  // ─── iteration / serialisation ────────────────────────────────────────────

  /** Iterate over all periods in order. */
  [Symbol.iterator](): Iterator<Period> {
    let i = 0;
    const ordinals = this._ordinals;
    const freq = this.freq;
    return {
      next(): IteratorResult<Period> {
        if (i >= ordinals.length) {
          return { done: true, value: undefined };
        }
        const ordinal = ordinals[i];
        i++;
        if (ordinal === undefined) {
          return { done: true, value: undefined };
        }
        return { done: false, value: new Period(ordinal, freq) };
      },
    };
  }

  /** Human-readable summary string. */
  toString(): string {
    const preview = this._ordinals
      .slice(0, 4)
      .map((ord) => formatPeriod(ord, this.freq))
      .join(", ");
    const suffix = this._ordinals.length > 4 ? ", ..." : "";
    return `PeriodIndex([${preview}${suffix}], freq="${this.freq}", length=${this._ordinals.length})`;
  }
}
