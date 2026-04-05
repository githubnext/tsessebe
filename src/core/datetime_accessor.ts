/**
 * DatetimeAccessor — the `Series.dt` accessor, mirroring `pandas.core.indexes.datetimes.DatetimeProperties`.
 *
 * Access via `series.dt` on a `Series<Date>` (or Series containing Date objects).
 * Calendar component properties return new Series of numbers/booleans; `strftime`
 * returns a Series of strings.  Null / undefined values are propagated unchanged
 * throughout (pandas behaviour).
 *
 * @example
 * ```ts
 * const s = new Series({ data: [new Date("2024-03-15"), new Date("2024-07-04")] });
 * s.dt.year().toArray();   // [2024, 2024]
 * s.dt.month().toArray();  // [3, 7]
 * s.dt.dayofweek().toArray(); // [4, 3]  (Friday=4, Thursday=3)
 * s.dt.strftime("%Y-%m-%d").toArray(); // ["2024-03-15", "2024-07-04"]
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";

// ─── DatetimeSeriesLike ────────────────────────────────────────────────────────

/**
 * Minimal interface for the Series type needed by DatetimeAccessor.
 * The real `Series<T>` class satisfies this interface.
 */
export interface DatetimeSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  readonly dt: DatetimeAccessor;
  withValues(data: readonly Scalar[], name?: string | null): DatetimeSeriesLike;
  toArray(): readonly Scalar[];
}

// ─── helpers ───────────────────────────────────────────────────────────────────

/** Cast a Scalar to a Date, returning null for missing / non-date values. */
function toDate(v: Scalar): Date | null {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return null;
  }
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Apply a Date → number transformation, propagating null. */
function mapNum(series: DatetimeSeriesLike, fn: (d: Date) => number): DatetimeSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const d = toDate(v);
    return d === null ? null : fn(d);
  });
  return series.withValues(result);
}

/** Apply a Date → boolean transformation, propagating null. */
function mapBool(series: DatetimeSeriesLike, fn: (d: Date) => boolean): DatetimeSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const d = toDate(v);
    return d === null ? null : fn(d);
  });
  return series.withValues(result);
}

/** Apply a Date → string transformation, propagating null. */
function mapStr(series: DatetimeSeriesLike, fn: (d: Date) => string): DatetimeSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const d = toDate(v);
    return d === null ? null : fn(d);
  });
  return series.withValues(result);
}

/** Apply a Date → Date transformation, propagating null. */
function mapDate(series: DatetimeSeriesLike, fn: (d: Date) => Date): DatetimeSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const d = toDate(v);
    return d === null ? null : fn(d);
  });
  return series.withValues(result);
}

// ─── strftime helpers ──────────────────────────────────────────────────────────

const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
const DAYS_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_FULL = [
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
] as const;
const MONTHS_ABBR = [
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
] as const;

/** Pad a number with leading zeros to a given width. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Return the ISO week number (1–53) for a Date. */
function isoWeekNumber(d: Date): number {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  const dayOfWeek = (jan4.getDay() + 6) % 7; // Mon=0
  startOfWeek1.setDate(jan4.getDate() - dayOfWeek);
  const diff = d.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (week < 1) {
    return isoWeekNumber(new Date(d.getFullYear() - 1, 11, 31));
  }
  if (week > 52) {
    const nextJan4 = new Date(d.getFullYear() + 1, 0, 4);
    const nextStartOfWeek1 = new Date(nextJan4);
    const nextDow = (nextJan4.getDay() + 6) % 7;
    nextStartOfWeek1.setDate(nextJan4.getDate() - nextDow);
    if (d >= nextStartOfWeek1) {
      return 1;
    }
  }
  return week;
}

/** Return the day-of-year (1–366) for a Date. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/** True when `year` is a leap year. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in a month (1-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Apply strftime-style format string to a Date. */
function applyStrftime(d: Date, fmt: string): string {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed
  const day = d.getDate();
  const dow = d.getDay(); // 0=Sunday
  const H = d.getHours();
  const M = d.getMinutes();
  const S = d.getSeconds();
  const ms = d.getMilliseconds();
  const weekNum = isoWeekNumber(d);
  const doy = dayOfYear(d);
  const isoPaddedYear = pad(y, 4);

  let result = "";
  let i = 0;
  while (i < fmt.length) {
    const ch = fmt[i];
    if (ch !== "%" || i + 1 >= fmt.length) {
      result += ch;
      i++;
      continue;
    }
    const directive = fmt[i + 1];
    result += expandDirective(
      directive ?? "",
      y,
      m,
      day,
      dow,
      H,
      M,
      S,
      ms,
      weekNum,
      doy,
      isoPaddedYear,
    );
    i += 2;
  }
  return result;
}

