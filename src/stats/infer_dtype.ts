/**
 * infer_dtype — infer the most specific dtype name from an array of values.
 *
 * Mirrors `pandas.api.types.infer_dtype(values, skipna)`.
 *
 * Returns a string label describing the dominant type of the values:
 *
 * | Return value          | Meaning                                          |
 * |-----------------------|--------------------------------------------------|
 * | `"empty"`             | Zero elements, or all null/undefined (skipna)    |
 * | `"boolean"`           | All `boolean`                                    |
 * | `"integer"`           | All integers (whole `number` + `bigint`)         |
 * | `"floating"`          | All finite or ±Infinity / NaN floats             |
 * | `"mixed-integer-float"` | Mix of integer and floating-point numbers      |
 * | `"decimal"`           | Mix of numbers and bigints                       |
 * | `"complex"`           | (never emitted — kept for API surface parity)    |
 * | `"string"`            | All `string`                                     |
 * | `"bytes"`             | (never emitted — kept for API surface parity)    |
 * | `"date"`              | All `Date`                                       |
 * | `"datetime"`          | All `Timestamp`                                  |
 * | `"timedelta"`         | All `Timedelta`                                  |
 * | `"period"`            | All `Period`                                     |
 * | `"interval"`          | All `Interval`                                   |
 * | `"mixed-integer"`     | Mix of integer and other non-float types         |
 * | `"mixed"`             | Multiple different non-numeric types             |
 *
 * @example
 * ```ts
 * inferDtype([1, 2, 3]);               // "integer"
 * inferDtype([1, 2.5, 3]);             // "mixed-integer-float"
 * inferDtype([1.1, 2.2, 3.3]);         // "floating"
 * inferDtype(["a", "b"]);              // "string"
 * inferDtype([true, false]);           // "boolean"
 * inferDtype([new Date()]);            // "date"
 * inferDtype([null, null], false);     // "mixed"
 * inferDtype([null, null], true);      // "empty"
 * inferDtype([1, "a"]);               // "mixed-integer"
 * ```
 *
 * @module
 */

import { Series } from "../core/index.ts";
import { Interval } from "../core/interval.ts";
import { Period } from "../core/period.ts";
import { Timedelta } from "../core/timedelta.ts";
import { Timestamp } from "../core/timestamp.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * The string labels returned by {@link inferDtype}.
 *
 * Mirrors the set of labels returned by `pandas.api.types.infer_dtype`.
 */
export type InferredDtype =
  | "string"
  | "floating"
  | "mixed-integer-float"
  | "integer"
  | "decimal"
  | "complex"
  | "boolean"
  | "datetime"
  | "date"
  | "timedelta"
  | "period"
  | "interval"
  | "empty"
  | "bytes"
  | "mixed-integer"
  | "mixed";

/** Options accepted by {@link inferDtype}. */
export interface InferDtypeOptions {
  /**
   * When `true` (the default), `null` and `undefined` values are ignored
   * when determining the dtype.  When `false`, they are treated as distinct
   * values of type `"object"` and cause the result to be `"mixed"` unless
   * every element is null/undefined (→ `"empty"`).
   */
  skipna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Classify a single non-null value into a coarse category tag. */
type ValueKind =
  | "boolean"
  | "integer"
  | "float"
  | "bigint"
  | "string"
  | "date"
  | "timestamp"
  | "timedelta"
  | "period"
  | "interval"
  | "null"
  | "other";

function classifyOne(v: unknown): ValueKind {
  if (v === null || v === undefined) {
    return "null";
  }
  if (typeof v === "boolean") {
    return "boolean";
  }
  if (typeof v === "bigint") {
    return "bigint";
  }
  if (typeof v === "number") {
    return Number.isInteger(v) ? "integer" : "float";
  }
  if (typeof v === "string") {
    return "string";
  }
  if (v instanceof Timestamp) {
    return "timestamp";
  }
  if (v instanceof Timedelta) {
    return "timedelta";
  }
  if (v instanceof Period) {
    return "period";
  }
  if (v instanceof Interval) {
    return "interval";
  }
  if (v instanceof Date) {
    return "date";
  }
  return "other";
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Infer the most specific dtype from a sequence of values.
 *
 * @param values - An array of values or a {@link Series}.
 * @param options - Optional settings (default: `{ skipna: true }`).
 * @returns A string label from {@link InferredDtype}.
 *
 * @example
 * ```ts
 * inferDtype([1, 2, 3]);          // "integer"
 * inferDtype([1.1, 2.2]);         // "floating"
 * inferDtype([1, 2.5]);           // "mixed-integer-float"
 * inferDtype(["a", "b"]);         // "string"
 * inferDtype([]);                 // "empty"
 * ```
 */
export function inferDtype(
  values: readonly unknown[] | Series,
  options?: InferDtypeOptions,
): InferredDtype {
  const skipna = options?.skipna ?? true;
  const arr: readonly unknown[] = values instanceof Series ? values.toArray() : values;

  if (arr.length === 0) {
    return "empty";
  }

  const kinds = new Set<ValueKind>();
  let _totalNulls = 0;

  for (const v of arr) {
    const k = classifyOne(v);
    if (k === "null") {
      _totalNulls++;
      if (!skipna) {
        kinds.add("null");
      }
    } else {
      kinds.add(k);
    }
  }

  // All values were null/undefined
  if (kinds.size === 0) {
    return "empty";
  }

  // Single kind → trivially infer
  if (kinds.size === 1) {
    const [k] = kinds;
    switch (k) {
      case "boolean":
        return "boolean";
      case "integer":
        return "integer";
      case "float":
        return "floating";
      case "bigint":
        return "integer";
      case "string":
        return "string";
      case "date":
        return "date";
      case "timestamp":
        return "datetime";
      case "timedelta":
        return "timedelta";
      case "period":
        return "period";
      case "interval":
        return "interval";
      case "null":
        return "mixed";
      case "other":
        return "mixed";
    }
  }

  // Multiple kinds — apply pandas-equivalent rules

  // integer + float (no other kinds) → mixed-integer-float
  const kindsExNulls = new Set(kinds);
  kindsExNulls.delete("null");

  const hasInteger = kinds.has("integer");
  const hasFloat = kinds.has("float");
  const hasBigint = kinds.has("bigint");
  const numericOnly =
    kindsExNulls.size > 0 &&
    [...kindsExNulls].every((k) => k === "integer" || k === "float" || k === "bigint");

  if (numericOnly) {
    if (hasBigint && !hasFloat) {
      return "decimal"; // int + bigint mix
    }
    if (hasInteger && hasFloat) {
      return "mixed-integer-float"; // int + float
    }
    if (hasBigint && hasFloat) {
      return "mixed-integer-float"; // bigint + float
    }
    return "integer"; // shouldn't reach here
  }

  // integer + non-numeric → mixed-integer
  if (hasInteger || hasBigint) {
    return "mixed-integer";
  }

  // everything else
  return "mixed";
}
