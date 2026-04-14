/**
 * Timestamp — a timezone-aware datetime scalar.
 *
 * Mirrors `pandas.Timestamp`: a single point in time with optional timezone,
 * component accessors, arithmetic with {@link Timedelta}, comparison operators,
 * and a rich set of formatting utilities.
 *
 * Stored internally as **milliseconds since the Unix epoch (UTC)** plus optional
 * sub-millisecond `microsecond` and `nanosecond` offsets.  For naive timestamps
 * (no timezone) the millisecond value is interpreted as a wall-clock time in UTC
 * space — matching pandas' behaviour where naive Timestamps carry no offset.
 *
 * ## Construction
 *
 * ```ts
 * // From ISO string
 * const ts1 = new Timestamp("2024-01-15T10:30:00");
 *
 * // From unix seconds
 * const ts2 = new Timestamp(1705312200, { unit: "s" });
 *
 * // From JS Date
 * const ts3 = new Timestamp(new Date("2024-01-15T10:30:00Z"));
 *
 * // With timezone
 * const ts4 = new Timestamp("2024-01-15 10:30:00", { tz: "America/New_York" });
 *
 * // Static constructors
 * const now = Timestamp.now("UTC");
 * const today = Timestamp.today();
 * ```
 *
 * ## Key properties
 *
 * ```ts
 * ts.year; ts.month; ts.day; ts.hour; ts.minute; ts.second;
 * ts.millisecond; ts.microsecond; ts.nanosecond;
 * ts.dayofweek;  // 0 = Monday … 6 = Sunday  (same as pandas)
 * ts.dayofyear;  ts.quarter;  ts.tz;
 * ts.is_leap_year;  ts.is_month_start;  ts.is_month_end;
 * ```
 *
 * ## Arithmetic
 *
 * ```ts
 * const later = ts.add(Timedelta.fromComponents({ hours: 2 }));
 * const delta = later.sub(ts);  // Timedelta
 * ```
 *
 * @module
 */

import { Timedelta } from "./timedelta.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Numeric unit for the `unit` option in {@link TimestampOptions}. */
export type TimestampUnit = "s" | "ms" | "us" | "ns";

/** Options accepted by the {@link Timestamp} constructor. */
export interface TimestampOptions {
  /**
   * IANA timezone identifier (e.g. `"UTC"`, `"America/New_York"`).
   * If supplied, the timestamp is localised to this timezone during display.
   */
  readonly tz?: string | null;
  /**
   * Interpretation of numeric input.
   * `"s"` = Unix seconds, `"ms"` = milliseconds (default),
   * `"us"` = microseconds, `"ns"` = nanoseconds.
   */
  readonly unit?: TimestampUnit;
  /** Extra nanoseconds (0–999) beyond the millisecond boundary. */
  readonly nanosecond?: number;
}

/** Component fields for constructing a Timestamp from parts. */
export interface TimestampComponents {
  readonly year: number;
  readonly month: number; // 1-based
  readonly day: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
  readonly microsecond?: number;
  readonly nanosecond?: number;
  readonly tz?: string | null;
}

// ─── internal helpers ──────────────────────────────────────────────────────────

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const WEEKDAY_NAMES: readonly string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEEKDAY_ABBR: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES: readonly string[] = [
  "", // 1-based
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_ABBR: readonly string[] = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Left-pad a number with zeros to `len` digits. */
function pad(n: number, len: number): string {
  return String(Math.abs(n)).padStart(len, "0");
}

/** Days in month (1-based month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Is `year` a leap year? */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Day of year (1-based) for the given UTC year/month/day.
 */
function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const curr = Date.UTC(year, month - 1, day);
  return Math.round((curr - start) / MS_PER_DAY) + 1;
}

/**
 * Return all local date/time components for `utcMs` in `tz`.
 * For naive (tz=null) timestamps, returns the UTC components directly.
 */
interface DateParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0=Monday, 6=Sunday
}

