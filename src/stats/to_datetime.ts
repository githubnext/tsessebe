/**
 * to_datetime — convert scalars, arrays, or Series to Date objects.
 *
 * Mirrors `pandas.to_datetime()`:
 * - `toDatetime(value, options?)` — parse a single scalar to a `Date | null`
 * - `toDatetime(values, options?)` — parse an array to `(Date | null)[]`
 * - `toDatetime(series, options?)` — parse a Series to `Series<Date | null>`
 *
 * Supported input types:
 * - `Date` — returned as-is (or converted to UTC if `utc: true`)
 * - `number` — treated as a Unix timestamp; unit controls scale
 * - `string` — parsed using ISO 8601, US-style (M/D/Y), European (D-M-Y),
 *   and compact (YYYYMMDD) formats
 * - `null` / `undefined` / `NaN` — treated as missing (returns `null`)
 *
 * @module
 */

import { Dtype, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── top-level regex constants (biome: useTopLevelRegex) ──────────────────────

/** ISO 8601 / RFC 3339: 2024-01-15T12:00:00Z or 2024-01-15 */
const RE_ISO =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** US style: MM/DD/YYYY or MM/DD/YY */
const RE_MDY = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

/** European dash: DD-MM-YYYY */
const RE_DMY_DASH = /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

/** Compact: YYYYMMDD */
const RE_COMPACT = /^(\d{4})(\d{2})(\d{2})$/;

/** Pure integer string (e.g. Unix timestamp) */
const RE_INT = /^-?\d+$/;

// ─── public types ─────────────────────────────────────────────────────────────

/** Time unit for numeric inputs. */
export type DatetimeUnit = "s" | "ms" | "us" | "ns";

/** Error handling behaviour — mirrors pandas `errors` parameter. */
export type DatetimeErrors = "raise" | "coerce" | "ignore";

/** Options for `toDatetime`. */
export interface ToDatetimeOptions {
  /**
   * Unit for numeric inputs (default `"ms"`).
   * - `"s"` — seconds since Unix epoch
   * - `"ms"` — milliseconds since Unix epoch
   * - `"us"` — microseconds since Unix epoch
   * - `"ns"` — nanoseconds since Unix epoch
   */
  readonly unit?: DatetimeUnit;
  /**
   * Error handling (default `"raise"`).
   * - `"raise"` — throw a `TypeError` on unparseable input
   * - `"coerce"` — return `null` on unparseable input
   * - `"ignore"` — return the original value unchanged
   */
  readonly errors?: DatetimeErrors;
  /**
   * If `true`, return dates anchored to UTC timezone (default `false`).
   * For numeric inputs this is a no-op (numbers are always UTC epoch).
   */
  readonly utc?: boolean;
  /**
   * If `true`, interpret ambiguous numeric-string dates as day-first
   * (e.g. `"01/02/2024"` → Feb 1, not Jan 2).  Default `false`.
   */
  readonly dayfirst?: boolean;
}

// ─── overloads ────────────────────────────────────────────────────────────────

/**
 * Convert a single scalar value to a `Date`.
 *
 * @param value - Scalar to convert.
 * @param options - Conversion options.
 * @returns A `Date` object, or `null` if the value is missing or unparseable
 *   (when `errors` is `"coerce"`).  When `errors` is `"ignore"` the original
 *   value is returned.
 */
export function toDatetime(value: Scalar, options?: ToDatetimeOptions): Date | null;

/**
 * Convert an array of scalars to an array of `Date` objects.
 *
 * @param values - Array of scalars to convert.
 * @param options - Conversion options.
 */
export function toDatetime(values: readonly Scalar[], options?: ToDatetimeOptions): (Date | null)[];

/**
 * Convert a `Series` of scalars to a `Series<Date | null>`.
 *
 * @param series - Series whose values are converted element-wise.
 * @param options - Conversion options.
 */
export function toDatetime(
  series: Series<Scalar>,
  options?: ToDatetimeOptions,
): Series<Date | null>;

// ─── implementation ───────────────────────────────────────────────────────────

export function toDatetime(
  input: Scalar | readonly Scalar[] | Series<Scalar>,
  options: ToDatetimeOptions = {},
): Date | null | (Date | null)[] | Series<Date | null> {
  if (input instanceof Series) {
    return convertSeries(input, options);
  }
  if (Array.isArray(input)) {
    return (input as readonly Scalar[]).map((v) => convertOne(v, options));
  }
  return convertOne(input as Scalar, options);
}

// ─── series conversion ────────────────────────────────────────────────────────

function convertSeries(s: Series<Scalar>, options: ToDatetimeOptions): Series<Date | null> {
  const converted = s.values.map((v) => convertOne(v, options));
  return new Series<Date | null>({
    data: converted as (Date | null)[],
    index: s.index,
    dtype: Dtype.datetime,
    name: s.name,
  });
}

// ─── scalar conversion ────────────────────────────────────────────────────────

function convertOne(value: Scalar, options: ToDatetimeOptions): Date | null {
  const errors = options.errors ?? "raise";

  if (isMissing(value)) {
    return null;
  }

  if (value instanceof Date) {
    return normalizeDate(value, options);
  }

  if (typeof value === "number") {
    return convertNumber(value, options);
  }

  if (typeof value === "string") {
    return convertString(value, options);
  }

  return handleFailure(value, errors, `Cannot convert ${typeof value} to datetime`);
}

/** True for null / undefined / NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Apply UTC anchoring to an existing Date. */
function normalizeDate(d: Date, options: ToDatetimeOptions): Date {
  if (options.utc === true) {
    return new Date(d.getTime());
  }
  return d;
}

/** Convert a numeric value using the configured unit. */
function convertNumber(value: number, options: ToDatetimeOptions): Date | null {
  const unit = options.unit ?? "ms";
  const ms = numericToMs(value, unit);
  if (!Number.isFinite(ms)) {
    return handleFailure(
      value as unknown as Scalar,
      options.errors ?? "raise",
      `Invalid numeric datetime: ${value}`,
    );
  }
  return new Date(ms);
}

/** Scale a numeric value to milliseconds based on unit. */
function numericToMs(value: number, unit: DatetimeUnit): number {
  if (unit === "s") {
    return value * 1000;
  }
  if (unit === "us") {
    return value / 1000;
  }
  if (unit === "ns") {
    return value / 1_000_000;
  }
  return value; // ms
}

/** Parse a string to a Date. */
function convertString(value: string, options: ToDatetimeOptions): Date | null {
  const errors = options.errors ?? "raise";
  const dayfirst = options.dayfirst ?? false;

  // Try compact YYYYMMDD before treating as integer (both match all-digit strings)
  if (RE_COMPACT.test(value)) {
    const m = RE_COMPACT.exec(value);
    if (m !== null) {
      const result = parseCompact(m);
      if (result !== null) {
        return result;
      }
    }
  }

  if (RE_INT.test(value)) {
    return convertNumber(Number(value), options);
  }

  const d = tryParseString(value, dayfirst);
  if (d !== null) {
    return d;
  }

  return handleFailure(value as unknown as Scalar, errors, `Cannot parse "${value}" as datetime`);
}

/** Try all known string formats; return a Date or null on no match. */
function tryParseString(value: string, dayfirst: boolean): Date | null {
  if (RE_ISO.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const compact = RE_COMPACT.exec(value);
  if (compact !== null) {
    return parseCompact(compact);
  }

  const mdy = RE_MDY.exec(value);
  if (mdy !== null) {
    return parseMDY(mdy, dayfirst);
  }

  const dmy = RE_DMY_DASH.exec(value);
  if (dmy !== null) {
    return parseDMY(dmy);
  }

  return null;
}

/** Parse YYYYMMDD compact format. */
function parseCompact(m: RegExpExecArray): Date | null {
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Parse MM/DD/YYYY (or DD/MM/YYYY when dayfirst=true). */
function parseMDY(m: RegExpExecArray, dayfirst: boolean): Date | null {
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = expandYear(Number(m[3]));
  const h = m[4] !== undefined ? Number(m[4]) : 0;
  const min = m[5] !== undefined ? Number(m[5]) : 0;
  const sec = m[6] !== undefined ? Number(m[6]) : 0;
  const mo = dayfirst ? b - 1 : a - 1;
  const day = dayfirst ? a : b;
  const dt = new Date(y, mo, day, h, min, sec);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Parse DD-MM-YYYY European format. */
function parseDMY(m: RegExpExecArray): Date | null {
  const day = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  const h = m[4] !== undefined ? Number(m[4]) : 0;
  const min = m[5] !== undefined ? Number(m[5]) : 0;
  const sec = m[6] !== undefined ? Number(m[6]) : 0;
  const dt = new Date(y, mo, day, h, min, sec);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Expand 2-digit years: 00–68 → 2000–2068, 69–99 → 1969–1999. */
function expandYear(y: number): number {
  if (y >= 100) {
    return y;
  }
  return y <= 68 ? 2000 + y : 1900 + y;
}

/**
 * Handle a parse failure according to the `errors` option.
 * - `"raise"` → throws TypeError
 * - `"coerce"` → returns null
 * - `"ignore"` → returns original value (cast-escaped by callers via `as unknown`)
 */
function handleFailure(original: Scalar, errors: DatetimeErrors, message: string): Date | null {
  if (errors === "raise") {
    throw new TypeError(message);
  }
  if (errors === "coerce") {
    return null;
  }
  // errors === "ignore": return original value unchanged
  return original as unknown as Date;
}
