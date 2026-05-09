/**
 * api_types — runtime type-checking predicates, mirroring `pandas.api.types`.
 *
 * Two groups of functions are provided:
 *
 * **Value-level predicates** — operate on arbitrary JavaScript values, equivalent
 * to `pandas.api.types.is_scalar`, `is_list_like`, `is_number`, etc.
 *
 * **Dtype-level predicates** — accept a `Dtype` instance or a `DtypeName` string
 * and answer questions about the dtype's kind, equivalent to
 * `pandas.api.types.is_numeric_dtype`, `is_float_dtype`, etc.
 *
 * @example
 * ```ts
 * import { isScalar, isNumericDtype, Dtype } from "tsb";
 * isScalar(42);               // true
 * isScalar([1, 2, 3]);        // false
 * isListLike([1, 2, 3]);      // true
 * isNumericDtype(Dtype.float64);  // true
 * isStringDtype("string");       // true
 * ```
 *
 * @module
 */

import type { DtypeName } from "../types.ts";
import { Dtype } from "./dtype.ts";

// ─── internal helper ──────────────────────────────────────────────────────────

/** Resolve a Dtype | DtypeName to a Dtype instance. */
function resolveDtype(dtype: Dtype | DtypeName): Dtype {
  if (dtype instanceof Dtype) {
    return dtype;
  }
  return Dtype.from(dtype);
}

// ═════════════════════════════════════════════════════════════════════════════
// VALUE-LEVEL PREDICATES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Return `true` if `val` is a scalar (not a collection).
 *
 * Scalars: `string`, `number`, `bigint`, `boolean`, `symbol`, `null`,
 * `undefined`, and `Date` objects.  Arrays, plain objects, `Map`, `Set`,
 * iterables, and class instances other than `Date` are **not** scalars.
 *
 * Mirrors `pandas.api.types.is_scalar`.
 *
 * @example
 * ```ts
 * isScalar(42);           // true
 * isScalar("hello");      // true
 * isScalar(null);         // true
 * isScalar([1, 2]);       // false
 * isScalar({ a: 1 });     // false
 * ```
 */
export function isScalar(val: unknown): boolean {
  if (val === null || val === undefined) {
    return true;
  }
  const t = typeof val;
  if (t === "string" || t === "number" || t === "bigint" || t === "boolean" || t === "symbol") {
    return true;
  }
  if (val instanceof Date) {
    return true;
  }
  return false;
}

/**
 * Return `true` if `val` is "list-like" — i.e. iterable or has a
 * non-negative integer `length` property. Strings are included, matching
 * the behaviour of `pandas.api.types.is_list_like`.
 *
 * Mirrors `pandas.api.types.is_list_like`.
 *
 * @example
 * ```ts
 * isListLike([1, 2, 3]);      // true
 * isListLike(new Set([1]));   // true
 * isListLike("abc");          // true
 * isListLike(42);             // false
 * isListLike({ a: 1 });       // false
 * ```
 */
export function isListLike(val: unknown): boolean {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val === "string") {
    return true;
  }
  // Has Symbol.iterator and is not a plain number/boolean/bigint/symbol
  if (
    typeof val === "number" ||
    typeof val === "boolean" ||
    typeof val === "bigint" ||
    typeof val === "symbol"
  ) {
    return false;
  }
  if (typeof val === "object" || typeof val === "function") {
    if (Symbol.iterator in (val as object)) {
      return true;
    }
    const len = (val as { length?: unknown }).length;
    if (typeof len === "number" && len >= 0 && Number.isInteger(len)) {
      return true;
    }
  }
  return false;
}

/**
 * Return `true` if `val` is array-like — i.e. has a non-negative integer
 * `length` property.
 *
 * Mirrors `pandas.api.types.is_array_like`.
 *
 * @example
 * ```ts
 * isArrayLike([1, 2]);   // true
 * isArrayLike("abc");    // true  (strings have .length)
 * isArrayLike(42);       // false
 * isArrayLike({});       // false
 * ```
 */
export function isArrayLike(val: unknown): boolean {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val === "string") {
    return true;
  }
  if (typeof val !== "object" && typeof val !== "function") {
    return false;
  }
  const len = (val as { length?: unknown }).length;
  return typeof len === "number" && len >= 0 && Number.isInteger(len);
}