/** Expand date-part strftime directive character. Returns null for unknown. */
function expandDatePart(
  directive: string,
  y: number,
  m: number,
  day: number,
  dow: number,
  doy: number,
  weekNum: number,
  isoPaddedYear: string,
): string | null {
  switch (directive) {
    case "Y":
      return isoPaddedYear;
    case "y":
      return pad(y % 100, 2);
    case "m":
      return pad(m + 1, 2);
    case "d":
      return pad(day, 2);
    case "A":
      return DAYS_FULL[dow] ?? "";
    case "a":
      return DAYS_ABBR[dow] ?? "";
    case "B":
      return MONTHS_FULL[m] ?? "";
    case "b":
    case "h":
      return MONTHS_ABBR[m] ?? "";
    case "j":
      return pad(doy, 3);
    case "U": {
      const sundayBased = Math.floor((doy + (dow === 0 ? 0 : 7 - dow)) / 7);
      return pad(sundayBased, 2);
    }
    case "W": {
      const mondayDow = (dow + 6) % 7;
      const mondayBased = Math.floor((doy + (mondayDow === 0 ? 0 : 7 - mondayDow)) / 7);
      return pad(mondayBased, 2);
    }
    case "V":
      return pad(weekNum, 2);
    case "G":
      return isoPaddedYear;
    case "u":
      return String(dow === 0 ? 7 : dow);
    case "w":
      return String(dow);
    default:
      return null;
  }
}

/** Expand time-part or composite strftime directive character. */
function expandTimePart(
  directive: string,
  y: number,
  m: number,
  day: number,
  dow: number,
  H: number,
  M: number,
  S: number,
  ms: number,
  _isoPaddedYear: string,
): string {
  switch (directive) {
    case "H":
      return pad(H, 2);
    case "I":
      return pad(H % 12 === 0 ? 12 : H % 12, 2);
    case "M":
      return pad(M, 2);
    case "S":
      return pad(S, 2);
    case "f":
      return pad(ms * 1000, 6);
    case "p":
      return H < 12 ? "AM" : "PM";
    case "Z":
    case "z":
      return "";
    case "c":
      return `${DAYS_ABBR[dow] ?? ""} ${MONTHS_ABBR[m] ?? ""} ${String(day).padStart(2, " ")} ${pad(H, 2)}:${pad(M, 2)}:${pad(S, 2)} ${pad(y, 4)}`;
    case "x":
      return `${pad(m + 1, 2)}/${pad(day, 2)}/${pad(y % 100, 2)}`;
    case "X":
      return `${pad(H, 2)}:${pad(M, 2)}:${pad(S, 2)}`;
    case "%":
      return "%";
    default:
      return `%${directive}`;
  }
}

/** Expand a single strftime directive character. */
function expandDirective(
  directive: string,
  y: number,
  m: number,
  day: number,
  dow: number,
  H: number,
  M: number,
  S: number,
  ms: number,
  weekNum: number,
  doy: number,
  isoPaddedYear: string,
): string {
  const datePart = expandDatePart(directive, y, m, day, dow, doy, weekNum, isoPaddedYear);
  if (datePart !== null) {
    return datePart;
  }
  return expandTimePart(directive, y, m, day, dow, H, M, S, ms, isoPaddedYear);
}

// ─── DatetimeAccessor ──────────────────────────────────────────────────────────

/**
 * Vectorised datetime operations for a Series.
 *
 * Returned from `Series.dt`. All operations work element-wise and propagate
 * `null` / `NaN` / `undefined` through unchanged (pandas behaviour).
 *
 * @example
 * ```ts
 * const s = new Series({ data: [new Date("2024-01-15")] });
 * s.dt.year().toArray();        // [2024]
 * s.dt.month().toArray();       // [1]
 * s.dt.is_leap_year().toArray(); // [true]
 * ```
 */
