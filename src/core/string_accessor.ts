/**
 * StringAccessor — the `Series.str` accessor, mirroring `pandas.core.strings.StringMethods`.
 *
 * Access via `series.str` on a `Series<string>` (or mixed Series containing strings).
 * Every method returns a new `Series` — the original is never mutated.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["hello", "WORLD", "  foo  "] });
 * s.str.upper().toArray();  // ["HELLO", "WORLD", "  FOO  "]
 * s.str.strip().toArray();  // ["hello", "WORLD", "foo"]
 * s.str.len().toArray();    // [5, 5, 7]
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";

// ─── top-level regex constants ────────────────────────────────────────────────
const RE_WORD_START = /\b\w/g;
const RE_WORD_REST = /\B\w/g;
const RE_ALPHA = /^\p{L}+$/u;
const RE_DIGIT = /^\d+$/;
const RE_ALNUM = /^[\p{L}\d]+$/u;
const RE_SPACE = /^\s+$/;
const RE_ESCAPE_CHARS = /[\\^$.*+?()[\]{}|]/g;

// ─── forward-declared Series type (avoids circular import) ────────────────────

/**
 * Minimal interface for the Series type needed by StringAccessor.
 * The real Series<T> class satisfies this interface.
 */
export interface StringSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  readonly str: StringAccessor;
  withValues(data: readonly Scalar[], name?: string | null): StringSeriesLike;
  toArray(): readonly Scalar[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Cast a scalar to string, returning null for missing values. */
function toStr(v: Scalar): string | null {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return null;
  }
  return String(v);
}

/** Apply a string → string transformation, preserving null/NaN. */
function mapStr(series: StringSeriesLike, fn: (s: string) => Scalar): StringSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const s = toStr(v);
    return s === null ? null : fn(s);
  });
  return series.withValues(result);
}

/** Apply a string → boolean transformation, preserving null as null. */
function mapBool(series: StringSeriesLike, fn: (s: string) => boolean): StringSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const s = toStr(v);
    return s === null ? null : fn(s);
  });
  return series.withValues(result);
}

/** Apply a string → number transformation, preserving null as null. */
function mapNum(series: StringSeriesLike, fn: (s: string) => number): StringSeriesLike {
  const result: Scalar[] = series.values.map((v) => {
    const s = toStr(v);
    return s === null ? null : fn(s);
  });
  return series.withValues(result);
}

// ─── StringAccessor ───────────────────────────────────────────────────────────

/**
 * Vectorised string operations for a Series.
 *
 * Returned from `Series.str`.  All operations work element-wise and propagate
 * `null` / `NaN` / `undefined` through unchanged (pandas behaviour).
 */
export class StringAccessor {
  readonly #series: StringSeriesLike;

  constructor(series: StringSeriesLike) {
    this.#series = series;
  }

  // ─── case ────────────────────────────────────────────────────────────────