/**
 * Return `true` if `val` is dict-like — a plain object (not an array, not a
 * `Date`, not a class instance).
 *
 * Mirrors `pandas.api.types.is_dict_like`.
 *
 * @example
 * ```ts
 * isDictLike({ a: 1 });       // true
 * isDictLike(new Map());      // true  (has .get / .set)
 * isDictLike([1, 2]);         // false
 * isDictLike("abc");          // false
 * ```
 */
export function isDictLike(val: unknown): boolean {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val !== "object") {
    return false;
  }
  if (Array.isArray(val)) {
    return false;
  }
  // Treat Map as dict-like (supports key lookup)
  if (val instanceof Map) {
    return true;
  }
  // Date is not dict-like
  if (val instanceof Date) {
    return false;
  }
  // Plain objects and other objects with properties
  return true;
}

/**
 * Return `true` if `val` is an iterator — i.e. has a callable `next` method.
 *
 * Mirrors `pandas.api.types.is_iterator`.
 *
 * @example
 * ```ts
 * isIterator([1, 2][Symbol.iterator]());  // true
 * isIterator([1, 2]);                     // false
 * ```
 */
export function isIterator(val: unknown): boolean {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val !== "object" && typeof val !== "function") {
    return false;
  }
  return typeof (val as { next?: unknown }).next === "function";
}

/**
 * Return `true` if `val` is a `number` (including `NaN` and `±Infinity`).
 *
 * Mirrors `pandas.api.types.is_number`.
 *
 * @example
 * ```ts
 * isNumber(3.14);   // true
 * isNumber(NaN);    // true
 * isNumber("3");    // false
 * ```
 */
export function isNumber(val: unknown): val is number {
  return typeof val === "number";
}

/**
 * Return `true` if `val` is a `boolean`.
 *
 * Mirrors `pandas.api.types.is_bool`.
 *
 * @example
 * ```ts
 * isBool(true);    // true
 * isBool(1);       // false
 * ```
 */
export function isBool(val: unknown): val is boolean {
  return typeof val === "boolean";
}

/**
 * Return `true` if `val` is a `string`.
 *
 * Named `isStringValue` to distinguish from the dtype-level `isStringDtype`.
 * Mirrors `pandas.api.types.is_string` (not to be confused with dtype checks).
 *
 * @example
 * ```ts
 * isStringValue("hello");  // true
 * isStringValue(42);       // false
 * ```
 */
export function isStringValue(val: unknown): val is string {
  return typeof val === "string";
}

/**
 * Return `true` if `val` is a finite floating-point number (has a fractional
 * component or is finite non-integer).  `NaN`, `±Infinity` are **not** floats
 * in the pandas sense.
 *
 * Mirrors `pandas.api.types.is_float`.
 *
 * @example
 * ```ts
 * isFloat(3.14);   // true
 * isFloat(3.0);    // false  (integer value)
 * isFloat(NaN);    // false
 * isFloat(Infinity); // false
 * ```
 */
export function isFloat(val: unknown): boolean {
  if (typeof val !== "number") {
    return false;
  }
  if (!Number.isFinite(val)) {
    return false;
  }
  return val !== Math.trunc(val);
}

/**
 * Return `true` if `val` is a finite integer-valued number.
 *
 * Mirrors `pandas.api.types.is_integer`.
 *
 * @example
 * ```ts
 * isInteger(3);      // true
 * isInteger(3.0);    // true   (integer value stored as float)
 * isInteger(3.14);   // false
 * isInteger(NaN);    // false
 * ```
 */
export function isInteger(val: unknown): boolean {
  return typeof val === "number" && Number.isInteger(val);
}

/**
 * Return `true` if `val` is a `bigint`.
 *
 * @example
 * ```ts
 * isBigInt(42n);   // true
 * isBigInt(42);    // false
 * ```
 */
export function isBigInt(val: unknown): val is bigint {
  return typeof val === "bigint";
}

/**
 * Return `true` if `val` is a `RegExp`.
 *
 * Mirrors `pandas.api.types.is_re`.
 *
 * @example
 * ```ts
 * isRegExp(/abc/);          // true
 * isRegExp(new RegExp("x")); // true
 * isRegExp("abc");          // false
 * ```
 */
