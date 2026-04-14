/**
 * to_numeric — coerce scalars, arrays, or Series to numeric types.
 *
 * Mirrors `pandas.to_numeric(arg, errors, downcast)`.
 *
 * Conversion rules (matching pandas behaviour):
 * - Numbers are returned as-is (after optional downcast).
 * - Strings are parsed: integer strings → integer, float strings → float.
 *   Recognises leading/trailing whitespace, `Infinity`, `-Infinity`, `NaN`.
 * - `null` / `undefined` → `NaN` (always — not affected by `errors`).
 * - `boolean` → 1 / 0.
 * - `bigint` → `Number(bigint)`.
 * - Everything else (Date, objects, …) is treated as unconvertible.
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/**
 * What to do when a value cannot be converted to a number.
 *
 * - `"raise"` (default) — throw a `TypeError`.
 * - `"coerce"` — replace the bad value with `NaN`.
 * - `"ignore"` — return the original value unchanged (output type becomes `number | T`).
 */
export type ToNumericErrors = "raise" | "coerce" | "ignore";

/**
 * Optional downcast hint.
 *
 * After conversion, attempt to cast the result to the smallest type that can
 * losslessly represent the value.  Mirrors pandas' downcast behaviour — the
 * actual JS representation always stays `number`; this is a logical annotation
 * that also drives the integer-vs-float distinction in the result.
 *
 * - `"integer"` / `"signed"` — smallest signed integer subtype (int8 → int64).
 * - `"unsigned"` — smallest unsigned integer subtype (uint8 → uint64).
 * - `"float"` — smallest float subtype (float32 before float64).
 */
export type ToNumericDowncast = "integer" | "signed" | "unsigned" | "float";

/** Options for {@link toNumeric}. */
export interface ToNumericOptions {
  /**
   * How to handle values that cannot be converted.
   * @defaultValue `"raise"`
   */
  readonly errors?: ToNumericErrors;
  /**
   * Downcast hint (informational; does not change JS runtime type).
   * @defaultValue `undefined` (no downcast)
   */
  readonly downcast?: ToNumericDowncast;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Try to parse a single scalar to a JS `number`.
 *
 * Returns `{ ok: true, value: number }` on success.
 * Returns `{ ok: false }` when the input is unconvertible.
 * `null` / `undefined` always convert to `NaN` (ok === true).
 */
function tryConvert(
  v: unknown,
): { readonly ok: true; readonly value: number } | { readonly ok: false } {
  if (v === null || v === undefined) {
    return { ok: true, value: Number.NaN };
  }
  if (typeof v === "number") {
    return { ok: true, value: v };
  }
  if (typeof v === "boolean") {
    return { ok: true, value: v ? 1 : 0 };
  }
  if (typeof v === "bigint") {
    return { ok: true, value: Number(v) };
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") {
      return { ok: true, value: Number.NaN };
    }
    // Use Number() which handles Infinity, -Infinity, hex (0x…), etc.
    const n = Number(trimmed);
    if (!Number.isNaN(n)) {
      return { ok: true, value: n };
    }
    // "NaN" string → NaN (pandas does the same)
    if (trimmed === "NaN" || trimmed === "nan" || trimmed === "NAN") {
      return { ok: true, value: Number.NaN };
    }
    return { ok: false };
  }
  return { ok: false };
}

/**
 * Apply the optional `downcast` hint to a converted number.
 *
 * This does not change the JS representation — all numbers in JavaScript are
 * IEEE-754 doubles.  The function returns `number` for parity; a future
 * implementation could store a dtype annotation on the Series instead.
 */