  /** Convert strings to lowercase. */
  lower(): StringSeriesLike {
    return mapStr(this.#series, (s) => s.toLowerCase());
  }

  /** Convert strings to uppercase. */
  upper(): StringSeriesLike {
    return mapStr(this.#series, (s) => s.toUpperCase());
  }

  /**
   * Convert strings to title case (first letter of each word capitalised).
   */
  title(): StringSeriesLike {
    return mapStr(this.#series, (s) =>
      s
        .replace(RE_WORD_START, (c) => c.toUpperCase())
        .replace(RE_WORD_REST, (c) => c.toLowerCase()),
    );
  }

  /** Capitalise the first character and lower-case the rest. */
  capitalize(): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      if (s.length === 0) {
        return s;
      }
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });
  }

  /** Swap case of each character. */
  swapcase(): StringSeriesLike {
    return mapStr(this.#series, (s) =>
      s
        .split("")
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join(""),
    );
  }

  // ─── length ──────────────────────────────────────────────────────────────

  /** Return length of each string element. */
  len(): StringSeriesLike {
    return mapNum(this.#series, (s) => s.length);
  }

  // ─── strip / pad ─────────────────────────────────────────────────────────

  /** Strip leading and trailing whitespace (or a given set of characters). */
  strip(chars?: string): StringSeriesLike {
    return mapStr(this.#series, (s) => stripChars(s, chars, true, true));
  }

  /** Strip leading whitespace (or a given set of characters). */
  lstrip(chars?: string): StringSeriesLike {
    return mapStr(this.#series, (s) => stripChars(s, chars, true, false));
  }

  /** Strip trailing whitespace (or a given set of characters). */
  rstrip(chars?: string): StringSeriesLike {
    return mapStr(this.#series, (s) => stripChars(s, chars, false, true));
  }

  /**
   * Pad strings to a minimum width.
   *
   * @param width  Minimum string width.
   * @param side   Which side to pad — `"left"` (default), `"right"`, or `"both"`.
   * @param fillchar  Character to use for padding (default `" "`).
   */
  pad(width: number, side: "left" | "right" | "both" = "left", fillchar = " "): StringSeriesLike {
    if (fillchar.length !== 1) {
      throw new TypeError("fillchar must be a single character");
    }
    return mapStr(this.#series, (s) => padString(s, width, side, fillchar));
  }

  /** Left-justify strings, padding the right with `fillchar` (default `" "`). */
  ljust(width: number, fillchar = " "): StringSeriesLike {
    return this.pad(width, "right", fillchar);
  }

  /** Right-justify strings, padding the left with `fillchar` (default `" "`). */
  rjust(width: number, fillchar = " "): StringSeriesLike {
    return this.pad(width, "left", fillchar);
  }

  /** Centre strings, padding both sides with `fillchar` (default `" "`). */
  center(width: number, fillchar = " "): StringSeriesLike {
    return this.pad(width, "both", fillchar);
  }

  /** Pad numeric strings with leading zeros to the given width. */
  zfill(width: number): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      if (s.startsWith("-") || s.startsWith("+")) {
        return s[0] + s.slice(1).padStart(width - 1, "0");
      }
      return s.padStart(width, "0");
    });
  }

  // ─── search / match ──────────────────────────────────────────────────────

  /**
   * Test if each element contains a pattern (substring or regex).
   *
   * @param pat    Pattern string or `RegExp`.
   * @param regex  When `true` (default), treat `pat` as a regex; otherwise literal substring match.
   * @param flags  Regex flags string (only used when `regex` is `true`).
   */
  contains(pat: string | RegExp, regex = true, flags = ""): StringSeriesLike {
    const re = buildContainsRegex(pat, regex, flags);
    return mapBool(this.#series, (s) => {
      if (re !== null) {
        return re.test(s);
      }
      return s.includes(pat as string);
    });
  }

  /** Test if each element starts with `pat`. */
  startswith(pat: string): StringSeriesLike {
    return mapBool(this.#series, (s) => s.startsWith(pat));
  }

  /** Test if each element ends with `pat`. */
  endswith(pat: string): StringSeriesLike {
    return mapBool(this.#series, (s) => s.endsWith(pat));
  }

  /**
   * Test if each element matches a regex at the start of the string
   * (anchored `^`).  Returns `true` / `false` (not null even on no-match).
   */
  match(pat: string | RegExp, flags = ""): StringSeriesLike {
    const re = pat instanceof RegExp ? pat : new RegExp(pat, flags);
    const anchored = new RegExp(`^(?:${re.source})`, re.flags || flags);
    return mapBool(this.#series, (s) => anchored.test(s));
  }

  /**
   * Test if each element matches a regex across the full string
   * (anchored `^…$`).
   */
  fullmatch(pat: string | RegExp, flags = ""): StringSeriesLike {
    const re = pat instanceof RegExp ? pat : new RegExp(pat, flags);
    const full = new RegExp(`^(?:${re.source})$`, re.flags || flags);
    return mapBool(this.#series, (s) => full.test(s));
  }

  // ─── find / count ────────────────────────────────────────────────────────

  /**
   * Return the lowest index in the string where `sub` is found, or `-1`.
   * Optionally restrict to `[start, end)`.
   */
  find(sub: string, start?: number, end?: number): StringSeriesLike {
    return mapNum(this.#series, (s) => {
      const slice = s.slice(start, end);
      const idx = slice.indexOf(sub);
      return idx === -1 ? -1 : idx + (start ?? 0);
    });
  }

  /**
   * Return the highest index in the string where `sub` is found, or `-1`.
   */
  rfind(sub: string, start?: number, end?: number): StringSeriesLike {
    return mapNum(this.#series, (s) => {
      const slice = s.slice(start, end);
      const idx = slice.lastIndexOf(sub);
      return idx === -1 ? -1 : idx + (start ?? 0);
    });
  }

  /**
   * Count occurrences of `pat` (substring or regex) in each element.
   */
  count(pat: string | RegExp, flags = ""): StringSeriesLike {
    const re =
      pat instanceof RegExp
        ? new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : `${pat.flags}g`)
        : new RegExp(escapeRegex(pat), `g${flags}`);
    return mapNum(this.#series, (s) => {
      re.lastIndex = 0;
      let n = 0;
      while (re.exec(s) !== null) {
        n++;
      }
      return n;
    });
  }

  // ─── replace / extract ───────────────────────────────────────────────────

  /**
   * Replace occurrences of `pat` with `repl`.
   *
   * @param pat    Pattern string or `RegExp`.
   * @param repl   Replacement string (supports `$1` capture-group references).
   * @param n      Max replacements; `-1` (default) means replace all.
   * @param regex  When `true` (default), treat `pat` as regex; otherwise literal.
   * @param flags  Regex flags (used when `regex` is `true` and `pat` is a string).
   */
  replace(pat: string | RegExp, repl: string, n = -1, regex = true, flags = ""): StringSeriesLike {
    return mapStr(this.#series, (s) => doReplace(s, pat, repl, n, regex, flags));
  }

  /**
   * Extract groups from the first match of a regex.
   *
   * Returns a Series of strings (first capture group) or `null` on no match.
   * For multiple capture groups the result is a comma-separated string of
   * group values (a full DataFrame extraction API is out of scope here).
   */
  extract(pat: string | RegExp, flags = ""): StringSeriesLike {
    const re = pat instanceof RegExp ? pat : new RegExp(pat, flags);
    return mapStr(this.#series, (s) => {
      const m = re.exec(s);
      if (m === null) {
        return null;
      }
      const groups = m.slice(1);
      return groups.length === 1 ? (groups[0] ?? null) : groups.join(",");
    });
  }

  // ─── split / join / cat ──────────────────────────────────────────────────

  /**
   * Split strings around a delimiter.
   *
   * Returns a Series where each element is the `n`-th split segment (0-based),
   * or the full array as a JSON string if `n` is omitted.
   *
   * @param pat  Separator string (default `" "`).
   * @param n    If provided, return only this split segment index.
   * @param maxsplit  Maximum number of splits (default: unlimited).
   */
  split(pat = " ", n?: number, maxsplit?: number): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      const parts = splitString(s, pat, maxsplit);
      return n === undefined ? JSON.stringify(parts) : (parts[n] ?? null);
    });
  }

  /**
   * Split strings around a delimiter from the right.
   *
   * @param pat  Separator string (default `" "`).
   * @param n    If provided, return only this split segment index (from right).
   * @param maxsplit  Maximum number of splits (default: unlimited).
   */
  rsplit(pat = " ", n?: number, maxsplit?: number): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      const parts = rsplitString(s, pat, maxsplit);
      return n === undefined ? JSON.stringify(parts) : (parts[n] ?? null);
    });
  }

  /**
   * Join lists stored as JSON strings in the Series elements with `sep`.
   *
   * Use after `split()` without an `n` argument.
   */
  join(sep: string): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      try {
        const arr = JSON.parse(s) as unknown;
        if (!Array.isArray(arr)) {
          return s;
        }
        return (arr as Scalar[]).map(String).join(sep);
      } catch {
        return s;
      }
    });
  }

  /**
   * Concatenate strings element-wise, optionally with a separator.
   *
   * @param others  An array of arrays (one per position) to concatenate.
   * @param sep     Separator inserted between each element (default `""`).
   * @param naRep   String used in place of missing values (default `""`).
   */
  cat(others: readonly (readonly Scalar[])[], sep = "", naRep = ""): StringSeriesLike {
    const vals = this.#series.values;
    const result: Scalar[] = vals.map((v, i) => {
      const parts: string[] = [toStr(v) ?? naRep];
      for (const other of others) {
        parts.push(toStr(other[i] ?? null) ?? naRep);
      }
      return parts.join(sep);
    });
    return this.#series.withValues(result);
  }

  // ─── slice ───────────────────────────────────────────────────────────────

  /**
   * Slice substrings from each element using Python-style slice notation.
   *
   * @param start  Start index (inclusive, default `0`).
   * @param stop   Stop index (exclusive, default: end of string).
   * @param step   Step (default `1`; negative values not supported).
   */
  slice(start?: number, stop?: number, step?: number): StringSeriesLike {
    return mapStr(this.#series, (s) => sliceString(s, start, stop, step));
  }

  /**
   * Return the character at position `i` (supports negative indexing).
   * Returns `null` if the position is out of bounds.
   */
  get(i: number): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      const idx = i < 0 ? s.length + i : i;
      return idx >= 0 && idx < s.length ? s.charAt(idx) : null;
    });
  }

  /**
   * Replace a slice of each string with `repl`.
   *
   * @param start   Start index (inclusive, default `0`).
   * @param stop    Stop index (exclusive, default: end of string).
   * @param repl    Replacement string (default `""`).
   */
  sliceReplace(start?: number, stop?: number, repl = ""): StringSeriesLike {
    return mapStr(this.#series, (s) => {
      const st = normaliseIndex(start ?? 0, s.length);
      const en = stop === undefined ? s.length : normaliseIndex(stop, s.length);
      return s.slice(0, st) + repl + s.slice(en);
    });
  }

  // ─── repeat / wrap ───────────────────────────────────────────────────────

  /**
   * Repeat each string element by `repeats` times.
   */
  repeat(repeats: number): StringSeriesLike {
    return mapStr(this.#series, (s) => s.repeat(repeats));
  }

  /**
   * Wrap long strings at `width` characters, inserting newlines.
   */
  wrap(width: number): StringSeriesLike {
    return mapStr(this.#series, (s) => wrapString(s, width));
  }

  // ─── encode / decode (stub) ──────────────────────────────────────────────

  /**
   * Encode each element to a UTF-8 `Uint8Array`, returned as a JSON byte array.
   * (Full binary Series type is out of scope; this returns a stringified form.)
   */
  encode(): StringSeriesLike {
    return mapStr(this.#series, (s) => JSON.stringify(Array.from(new TextEncoder().encode(s))));
  }

  // ─── predicate helpers ───────────────────────────────────────────────────

  /** Test if all characters in the string are alphabetic. */
  isalpha(): StringSeriesLike {
    return mapBool(this.#series, (s) => s.length > 0 && RE_ALPHA.test(s));
  }

  /** Test if all characters are digits (0–9). */
  isdigit(): StringSeriesLike {
    return mapBool(this.#series, (s) => s.length > 0 && RE_DIGIT.test(s));
  }

  /** Test if all characters are alphanumeric. */
  isalnum(): StringSeriesLike {
    return mapBool(this.#series, (s) => s.length > 0 && RE_ALNUM.test(s));
  }

  /** Test if the string is numeric (includes decimals). */
  isnumeric(): StringSeriesLike {
    return mapBool(this.#series, (s) => s.length > 0 && RE_DIGIT.test(s));
  }

  /** Test if all characters are lowercase. */
  islower(): StringSeriesLike {
    return mapBool(
      this.#series,
      (s) => s.length > 0 && s === s.toLowerCase() && s !== s.toUpperCase(),
    );
  }

  /** Test if all characters are uppercase. */
  isupper(): StringSeriesLike {
    return mapBool(
      this.#series,
      (s) => s.length > 0 && s === s.toUpperCase() && s !== s.toLowerCase(),
    );
  }

  /** Test if the string looks like a title (first char of each word is uppercase). */
  istitle(): StringSeriesLike {
    return mapBool(this.#series, (s) => {
      if (s.length === 0) {
        return false;
      }
      const titled = s
        .replace(RE_WORD_START, (c) => c.toUpperCase())
        .replace(RE_WORD_REST, (c) => c.toLowerCase());
      return s === titled;
    });
  }

  /** Test if all characters are whitespace. */
  isspace(): StringSeriesLike {
    return mapBool(this.#series, (s) => s.length > 0 && RE_SPACE.test(s));
  }
}

// ─── private helpers ─────────────────────────────────────────────────────────

/** Build the regex for contains(), or null for literal substring match. */
function buildContainsRegex(pat: string | RegExp, regex: boolean, flags: string): RegExp | null {
  if (pat instanceof RegExp) {
    return pat;
  }
  if (regex) {
    return new RegExp(pat, flags);
  }
  return null;
}

/** Strip leading/trailing characters from a string. */
function stripChars(s: string, chars: string | undefined, left: boolean, right: boolean): string {
  if (chars === undefined || chars === null) {
    return stripWhitespace(s, left, right);
  }
  return stripCharSet(s, new Set(chars.split("")), left, right);
}

/** Strip whitespace from one or both ends. */
function stripWhitespace(s: string, left: boolean, right: boolean): string {
  if (left && right) {
    return s.trim();
  }
  if (left) {
    return s.trimStart();
  }
  return s.trimEnd();
}

/** Strip characters in `set` from one or both ends. */
function stripCharSet(s: string, set: Set<string>, left: boolean, right: boolean): string {
  let start = 0;
  let end = s.length;
  if (left) {
    while (start < end && set.has(s[start] ?? "")) {
      start++;
    }
  }
  if (right) {
    while (end > start && set.has(s[end - 1] ?? "")) {
      end--;
    }
  }
  return s.slice(start, end);
}

/** Pad a string to the given width. */
function padString(
  s: string,
  width: number,
  side: "left" | "right" | "both",
  fillchar: string,
): string {
  const needed = width - s.length;
  if (needed <= 0) {
    return s;
  }
  if (side === "left") {
    return fillchar.repeat(needed) + s;
  }
  if (side === "right") {
    return s + fillchar.repeat(needed);
  }
  const lpad = Math.floor(needed / 2);
  const rpad = needed - lpad;
  return fillchar.repeat(lpad) + s + fillchar.repeat(rpad);
}

/** Escape special regex characters. */
function escapeRegex(s: string): string {
  return s.replace(RE_ESCAPE_CHARS, "\\$&");
}

/** Replace all occurrences of pat in s. */
function replaceAll(
  s: string,
  pat: string | RegExp,
  repl: string,
  regex: boolean,
  flags: string,
): string {
  if (pat instanceof RegExp) {
    const re = pat.flags.includes("g") ? pat : new RegExp(pat.source, `${pat.flags}g`);
    return s.replace(re, repl);
  }
  if (!regex) {
    return s.split(pat).join(repl);
  }
  return s.replace(new RegExp(pat, `g${flags}`), repl);
}

/** Replace n occurrences of pat in s (n >= 1). */
function replaceN(
  s: string,
  pat: string | RegExp,
  repl: string,
  n: number,
  regex: boolean,
  flags: string,
): string {
  let result = s;
  let count = 0;
  const re = buildReplaceRegex(pat, regex, flags);
  while (count < n) {
    const replaced = re !== null ? result.replace(re, repl) : result.replace(pat as string, repl);
    if (replaced === result) {
      break;
    }
    result = replaced;
    count++;
  }
  return result;
}

/** Build regex for replaceN, or null for literal string replace. */
function buildReplaceRegex(pat: string | RegExp, regex: boolean, flags: string): RegExp | null {
  if (pat instanceof RegExp) {
    return pat;
  }
  if (regex) {
    return new RegExp(pat, flags);
  }
  return null;
}

/** Replace occurrences of `pat` in `s`. */
function doReplace(
  s: string,
  pat: string | RegExp,
  repl: string,
  n: number,
  regex: boolean,
  flags: string,
): string {
  if (n === -1 || n === undefined) {
    return replaceAll(s, pat, repl, regex, flags);
  }
  return replaceN(s, pat, repl, n, regex, flags);
}

/** Split a string with optional maxsplit. */
function splitString(s: string, sep: string, maxsplit?: number): string[] {
  if (maxsplit === undefined) {
    return s.split(sep);
  }
  const result: string[] = [];
  let remaining = s;
  let splits = 0;
  while (splits < maxsplit) {
    const idx = remaining.indexOf(sep);
    if (idx === -1) {
      break;
    }
    result.push(remaining.slice(0, idx));
    remaining = remaining.slice(idx + sep.length);
    splits++;
  }
  result.push(remaining);
  return result;
}

/** Split from the right with optional maxsplit. */
function rsplitString(s: string, sep: string, maxsplit?: number): string[] {
  if (maxsplit === undefined) {
    return s.split(sep);
  }
  const result: string[] = [];
  let remaining = s;
  let splits = 0;
  while (splits < maxsplit) {
    const idx = remaining.lastIndexOf(sep);
    if (idx === -1) {
      break;
    }
    result.unshift(remaining.slice(idx + sep.length));
    remaining = remaining.slice(0, idx);
    splits++;
  }
  result.unshift(remaining);
  return result;
}

/** Python-style slice a string. */
function sliceString(s: string, start?: number, stop?: number, step?: number): string {
  const st = step ?? 1;
  if (st === 1) {
    return s.slice(start, stop);
  }
  const chars = s.split("");
  const len = chars.length;
  const from = normaliseIndex(start ?? 0, len);
  const to = stop === undefined ? len : normaliseIndex(stop, len);
  const out: string[] = [];
  for (let i = from; i < to; i += st) {
    out.push(chars[i] ?? "");
  }
  return out.join("");
}

/** Normalise a possibly-negative index. */
function normaliseIndex(i: number, len: number): number {
  const idx = i < 0 ? len + i : i;
  return Math.max(0, Math.min(idx, len));
}

/** Word-wrap a string at `width` characters. */
function wrapString(s: string, width: number): string {
  const words = s.split(" ");
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
