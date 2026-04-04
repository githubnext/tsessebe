/**
 * StringAccessor — vectorized string operations for Series.
 *
 * Mirrors pandas' `Series.str` accessor: provides element-wise string
 * operations on a Series, treating null/undefined values as propagated null.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["Hello", "World", null] });
 * s.str.upper().values;           // ["HELLO", "WORLD", null]
 * s.str.len().values;             // [5, 5, null]
 * s.str.contains("ello").values;  // [true, false, null]
 * ```
 */

import type { Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { Series } from "./series.ts";

/** Regex for splitting on whitespace (top-level for performance). */
const WHITESPACE_RE = /\s+/;

/** Apply `fn` to a scalar string; propagate null for missing values. */
function mapStr(v: Scalar, fn: (s: string) => Scalar): Scalar {
  if (v === null || v === undefined) {
    return null;
  }
  return fn(String(v));
}

/** Perform bounded replacements (max `n`) on string `s`. */
function replaceBounded(s: string, pat: string | RegExp, repl: string, n: number): string {
  const patStr = pat instanceof RegExp ? pat.source : pat;
  const flags = pat instanceof RegExp ? pat.flags.replace("g", "") : "";
  const re = new RegExp(patStr, flags);
  let result = s;
  for (let count = 0; count < n; count++) {
    const next = result.replace(re, repl);
    if (next === result) {
      break;
    }
    result = next;
  }
  return result;
}

/** Perform unbounded replacement of all occurrences. */
function replaceAll(s: string, pat: string | RegExp, repl: string): string {
  if (pat instanceof RegExp) {
    const re = new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : `${pat.flags}g`);
    return s.replace(re, repl);
  }
  return s.split(pat).join(repl);
}

/**
 * Vectorized string operations for a `Series`.
 *
 * Obtain an instance via `series.str`.
 */
export class StringAccessor {
  private readonly _series: Series<Scalar>;

  constructor(series: Series<Scalar>) {
    this._series = series;
  }

  // ─── case ────────────────────────────────────────────────────────────────

  /** Convert each string to upper-case. */
  upper(): Series<Scalar> {
    return this._map((s) => s.toUpperCase());
  }

  /** Convert each string to lower-case. */
  lower(): Series<Scalar> {
    return this._map((s) => s.toLowerCase());
  }

  /** Capitalize the first character of each string; lower-case the rest. */
  capitalize(): Series<Scalar> {
    return this._map((s) => (s.length === 0 ? s : s[0]?.toUpperCase() + s.slice(1).toLowerCase()));
  }

