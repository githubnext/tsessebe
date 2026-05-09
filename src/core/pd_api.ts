/**
 * pd_api — the `pd.api` namespace object, mirroring `pandas.api`.
 *
 * Provides `api.types` (type-checking predicates) sub-namespace, analogous to
 * `pandas.api.types`.
 *
 * @example
 * ```ts
 * import { api } from "tsb";
 * api.types.isScalar(42);            // true
 * api.types.isNumericDtype("float64"); // true
 * api.types.isListLike([1, 2, 3]);   // true
 * ```
 *
 * @module
 */

import {
  isArrayLike,
  isBigInt,
  isBool,
  isBoolDtype,
  isCategoricalDtype,
  isComplexDtype,
  isDate,
  isDatetimeDtype,
  isDictLike,
  isExtensionArrayDtype,
  isFloat,
  isFloatDtype,
  isHashable,
  isInteger,
  isIntegerDtype,
  isIntervalDtype,
  isIterator,
  isListLike,
  isMissing,
  isNumber,
  isNumericDtype,
  isObjectDtype,
  isPeriodDtype,
  isScalar,
  isSignedIntegerDtype,
  isStringDtype,
  isTimedeltaDtype,
  isUnsignedIntegerDtype,
} from "./api_types.ts";

// ─── api.types ────────────────────────────────────────────────────────────────

/**
 * The `api.types` sub-namespace — mirrors `pandas.api.types`.
 *
 * Contains predicates for both runtime values and dtypes.
 */
export const apiTypes = {
  // Value-level predicates
  isScalar,
  isListLike,
  isArrayLike,
  isDictLike,
  isIterator,
  isNumber,
  isBool,
  isFloat,
  isInteger,
  isBigInt,
  isMissing,
  isHashable,
  isDate,

  // Dtype-level predicates
  isNumericDtype,
  isIntegerDtype,
  isSignedIntegerDtype,
  isUnsignedIntegerDtype,
  isFloatDtype,
  isBoolDtype,
  isStringDtype,
  isDatetimeDtype,
  isTimedeltaDtype,
  isCategoricalDtype,
  isObjectDtype,
  isComplexDtype,
  isExtensionArrayDtype,
  isPeriodDtype,
  isIntervalDtype,
} as const;

export type ApiTypes = typeof apiTypes;

// ─── api namespace ────────────────────────────────────────────────────────────

/**
 * The top-level `api` namespace object, mirroring `pandas.api`.
 *
 * @example
 * ```ts
 * import { api } from "tsb";
 * api.types.isScalar(42);
 * ```
 */
export const api = {
  /** Type-checking predicates — mirrors `pandas.api.types`. */
  types: apiTypes,
} as const;

export type Api = typeof api;