function getLocalParts(utcMs: number, tz: string | null): DateParts {
  if (tz === null) {
    const d = new Date(utcMs);
    // Use UTC accessors because for naive timestamps the stored ms value
    // is already in "wall-clock UTC" space.
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const hour = d.getUTCHours();
    const minute = d.getUTCMinutes();
    const second = d.getUTCSeconds();
    // JS: 0=Sun … 6=Sat  →  pandas: 0=Mon … 6=Sun
    const jsDow = d.getUTCDay();
    const weekday = jsDow === 0 ? 6 : jsDow - 1;
    return { year, month, day, hour, minute, second, weekday };
  }

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(utcMs));

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    switch (p.type) {
      case "year":
        year = Number(p.value);
        break;
      case "month":
        month = Number(p.value);
        break;
      case "day":
        day = Number(p.value);
        break;
      case "hour":
        hour = Number(p.value) % 24;
        break;
      case "minute":
        minute = Number(p.value);
        break;
      case "second":
        second = Number(p.value);
        break;
      default:
        break;
    }
  }

  // Compute weekday: get the weekday of the *local* date in the given tz.
  const localMidnight = Date.UTC(year, month - 1, day);
  const jsDow = new Date(localMidnight).getUTCDay();
  const weekday = jsDow === 0 ? 6 : jsDow - 1;

  return { year, month, day, hour, minute, second, weekday };
}

/**
 * Return the UTC offset in minutes for `tz` at `utcMs`.
 * Positive means east of UTC (e.g. +05:30 → +330).
 */
function utcOffsetMinutes(utcMs: number, tz: string): number {
  const d = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const p of parts) {
    switch (p.type) {
      case "year":
        year = Number(p.value);
        break;
      case "month":
        month = Number(p.value);
        break;
      case "day":
        day = Number(p.value);
        break;
      case "hour":
        hour = Number(p.value) % 24;
        break;
      case "minute":
        minute = Number(p.value);
        break;
      case "second":
        second = Number(p.value);
        break;
      default:
        break;
    }
  }
  const localMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return (localMs - utcMs) / MS_PER_MINUTE;
}

/** Convert wall-clock "naive UTC" ms to a true UTC ms for a given timezone. */
function wallClockToUtc(wallMs: number, tz: string): number {
  // First estimate: offset at the wall-clock time treated as UTC.
  const offset1 = utcOffsetMinutes(wallMs, tz);
  const utc1 = wallMs - offset1 * MS_PER_MINUTE;
  // Refine: recompute offset at utc1 (handles DST edges).
  const offset2 = utcOffsetMinutes(utc1, tz);
  const utc2 = wallMs - offset2 * MS_PER_MINUTE;
  return utc2;
}

// ─── string parsing ────────────────────────────────────────────────────────────

// Regex for ISO-like datetime strings.
// Groups: 1=year, 2=month, 3=day, 4=hour, 5=minute, 6=second, 7=fraction,
//         8=tz-sign, 9=tz-hour, 10=tz-minute (or "Z" in group 8 for UTC).
const RE_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):?(\d{2}))?$/;

