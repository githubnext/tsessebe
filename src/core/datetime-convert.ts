/**
 * Type-conversion utilities — `to_datetime` and `to_timedelta`,
 * mirroring `pandas.to_datetime` and `pandas.to_timedelta`.
 *
 * These convert scalar values, arrays, or Series to DatetimeIndex /
 * TimedeltaIndex respectively.
 */

import type { Scalar } from "../types.ts";
import { Series } from "./series.ts";
import { Timedelta } from "./timedelta.ts";

// ─── to_datetime helpers ──────────────────────────────────────────────────────

/** Try to parse a scalar as a Date. Returns null on failure. */
function parseDate(v: Scalar): Date | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === "number") {
    return new Date(v);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ─── to_datetime ──────────────────────────────────────────────────────────────

/** Options for {@link toDatetime}. */
export interface ToDatetimeOptions {
  /** If `"coerce"`, invalid values become `null`; if `"raise"` (default) an error is thrown. */
  errors?: "raise" | "coerce";
  /** Optional UTC flag — stored but not enforced at parse time. */
  utc?: boolean;
}

/**
 * Convert a Series of strings/numbers to a Series of Date objects.
 * Mirrors `pandas.to_datetime`.
 *
 * @example
 * ```ts
 * toDatetime(new Series({ data: ["2024-01-01", "2024-06-15"] }));
 * ```
 */
export function toDatetime(s: Series<Scalar>, opts: ToDatetimeOptions = {}): Series<Scalar> {
  const errors = opts.errors ?? "raise";
  const out: Scalar[] = [];
  for (const v of s.values) {
    const d = parseDate(v);
    if (d === null) {
      if (errors === "coerce") {
        out.push(null);
      } else {
        throw new TypeError(`to_datetime: cannot parse value ${String(v)}`);
      }
    } else {
      out.push(d);
    }
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── to_timedelta helpers ─────────────────────────────────────────────────────

const ISO_DURATION_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;
const NAT_DURATION_RE =
  /^(-?\d+(?:\.\d+)?)\s*(d|day|days|h|hour|hours|m|min|minute|minutes|s|sec|second|seconds|ms|millisecond|milliseconds)$/i;

/** Resolve Timedelta unit from a natural-language unit string. */
function resolveUnit(unit: string): "D" | "h" | "m" | "s" | "ms" {
  if (unit.startsWith("d")) {
    return "D";
  }
  if (unit.startsWith("h")) {
    return "h";
  }
  if (unit === "m" || unit.startsWith("min")) {
    return "m";
  }
  if (unit === "ms" || unit.startsWith("mil")) {
    return "ms";
  }
  return "s";
}

/** Parse a Timedelta from a string like "1 day", "3h", etc. */
function parseTimedeltaStr(v: string): Timedelta | null {
  const trimmed = v.trim();
  const isoMatch = trimmed.match(ISO_DURATION_RE);
  if (isoMatch !== null) {
    const days = Number(isoMatch[1] ?? 0);
    const hours = Number(isoMatch[2] ?? 0);
    const minutes = Number(isoMatch[3] ?? 0);
    const seconds = Number(isoMatch[4] ?? 0);
    const ms = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;
    return new Timedelta(ms, "ms");
  }
  const natMatch = trimmed.match(NAT_DURATION_RE);
  if (natMatch !== null) {
    const amount = Number(natMatch[1]);
    const unit = (natMatch[2] ?? "").toLowerCase();
    return new Timedelta(amount, resolveUnit(unit));
  }
  return null;
}

/** Convert a scalar to a Timedelta, or null. */
function parseTimedelta(v: Scalar): Timedelta | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Timedelta) {
    return v;
  }
  if (typeof v === "number") {
    return new Timedelta(v, "ms");
  }
  if (typeof v === "string") {
    return parseTimedeltaStr(v);
  }
  return null;
}

// ─── to_timedelta ─────────────────────────────────────────────────────────────

/** Options for {@link toTimedelta}. */
export interface ToTimedeltaOptions {
  /** Default unit when a plain number is passed. Defaults to `"ms"`. */
  unit?: "D" | "h" | "m" | "s" | "ms";
  /** Error handling. Default `"raise"`. */
  errors?: "raise" | "coerce";
}

/**
 * Convert a Series of strings/numbers to a Series of Timedelta objects.
 * Mirrors `pandas.to_timedelta`.
 *
 * @example
 * ```ts
 * toTimedelta(new Series({ data: ["1 day", "3 hours"] }));
 * toTimedelta(new Series({ data: [1000, 2000] }), { unit: "ms" });
 * ```
 */
export function toTimedelta(s: Series<Scalar>, opts: ToTimedeltaOptions = {}): Series<Scalar> {
  const errors = opts.errors ?? "raise";
  const defaultUnit = opts.unit ?? "ms";
  const out: Scalar[] = [];
  for (const v of s.values) {
    let td: Timedelta | null = null;
    if (typeof v === "number") {
      td = new Timedelta(v, defaultUnit);
    } else {
      td = parseTimedelta(v);
    }
    if (td === null) {
      if (errors === "coerce") {
        out.push(null);
      } else {
        throw new TypeError(`to_timedelta: cannot parse value ${String(v)}`);
      }
    } else {
      out.push(td as unknown as Scalar);
    }
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}