export function isRegExp(val: unknown): val is RegExp {
  return val instanceof RegExp;
}

/**
 * Return `true` if `val` can be compiled into a `RegExp` — i.e. it is either
 * a `string` or already a `RegExp`.
 *
 * Mirrors `pandas.api.types.is_re_compilable`.
 *
 * @example
 * ```ts
 * isReCompilable("abc");   // true
 * isReCompilable(/abc/);   // true
 * isReCompilable(42);      // false
 * ```
 */
export function isReCompilable(val: unknown): boolean {
  return typeof val === "string" || val instanceof RegExp;
}

/**
 * Return `true` if `val` is a "missing" value in the pandas sense: `null`,
 * `undefined`, or `NaN`.
 *
 * @example
 * ```ts
 * isMissing(null);       // true
 * isMissing(undefined);  // true
 * isMissing(NaN);        // true
 * isMissing(0);          // false
 * isMissing("");         // false
 * ```
 */
export function isMissing(val: unknown): boolean {
  if (val === null || val === undefined) {
    return true;
  }
  if (typeof val === "number" && Number.isNaN(val)) {
    return true;
  }
  return false;
}

/**
 * Return `true` if `val` is "hashable" — usable as an object-key in
 * JavaScript.  In practice this means it is a primitive (`string`, `number`,
 * `bigint`, `boolean`, `symbol`, `null`, `undefined`).
 *
 * Mirrors the spirit of `pandas.api.types.is_hashable`.
 *
 * @example
 * ```ts
 * isHashable("key");   // true
 * isHashable(42);      // true
 * isHashable({});      // false
 * isHashable([]);      // false
 * ```
 */
export function isHashable(val: unknown): boolean {
  if (val === null || val === undefined) {
    return true;
  }
  const t = typeof val;
  return t === "string" || t === "number" || t === "bigint" || t === "boolean" || t === "symbol";
}

/**
 * Return `true` if `val` is a `Date` instance.
 *
 * @example
 * ```ts
 * isDate(new Date());   // true
 * isDate("2024-01-01"); // false
 * ```
 */
export function isDate(val: unknown): val is Date {
  return val instanceof Date;
}

// ═════════════════════════════════════════════════════════════════════════════
// DTYPE-LEVEL PREDICATES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Return `true` if the dtype is numeric (integer, unsigned integer, or float).
 *
 * Mirrors `pandas.api.types.is_numeric_dtype`.
 *
 * @example
 * ```ts
 * isNumericDtype(Dtype.float64);  // true
 * isNumericDtype("int32");        // true
 * isNumericDtype("string");       // false
 * ```
 */
export function isNumericDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isNumeric;
}

/**
 * Return `true` if the dtype is any integer kind (signed or unsigned).
 *
 * Mirrors `pandas.api.types.is_integer_dtype`.
 *
 * @example
 * ```ts
 * isIntegerDtype("int64");   // true
 * isIntegerDtype("uint8");   // true
 * isIntegerDtype("float32"); // false
 * ```
 */
export function isIntegerDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isInteger;
}

/**
 * Return `true` if the dtype is a signed integer (`int8`–`int64`).
 *
 * Mirrors `pandas.api.types.is_signed_integer_dtype`.
 *
 * @example
 * ```ts
 * isSignedIntegerDtype("int32");  // true
 * isSignedIntegerDtype("uint32"); // false
 * ```
 */
export function isSignedIntegerDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isSignedInteger;
}

/**
 * Return `true` if the dtype is an unsigned integer (`uint8`–`uint64`).
 *
 * Mirrors `pandas.api.types.is_unsigned_integer_dtype`.
 *
 * @example
 * ```ts
 * isUnsignedIntegerDtype("uint64"); // true
 * isUnsignedIntegerDtype("int64");  // false
 * ```
 */
export function isUnsignedIntegerDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isUnsignedInteger;
}

/**
 * Return `true` if the dtype is a floating-point type (`float32` or `float64`).
 *
 * Mirrors `pandas.api.types.is_float_dtype`.
 *
 * @example
 * ```ts
 * isFloatDtype("float64");  // true
 * isFloatDtype("float32");  // true
 * isFloatDtype("int32");    // false
 * ```
 */