const RE_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse an ISO-like datetime string into UTC milliseconds and tz metadata. */
function parseString(
  s: string,
  tzHint: string | null | undefined,
): { utcMs: number; parsedTz: string | null } {
  const trimmed = s.trim();

  // Try full datetime.
  const mDt = RE_DATETIME.exec(trimmed);
  if (mDt !== null) {
    const year = Number(mDt[1]);
    const month = Number(mDt[2]) - 1;
    const day = Number(mDt[3]);
    const hour = Number(mDt[4]);
    const minute = Number(mDt[5]);
    const second = Number(mDt[6]);

    // Parse sub-second fraction → milliseconds + microseconds.
    let ms = 0;
    if (mDt[7] !== undefined) {
      const frac = mDt[7].padEnd(6, "0").slice(0, 6);
      ms = Math.floor(Number(frac) / 1000);
    }

    const tzSign = mDt[8];
    if (tzSign === "Z") {
      // Explicit UTC.
      const utcMs = Date.UTC(year, month, day, hour, minute, second, ms);
      return { utcMs, parsedTz: "UTC" };
    }
    if (mDt[9] !== undefined && mDt[10] !== undefined) {
      // Explicit offset (+HH:MM or -HH:MM).
      const sign = mDt[9] === "+" ? 1 : -1;
      const offsetMs =
        sign * (Number(mDt[10]) * MS_PER_HOUR + Number(mDt[11] ?? "0") * MS_PER_MINUTE);
      const wallMs = Date.UTC(year, month, day, hour, minute, second, ms);
      const utcMs = wallMs - offsetMs;
      return { utcMs, parsedTz: tzHint ?? "UTC" };
    }

    // No timezone in string.
    const wallMs = Date.UTC(year, month, day, hour, minute, second, ms);
    if (tzHint) {
      const utcMs = wallClockToUtc(wallMs, tzHint);
      return { utcMs, parsedTz: tzHint };
    }
    return { utcMs: wallMs, parsedTz: null };
  }

  // Try date-only.
  const mDate = RE_DATE_ONLY.exec(trimmed);
  if (mDate !== null) {
    const year = Number(mDate[1]);
    const month = Number(mDate[2]) - 1;
    const day = Number(mDate[3]);
    const wallMs = Date.UTC(year, month, day);
    if (tzHint) {
      const utcMs = wallClockToUtc(wallMs, tzHint);
      return { utcMs, parsedTz: tzHint };
    }
    return { utcMs: wallMs, parsedTz: null };
  }

  throw new Error(`Timestamp: cannot parse "${s}"`);
}

// ─── frequency helpers for floor/ceil/round ───────────────────────────────────

/** Return the size of a frequency in milliseconds. */
function freqMs(freq: string): number {
  const upper = freq.toUpperCase();
  if (upper === "NS" || upper === "N") {
    return 0; // nanosecond — treat as 1ms for our resolution
  }
  if (upper === "US" || upper === "U") {
    return 1;
  }
  if (upper === "MS" || upper === "L") {
    return 1;
  }
  if (upper === "S") {
    return MS_PER_SECOND;
  }
  if (upper === "T" || upper === "MIN" || upper === "MIN") {
    return MS_PER_MINUTE;
  }
  if (upper === "H") {
    return MS_PER_HOUR;
  }
  if (upper === "D") {
    return MS_PER_DAY;
  }
  // Try "Nunit" pattern (e.g. "2H", "15T").
  const m = /^(\d+)(.+)$/.exec(freq);
  if (m !== null && m[1] !== undefined && m[2] !== undefined) {
    return Number(m[1]) * freqMs(m[2]);
  }
  throw new Error(`Timestamp.floor/ceil/round: unsupported frequency "${freq}"`);
}

// ─── Internal raw-construction sentinel ───────────────────────────────────────

/**
 * Internal-only class used to create Timestamp instances from pre-parsed fields
 * without going through the full parsing pipeline.  Never exported.
 */
class RawTimestamp {
  constructor(
    readonly utcMs: number,
    readonly tz: string | null,
    readonly us: number,
    readonly ns: number,
  ) {}
}

// ─── Timestamp class ──────────────────────────────────────────────────────────

/**
 * A single point in time — the TypeScript/tsb equivalent of `pandas.Timestamp`.
 *
 * @example
 * ```ts
 * const ts = new Timestamp("2024-06-15T12:00:00Z");
 * ts.year;       // 2024
 * ts.month;      // 6
 * ts.dayofweek;  // 5 (Saturday)
 * ts.isoformat(); // "2024-06-15T12:00:00.000Z"
 *
 * const ts2 = ts.add(Timedelta.fromComponents({ hours: 3 }));
 * ts2.hour; // 15
 * ```
 */
