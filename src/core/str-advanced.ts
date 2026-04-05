/**
 * Advanced string operations — extends the basic StringAccessor with
 * pandas-parity methods: extractAll, findAll, wrap, zfill, normalize,
 * encode/decode helpers, center, ljust, rjust, and more.
 *
 * These are standalone functions (not methods on StringAccessor) to keep
 * each file focused and avoid touching the existing strings.ts.
 */

import type { Scalar } from "../types.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True if value is a non-null, non-undefined string. */
function isStr(v: Scalar): v is string {
  return typeof v === "string";
}

/** Apply a string→string transform, keeping null for missing/non-string. */
function mapStr(s: Series<Scalar>, fn: (v: string) => Scalar): Series<Scalar> {
  const out: Scalar[] = [];
  for (const v of s.values) {
    out.push(isStr(v) ? fn(v) : null);
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── padding ──────────────────────────────────────────────────────────────────

/**
 * Zero-pad string values on the left to reach `width`.
 *
 * @example
 * ```ts
 * strZfill(s, 5); // "42" → "00042"
 * ```
 */
export function strZfill(s: Series<Scalar>, width: number): Series<Scalar> {
  return mapStr(s, (v) => v.padStart(width, "0"));
}

/**
 * Left-justify strings in a field of `width`, padded with `fillchar`.
 *
 * @example
 * ```ts
 * strLjust(s, 10); // "hi" → "hi        "
 * ```
 */
export function strLjust(s: Series<Scalar>, width: number, fillchar = " "): Series<Scalar> {
  return mapStr(s, (v) => v.padEnd(width, fillchar));
}

/**
 * Right-justify strings in a field of `width`, padded with `fillchar`.
 *
 * @example
 * ```ts
 * strRjust(s, 10); // "hi" → "        hi"
 * ```
 */
export function strRjust(s: Series<Scalar>, width: number, fillchar = " "): Series<Scalar> {
  return mapStr(s, (v) => v.padStart(width, fillchar));
}

/**
 * Center strings in a field of `width`, padded with `fillchar`.
 *
 * @example
 * ```ts
 * strCenter(s, 10); // "hi" → "    hi    "
 * ```
 */
export function strCenter(s: Series<Scalar>, width: number, fillchar = " "): Series<Scalar> {
  return mapStr(s, (v) => {
    const total = Math.max(0, width - v.length);
    const left = Math.floor(total / 2);
    const right = total - left;
    return fillchar.repeat(left) + v + fillchar.repeat(right);
  });
}

// ─── wrap ─────────────────────────────────────────────────────────────────────

/** Split a string into lines of at most `width` characters. */
function wrapLine(text: string, width: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.join("\n");
}

/**
 * Wrap long strings at `width` characters, joining with newlines.
 *
 * @example
 * ```ts
 * strWrap(s, 20);
 * ```
 */
export function strWrap(s: Series<Scalar>, width: number): Series<Scalar> {
  return mapStr(s, (v) => wrapLine(v, width));
}

// ─── extract / findall ────────────────────────────────────────────────────────

/**
 * Extract first match of `pattern` from each element.
 * Returns `null` where no match is found.
 *
 * @example
 * ```ts
 * strExtract(s, /(\d+)/); // extracts first digit run
 * ```
 */
export function strExtract(s: Series<Scalar>, pattern: RegExp): Series<Scalar> {
  return mapStr(s, (v) => {
    const m = v.match(pattern);
    return m !== null ? (m[1] ?? m[0] ?? null) : null;
  });
}

/**
 * Find all non-overlapping matches of `pattern` in each element.
 * Returns an array of matches per element (or `null` for non-strings).
 *
 * @example
 * ```ts
 * strFindall(s, /\d+/g); // [["1","2"], ["3"]]
 * ```
 */
export function strFindall(s: Series<Scalar>, pattern: RegExp): Series<Scalar> {
  return mapStr(s, (v) => {
    const matches = [...v.matchAll(pattern)].map((m) => m[0]);
    return matches as unknown as Scalar;
  });
}

// ─── normalize / encode ───────────────────────────────────────────────────────

/** Unicode normalization forms. */
export type NormalizeForm = "NFC" | "NFD" | "NFKC" | "NFKD";

/**
 * Unicode-normalize string values.
 *
 * @example
 * ```ts
 * strNormalize(s, "NFC");
 * ```
 */
export function strNormalize(s: Series<Scalar>, form: NormalizeForm = "NFC"): Series<Scalar> {
  return mapStr(s, (v) => v.normalize(form));
}

// ─── title case ───────────────────────────────────────────────────────────────

const WORD_RE = /\b\w/g;

/**
 * Convert strings to title-case (first letter of each word uppercase).
 *
 * @example
 * ```ts
 * strTitle(s); // "hello world" → "Hello World"
 * ```
 */
export function strTitle(s: Series<Scalar>): Series<Scalar> {
  return mapStr(s, (v) => v.toLowerCase().replace(WORD_RE, (c) => c.toUpperCase()));
}

// ─── repeat ───────────────────────────────────────────────────────────────────

/**
 * Repeat each string `n` times.
 *
 * @example
 * ```ts
 * strRepeat(s, 3); // "ab" → "ababab"
 * ```
 */
export function strRepeat(s: Series<Scalar>, n: number): Series<Scalar> {
  return mapStr(s, (v) => v.repeat(n));
}

// ─── count (with pattern) ─────────────────────────────────────────────────────

/**
 * Count non-overlapping occurrences of `pattern` in each element.
 *
 * @example
 * ```ts
 * strCountPattern(s, /\d/g); // "a1b2" → 2
 * ```
 */
export function strCountPattern(s: Series<Scalar>, pattern: RegExp): Series<Scalar> {
  return mapStr(s, (v) => {
    const matches = v.match(pattern);
    return matches !== null ? matches.length : 0;
  });
}

// ─── removeprefix / removesuffix ──────────────────────────────────────────────

/**
 * Remove a prefix from each string element (if it starts with it).
 *
 * @example
 * ```ts
 * strRemovePrefix(s, "pre_"); // "pre_foo" → "foo"
 * ```
 */
export function strRemovePrefix(s: Series<Scalar>, prefix: string): Series<Scalar> {
  return mapStr(s, (v) => (v.startsWith(prefix) ? v.slice(prefix.length) : v));
}

/**
 * Remove a suffix from each string element (if it ends with it).
 *
 * @example
 * ```ts
 * strRemoveSuffix(s, "_end"); // "foo_end" → "foo"
 * ```
 */
export function strRemoveSuffix(s: Series<Scalar>, suffix: string): Series<Scalar> {
  return mapStr(s, (v) => (v.endsWith(suffix) ? v.slice(0, -suffix.length) : v));
}