export function isFloatDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isFloat;
}

/**
 * Return `true` if the dtype is boolean.
 *
 * Mirrors `pandas.api.types.is_bool_dtype`.
 *
 * @example
 * ```ts
 * isBoolDtype("bool");     // true
 * isBoolDtype("int8");     // false
 * ```
 */
export function isBoolDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isBool;
}

/**
 * Return `true` if the dtype is the `string` dtype.
 *
 * Mirrors `pandas.api.types.is_string_dtype`.
 *
 * @example
 * ```ts
 * isStringDtype("string");   // true
 * isStringDtype("object");   // false
 * ```
 */
export function isStringDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isString;
}

/**
 * Return `true` if the dtype is a datetime type.
 *
 * Mirrors `pandas.api.types.is_datetime64_dtype`.
 *
 * @example
 * ```ts
 * isDatetimeDtype("datetime");  // true
 * isDatetimeDtype("string");    // false
 * ```
 */
export function isDatetimeDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isDatetime;
}

/**
 * Return `true` if the dtype is a timedelta type.
 *
 * Mirrors `pandas.api.types.is_timedelta64_dtype`.
 *
 * @example
 * ```ts
 * isTimedeltaDtype("timedelta");  // true
 * isTimedeltaDtype("datetime");   // false
 * ```
 */
export function isTimedeltaDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isTimedelta;
}

/**
 * Return `true` if the dtype is the categorical dtype.
 *
 * Mirrors `pandas.api.types.is_categorical_dtype`.
 *
 * @example
 * ```ts
 * isCategoricalDtype("category");  // true
 * isCategoricalDtype("string");    // false
 * ```
 */
export function isCategoricalDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isCategory;
}

/**
 * Return `true` if the dtype is the object dtype.
 *
 * Mirrors `pandas.api.types.is_object_dtype`.
 *
 * @example
 * ```ts
 * isObjectDtype("object");   // true
 * isObjectDtype("string");   // false
 * ```
 */
export function isObjectDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isObject;
}

/**
 * Return `true` if the dtype represents complex numbers.
 *
 * JavaScript has no native complex number type, so this always returns `false`
 * (no complex dtype exists in the `tsb` dtype system).  Provided for API
 * parity with `pandas.api.types.is_complex_dtype`.
 *
 * @example
 * ```ts
 * isComplexDtype("float64");  // false  (no complex dtype)
 * ```
 */
export function isComplexDtype(_dtype: Dtype | DtypeName): boolean {
  return false;
}

/**
 * Return `true` if the dtype is an "extension array" dtype — i.e. any dtype
 * beyond the numeric primitives: `string`, `object`, `datetime`, `timedelta`,
 * `category`.
 *
 * Mirrors `pandas.api.types.is_extension_array_dtype`.
 *
 * @example
 * ```ts
 * isExtensionArrayDtype("category");  // true
 * isExtensionArrayDtype("datetime");  // true
 * isExtensionArrayDtype("int64");     // false
 * ```
 */
export function isExtensionArrayDtype(dtype: Dtype | DtypeName): boolean {
  const d = resolveDtype(dtype);
  return d.isString || d.isObject || d.isDatetime || d.isTimedelta || d.isCategory;
}

/**
 * Return `true` if the dtype can hold period (date period) data.
 * In the current `tsb` dtype system this maps to the `datetime` kind.
 *
 * Mirrors `pandas.api.types.is_period_dtype`.
 *
 * @example
 * ```ts
 * isPeriodDtype("datetime");  // true
 * isPeriodDtype("float64");   // false
 * ```
 */
export function isPeriodDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isDatetime;
}

/**
 * Return `true` if the dtype is suitable for interval data — float or integer.
 *
 * Mirrors `pandas.api.types.is_interval_dtype`.
 *
 * @example
 * ```ts
 * isIntervalDtype("float64");  // true
 * isIntervalDtype("int32");    // true
 * isIntervalDtype("string");   // false
 * ```
 */
export function isIntervalDtype(dtype: Dtype | DtypeName): boolean {
  return resolveDtype(dtype).isNumeric;
}
