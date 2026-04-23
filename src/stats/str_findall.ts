/**
 * str_findall — findall, findFirst, and findallCount for Series strings.
 *
 * Mirrors `pandas.Series.str.findall(pat)` and related helpers:
 *
 * - `strFindall`      — all non-overlapping regex matches per element
 * - `strFindallCount` — count of matches per element
 * - `strFindFirst`    — first match per element (or null if none)
 * - `strFindallExpand`— expand first N capture groups into a DataFrame
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";
import type { StrInput } from "./string_ops.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toStr(v: Scalar): string | null {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return null;
  }
  return String(v);
}

function toInputStrings(input: StrInput): string[] {
  if (typeof input === "string") {
    return [input];
  }
  if (input instanceof Series) {
    return input.values.map((v) => toStr(v) ?? "");
  }
  return (input as readonly Scalar[]).map((v) => toStr(v) ?? "");
}

function buildResult(data: Scalar[], input: StrInput): Series<Scalar> {
  if (input instanceof Series) {
    return new Series({ data, index: input.index });
  }
  return new Series({ data });
}

/** Build a global RegExp from a pattern, optionally with flags. */
function makeGlobal(pat: string | RegExp, flags?: string): RegExp {
  if (pat instanceof RegExp) {
    const f = pat.flags.includes("g") ? pat.flags : `${pat.flags}g`;
    return new RegExp(pat.source, f);
  }
  const f = `${flags ?? ""}g`.replace(/g{2,}/, "g");
  return new RegExp(pat, f);
}