function applyDowncast(n: number, downcast: ToNumericDowncast | undefined): number {
  if (downcast === undefined || !Number.isFinite(n)) {
    return n;
  }

  if (downcast === "float") {
    // Represent as float32 precision (round-trip through Float32Array).
    const buf = new Float32Array(1);
    buf[0] = n;
    return buf[0] ?? n;
  }

  // integer / signed / unsigned — snap to an integer if it is already one.
  if (!Number.isInteger(n)) {
    return n;
  }

  if (downcast === "unsigned") {
    // Clamp to uint8 range first, expanding as needed.
    if (n >= 0 && n <= 255) {
      return n & 0xff;
    }
    if (n >= 0 && n <= 65535) {
      return n & 0xffff;
    }
    if (n >= 0 && n <= 4294967295) {
      return n >>> 0;
    }
    return n;
  }

  // signed / integer
  if (n >= -128 && n <= 127) {
    return n | 0;
  }
  if (n >= -32768 && n <= 32767) {
    return n | 0;
  }
  if (n >= -2147483648 && n <= 2147483647) {
    return n | 0;
  }
  return n;
}

// ─── scalar overload ──────────────────────────────────────────────────────────

/**
 * Convert a single scalar value to a number.
 *
 * When `errors = "ignore"` the return type is `number | T` so TypeScript
 * knows that the original value may be returned unchanged.
 */
export function toNumericScalar<T>(
  value: T,
  options?: ToNumericOptions & { readonly errors: "ignore" },
): number | T;
export function toNumericScalar(value: unknown, options?: ToNumericOptions): number;
export function toNumericScalar(value: unknown, options: ToNumericOptions = {}): unknown {
  const errors = options.errors ?? "raise";
  const result = tryConvert(value);
  if (result.ok) {
    return applyDowncast(result.value, options.downcast);
  }
  if (errors === "coerce") {
    return Number.NaN;
  }
  if (errors === "ignore") {
    return value;
  }
  throw new TypeError(`to_numeric: cannot convert ${JSON.stringify(value)} to a number`);
}

// ─── array overload ───────────────────────────────────────────────────────────

/**
 * Convert an array-like of values to `number[]`.
 *
 * When `errors = "ignore"` the return type is `(number | T)[]`.
 */
export function toNumericArray<T>(
  values: readonly T[],
  options?: ToNumericOptions & { readonly errors: "ignore" },
): (number | T)[];
export function toNumericArray(values: readonly unknown[], options?: ToNumericOptions): number[];
export function toNumericArray(
  values: readonly unknown[],
  options: ToNumericOptions = {},
): unknown[] {
  const errors = options.errors ?? "raise";
  const downcast = options.downcast;
  return values.map((v) => {
    const result = tryConvert(v);
    if (result.ok) {
      return applyDowncast(result.value, downcast);
    }
    if (errors === "coerce") {
      return Number.NaN;
    }
    if (errors === "ignore") {
      return v;
    }
    throw new TypeError(`to_numeric: cannot convert ${JSON.stringify(v)} to a number`);
  });
}

// ─── Series overload ──────────────────────────────────────────────────────────

/**
 * Convert a Series to a numeric Series.
 *
 * Returns a new `Series<number>` (or `Series<number | T>` when `errors = "ignore"`).
 */
export function toNumericSeries<T extends Scalar>(
  s: Series<T>,
  options?: ToNumericOptions & { readonly errors: "ignore" },
): Series<number | T>;
export function toNumericSeries<T extends Scalar>(
  s: Series<T>,
  options?: ToNumericOptions,
): Series<number>;
export function toNumericSeries<T extends Scalar>(
  s: Series<T>,
  options: ToNumericOptions = {},
): Series<number | T> {
  const converted = toNumericArray(s.values as readonly unknown[], options) as (number | T)[];
  return new Series<number | T>({ data: converted, index: s.index, name: s.name });
}

// ─── unified entry-point ──────────────────────────────────────────────────────

/**
 * `pandas.to_numeric` — convert argument to numeric type.
 *
 * Accepts a scalar, a plain array, or a `Series`.
 *
 * ```ts
 * import { toNumeric } from "tsb";
 *
 * toNumeric("3.14");        // 3.14
 * toNumeric(["1", "2.5"]);  // [1, 2.5]
 * toNumeric(mySeries, { errors: "coerce" });  // Series<number>
 * ```
 */
export function toNumeric(value: unknown, options?: ToNumericOptions): unknown {
  if (value instanceof Series) {
    return toNumericSeries(value, options);
  }
  if (Array.isArray(value)) {
    return toNumericArray(value as readonly unknown[], options);
  }
  return toNumericScalar(value, options);
}