export class Timestamp {
  /** Milliseconds since Unix epoch (UTC). */
  readonly _utcMs: number;
  /** IANA timezone, or null for naive. */
  readonly _tz: string | null;
  /** Sub-millisecond microseconds (0–999). */
  readonly _us: number;
  /** Sub-microsecond nanoseconds (0–999). */
  readonly _ns: number;

  // ─── construction ────────────────────────────────────────────────────────────

  /**
   * Create a Timestamp from a string, number, or Date.
   *
   * @param input - ISO string, Unix numeric value, or JS Date.
   * @param options - Optional tz, unit, and nanosecond overrides.
   */
  constructor(
    input: string | number | Date | Timestamp | RawTimestamp,
    options?: TimestampOptions,
  ) {
    if (input instanceof RawTimestamp) {
      this._utcMs = input.utcMs;
      this._tz = input.tz;
      this._us = input.us;
      this._ns = input.ns;
      return;
    }
    const tz = options?.tz ?? null;
    const unit: TimestampUnit = options?.unit ?? "ms";
    const nsExtra = options?.nanosecond ?? 0;

    if (input instanceof Timestamp) {
      this._utcMs = input._utcMs;
      this._tz = tz !== null ? tz : input._tz;
      this._us = input._us;
      this._ns = nsExtra !== 0 ? nsExtra : input._ns;
      return;
    }

    if (input instanceof Date) {
      this._utcMs = input.getTime();
      this._tz = tz;
      this._us = 0;
      this._ns = nsExtra;
      return;
    }

    if (typeof input === "number") {
      let utcMs: number;
      let us = 0;
      switch (unit) {
        case "s":
          utcMs = Math.trunc(input) * MS_PER_SECOND;
          break;
        case "ms":
          utcMs = Math.trunc(input);
          break;
        case "us": {
          utcMs = Math.trunc(input / 1000);
          us = Math.trunc(input % 1000);
          break;
        }
        case "ns": {
          utcMs = Math.trunc(input / 1_000_000);
          us = Math.trunc((input % 1_000_000) / 1_000);
          break;
        }
        default:
          utcMs = Math.trunc(input);
      }
      this._utcMs = utcMs;
      this._tz = tz;
      this._us = us;
      this._ns = nsExtra;
      return;
    }

    // String input.
    const { utcMs, parsedTz } = parseString(input, tz);
    this._utcMs = utcMs;
    this._tz = tz !== null ? tz : parsedTz;
    this._us = 0;
    this._ns = nsExtra;
  }

  /**
   * Create a Timestamp from individual date/time components.
   *
   * @example
   * ```ts
   * Timestamp.fromComponents({ year: 2024, month: 6, day: 15, hour: 12 });
   * ```
   */
  static fromComponents(c: TimestampComponents): Timestamp {
    const tz = c.tz ?? null;
    const wallMs = Date.UTC(
      c.year,
      c.month - 1,
      c.day,
      c.hour ?? 0,
      c.minute ?? 0,
      c.second ?? 0,
      c.millisecond ?? 0,
    );
    let utcMs = wallMs;
    if (tz !== null) {
      utcMs = wallClockToUtc(wallMs, tz);
    }
    return new Timestamp(new RawTimestamp(utcMs, tz, c.microsecond ?? 0, c.nanosecond ?? 0));
  }

  /** Current UTC time as a Timestamp (optionally localised to `tz`). */
  static now(tz?: string | null): Timestamp {
    return new Timestamp(Date.now(), { tz: tz ?? null });
  }

  /**
   * Today's date at midnight (naive, local-machine wall clock).
   * Mirrors `pandas.Timestamp.today()` which returns today at midnight.
   */
  static today(): Timestamp {
    const now = new Date();
    const wallMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return new Timestamp(wallMs, { tz: null });
  }

