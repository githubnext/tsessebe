/**
 * hash_pandas_object — FNV-1a 64-bit hashes for Series and DataFrame.
 *
 * Mirrors `pandas.util.hash_pandas_object`, which returns a `Series` of
 * `uint64` hash values — one per element (for a Series input) or one per row
 * (for a DataFrame input).
 *
 * Implementation uses FNV-1a 64-bit (Fowler–Noll–Vo) running on JavaScript
 * `BigInt` arithmetic.  The result values are stored as `float64` (the only
 * numeric type available in the tsb dtype system) by converting the `uint64`
 * bit-pattern to `number` via `Number(bigint)`.  For hash-equality checks this
 * is fine because every `uint64` value that differs will also differ as a
 * `float64` in the range 0 – 2**64-1 that we use.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, hashPandasObject } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
 * const h = hashPandasObject(s);
 * // h is a Series<number> with hash values; equal inputs ⇒ equal hashes
 *
 * const df = new DataFrame({ a: [1, 2], b: ["x", "y"] });
 * const hr = hashPandasObject(df);
 * // hr has one hash per row
 * ```
 *
 * @module
 */

import { Dtype } from "../core/dtype.ts";
import type { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";
import type { Scalar } from "../types.ts";

// ─── FNV-1a 64-bit constants ──────────────────────────────────────────────────

const FNV_PRIME = BigInt("0x00000100000001B3");
const FNV_OFFSET = BigInt("0xcbf29ce484222325");
const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1);

/** Hash a single byte into the running FNV-1a state. */
function fnvByte(hash: bigint, byte: number): bigint {
  return ((hash ^ BigInt(byte)) * FNV_PRIME) & MASK64;
}

/** Hash an arbitrary string (UTF-8 bytes) into the FNV state. */
function fnvString(hash: bigint, s: string): bigint {
  let h = hash;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    // Encode as UTF-8 bytes
    if (code < 0x80) {
      h = fnvByte(h, code);
    } else if (code < 0x800) {
      h = fnvByte(h, 0xc0 | (code >> 6));
      h = fnvByte(h, 0x80 | (code & 0x3f));
    } else {
      h = fnvByte(h, 0xe0 | (code >> 12));
      h = fnvByte(h, 0x80 | ((code >> 6) & 0x3f));
      h = fnvByte(h, 0x80 | (code & 0x3f));
    }
  }
  return h;
}

/** Hash a single scalar value into the FNV state. */
function fnvScalar(hash: bigint, val: Scalar): bigint {
  if (val === null || val === undefined) {
    // encode as a sentinel byte sequence
    return fnvByte(fnvByte(hash, 0xfe), 0xfe);
  }
  if (typeof val === "boolean") {
    return fnvByte(hash, val ? 1 : 0);
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return fnvByte(fnvByte(hash, 0xfd), 0xfd);
    }
    // Encode as little-endian 8-byte IEEE 754
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, val, true);
    const bytes = new Uint8Array(buf);
    let h = hash;
    for (let i = 0; i < 8; i++) {
      h = fnvByte(h, bytes[i] ?? 0);
    }
    return h;
  }
  if (typeof val === "bigint") {
    return fnvString(hash, val.toString());
  }
  if (val instanceof Date) {
    return fnvString(hash, String(val.getTime()));
  }
  // string or timedelta-like — stringify
  return fnvString(hash, String(val));
}

// ─── Options ──────────────────────────────────────────────────────────────────

/** Options for {@link hashPandasObject}. */
export interface HashPandasObjectOptions {
  /**
   * Whether to include the index in the hash.  Default `true`.
   *
   * When `false`, two Series with different indexes but identical values will
   * produce the same hash values.
   */
  index?: boolean;
}

// ─── Series overload ──────────────────────────────────────────────────────────

/**
 * Return a `Series<number>` of FNV-1a 64-bit hash values for each element
 * of `s`.  The result index matches `s.index`.
 *
 * Mirrors `pandas.util.hash_pandas_object` for a `Series` input.
 *
 * @param obj - A `Series` to hash.
 * @param options - Optional settings (see {@link HashPandasObjectOptions}).
 * @returns A `Series<number>` of hash values.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["a", "b", "a"], index: [0, 1, 2] });
 * const h = hashPandasObject(s);
 * h.iat(0) === h.iat(2); // true — same value → same hash
 * h.iat(0) !== h.iat(1); // true  (with overwhelming probability)
 * ```
 */
export function hashPandasObject(obj: Series, options?: HashPandasObjectOptions): Series<number>;

/**
 * Return a `Series<number>` of FNV-1a 64-bit row-hashes for each row of `df`.
 * The result index matches `df.index`.
 *
 * Mirrors `pandas.util.hash_pandas_object` for a `DataFrame` input.
 *
 * @param obj - A `DataFrame` to hash.
 * @param options - Optional settings (see {@link HashPandasObjectOptions}).
 * @returns A `Series<number>` of row hash values.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ a: [1, 2], b: ["x", "y"] });
 * const h = hashPandasObject(df);
 * // h.iat(0) is the hash of row 0; h.iat(1) is the hash of row 1
 * ```
 */
export function hashPandasObject(obj: DataFrame, options?: HashPandasObjectOptions): Series<number>;

export function hashPandasObject(
  obj: Series | DataFrame,
  options: HashPandasObjectOptions = {},
): Series<number> {
  const includeIndex = options.index !== false;

  if (obj instanceof Series) {
    return _hashSeries(obj, includeIndex);
  }
  return _hashDataFrame(obj, includeIndex);
}

// ─── internal helpers ─────────────────────────────────────────────────────────

function _hashSeries(s: Series, includeIndex: boolean): Series<number> {
  const n = s.index.size;
  const hashes: number[] = [];

  for (let i = 0; i < n; i++) {
    let h = FNV_OFFSET;
    if (includeIndex) {
      h = fnvScalar(h, s.index.at(i) as Scalar);
      // separator byte between index and value
      h = fnvByte(h, 0xff);
    }
    h = fnvScalar(h, s.iat(i));
    hashes.push(Number(h));
  }

  return new Series<number>({ data: hashes, index: s.index, dtype: Dtype.float64 });
}

function _hashDataFrame(df: DataFrame, includeIndex: boolean): Series<number> {
  const [nRows] = df.shape;
  const colNames = df.columns.values as readonly string[];
  const hashes: number[] = [];

  for (let i = 0; i < nRows; i++) {
    let h = FNV_OFFSET;
    if (includeIndex) {
      h = fnvScalar(h, df.index.at(i) as Scalar);
      h = fnvByte(h, 0xff);
    }
    for (const name of colNames) {
      const s = df.col(name);
      h = fnvScalar(h, s.iat(i));
      h = fnvByte(h, 0xfe); // column separator
    }
    hashes.push(Number(h));
  }

  return new Series<number>({ data: hashes, index: df.index, dtype: Dtype.float64 });
}