export class DatetimeAccessor {
  readonly #series: DatetimeSeriesLike;

  constructor(series: DatetimeSeriesLike) {
    this.#series = series;
  }

  // ─── calendar components ────────────────────────────────────────────────────

  /** Extract the year component (e.g. 2024). */
  year(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getFullYear());
  }

  /** Extract the month component (1 = January, 12 = December). */
  month(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getMonth() + 1);
  }

  /** Extract the day of month (1–31). */
  day(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getDate());
  }

  /** Extract the hour component (0–23). */
  hour(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getHours());
  }

  /** Extract the minute component (0–59). */
  minute(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getMinutes());
  }

  /** Extract the second component (0–59). */
  second(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getSeconds());
  }

  /** Extract the millisecond component (0–999). */
  millisecond(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => d.getMilliseconds());
  }

  /**
   * Extract the microsecond component (always 0 — JS Date has millisecond precision).
   * Included for pandas API parity.
   */
  microsecond(): DatetimeSeriesLike {
    return mapNum(this.#series, () => 0);
  }

  /**
   * Extract the nanosecond component (always 0 — JS Date has millisecond precision).
   * Included for pandas API parity.
   */
  nanosecond(): DatetimeSeriesLike {
    return mapNum(this.#series, () => 0);
  }

  /**
   * Day of the week as an integer (Monday = 0, Sunday = 6).
   * Mirrors `pandas.Series.dt.dayofweek` / `pandas.Series.dt.weekday`.
   */
  dayofweek(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => (d.getDay() + 6) % 7);
  }

  /** Alias for `dayofweek()`. */
  weekday(): DatetimeSeriesLike {
    return this.dayofweek();
  }

  /** Day of the year (1–366). */
  dayofyear(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => dayOfYear(d));
  }

  /**
   * Quarter of the year (1–4).
   * Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec.
   */
  quarter(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => Math.floor(d.getMonth() / 3) + 1);
  }

  /** ISO week number of the year (1–53). */
  isocalendar_week(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => isoWeekNumber(d));
  }

  /** Number of days in the month for each date (28–31). */
  days_in_month(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => daysInMonth(d.getFullYear(), d.getMonth() + 1));
  }

  /** Alias for `days_in_month()`. */
  daysinmonth(): DatetimeSeriesLike {
    return this.days_in_month();
  }

  // ─── boolean properties ─────────────────────────────────────────────────────

  /** True when the date is the first day of the month. */
  is_month_start(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => d.getDate() === 1);
  }

  /** True when the date is the last day of the month. */
  is_month_end(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      return d.getDate() === daysInMonth(year, month);
    });
  }

  /** True when the date is the first day of the quarter. */
  is_quarter_start(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => {
      const month = d.getMonth() + 1; // 1-indexed
      return d.getDate() === 1 && (month === 1 || month === 4 || month === 7 || month === 10);
    });
  }

  /** True when the date is the last day of the quarter. */
  is_quarter_end(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const lastDay = daysInMonth(year, month);
      return d.getDate() === lastDay && (month === 3 || month === 6 || month === 9 || month === 12);
    });
  }

  /** True when the date is the first day of the year. */
  is_year_start(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => d.getMonth() === 0 && d.getDate() === 1);
  }

  /** True when the date is the last day of the year. */
  is_year_end(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => d.getMonth() === 11 && d.getDate() === 31);
  }

  /** True when the year of the date is a leap year. */
  is_leap_year(): DatetimeSeriesLike {
    return mapBool(this.#series, (d) => isLeapYear(d.getFullYear()));
  }

  // ─── formatting ─────────────────────────────────────────────────────────────

  /**
   * Format each date using a strftime-style format string.
   *
   * Supported directives:
   * `%Y` (4-digit year), `%y` (2-digit year), `%m` (month 01–12),
   * `%d` (day 01–31), `%H` (hour 00–23), `%I` (hour 01–12), `%M` (minute),
   * `%S` (second), `%f` (microseconds, zero-padded to 6), `%A` (full weekday),
   * `%a` (abbrev weekday), `%B` (full month name), `%b`/`%h` (abbrev month),
   * `%p` (AM/PM), `%j` (day of year), `%U` (Sunday week), `%W` (Monday week),
   * `%V` (ISO week), `%u` (ISO weekday Mon=1), `%w` (weekday Sun=0),
   * `%c` (locale-like), `%x` (date), `%X` (time), `%%` (literal %).
   *
   * @example
   * ```ts
   * s.dt.strftime("%Y-%m-%d").toArray(); // ["2024-01-15", ...]
   * ```
   */
  strftime(format: string): DatetimeSeriesLike {
    return mapStr(this.#series, (d) => applyStrftime(d, format));
  }

  // ─── normalization ──────────────────────────────────────────────────────────

  /**
   * Normalize each datetime to midnight (00:00:00.000), preserving the date.
   * Mirrors `pandas.Series.dt.normalize()`.
   */
  normalize(): DatetimeSeriesLike {
    return mapDate(this.#series, (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  /**
   * Round each datetime down to the nearest unit.
   *
   * @param unit - `"D"` (day), `"H"` (hour), `"T"`/`"min"` (minute),
   *               `"S"` (second), `"L"`/`"ms"` (millisecond)
   */
  floor(unit: "D" | "H" | "T" | "min" | "S" | "L" | "ms"): DatetimeSeriesLike {
    return mapDate(this.#series, (d) => floorDate(d, unit));
  }

  /**
   * Round each datetime up to the nearest unit.
   *
   * @param unit - `"D"` (day), `"H"` (hour), `"T"`/`"min"` (minute),
   *               `"S"` (second), `"L"`/`"ms"` (millisecond)
   */
  ceil(unit: "D" | "H" | "T" | "min" | "S" | "L" | "ms"): DatetimeSeriesLike {
    return mapDate(this.#series, (d) => ceilDate(d, unit));
  }

  /**
   * Round each datetime to the nearest unit.
   *
   * @param unit - `"D"` (day), `"H"` (hour), `"T"`/`"min"` (minute),
   *               `"S"` (second), `"L"`/`"ms"` (millisecond)
   */
  round(unit: "D" | "H" | "T" | "min" | "S" | "L" | "ms"): DatetimeSeriesLike {
    return mapDate(this.#series, (d) => roundDate(d, unit));
  }

  // ─── epoch conversion ───────────────────────────────────────────────────────

  /**
   * Convert each datetime to Unix timestamp in seconds (integer, floored).
   * Mirrors pandas `dt.asi8` but at second granularity.
   */
  total_seconds(): DatetimeSeriesLike {
    return mapNum(this.#series, (d) => Math.floor(d.getTime() / 1000));
  }

  /**
   * Return the date portion of each datetime as a new Date at midnight.
   * Mirrors `pandas.Series.dt.date`.
   */
  date(): DatetimeSeriesLike {
    return this.normalize();
  }
}

// ─── floor/ceil/round helpers ─────────────────────────────────────────────────

type TimeUnit = "D" | "H" | "T" | "min" | "S" | "L" | "ms";

/** Return the unit duration in milliseconds. */
function unitMs(unit: TimeUnit): number {
  switch (unit) {
    case "D":
      return 24 * 60 * 60 * 1000;
    case "H":
      return 60 * 60 * 1000;
    case "T":
    case "min":
      return 60 * 1000;
    case "S":
      return 1000;
    case "L":
    case "ms":
      return 1;
    default:
      return 1;
  }
}

function floorDate(d: Date, unit: TimeUnit): Date {
  const ms = unitMs(unit);
  if (unit === "D") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date(Math.floor(d.getTime() / ms) * ms);
}

function ceilDate(d: Date, unit: TimeUnit): Date {
  const ms = unitMs(unit);
  if (unit === "D") {
    const floored = floorDate(d, unit);
    if (floored.getTime() === d.getTime()) {
      return floored;
    }
    return new Date(floored.getTime() + ms);
  }
  const floored = Math.floor(d.getTime() / ms) * ms;
  if (floored === d.getTime()) {
    return new Date(floored);
  }
  return new Date(floored + ms);
}

function roundDate(d: Date, unit: TimeUnit): Date {
  const ms = unitMs(unit);
  if (unit === "D") {
    const midnight = floorDate(d, unit);
    const midpointMs = midnight.getTime() + ms / 2;
    return d.getTime() < midpointMs ? midnight : new Date(midnight.getTime() + ms);
  }
  return new Date(Math.round(d.getTime() / ms) * ms);
}