  /**
   * Create a Timestamp from a Unix timestamp (seconds since epoch).
   *
   * @param ts - Unix seconds (float).
   * @param tz - Optional IANA timezone.
   */
  static fromtimestamp(ts: number, tz?: string | null): Timestamp {
    return new Timestamp(ts, { unit: "s", tz: tz ?? null });
  }

  /**
   * Parse an ISO 8601 string.
   *
   * @example
   * ```ts
   * Timestamp.fromisoformat("2024-06-15T12:00:00");
   * ```
   */
  static fromisoformat(s: string): Timestamp {
    return new Timestamp(s);
  }

  // ─── local-time component accessors ──────────────────────────────────────────

  /** Cached parts (lazy). */
  private _cachedParts: DateParts | undefined = undefined;
  private _localParts(): DateParts {
    if (this._cachedParts === undefined) {
      this._cachedParts = getLocalParts(this._utcMs, this._tz);
    }
    return this._cachedParts;
  }

  /** Four-digit year. */
  get year(): number {
    return this._localParts().year;
  }
  /** Month (1–12). */
  get month(): number {
    return this._localParts().month;
  }
  /** Day of month (1–31). */
  get day(): number {
    return this._localParts().day;
  }
  /** Hour (0–23). */
  get hour(): number {
    return this._localParts().hour;
  }
  /** Minute (0–59). */
  get minute(): number {
    return this._localParts().minute;
  }
  /** Second (0–59). */
  get second(): number {
    return this._localParts().second;
  }
  /** Millisecond (0–999). */
  get millisecond(): number {
    return this._utcMs % 1_000;
  }
  /** Microsecond (0–999999): millisecond * 1000 + sub-ms microseconds. */
  get microsecond(): number {
    return (this._utcMs % 1_000) * 1_000 + this._us;
  }
  /** Nanosecond (0–999). */
  get nanosecond(): number {
    return this._ns;
  }

  /**
   * Day of week (0=Monday, 6=Sunday), matching pandas convention.
   */
  get dayofweek(): number {
    return this._localParts().weekday;
  }
  /** Alias for {@link dayofweek}. */
  get weekday(): number {
    return this.dayofweek;
  }

  /** Day of year (1–366). */
  get dayofyear(): number {
    const { year, month, day } = this._localParts();
    return dayOfYear(year, month, day);
  }

