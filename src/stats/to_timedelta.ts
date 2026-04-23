/**
 * to_timedelta — convert scalars, arrays, or Series to Timedelta objects.
 *
 * Mirrors `pandas.to_timedelta()`:
 * - `toTimedelta(value, options?)` — parse a single scalar to a `Timedelta | null`
 * - `toTimedelta(values, options?)` — parse an array to `(Timedelta | null)[]`
 * - `toTimedelta(series, options?)` — parse a Series to `Series<Timedelta | null>`
 *
 * Supported input types:
 * - `Timedelta` — returned as-is
 * - `number` — treated as a duration in the given unit (default `"ns"`)
 * - `string` — pandas-style "1 days 02:03:04.567", ISO-8601 "P1DT2H3M4S",
 *   clock "HH:MM:SS", or human form "1h 30m 20s 500ms"
 * - `null` / `undefined` / `NaN` — treated as missing (returns `null`)
 *
 * @module
 */

import { Dtype, Series, Timedelta } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── top-level regex constants (biome: useTopLevelRegex) ──────────────────────

/** Pandas-style: "[± ][N day[s][,]] HH:MM:SS[.fraction]" */
const RE_PANDAS = /^(-)?(?:(\d+)\s+days?,?\s*)?(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/i;

/** ISO 8601 duration: P[nD][T[nH][nM][nS]] */
const RE_ISO =
  /^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

/** Human unit tokens for scanAll: "1h", "30 minutes", "2.5s" etc. */
const RE_HUMAN_UNIT =
  /(\d+(?:\.\d+)?)\s*(weeks?|w|days?|d|hours?|h|milliseconds?|millis?|ms|minutes?|mins?|m|seconds?|secs?|s|microseconds?|micros?|us|nanoseconds?|nanos?|ns)/gi;

/** Pure integer string (no decimal). */
const RE_INT = /^-?\d+$/;

// ─── public types ──────────────────────────────────────────────────────────────

/** Time unit for numeric inputs. Mirrors pandas `unit` parameter. */
export type TimedeltaUnit = "W" | "D" | "h" | "m" | "s" | "ms" | "us" | "ns";

/** Error handling behaviour — mirrors pandas `errors` parameter. */
export type TimedeltaErrors = "raise" | "coerce" | "ignore";

/** Options for `toTimedelta`. */
export interface ToTimedeltaOptions {
  /**
   * Unit for numeric inputs (default `"ns"`).
   * - `"W"` — weeks
   * - `"D"` — days
   * - `"h"` — hours
   * - `"m"` — minutes
   * - `"s"` — seconds
   * - `"ms"` — milliseconds
   * - `"us"` — microseconds
   * - `"ns"` — nanoseconds
   */
  readonly unit?: TimedeltaUnit;
  /**
   * Error handling (default `"raise"`).
   * - `"raise"` — throw a `TypeError` on unparseable input
   * - `"coerce"` — return `null` on unparseable input
   * - `"ignore"` — return the original value unchanged
   */
  readonly errors?: TimedeltaErrors;
}

// ─── overloads ─────────────────────────────────────────────────────────────────

/**
 * Convert a single scalar value to a `Timedelta`.
 *
 * @param value - Scalar to convert.
 * @param options - Conversion options.
 */
export function toTimedelta(value: Scalar, options?: ToTimedeltaOptions): Timedelta | null;

/**
 * Convert an array of scalars to an array of `Timedelta` objects.
 *
 * @param values - Array of scalars to convert.
 * @param options - Conversion options.
 */
export function toTimedelta(
  values: readonly Scalar[],
  options?: ToTimedeltaOptions,
): (Timedelta | null)[];

/**
 * Convert a `Series` of scalars to a `Series<Timedelta | null>`.
 *
 * @param series - Series whose values are converted element-wise.
 * @param options - Conversion options.
 */
export function toTimedelta(
  series: Series<Scalar>,
  options?: ToTimedeltaOptions,
): Series<Timedelta | null>;

// ─── implementation ────────────────────────────────────────────────────────────

export function toTimedelta(
  input: Scalar | readonly Scalar[] | Series<Scalar>,
  options: ToTimedeltaOptions = {},
): Timedelta | null | (Timedelta | null)[] | Series<Timedelta | null> {
  if (input instanceof Series) {
    return convertSeries(input, options);
  }
  if (Array.isArray(input)) {
    return (input as readonly Scalar[]).map((v) => convertOne(v, options));
  }
  return convertOne(input as Scalar, options);
}

// ─── series conversion ─────────────────────────────────────────────────────────

function convertSeries(s: Series<Scalar>, options: ToTimedeltaOptions): Series<Timedelta | null> {
  const converted = s.values.map((v) => convertOne(v, options));
  return new Series<Timedelta | null>({
    data: converted as (Timedelta | null)[],
    index: s.index,
    dtype: Dtype.timedelta,
    name: s.name,
  });
}

// ─── scalar conversion ─────────────────────────────────────────────────────────

function convertOne(value: Scalar, options: ToTimedeltaOptions): Timedelta | null {
  const errors = options.errors ?? "raise";

  if (isMissing(value)) {
    return null;
  }

  // Passthrough: already a Timedelta
  if ((value as unknown) instanceof Timedelta) {
    return value as unknown as Timedelta;
  }

  if (typeof value === "number") {
    return convertNumber(value, options);
  }

  if (typeof value === "string") {
    return convertString(value, options);
  }

  return applyErrors(errors, value, `Cannot convert ${typeof value} to Timedelta`);
}

/** True for null / undefined / NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── numeric conversion ────────────────────────────────────────────────────────

/** Convert a numeric value to Timedelta using the configured unit. */
function convertNumber(value: number, options: ToTimedeltaOptions): Timedelta | null {
  const unit = options.unit ?? "ns";
  const ms = unitToMs(value, unit);
  if (!Number.isFinite(ms)) {
    return applyErrors(
      options.errors ?? "raise",
      value as unknown as Scalar,
      `Invalid numeric timedelta: ${value}`,
    );
  }
  return Timedelta.fromMilliseconds(ms);
}

/** Scale a value from the given unit to milliseconds. */
function unitToMs(value: number, unit: TimedeltaUnit): number {
  if (unit === "W") {
    return value * 7 * 86_400_000;
  }
  if (unit === "D") {
    return value * 86_400_000;
  }
  if (unit === "h") {
    return value * 3_600_000;
  }
  if (unit === "m") {
    return value * 60_000;
  }
  if (unit === "s") {
    return value * 1_000;
  }
  if (unit === "ms") {
    return value;
  }
  if (unit === "us") {
    return value / 1_000;
  }
  // ns
  return value / 1_000_000;
}

// ─── string conversion ─────────────────────────────────────────────────────────

/** Parse a string representation of a duration. */
function convertString(value: string, options: ToTimedeltaOptions): Timedelta | null {
  const errors = options.errors ?? "raise";
  const trimmed = value.trim();

  if (RE_INT.test(trimmed)) {
    return convertNumber(Number(trimmed), options);
  }

  const td = tryParseString(trimmed);
  if (td !== null) {
    return td;
  }

  return applyErrors(errors, value as unknown as Scalar, `Cannot parse "${value}" as Timedelta`);
}

/** Try all known string formats; return a Timedelta or null on no match. */
function tryParseString(value: string): Timedelta | null {
  const pandas = RE_PANDAS.exec(value);
  if (pandas !== null) {
    return parsePandas(pandas);
  }

  const iso = RE_ISO.exec(value);
  if (iso !== null) {
    return parseIso(iso);
  }

  return parseHuman(value);
}

// ─── pandas-format parser ──────────────────────────────────────────────────────

/**
 * Parse pandas-style duration string.
 * Examples: "1 days 02:03:04", "-1 days +22:30:00", "0:05:00.500000"
 */
function parsePandas(m: RegExpExecArray): Timedelta | null {
  const neg = m[1] === "-";
  const days = m[2] !== undefined ? Number(m[2]) : 0;
  const hours = Number(m[3]);
  const minutes = Number(m[4]);
  const seconds = Number(m[5]);
  const frac = m[6] !== undefined ? parseFrac(m[6]) : 0;

  let ms = days * 86_400_000 + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + frac;
  if (neg) {
    ms = -ms;
  }
  return Timedelta.fromMilliseconds(ms);
}

// ─── ISO 8601 parser ───────────────────────────────────────────────────────────

/** Parse ISO 8601 duration: P1DT2H3M4.5S */
function parseIso(m: RegExpExecArray): Timedelta | null {
  // Reject bare "P" with no components
  if (m[2] === undefined && m[3] === undefined && m[4] === undefined && m[5] === undefined) {
    return null;
  }
  const neg = m[1] === "-";
  const days = m[2] !== undefined ? Number(m[2]) : 0;
  const hours = m[3] !== undefined ? Number(m[3]) : 0;
  const minutes = m[4] !== undefined ? Number(m[4]) : 0;
  const seconds = m[5] !== undefined ? Number(m[5]) : 0;

  let ms = days * 86_400_000 + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000;
  if (neg) {
    ms = -ms;
  }
  return Timedelta.fromMilliseconds(ms);
}

// ─── human-readable parser ─────────────────────────────────────────────────────

/** Parse human-readable form: "1h 30m 20s 500ms". Returns null if nothing matched. */
function parseHuman(value: string): Timedelta | null {
  let totalMs = 0;
  let matched = false;

  for (const match of value.matchAll(RE_HUMAN_UNIT)) {
    matched = true;
    const qty = Number(match[1]);
    const unit = (match[2] ?? "").toLowerCase();
    totalMs += humanUnitToMs(qty, unit);
  }

  return matched ? Timedelta.fromMilliseconds(totalMs) : null;
}

/** Map a human unit token to milliseconds. */
function humanUnitToMs(qty: number, unit: string): number {
  if (unit === "w" || unit.startsWith("week")) {
    return qty * 7 * 86_400_000;
  }
  if (unit === "d" || unit.startsWith("day")) {
    return qty * 86_400_000;
  }
  if (unit === "h" || unit.startsWith("hour")) {
    return qty * 3_600_000;
  }
  if (unit === "m" || unit.startsWith("min")) {
    return qty * 60_000;
  }
  if (unit === "s" || unit.startsWith("sec")) {
    return qty * 1_000;
  }
  if (unit === "us" || unit.startsWith("micro")) {
    return qty / 1_000;
  }
  if (unit === "ns" || unit.startsWith("nano")) {
    return qty / 1_000_000;
  }
  // ms / milli
  return qty;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a fractional-seconds string to milliseconds.
 * Pads or truncates to 9 digits (nanoseconds), then divides by 1e6 to get ms.
 * E.g. "5" → "500000000" / 1e6 = 500 ms
 *      "500000" → "500000000" / 1e6 = 500 ms
 *      "123456789" → 123.456789 ms
 */
export function parseFrac(s: string): number {
  const padded = s.padEnd(9, "0").slice(0, 9);
  return Number(padded) / 1_000_000;
}

/**
 * Format a Timedelta as a human-readable string matching pandas' output.
 * E.g. "0 days 01:30:00", "-1 days +22:30:00.500000"
 */
export function formatTimedelta(td: Timedelta): string {
  const neg = td.totalMs < 0;
  const absMs = Math.abs(td.totalMs);

  const days = Math.floor(absMs / 86_400_000);
  const remMs = absMs - days * 86_400_000;
  const hours = Math.floor(remMs / 3_600_000);
  const minutes = Math.floor((remMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remMs % 60_000) / 1_000);
  const fracMs = remMs % 1_000;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const frac = fracMs > 0 ? `.${String(Math.round(fracMs * 1000)).padStart(6, "0")}` : "";
  const clock = `${hh}:${mm}:${ss}${frac}`;

  if (neg) {
    // pandas: "-1 days +HH:MM:SS" style for negative durations
    const negDays = -(days + 1);
    return `${negDays} days +${clock}`;
  }

  const dayLabel = days === 1 ? "1 day" : `${days} days`;
  return `${dayLabel} ${clock}`;
}

// ─── error handler ─────────────────────────────────────────────────────────────

/**
 * Apply errors-handling policy.
 * - `"raise"` → throws TypeError
 * - `"coerce"` → returns null
 * - `"ignore"` → returns original value unchanged
 */
function applyErrors(errors: TimedeltaErrors, original: Scalar, message: string): Timedelta | null {
  if (errors === "raise") {
    throw new TypeError(message);
  }
  if (errors === "coerce") {
    return null;
  }
  // errors === "ignore"
  return original as unknown as Timedelta;
}