/** Extract named capture-group identifiers from a regex source pattern. */
function extractNamedGroupNames(source: string): string[] {
  const names: string[] = [];
  const re = /\(\?<([A-Za-z_]\w*)>/g;
  for (;;) {
    const m = re.exec(source);
    if (m === null) {
      break;
    }
    const name = m[1];
    if (name !== undefined) {
      names.push(name);
    }
  }
  return names;
}

// ─── strFindall ───────────────────────────────────────────────────────────────

/**
 * Find all non-overlapping regex matches in each element.
 *
 * Mirrors `pandas.Series.str.findall(pat, flags=0)`.
 *
 * Each element in the returned Series contains a `string[]` of matches
 * (the full match if no capture groups; the single capture group string if
 * exactly one group is present; a `string[]` per match if multiple groups).
 * Null/NaN elements produce `null`.
 *
 * The `string[]` value is stored as a JSON-serialized string for compatibility
 * with `Scalar`. Use `JSON.parse` to recover the array.
 *
 * @param input - Series, array, or scalar string.
 * @param pat   - Regular expression pattern (string or RegExp).
 * @param flags - Regex flags (only used when `pat` is a string).
 * @returns A `Series<Scalar>` where each value is a JSON string of `string[]`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["one two three", "four five"] });
 * const result = strFindall(s, /\w+/);
 * // Series [
 * //   '["one","two","three"]',
 * //   '["four","five"]',
 * // ]
 * JSON.parse(result.values[0] as string); // ["one", "two", "three"]
 * ```
 */
export function strFindall(input: StrInput, pat: string | RegExp, flags?: string): Series<Scalar> {
  const strs = toInputStrings(input);
  const re = makeGlobal(pat, flags);

  const data: Scalar[] = strs.map((s, i) => {
    // null/NaN elements: check original value
    const orig =
      input instanceof Series
        ? input.values[i]
        : typeof input === "string"
          ? input
          : (input as readonly Scalar[])[i];
    if (orig === null || orig === undefined || (typeof orig === "number" && Number.isNaN(orig))) {
      return null;
    }

    re.lastIndex = 0;
    const matches: string[] = [];
    for (;;) {
      const m = re.exec(s);
      if (m === null) {
        break;
      }
      // If there are capture groups, use the first group (pandas behaviour).
      matches.push(m.length > 1 ? (m[1] ?? "") : (m[0] ?? ""));
    }
    return JSON.stringify(matches);
  });

  return buildResult(data, input);
}

// ─── strFindallCount ──────────────────────────────────────────────────────────

/**
 * Count all non-overlapping regex matches in each element.
 *
 * This is equivalent to `strFindall(s, pat).map(x => JSON.parse(x).length)`
 * but more efficient since it avoids allocating match arrays.
 *
 * @param input - Series, array, or scalar string.
 * @param pat   - Regular expression pattern.
 * @param flags - Regex flags (only when `pat` is a string).
 * @returns A `Series<Scalar>` of integer counts. Null elements return `null`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["aaa", "bb", "c"] });
 * strFindallCount(s, /a+/);
 * // Series [1, 0, 0]
 * ```
 */
export function strFindallCount(
  input: StrInput,
  pat: string | RegExp,
  flags?: string,
): Series<Scalar> {
  const strs = toInputStrings(input);
  const re = makeGlobal(pat, flags);

  const data: Scalar[] = strs.map((s, i) => {
    const orig =
      input instanceof Series
        ? input.values[i]
        : typeof input === "string"
          ? input
          : (input as readonly Scalar[])[i];
    if (orig === null || orig === undefined || (typeof orig === "number" && Number.isNaN(orig))) {
      return null;
    }

    re.lastIndex = 0;
    let count = 0;
    for (;;) {
      const m = re.exec(s);
      if (m === null) {
        break;
      }
      count++;
    }
    return count;
  });

  return buildResult(data, input);
}

// ─── strFindFirst ─────────────────────────────────────────────────────────────

/**
 * Return the first regex match in each element, or `null` if there is none.
 *
 * If the pattern has capture groups, returns the first capture group's value
 * (mirrors pandas behaviour for single-group patterns).
 *
 * @param input - Series, array, or scalar string.
 * @param pat   - Regular expression pattern.
 * @param flags - Regex flags (only when `pat` is a string).
 * @returns A `Series<Scalar>` of strings (first match) or `null`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["price: $10.99", "no price", "cost: $5.00"] });
 * strFindFirst(s, /\$[\d.]+/);
 * // Series ["$10.99", null, "$5.00"]
 * ```
 */
export function strFindFirst(
  input: StrInput,
  pat: string | RegExp,
  flags?: string,
): Series<Scalar> {
  const strs = toInputStrings(input);
  const source = pat instanceof RegExp ? pat.source : pat;
  const baseFlags = pat instanceof RegExp ? pat.flags.replace("g", "") : (flags ?? "");
  const re = new RegExp(source, baseFlags);

  const data: Scalar[] = strs.map((s, i) => {
    const orig =
      input instanceof Series
        ? input.values[i]
        : typeof input === "string"
          ? input
          : (input as readonly Scalar[])[i];
    if (orig === null || orig === undefined || (typeof orig === "number" && Number.isNaN(orig))) {
      return null;
    }

    const m = re.exec(s);
    if (m === null) {
      return null;
    }
    return m.length > 1 ? (m[1] ?? null) : (m[0] ?? null);
  });

  return buildResult(data, input);
}

// ─── strFindallExpand ─────────────────────────────────────────────────────────

/**
 * Extract capture groups from the **first** match of each element into a
 * DataFrame, one column per capture group.
 *
 * This is a simplified variant of `str.extract(pat, expand=True)` limited
 * to named or positional capture groups in the pattern.
 *
 * Column names are taken from named capture groups (`(?<name>...)`) where
 * present; otherwise numbered as `"0"`, `"1"`, etc.
 *
 * @param input   - Series or string array.
 * @param pat     - Regular expression with capture groups.
 * @param flags   - Regex flags (only when `pat` is a string).
 * @returns A `DataFrame` with one row per input element and one column per
 *   capture group. Non-matching elements produce `null` in all columns.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["John 30", "Jane 25", "unknown"] });
 * strFindallExpand(s, /(?<name>\w+)\s+(?<age>\d+)/);
 * // DataFrame
 * //    name  age
 * // 0  John  30
 * // 1  Jane  25
 * // 2  null  null
 * ```
 */
export function strFindallExpand(
  input: readonly string[] | Series<Scalar>,
  pat: string | RegExp,
  flags?: string,
): DataFrame {
  const source = pat instanceof RegExp ? pat.source : pat;
  const baseFlags = pat instanceof RegExp ? pat.flags.replace("g", "") : (flags ?? "");
  const re = new RegExp(source, baseFlags);

  const strs = toInputStrings(input);

  // Determine group names from pattern source.
  const namedKeys = extractNamedGroupNames(source);

  // Determine number of capture groups from source
  // Count open parens that aren't non-capturing groups (?:
  let groupCount = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "(" && source[i + 1] !== "?" && source[i + 1] !== "*") {
      groupCount++;
    } else if (
      source[i] === "(" &&
      source[i + 1] === "?" &&
      source[i + 2] !== ":" &&
      source[i + 2] !== "=" &&
      source[i + 2] !== "!" &&
      source[i + 2] !== "<" // negative look-behind uses (?<!
    ) {
      groupCount++;
    } else if (
      source[i] === "(" &&
      source[i + 1] === "?" &&
      source[i + 2] === "<" &&
      source[i + 3] !== "=" &&
      source[i + 3] !== "!"
    ) {
      groupCount++;
    }
  }

  const colCount = namedKeys.length > 0 ? namedKeys.length : Math.max(groupCount, 1);
  const colNames: string[] =
    namedKeys.length > 0 ? namedKeys : Array.from({ length: colCount }, (_, k) => String(k));

  const columns: Record<string, Scalar[]> = {};
  for (const col of colNames) {
    columns[col] = [];
  }

  for (let i = 0; i < strs.length; i++) {
    const isNull: boolean =
      input instanceof Series
        ? ((): boolean => {
            const v = input.values[i];
            return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
          })()
        : (input as readonly string[])[i] === undefined;

    if (isNull) {
      for (const col of colNames) {
        (columns[col] as Scalar[]).push(null);
      }
      continue;
    }

    const m = re.exec(strs[i] ?? "");
    if (m === null) {
      for (const col of colNames) {
        (columns[col] as Scalar[]).push(null);
      }
    } else if (namedKeys.length > 0 && m.groups !== null && m.groups !== undefined) {
      for (const col of namedKeys) {
        (columns[col] as Scalar[]).push(m.groups[col] ?? null);
      }
    } else {
      for (let k = 0; k < colCount; k++) {
        (columns[colNames[k] as string] as Scalar[]).push(m[k + 1] ?? null);
      }
    }
  }

  if (input instanceof Series) {
    return DataFrame.fromColumns(columns, { index: input.index });
  }
  return DataFrame.fromColumns(columns);
}