  /** ISO week number (1–53). */
  get week(): number {
    const { year, month, day } = this._localParts();
    const d = new Date(Date.UTC(year, month - 1, day));
    // ISO week: set date to nearest Thursday.
    const thu = new Date(d.getTime());
    thu.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
    return Math.ceil(((thu.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  }

  /** Quarter (1–4). */
  get quarter(): number {
    return Math.ceil(this._localParts().month / 3);
  }

  /** IANA timezone string, or null for naive. */
  get tz(): string | null {
    return this._tz;
  }
  /** Alias for {@link tz}. */
  get tzinfo(): string | null {
    return this._tz;
  }
  /** Always null — tsb Timestamps have no fixed frequency. */
  get freq(): null {
    return null;
  }

  // ─── boolean properties ───────────────────────────────────────────────────────

  /** True if the year is a leap year. */
  get is_leap_year(): boolean {
    return isLeapYear(this.year);
  }

  /** True if this is the first day of the month. */
  get is_month_start(): boolean {
    return this.day === 1;
  }

  /** True if this is the last day of the month. */
  get is_month_end(): boolean {
    const { year, month, day } = this._localParts();
    return day === daysInMonth(year, month);
  }

  /** True if this is the first day of a quarter. */
  get is_quarter_start(): boolean {
    return (
      this.day === 1 &&
      (this.month === 1 || this.month === 4 || this.month === 7 || this.month === 10)
    );
  }

  /** True if this is the last day of a quarter. */
  get is_quarter_end(): boolean {
    const { year, month, day } = this._localParts();
    return (
      day === daysInMonth(year, month) &&
      (month === 3 || month === 6 || month === 9 || month === 12)
    );
  }

  /** True if this is the first day of the year (Jan 1). */
  get is_year_start(): boolean {
    return this.month === 1 && this.day === 1;
  }

  /** True if this is the last day of the year (Dec 31). */
  get is_year_end(): boolean {
    return this.month === 12 && this.day === 31;
  }

  // ─── conversion methods ───────────────────────────────────────────────────────

  /**
   * Unix timestamp as fractional seconds (float).
   * Mirrors `pandas.Timestamp.timestamp()`.
   */
  timestamp(): number {
    return this._utcMs / MS_PER_SECOND;
  }

  /**
   * Date portion as a plain object `{ year, month, day }`.
   * Mirrors `pandas.Timestamp.date()`.
   */
  date(): { year: number; month: number; day: number } {
    const { year, month, day } = this._localParts();
    return { year, month, day };
  }

  /**
   * Time portion as a plain object `{ hour, minute, second, microsecond }`.
   * Mirrors `pandas.Timestamp.time()`.
   */
  time(): { hour: number; minute: number; second: number; microsecond: number } {
    const { hour, minute, second } = this._localParts();
    return { hour, minute, second, microsecond: this.microsecond };
  }

  /** Convert to a JS `Date` object (millisecond precision). */
  toDate(): Date {
    return new Date(this._utcMs);
  }

  /**
   * Return an ISO 8601 string.
   *
   * @param sep - Separator between date and time (default `"T"`).
   * @param timespec - Precision: `"auto"`, `"hours"`, `"minutes"`, `"seconds"`,
   *                   `"milliseconds"`, `"microseconds"` (default `"auto"`).
   */
  isoformat(sep = "T", timespec = "auto"): string {
    const { year, month, day, hour, minute, second } = this._localParts();
    const ms = this._utcMs % 1_000;
    const datePart = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
    const spec =
      timespec === "auto" ? (ms !== 0 || this._us !== 0 ? "microseconds" : "seconds") : timespec;

    let timePart: string;
    switch (spec) {
      case "hours":
        timePart = `${pad(hour, 2)}`;
        break;
      case "minutes":
        timePart = `${pad(hour, 2)}:${pad(minute, 2)}`;
        break;
      case "seconds":
        timePart = `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`;
        break;
      case "milliseconds":
        timePart = `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}.${pad(ms, 3)}`;
        break;
      default:
        timePart = `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}.${pad(ms * 1_000 + this._us, 6)}`;
        break;
    }

    const tzSuffix =
      this._tz === null
        ? ""
        : this._tz === "UTC"
          ? "+00:00"
          : (() => {
              const offMin = utcOffsetMinutes(this._utcMs, this._tz);
              const sign = offMin >= 0 ? "+" : "-";
              const absMin = Math.abs(offMin);
              return `${sign}${pad(Math.floor(absMin / 60), 2)}:${pad(absMin % 60, 2)}`;
            })();

    return `${datePart}${sep}${timePart}${tzSuffix}`;
  }

  /**
   * Format using strftime-style format codes.
   *
   * Supported codes: `%Y %y %m %d %H %M %S %f %j %A %a %B %b %p %Z %z %w %I %% %n`
   *
   * @example
   * ```ts
   * ts.strftime("%Y-%m-%d %H:%M:%S"); // "2024-06-15 12:00:00"
   * ```
   */
  strftime(format: string): string {
    const { year, month, day, hour, minute, second, weekday } = this._localParts();
    const ms = this._utcMs % 1_000;
    const us6 = ms * 1_000 + this._us;
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? "AM" : "PM";
    const doy = dayOfYear(year, month, day);

    const tzName = this._tz ?? "";
    const tzOffset = (() => {
      if (this._tz === null) {
        return "";
      }
      const offMin = utcOffsetMinutes(this._utcMs, this._tz);
      const sign = offMin >= 0 ? "+" : "-";
      const absMin = Math.abs(offMin);
      return `${sign}${pad(Math.floor(absMin / 60), 2)}${pad(absMin % 60, 2)}`;
    })();

    // JS weekday: 0=Sunday … 6=Saturday (for %w).
    const jsDow = weekday === 6 ? 0 : weekday + 1;

    return format.replace(/%[A-Za-z%n]/g, (token) => {
      switch (token) {
        case "%Y":
          return pad(year, 4);
        case "%y":
          return pad(year % 100, 2);
        case "%m":
          return pad(month, 2);
        case "%d":
          return pad(day, 2);
        case "%H":
          return pad(hour, 2);
        case "%I":
          return pad(hour12, 2);
        case "%M":
          return pad(minute, 2);
        case "%S":
          return pad(second, 2);
        case "%f":
          return pad(us6, 6);
        case "%j":
          return pad(doy, 3);
        case "%A":
          return WEEKDAY_NAMES[weekday] ?? "";
        case "%a":
          return WEEKDAY_ABBR[weekday] ?? "";
        case "%B":
          return MONTH_NAMES[month] ?? "";
        case "%b":
          return MONTH_ABBR[month] ?? "";
        case "%p":
          return ampm;
        case "%Z":
          return tzName;
        case "%z":
          return tzOffset;
        case "%w":
          return String(jsDow);
        case "%%":
          return "%";
        case "%n":
          return "\n";
        default:
          return token;
      }
    });
  }

  // ─── rounding ─────────────────────────────────────────────────────────────────

  /**
   * Round down to the nearest `freq` boundary.
   *
   * @example
   * ```ts
   * new Timestamp("2024-01-15T10:37:29Z").floor("H").hour; // 10
   * ```
   */
  floor(freq: string): Timestamp {
    const unit = freqMs(freq);
    if (unit === 0) {
      return new Timestamp(this);
    }
    const floored = Math.floor(this._utcMs / unit) * unit;
    return new Timestamp(floored, { tz: this._tz });
  }

  /**
   * Round up to the nearest `freq` boundary.
   *
   * @example
   * ```ts
   * new Timestamp("2024-01-15T10:37:29Z").ceil("H").hour; // 11
   * ```
   */
  ceil(freq: string): Timestamp {
    const unit = freqMs(freq);
    if (unit === 0) {
      return new Timestamp(this);
    }
    const ceiled = Math.ceil(this._utcMs / unit) * unit;
    return new Timestamp(ceiled, { tz: this._tz });
  }

  /**
   * Round to the nearest `freq` boundary (ties go to even).
   *
   * @example
   * ```ts
   * new Timestamp("2024-01-15T10:37:30Z").round("H").hour; // 11
   * ```
   */
  round(freq: string): Timestamp {
    const unit = freqMs(freq);
    if (unit === 0) {
      return new Timestamp(this);
    }
    const rounded = Math.round(this._utcMs / unit) * unit;
    return new Timestamp(rounded, { tz: this._tz });
  }

  /**
   * Set the time component to midnight (00:00:00.000).
   *
   * @example
   * ```ts
   * new Timestamp("2024-01-15T10:37:00Z").normalize().hour; // 0
   * ```
   */
  normalize(): Timestamp {
    return this.floor("D");
  }

  // ─── timezone operations ──────────────────────────────────────────────────────

  /**
   * Localise a naive timestamp to `tz` (treating the stored time as a
   * wall-clock time in that timezone).
   *
   * Mirrors `pandas.Timestamp.tz_localize(tz)`.
   *
   * @throws If the timestamp is already timezone-aware.
   */
  tz_localize(tz: string): Timestamp {
    if (this._tz !== null) {
      throw new Error(
        `Timestamp.tz_localize: timestamp is already tz-aware (tz="${this._tz}"). Use tz_convert() to change timezone.`,
      );
    }
    // Re-interpret the wall-clock UTC ms as a local time in `tz`.
    const utcMs = wallClockToUtc(this._utcMs, tz);
    return new Timestamp(new RawTimestamp(utcMs, tz, this._us, this._ns));
  }

  /**
   * Convert a timezone-aware timestamp to a different timezone.
   *
   * Mirrors `pandas.Timestamp.tz_convert(tz)`.
   *
   * @throws If the timestamp is naive.
   */
  tz_convert(tz: string): Timestamp {
    if (this._tz === null) {
      throw new Error(
        "Timestamp.tz_convert: timestamp is timezone-naive. Use tz_localize() first.",
      );
    }
    return new Timestamp(new RawTimestamp(this._utcMs, tz, this._us, this._ns));
  }

  // ─── arithmetic ───────────────────────────────────────────────────────────────

  /**
   * Add a {@link Timedelta} to this Timestamp, returning a new Timestamp.
   *
   * @example
   * ```ts
   * const tomorrow = ts.add(Timedelta.fromComponents({ days: 1 }));
   * ```
   */
  add(delta: Timedelta): Timestamp {
    return new Timestamp(
      new RawTimestamp(this._utcMs + delta.totalMilliseconds, this._tz, this._us, this._ns),
    );
  }

  /**
   * Subtract a Timedelta or another Timestamp.
   *
   * - `sub(Timedelta)` → Timestamp displaced by the negative of the delta.
   * - `sub(Timestamp)` → Timedelta representing the time difference.
   *
   * @example
   * ```ts
   * const yesterday = ts.sub(Timedelta.fromComponents({ days: 1 }));
   * const delta = ts2.sub(ts1); // Timedelta
   * ```
   */
  sub(other: Timedelta): Timestamp;
  sub(other: Timestamp): Timedelta;
  sub(other: Timedelta | Timestamp): Timestamp | Timedelta {
    if (other instanceof Timedelta) {
      return new Timestamp(
        new RawTimestamp(this._utcMs - other.totalMilliseconds, this._tz, this._us, this._ns),
      );
    }
    return Timedelta.fromMilliseconds(this._utcMs - other._utcMs);
  }

  // ─── comparisons ─────────────────────────────────────────────────────────────

  /** Primitive value (ms since epoch) — enables `<`, `>`, `<=`, `>=` operators. */
  valueOf(): number {
    return this._utcMs;
  }

  /** True if `this` and `other` represent the same instant. */
  eq(other: Timestamp): boolean {
    return this._utcMs === other._utcMs;
  }
  /** True if `this` and `other` represent different instants. */
  ne(other: Timestamp): boolean {
    return this._utcMs !== other._utcMs;
  }
  /** True if `this` is before `other`. */
  lt(other: Timestamp): boolean {
    return this._utcMs < other._utcMs;
  }
  /** True if `this` is before or equal to `other`. */
  le(other: Timestamp): boolean {
    return this._utcMs <= other._utcMs;
  }
  /** True if `this` is after `other`. */
  gt(other: Timestamp): boolean {
    return this._utcMs > other._utcMs;
  }
  /** True if `this` is after or equal to `other`. */
  ge(other: Timestamp): boolean {
    return this._utcMs >= other._utcMs;
  }

  // ─── name helpers ──────────────────────────────────────────────────────────────

  /**
   * Full English name of the day of week.
   *
   * @example `ts.day_name()` → `"Saturday"`
   */
  day_name(): string {
    return WEEKDAY_NAMES[this.dayofweek] ?? "";
  }

  /**
   * Full English name of the month.
   *
   * @example `ts.month_name()` → `"January"`
   */
  month_name(): string {
    return MONTH_NAMES[this.month] ?? "";
  }

  // ─── string representation ────────────────────────────────────────────────────

  /** Human-readable string — uses ISO format with timezone if aware. */
  toString(): string {
    return this.isoformat();
  }

  /** JSON serialisation delegates to {@link toString}. */
  toJSON(): string {
    return this.toString();
  }
}