  /** Title-case each string (capitalize first letter of every word). */
  title(): Series<Scalar> {
    return this._map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()));
  }

  /** Swap upper-case to lower-case and vice versa. */
  swapcase(): Series<Scalar> {
    return this._map((s) =>
      s
        .split("")
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join(""),
    );
  }

  // ─── padding / trimming ──────────────────────────────────────────────────

  /** Remove leading and trailing whitespace. */
  strip(): Series<Scalar> {
    return this._map((s) => s.trim());
  }

  /** Remove leading whitespace. */
  lstrip(): Series<Scalar> {
    return this._map((s) => s.trimStart());
  }

  /** Remove trailing whitespace. */
  rstrip(): Series<Scalar> {
    return this._map((s) => s.trimEnd());
  }

  /**
   * Pad each string on the left, right, or both sides to `width`.
   * @param width  Minimum total string length.
   * @param side   `"left"` | `"right"` | `"both"` (default `"right"`).
   * @param fillchar  Character used for padding (default `" "`).
   */
  pad(width: number, side: "left" | "right" | "both" = "right", fillchar = " "): Series<Scalar> {
    return this._map((s) => {
      const need = width - s.length;
      if (need <= 0) {
        return s;
      }
      const fill = fillchar.repeat(need);
      if (side === "left") {
        return fill + s;
      }
      if (side === "right") {
        return s + fill;
      }
      const left = fill.slice(0, Math.floor(need / 2));
      const right = fill.slice(Math.floor(need / 2));
      return left + s + right;
    });
  }

  /** Center each string in a field of width `width`. */
  center(width: number, fillchar = " "): Series<Scalar> {
    return this.pad(width, "both", fillchar);
  }

  /** Left-justify each string in a field of width `width`. */
  ljust(width: number, fillchar = " "): Series<Scalar> {
    return this.pad(width, "right", fillchar);
  }

  /** Right-justify each string in a field of width `width`. */
  rjust(width: number, fillchar = " "): Series<Scalar> {
    return this.pad(width, "left", fillchar);
  }

  /** Pad each string with zeros on the left to `width`. */
  zfill(width: number): Series<Scalar> {
    return this._map((s) => {
      const need = width - s.length;
      if (need <= 0) {
        return s;
      }
      return "0".repeat(need) + s;
    });
  }

  // ─── search ──────────────────────────────────────────────────────────────

  /**
   * Test whether each element contains `pat`.
   * @param pat     Substring (or `RegExp`) to search for.
   * @param regex   If `true` and `pat` is a string, treat it as a regex pattern (default `false`).
   */
  contains(pat: string | RegExp, regex = false): Series<Scalar> {
    return this._mapBool((s) => {
      if (pat instanceof RegExp) {
        return pat.test(s);
      }
      if (regex) {
        return new RegExp(pat).test(s);
      }
      return s.includes(pat);
    });
  }

  /**
   * Test whether each element starts with `pat`.
   */
  startswith(pat: string): Series<Scalar> {
    return this._mapBool((s) => s.startsWith(pat));
  }

  /**
   * Test whether each element ends with `pat`.
   */
  endswith(pat: string): Series<Scalar> {
    return this._mapBool((s) => s.endsWith(pat));
  }

  /**
   * Return the number of occurrences of `pat` in each element.
   */
  count(pat: string | RegExp): Series<Scalar> {
    return this._mapNum((s) => {
      if (pat instanceof RegExp) {
        const re = new RegExp(pat.source, pat.flags.includes("g") ? pat.flags : `${pat.flags}g`);
        return (s.match(re) ?? []).length;
      }
      let count = 0;
      let pos = s.indexOf(pat);
      while (pos !== -1) {
        count++;
        pos = s.indexOf(pat, pos + 1);
      }
      return count;
    });
  }

  /**
   * Return the lowest index of `sub` in each element; -1 if not found.
   */
  find(sub: string): Series<Scalar> {
    return this._mapNum((s) => s.indexOf(sub));
  }

  // ─── transform ───────────────────────────────────────────────────────────

  /**
   * Replace occurrences of `pat` with `repl`.
   * @param pat    Substring or `RegExp` to match.
   * @param repl   Replacement string.
   * @param n      Maximum replacements (default all).
   */
  replace(pat: string | RegExp, repl: string, n?: number): Series<Scalar> {
    return this._map((s) => {
      if (typeof n === "number" && n >= 0) {
        return replaceBounded(s, pat, repl, n);
      }
      return replaceAll(s, pat, repl);
    });
  }

  /**
   * Split each string by `sep` and return a Series of string arrays.
   * @param sep    Delimiter string (default splits on whitespace).
   * @param n      Maximum number of splits (default unlimited).
   */
  split(sep?: string, n?: number): Series<Scalar> {
    return this._map((s) => {
      const parts =
        sep !== undefined ? s.split(sep) : s.split(WHITESPACE_RE).filter((x) => x.length > 0);
      if (typeof n === "number" && n >= 0 && parts.length > n + 1) {
        const head = parts.slice(0, n);
        const tail = parts.slice(n).join(sep ?? " ");
        return JSON.stringify([...head, tail]);
      }
      return JSON.stringify(parts);
    });
  }

  /** Return the `i`-th character of each element. */
  get(i: number): Series<Scalar> {
    return this._map((s) => {
      const idx = i < 0 ? s.length + i : i;
      return idx >= 0 && idx < s.length ? (s[idx] as string) : null;
    });
  }

  /**
   * Slice each string with Python-style `start:stop:step` semantics.
   */
  slice(start?: number, stop?: number, step = 1): Series<Scalar> {
    return this._map((s) => {
      const len = s.length;
      const normalise = (n: number | undefined, defaultVal: number): number => {
        if (n === undefined) {
          return defaultVal;
        }
        return n < 0 ? Math.max(0, len + n) : Math.min(len, n);
      };
      const st = normalise(start, 0);
      const en = normalise(stop, len);
      if (step === 1) {
        return s.slice(st, en);
      }
      let result = "";
      for (let idx = st; idx < en; idx += step) {
        result += s[idx] ?? "";
      }
      return result;
    });
  }

  // ─── measures ────────────────────────────────────────────────────────────

  /** Return the length of each element. */
  len(): Series<Scalar> {
    return this._mapNum((s) => s.length);
  }

  // ─── internal helpers ────────────────────────────────────────────────────

  private _map(fn: (s: string) => Scalar): Series<Scalar> {
    const data = [...this._series.values].map((v) => mapStr(v, fn));
    return new Series<Scalar>({ data, index: this._series.index, dtype: Dtype.string });
  }

  private _mapBool(fn: (s: string) => boolean): Series<Scalar> {
    const data = [...this._series.values].map((v) =>
      v === null || v === undefined ? null : fn(String(v)),
    );
    return new Series<Scalar>({ data, index: this._series.index, dtype: Dtype.bool });
  }

  private _mapNum(fn: (s: string) => number): Series<Scalar> {
    const data = [...this._series.values].map((v) =>
      v === null || v === undefined ? null : fn(String(v)),
    );
    return new Series<Scalar>({ data, index: this._series.index, dtype: Dtype.int64 });
  }
}
