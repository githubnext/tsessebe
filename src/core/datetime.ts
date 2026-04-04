/**
 * DateTimeAccessor — vectorized datetime operations for Series.
 *
 * Mirrors pandas' `Series.dt` accessor: provides element-wise datetime
 * component extraction and operations on a Series whose values are
 * `Date` objects, ISO-8601 strings, or millisecond timestamps (numbers).
 * Null / undefined values propagate as `null`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["2021-01-15", "2022-06-30", null] });
 * s.dt.year.values;        // [2021, 2022, null]
 * s.dt.month.values;       // [1, 6, null]
 * s.dt.dayofweek.values;   // [4, 3, null]  (Friday, Thursday)
 * s.dt.strftime("%Y-%m-%d").values; // ["2021-01-15", "2022-06-30", null]
 * ```
 */

import type { Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Coerce a scalar value to a Date, or return null if missing/invalid.
 */
function toDate(v: Scalar): Date | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Apply a function that extracts a number from a Date; propagate null. */
function mapComponent(v: Scalar, fn: (d: Date) => number): Scalar {
  const d = toDate(v);
  return d === null ? null : fn(d);
}

/** True if the given year is a leap year. */
function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in month `month` (1-based) for year `year`. */
function daysInMonth(year: number, month: number): number {
  // Using day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate();
}

/** True when the date is the first day of its month. */
function checkMonthStart(d: Date): boolean {
  return d.getDate() === 1;
}

/** True when the date is the last day of its month. */
function checkMonthEnd(d: Date): boolean {
  return d.getDate() === daysInMonth(d.getFullYear(), d.getMonth() + 1);
}

/** Quarter (1–4) from a Date. */
function getQuarter(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

/** True when the date is the first day of its quarter. */
function checkQuarterStart(d: Date): boolean {
  return d.getDate() === 1 && d.getMonth() % 3 === 0;
}

/** True when the date is the last day of its quarter. */
function checkQuarterEnd(d: Date): boolean {
  const month = d.getMonth(); // 0-based
  const lastMonthOfQ = month - (month % 3) + 2;
  return d.getDate() === daysInMonth(d.getFullYear(), lastMonthOfQ + 1) && month === lastMonthOfQ;
}

/** True when the date is Jan 1. */
function checkYearStart(d: Date): boolean {
  return d.getMonth() === 0 && d.getDate() === 1;
}

/** True when the date is Dec 31. */
function checkYearEnd(d: Date): boolean {
  return d.getMonth() === 11 && d.getDate() === 31;
}

/** Day of year (1-based). */
function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 86_400_000;
  return Math.floor(diff / oneDay);
}

/** Pad a number to at least `width` digits with leading zeros. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Minimal `strftime`-compatible formatter.
 *
 * Supported directives:
 * `%Y` full year, `%y` 2-digit year, `%m` month, `%d` day,
 * `%H` hour (24h), `%I` hour (12h), `%M` minute, `%S` second,
 * `%f` microseconds (0-padded to 6), `%p` AM/PM, `%A` weekday name,
 * `%a` abbreviated weekday, `%B` month name, `%b` abbreviated month,
 * `%j` day of year, `%Z` timezone offset, `%%` literal `%`.
 */
function strftime(d: Date, fmt: string): string {
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = [
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

  return fmt.replace(/%[A-Za-z%]/g, (dir) => {
    switch (dir) {
      case "%Y":
        return pad(d.getFullYear(), 4);
      case "%y":
        return pad(d.getFullYear() % 100, 2);
      case "%m":
        return pad(d.getMonth() + 1, 2);
      case "%d":
        return pad(d.getDate(), 2);
      case "%H":
        return pad(d.getHours(), 2);
      case "%I": {
        const h = d.getHours() % 12;
        return pad(h === 0 ? 12 : h, 2);
      }
      case "%M":
        return pad(d.getMinutes(), 2);
      case "%S":
        return pad(d.getSeconds(), 2);
      case "%f":
        return pad(d.getMilliseconds() * 1000, 6);
      case "%p":
        return d.getHours() < 12 ? "AM" : "PM";
      case "%A":
        return WEEKDAYS[d.getDay()] ?? "";
      case "%a":
        return (WEEKDAYS[d.getDay()] ?? "").slice(0, 3);
      case "%B":
        return MONTHS[d.getMonth()] ?? "";
      case "%b":
        return (MONTHS[d.getMonth()] ?? "").slice(0, 3);
      case "%j":
        return pad(getDayOfYear(d), 3);
      case "%Z": {
        const off = -d.getTimezoneOffset();
        const sign = off >= 0 ? "+" : "-";
        const abs = Math.abs(off);
        return `${sign}${pad(Math.floor(abs / 60), 2)}${pad(abs % 60, 2)}`;
      }
      case "%%":
        return "%";
      default:
        return dir;
    }
  });
}

// ─── DateTimeAccessor ─────────────────────────────────────────────────────────

/**
 * Vectorized datetime operations for a `Series`.
 *
 * Obtain an instance via `series.dt`.
 *
 * Values in the underlying Series may be `Date` objects, ISO-8601 strings,
 * or numeric millisecond timestamps. All other value types (including null /
 * undefined) are treated as missing and propagate as `null`.
 */
export class DateTimeAccessor {
  private readonly _series: Series<Scalar>;

  constructor(series: Series<Scalar>) {
    this._series = series;
  }

  // ─── calendar components ────────────────────────────────────────────────

  /** Four-digit year. */
  get year(): Series<Scalar> {
    return this._mapComp((d) => d.getFullYear());
  }

  /** Month (1–12). */
  get month(): Series<Scalar> {
    return this._mapComp((d) => d.getMonth() + 1);
  }

  /** Day of month (1–31). */
  get day(): Series<Scalar> {
    return this._mapComp((d) => d.getDate());
  }

  /** Hour (0–23). */
  get hour(): Series<Scalar> {
    return this._mapComp((d) => d.getHours());
  }

  /** Minute (0–59). */
  get minute(): Series<Scalar> {
    return this._mapComp((d) => d.getMinutes());
  }

  /** Second (0–59). */
  get second(): Series<Scalar> {
    return this._mapComp((d) => d.getSeconds());
  }

  /** Millisecond (0–999). */
  get millisecond(): Series<Scalar> {
    return this._mapComp((d) => d.getMilliseconds());
  }

  /**
   * Day of the week with Monday=0 and Sunday=6.
   * Matches pandas convention (ISO weekday - 1).
   */
  get dayofweek(): Series<Scalar> {
    return this._mapComp((d) => (d.getDay() + 6) % 7);
  }

  /** Alias for `dayofweek`. */
  get day_of_week(): Series<Scalar> {
    return this.dayofweek;
  }

  /**
   * The numeric day of the week with Monday=0 and Sunday=6.
   * Alias for `dayofweek` — pandas also exposes this name.
   */
  get weekday(): Series<Scalar> {
    return this.dayofweek;
  }

  /** Day of the year (1–366). */
  get dayofyear(): Series<Scalar> {
    return this._mapComp((d) => getDayOfYear(d));
  }

  /** Alias for `dayofyear`. */
  get day_of_year(): Series<Scalar> {
    return this.dayofyear;
  }

  /** Quarter (1–4). */
  get quarter(): Series<Scalar> {
    return this._mapComp((d) => getQuarter(d));
  }

  /** ISO 8601 week number (1–53). */
  get week(): Series<Scalar> {
    return this._mapComp((d) => getIsoWeek(d));
  }

  /** Alias for `week`. */
  get weekofyear(): Series<Scalar> {
    return this.week;
  }

  // ─── boolean properties ──────────────────────────────────────────────────

  /** True when the date falls on a weekday (Mon–Fri). */
  get is_weekday(): Series<Scalar> {
    return this._mapComp((d) => {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6 ? 1 : 0;
    });
  }

  /** True (1) when the date falls on a weekend (Sat/Sun). */
  get is_weekend(): Series<Scalar> {
    return this._mapComp((d) => {
      const dow = d.getDay();
      return dow === 0 || dow === 6 ? 1 : 0;
    });
  }

  /** True (1) when the date is the first day of its month. */
  get is_month_start(): Series<Scalar> {
    return this._mapComp((d) => (checkMonthStart(d) ? 1 : 0));
  }

  /** True (1) when the date is the last day of its month. */
  get is_month_end(): Series<Scalar> {
    return this._mapComp((d) => (checkMonthEnd(d) ? 1 : 0));
  }

  /** True (1) when the date is the first day of its quarter. */
  get is_quarter_start(): Series<Scalar> {
    return this._mapComp((d) => (checkQuarterStart(d) ? 1 : 0));
  }

  /** True (1) when the date is the last day of its quarter. */
  get is_quarter_end(): Series<Scalar> {
    return this._mapComp((d) => (checkQuarterEnd(d) ? 1 : 0));
  }

  /** True (1) when the date is January 1. */
  get is_year_start(): Series<Scalar> {
    return this._mapComp((d) => (checkYearStart(d) ? 1 : 0));
  }

  /** True (1) when the date is December 31. */
  get is_year_end(): Series<Scalar> {
    return this._mapComp((d) => (checkYearEnd(d) ? 1 : 0));
  }

  /** True (1) when the year is a leap year. */
  get is_leap_year(): Series<Scalar> {
    return this._mapComp((d) => (isLeap(d.getFullYear()) ? 1 : 0));
  }

  /** Number of days in the month for each element. */
  get days_in_month(): Series<Scalar> {
    return this._mapComp((d) => daysInMonth(d.getFullYear(), d.getMonth() + 1));
  }

  /** Alias for `days_in_month`. */
  get daysinmonth(): Series<Scalar> {
    return this.days_in_month;
  }

  // ─── string representations ──────────────────────────────────────────────

  /**
   * ISO 8601 date string for each element (e.g. `"2021-01-15"`).
   * Returns `null` for missing values.
   */
  date(): Series<Scalar> {
    return this._mapScalar((v) => {
      const d = toDate(v);
      if (d === null) {
        return null;
      }
      return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
    });
  }

  /**
   * ISO 8601 time string for each element (e.g. `"14:30:00"`).
   * Returns `null` for missing values.
   */
  time(): Series<Scalar> {
    return this._mapScalar((v) => {
      const d = toDate(v);
      if (d === null) {
        return null;
      }
      return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
    });
  }

  /**
   * Format each element using a `strftime`-compatible format string.
   *
   * @param format - Format string (e.g. `"%Y-%m-%d %H:%M:%S"`).
   *
   * Supported directives: `%Y %y %m %d %H %I %M %S %f %p %A %a %B %b %j %Z %%`
   */
  strftime(format: string): Series<Scalar> {
    return this._mapScalar((v) => {
      const d = toDate(v);
      return d === null ? null : strftime(d, format);
    });
  }

  // ─── epoch utilities ─────────────────────────────────────────────────────

  /**
   * Unix timestamp in seconds (integer) for each element.
   * Equivalent to `pd.Series.dt.floor("s").astype(int) / 1e9` but simpler.
   */
  total_seconds(): Series<Scalar> {
    return this._mapComp((d) => Math.floor(d.getTime() / 1000));
  }

  /** Unix timestamp in milliseconds for each element. */
  timestamp_ms(): Series<Scalar> {
    return this._mapComp((d) => d.getTime());
  }

  // ─── normalization ───────────────────────────────────────────────────────

  /**
   * Normalize each datetime to midnight (floor to day boundary).
   * Returns a new Series with `Date` values (missing propagated as null).
   */
  normalize(): Series<Scalar> {
    return this._mapScalar((v) => {
      const d = toDate(v);
      if (d === null) {
        return null;
      }
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }

  // ─── private helpers ─────────────────────────────────────────────────────

  /** Map a Date component extractor over the series. */
  private _mapComp(fn: (d: Date) => number): Series<Scalar> {
    const data = this._series.values.map((v) => mapComponent(v, fn));
    return new Series<Scalar>({
      data,
      index: this._series.index,
      dtype: Dtype.int64,
    });
  }

  /** Map a raw scalar transformer over the series (for non-numeric outputs). */
  private _mapScalar(fn: (v: Scalar) => Scalar): Series<Scalar> {
    const data = this._series.values.map((v) => fn(v));
    return new Series<Scalar>({
      data,
      index: this._series.index,
    });
  }
}

// ─── ISO week helper (outside class to avoid complexity) ──────────────────────

/**
 * Return the ISO 8601 week number (1–53) for a given date.
 *
 * ISO weeks start on Monday, and the first week of the year contains the
 * first Thursday.
 */
function getIsoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1)
  const dayNum = tmp.getUTCDay() === 0 ? 7 : tmp.getUTCDay();
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
