/**
 * hashArray — element-wise FNV-1a 64-bit hashing of an array of scalars.
 *
 * Mirrors `pandas.util.hash_array`, which accepts a 1-D array-like and returns
 * a `numpy.ndarray` of `uint64` hash values, one per element.  In tsb the
 * result is a plain `number[]` (float64 bit-pattern of the uint64).
 *
 * @example
 * ```ts
 * import { hashArray } from "tsb";
 *
 * const hashes = hashArray([1, 2, 3, null, "hello"]);
 * // hashes[0] === hashes[0]  (deterministic)
 * // hashes[0] !== hashes[1]  (with overwhelming probability)
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";

// ─── FNV-1a 64-bit constants ──────────────────────────────────────────────────

const FNV_PRIME = BigInt("0x00000100000001B3");
const FNV_OFFSET = BigInt("0xcbf29ce484222325");
const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1);

function fnvByte(hash: bigint, byte: number): bigint {
  return ((hash ^ BigInt(byte)) * FNV_PRIME) & MASK64;
}

function fnvString(hash: bigint, s: string): bigint {
  let h = hash;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
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

function fnvScalar(hash: bigint, val: Scalar): bigint {
  if (val === null || val === undefined) {
    return fnvByte(fnvByte(hash, 0xfe), 0xfe);
  }
  if (typeof val === "boolean") {
    return fnvByte(hash, val ? 1 : 0);
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return fnvByte(fnvByte(hash, 0xfd), 0xfd);
    }
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
  return fnvString(hash, String(val));
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Compute FNV-1a 64-bit hash values for each element of `arr`.
 *
 * The returned array has the same length as `arr`.  Each element is the
 * `uint64` hash encoded as a `number` (float64 bit-pattern).  Equal inputs
 * always produce equal outputs; unequal inputs produce different outputs with
 * overwhelming probability.
 *
 * Mirrors `pandas.util.hash_array(arr)` (without the `encoding` / `hash_key`
 * options, which are pandas internals not needed for typical use).
 *
 * @param arr - Array of scalar values to hash.
 * @returns Array of hash values (one per element).
 *
 * @example
 * ```ts
 * import { hashArray } from "tsb";
 *
 * const h = hashArray(["a", "b", "a"]);
 * h[0] === h[2]; // true
 * h[0] !== h[1]; // true (with overwhelming probability)
 * ```
 */
export function hashArray(arr: readonly Scalar[]): number[] {
  return arr.map((val) => Number(fnvScalar(FNV_OFFSET, val)));
}
