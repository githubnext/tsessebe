/**
 * pd.array — factory function for creating pandas-compatible arrays.
 *
 * Mirrors `pandas.array()`. Accepts a sequence of values and an optional dtype
 * hint, and returns a typed array wrapper suitable for use with tsb Series and
 * DataFrames.
 *
 * @example
 * ```ts
 * import { pdArray } from "tsb";
 *
 * const a = pdArray([1, 2, 3], "int64");
 * a.dtype;       // "int64"
 * a.length;      // 3
 * a.toArray();   // [1, 2, 3]
 *
 * const b = pdArray(["a", "b", null], "string");
 * b.dtype;       // "string"
 * b.toArray();   // ["a", "b", null]
 * ```
 *
 * @module
 */

import type { DtypeName, Scalar } from "../types.ts";

/**
 * A lightweight typed array returned by {@link pdArray}.
 *
 * Mirrors the minimal public interface of a pandas ExtensionArray / ndarray
 * that tsb needs for interop.
 */
export class PandasArray {
  readonly dtype: DtypeName;
  readonly length: number;
  private readonly _data: readonly Scalar[];

  /** @internal */
  constructor(data: readonly Scalar[], dtype: DtypeName) {
    this._data = data;
    this.dtype = dtype;
    this.length = data.length;
  }

  /** Return the element at position `i` (0-based). */
  at(i: number): Scalar {
    return this._data[i] ?? null;
  }

  /** Return a plain JS array copy of the underlying data. */
  toArray(): Scalar[] {
    return Array.from(this._data);
  }

  /** Iterate over elements. */
  [Symbol.iterator](): Iterator<Scalar> {
    return this._data[Symbol.iterator]();
  }

  /** @internal */
  toString(): string {
    return `PandasArray([${this._data.join(", ")}], dtype='${this.dtype}')`;
  }
}

// ─── dtype inference ──────────────────────────────────────────────────────────

function inferDtype(data: readonly Scalar[]): DtypeName {
  let hasFloat = false;
  let hasInt = false;
  let hasString = false;
  let hasBool = false;
  let hasDate = false;
  let hasBigInt = false;

  for (const v of data) {
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") {
      hasBool = true;
    } else if (typeof v === "bigint") {
      hasBigInt = true;
    } else if (typeof v === "number") {
      if (!Number.isInteger(v)) {
        hasFloat = true;
      } else {
        hasInt = true;
      }
    } else if (typeof v === "string") {
      hasString = true;
    } else if (v instanceof Date) {
      hasDate = true;
    }
  }

  if (hasDate) return "datetime";
  if (hasBigInt) return "int64";
  if (hasFloat) return "float64";
  if (hasInt && !hasString && !hasBool) return "int64";
  if (hasBool && !hasInt && !hasFloat && !hasString) return "bool";
  if (hasString) return "string";
  return "object";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a {@link PandasArray} from a sequence of values.
 *
 * Mirrors `pandas.array(data, dtype=None)`.
 *
 * @param data  - Iterable of scalar values (may include `null`/`undefined` for NA).
 * @param dtype - Optional dtype hint. When omitted the dtype is inferred from
 *   the data (similar to pandas' inference rules).
 * @returns A {@link PandasArray} with the given (or inferred) dtype.
 *
 * @example
 * ```ts
 * pdArray([1, 2, 3]);               // dtype inferred as "int64"
 * pdArray([1.5, 2.5], "float32");   // dtype forced to "float32"
 * pdArray(["a", null, "c"]);        // dtype inferred as "string"
 * ```
 */
export function pdArray(
  data: Iterable<Scalar>,
  dtype?: DtypeName,
): PandasArray {
  const arr = Array.from(data);
  const resolvedDtype = dtype ?? inferDtype(arr);
  return new PandasArray(arr, resolvedDtype);
}
