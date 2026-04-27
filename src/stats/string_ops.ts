/**
 * string_ops — standalone string operation functions for Series and arrays.
 *
 * Provides string transformation utilities that work on `Series<string>`,
 * `string[]`, and scalar strings. These complement the `StringAccessor`
 * class by offering module-level functions that do not require the `.str`
 * accessor pattern.
 *
 * Functions mirror pandas `str` accessor methods that are either missing from
 * the accessor or better expressed as pure standalone utilities:
 *
 * - `strNormalize`  — Unicode normalization (NFC / NFD / NFKC / NFKD)
 * - `strExtractAll` — extract ALL regex matches per element
 * - `strRemovePrefix` — remove a leading prefix
 * - `strRemoveSuffix` — remove a trailing suffix
 * - `strTranslate` — character-level substitution via a mapping
 * - `strCharWidth` — display width (accounts for CJK full-width characters)
 * - `strByteLength` — UTF-8 encoded byte length
 *
 * @module
 */

import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Unicode normalization form. */
export type NormalizeForm = "NFC" | "NFD" | "NFKC" | "NFKD";

/** Input accepted by all string-op functions. */
export type StrInput = Series<Scalar> | readonly Scalar[] | readonly string[] | string;

/** Options for {@link strExtractAll}. */
export interface ExtractAllOptions {
  /**
   * RegExp flags used when `pat` is supplied as a plain string.
   * The `g` flag is always added internally — you do not need to include it.
   * @default ""
   */
  readonly flags?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Extract a plain string from a Scalar value; returns `""` for non-strings. */
function scalarToStr(v: Scalar): string {
  if (typeof v === "string") {
    return v;
  }
  if (v === null || v === undefined) {
    return "";
  }
  return String(v);
}

/**
 * Normalise the input to a `string[]`.
 * Scalars are wrapped in a single-element array.
 */
function toStringArray(input: StrInput): string[] {
  if (typeof input === "string") {
    return [input];
  }
  if (input instanceof Series) {
    return input.values.map(scalarToStr);
  }
  return input.map(scalarToStr);
}

/**
 * Build an output `Series<Scalar>` whose index mirrors the input.
 * - `Series`  → copy the input index
 * - `string[]` → default `RangeIndex`
 * - `string`  → default `RangeIndex` of length 1
 */
function buildSeries(data: Scalar[], input: StrInput): Series<Scalar> {
  if (input instanceof Series) {
    return new Series({ data, index: input.index });
  }
  return new Series({ data });
}

// ─── strNormalize ─────────────────────────────────────────────────────────────

/**
 * Apply Unicode normalization to every element.
 *
 * Mirrors `pandas.Series.str.normalize(form)`.
 *
 * @param input - Input data (Series, string array, or scalar string).
 * @param form  - One of `"NFC"` (default), `"NFD"`, `"NFKC"`, or `"NFKD"`.
 * @returns A new `Series<Scalar>` (or scalar string) with normalised values.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["\u00e9", "caf\u0065\u0301"] });
 * strNormalize(s, "NFC");
 * // Series ["é", "café"]  (both now NFC)
 * ```
 */
export function strNormalize(input: string, form?: NormalizeForm): string;
export function strNormalize(
  input: readonly string[] | Series<Scalar>,
  form?: NormalizeForm,
): Series<Scalar>;
export function strNormalize(
  input: StrInput,
  form: NormalizeForm = "NFC",
): Series<Scalar> | string {
  if (typeof input === "string") {
    return input.normalize(form);
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map((s) => s.normalize(form));
  return buildSeries(data, input);
}

// ─── strExtractAll ────────────────────────────────────────────────────────────

/**
 * Extract ALL non-overlapping regex matches from every element.
 *
 * Each element maps to an array of match arrays (one inner array per match;
 * each inner array contains the full match and any capture groups).
 *
 * Mirrors `pandas.Series.str.extractall(pat)`, but returns a
 * `Series<Scalar[][]>` rather than a multi-indexed DataFrame to avoid
 * the overhead of MultiIndex construction.
 *
 * @param input   - Series or string array.
 * @param pat     - Regular expression (string or `RegExp`).
 * @param options - Optional flags when `pat` is a string.
 * @returns A `Series` whose values are `string[][]` (an array of match arrays).
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["abc 123", "foo 456 bar 789"] });
 * strExtractAll(s, /(\d+)/);
 * // Series [
 * //   [["123", "123"]],
 * //   [["456", "456"], ["789", "789"]],
 * // ]
 * ```
 */
export function strExtractAll(
  input: readonly string[] | Series<Scalar>,
  pat: string | RegExp,
  options: ExtractAllOptions = {},
): Series<Scalar> {
  const strs = toStringArray(input);
  const flags =
    pat instanceof RegExp
      ? pat.flags.includes("g")
        ? pat.flags
        : `${pat.flags}g`
      : `${options.flags ?? ""}g`;
  const source = pat instanceof RegExp ? pat.source : pat;
  const re = new RegExp(source, flags);

  const data: Scalar[] = strs.map((s) => {
    const matches: string[][] = [];
    re.lastIndex = 0;
    for (;;) {
      const m = re.exec(s);
      if (m === null) {
        break;
      }
      matches.push([...m]);
      if (!re.global) {
        break;
      }
    }
    // Store as JSON string so it fits in Scalar; consumers can JSON.parse
    return JSON.stringify(matches);
  });

  return buildSeries(data, input);
}

// ─── strRemovePrefix ──────────────────────────────────────────────────────────

/**
 * Remove a leading prefix from each element (only if the element starts with it).
 *
 * Mirrors Python 3.9+ `str.removeprefix()` and can be used as a pandas
 * equivalent via `df["col"].str.removeprefix(prefix)`.
 *
 * @param input  - Series, string array, or scalar string.
 * @param prefix - Prefix to remove.
 * @returns A new Series (or scalar string) with the prefix stripped where present.
 *
 * @example
 * ```ts
 * strRemovePrefix(["prefix_a", "prefix_b", "other"], "prefix_");
 * // Series ["a", "b", "other"]
 * ```
 */
export function strRemovePrefix(input: string, prefix: string): string;
export function strRemovePrefix(
  input: readonly string[] | Series<Scalar>,
  prefix: string,
): Series<Scalar>;
export function strRemovePrefix(input: StrInput, prefix: string): Series<Scalar> | string {
  if (typeof input === "string") {
    return input.startsWith(prefix) ? input.slice(prefix.length) : input;
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map((s) => (s.startsWith(prefix) ? s.slice(prefix.length) : s));
  return buildSeries(data, input);
}

// ─── strRemoveSuffix ──────────────────────────────────────────────────────────

/**
 * Remove a trailing suffix from each element (only if the element ends with it).
 *
 * Mirrors Python 3.9+ `str.removesuffix()`.
 *
 * @param input  - Series, string array, or scalar string.
 * @param suffix - Suffix to remove.
 * @returns A new Series (or scalar string) with the suffix stripped where present.
 *
 * @example
 * ```ts
 * strRemoveSuffix(["hello_suffix", "world_suffix", "test"], "_suffix");
 * // Series ["hello", "world", "test"]
 * ```
 */
export function strRemoveSuffix(input: string, suffix: string): string;
export function strRemoveSuffix(
  input: readonly string[] | Series<Scalar>,
  suffix: string,
): Series<Scalar>;
export function strRemoveSuffix(input: StrInput, suffix: string): Series<Scalar> | string {
  if (typeof input === "string") {
    return input.endsWith(suffix) ? input.slice(0, input.length - suffix.length) : input;
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map((s) =>
    s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s,
  );
  return buildSeries(data, input);
}

// ─── strTranslate ─────────────────────────────────────────────────────────────

/**
 * Translate characters in each element according to a mapping.
 *
 * Works like Python's `str.translate(table)`, where a `Map<string, string | null>`
 * maps single characters to their replacements (`null` means delete).
 *
 * @param input - Series, string array, or scalar string.
 * @param table - Map from single source characters to replacement strings or
 *   `null` (to delete the character).
 * @returns A new Series (or scalar string) with characters replaced.
 *
 * @example
 * ```ts
 * const t = new Map([["a", "A"], ["e", null]]);
 * strTranslate(["cafe", "bale"], t);
 * // Series ["cAf", "bAl"]
 * ```
 */
export function strTranslate(input: string, table: ReadonlyMap<string, string | null>): string;
export function strTranslate(
  input: readonly string[] | Series<Scalar>,
  table: ReadonlyMap<string, string | null>,
): Series<Scalar>;
export function strTranslate(
  input: StrInput,
  table: ReadonlyMap<string, string | null>,
): Series<Scalar> | string {
  const translate = (s: string): string => {
    let result = "";
    for (const ch of s) {
      if (table.has(ch)) {
        const repl = table.get(ch);
        if (repl !== null && repl !== undefined) {
          result += repl;
        }
        // null → delete: skip
      } else {
        result += ch;
      }
    }
    return result;
  };

  if (typeof input === "string") {
    return translate(input);
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map(translate);
  return buildSeries(data, input);
}

// ─── strCharWidth ─────────────────────────────────────────────────────────────

/**
 * Compute the *display width* of each element, counting CJK (Chinese/Japanese/
 * Korean) and other full-width characters as 2 columns.
 *
 * This is useful when formatting text tables that mix ASCII and East-Asian
 * scripts.
 *
 * @param input - Series, string array, or scalar string.
 * @returns A new `Series<Scalar>` of numbers (or a number for scalar input).
 *
 * @example
 * ```ts
 * strCharWidth("hello");    // 5
 * strCharWidth("こんにちは");  // 10
 * ```
 */
export function strCharWidth(input: string): number;
export function strCharWidth(input: readonly string[] | Series<Scalar>): Series<Scalar>;
export function strCharWidth(input: StrInput): Series<Scalar> | number {
  const width = (s: string): number => {
    let w = 0;
    for (const ch of s) {
      const cp = ch.codePointAt(0) ?? 0;
      // Full-width and CJK ranges (simplified but covers the common cases)
      if (
        (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
        (cp >= 0x2e80 && cp <= 0x303e) || // CJK Radicals, Kangxi
        (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana, Katakana, CJK
        (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
        (cp >= 0x4e00 && cp <= 0xa4c6) || // CJK Unified + Yi
        (cp >= 0xa960 && cp <= 0xa97c) || // Hangul Jamo Extended-A
        (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
        (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility
        (cp >= 0xfe10 && cp <= 0xfe19) || // Vertical forms
        (cp >= 0xfe30 && cp <= 0xfe6b) || // CJK Compatibility Forms
        (cp >= 0xff01 && cp <= 0xff60) || // Halfwidth/Fullwidth
        (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth Signs
        (cp >= 0x1b000 && cp <= 0x1b001) || // Kana Supplement
        (cp >= 0x1f004 && cp <= 0x1f004) || // Mahjong tile
        (cp >= 0x1f0cf && cp <= 0x1f0cf) || // Playing card
        (cp >= 0x1f200 && cp <= 0x1f251) || // Enclosed CJK
        (cp >= 0x20000 && cp <= 0x2fffd) || // CJK Extension B–F
        (cp >= 0x30000 && cp <= 0x3fffd) // CJK Extension G
      ) {
        w += 2;
      } else {
        w += 1;
      }
    }
    return w;
  };

  if (typeof input === "string") {
    return width(input);
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map((s) => width(s));
  return buildSeries(data, input);
}

// ─── strByteLength ────────────────────────────────────────────────────────────

/**
 * Compute the UTF-8 encoded byte length of each element.
 *
 * Useful when working with byte-limited APIs (HTTP headers, database columns)
 * where the character count alone is insufficient.
 *
 * @param input - Series, string array, or scalar string.
 * @returns A new `Series<Scalar>` of numbers (or a number for scalar input).
 *
 * @example
 * ```ts
 * strByteLength("hello");    // 5
 * strByteLength("こんにちは");  // 15   (3 bytes per character)
 * ```
 */
export function strByteLength(input: string): number;
export function strByteLength(input: readonly string[] | Series<Scalar>): Series<Scalar>;
export function strByteLength(input: StrInput): Series<Scalar> | number {
  const byteLen = (s: string): number => new TextEncoder().encode(s).length;

  if (typeof input === "string") {
    return byteLen(input);
  }
  const strs = toStringArray(input);
  const data: Scalar[] = strs.map((s) => byteLen(s));
  return buildSeries(data, input);
}
