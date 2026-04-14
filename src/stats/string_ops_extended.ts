/**
 * string_ops_extended — extended standalone string operations.
 *
 * Provides advanced string manipulation utilities that complement
 * `string_ops.ts` and `StringAccessor`:
 *
 * - `strSplitExpand`   — split strings by delimiter and expand each part into
 *                        a DataFrame column (mirrors `str.split(expand=True)`)
 * - `strExtractGroups` — extract regex capture groups into a DataFrame
 *                        (mirrors `str.extract` with capture groups)
 * - `strPartition`     — split at first occurrence of sep → (before, sep, after)
 * - `strRPartition`    — split at last occurrence of sep → (before, sep, after)
 * - `strMultiReplace`  — apply multiple find/replace pairs in sequence
 * - `strIndent`        — prefix every (non-empty) line with a string
 * - `strDedent`        — remove common leading whitespace from all lines
 *
 * @module
 */

import { DataFrame, type Index, RangeIndex, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";
import type { StrInput } from "./string_ops.ts";

// ─── internal helpers ─────────────────────────────────────────────────────────

function toStrOrNull(v: Scalar): string | null {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return null;
  }
  return String(v);
}

function toValues(input: readonly Scalar[] | Series<Scalar>): readonly Scalar[] {
  return input instanceof Series ? input.values : input;
}

function rowIndex(input: readonly Scalar[] | Series<Scalar>): Index<Label> {
  return input instanceof Series ? input.index : new RangeIndex(toValues(input).length);
}

function escapeRegex(s: string): string {
  return s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

// ─── strSplitExpand ───────────────────────────────────────────────────────────

/** Options for {@link strSplitExpand}. */
export interface SplitExpandOptions {
  /**
   * Maximum number of splits to perform. `-1` means unlimited.
   * @default -1
   */
  readonly n?: number;
}

/** Split a scalar string into an array of parts. */
export function strSplitExpand(
  input: string,
  sep?: string | RegExp,
  options?: SplitExpandOptions,
): string[];
/** Split each element and expand the parts into a DataFrame (one column per part). */
export function strSplitExpand(
  input: readonly Scalar[] | Series<Scalar>,
  sep?: string | RegExp,
  options?: SplitExpandOptions,
): DataFrame;
/** @internal */
export function strSplitExpand(
  input: StrInput,
  sep: string | RegExp = " ",
  options: SplitExpandOptions = {},
): string[] | DataFrame {
  const maxSplits = options.n ?? -1;

  function splitOne(s: string | null): (string | null)[] {
    if (s === null) {
      return [null];
    }
    if (maxSplits < 0) {
      // unlimited splits
      const pat = sep instanceof RegExp ? sep : new RegExp(escapeRegex(sep));
      return s.split(pat);
    }
    // limited splits: extract up to maxSplits separators
    const parts: string[] = [];
    let rest = s;
    for (let i = 0; i < maxSplits; i++) {
      let idx: number;
      let sepLen: number;
      if (typeof sep === "string") {
        idx = rest.indexOf(sep);
        sepLen = sep.length;
      } else {
        const m = rest.match(sep);
        if (m === null || m.index === undefined) {
          break;
        }
        idx = m.index;
        sepLen = m[0]?.length ?? 0;
      }
      if (idx === -1) {
        break;
      }
      parts.push(rest.slice(0, idx));
      rest = rest.slice(idx + sepLen);
    }
    parts.push(rest);
    return parts;
  }

  if (typeof input === "string") {
    return splitOne(input) as string[];
  }

  const vals = toValues(input);
  const rows: (string | null)[][] = vals.map((v) => splitOne(toStrOrNull(v)));

  // determine column width (maximum number of parts in any row)
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);

  const columns: Record<string, Scalar[]> = {};
  for (let c = 0; c < width; c++) {
    const col: Scalar[] = rows.map((r) => {
      const cell = r[c];
      return cell !== undefined ? cell : null;
    });
    columns[String(c)] = col;
  }

  return DataFrame.fromColumns(columns, { index: rowIndex(input) });
}

// ─── strExtractGroups ─────────────────────────────────────────────────────────

/** Options for {@link strExtractGroups}. */
export interface ExtractGroupsOptions {
  /** Additional regex flags to merge with any flags already on a RegExp pattern. */
  readonly flags?: string;
}

/**
 * Extract regex capture groups from each element into a DataFrame.
 *
 * One column is created per capture group. Named groups (`(?<name>...)`)
 * produce named columns; unnamed groups produce `"0"`, `"1"`, … columns.
 *
 * Non-matching elements produce a row of `null` values.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["2024-01-15", "2025-12-31"] });
 * const df = strExtractGroups(s, /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
 * // DataFrame with columns: year, month, day
 * ```
 */
export function strExtractGroups(
  input: readonly Scalar[] | Series<Scalar>,
  pat: string | RegExp,
  options?: ExtractGroupsOptions,
): DataFrame {
  const flags = options?.flags ?? "";
  const re =
    pat instanceof RegExp
      ? flags === ""
        ? pat
        : new RegExp(pat.source, pat.flags + flags)
      : new RegExp(pat, flags);

  const groupNames = extractGroupNames(re);
  const vals = toValues(input);

  // Determine number of capture groups by adding an empty-string alternative.
  // This always matches, and (matchResult.length - 1) gives the group count.
  const groupCountMatch = new RegExp(`${re.source}|`).exec("");
  const groupCount = groupCountMatch !== null ? groupCountMatch.length - 1 : 0;

  const rows: (string | null)[][] = vals.map((v) => {
    const s = toStrOrNull(v);
    if (s === null) {
      return Array.from({ length: groupCount }, (): null => null);
    }
    const m = re.exec(s);
    if (m === null) {
      return Array.from({ length: groupCount }, (): null => null);
    }
    return Array.from({ length: m.length - 1 }, (_, i) => {
      const captured = m[i + 1];
      return captured !== undefined ? captured : null;
    });
  });

  const width = groupCount;

  // Use named groups if available and count matches; otherwise use 0-indexed strings.
  const colNames: string[] =
    groupNames.length === width && width > 0
      ? groupNames
      : Array.from({ length: width }, (_, i) => String(i));

  const columns: Record<string, Scalar[]> = {};
  for (let c = 0; c < width; c++) {
    const name = colNames[c] ?? String(c);
    const col: Scalar[] = rows.map((r) => {
      const cell = r[c];
      return cell !== undefined ? cell : null;
    });
    columns[name] = col;
  }

  return DataFrame.fromColumns(columns, { index: rowIndex(input) });
}

/** Parse named capture group names from a regex source string. */
function extractGroupNames(re: RegExp): string[] {
  const names: string[] = [];
  const source = re.source;
  let i = 0;
  while (i < source.length - 2) {
    if (source[i] === "(" && source[i + 1] === "?" && source[i + 2] === "<") {
      const first = source[i + 3];
      if (first !== undefined && /[A-Za-z_]/.test(first)) {
        let j = i + 4;
        while (j < source.length) {
          const ch = source[j];
          if (ch === ">") {
            names.push(source.slice(i + 3, j));
            i = j;
            break;
          }
          if (ch !== undefined && !/[A-Za-z0-9_]/.test(ch)) {
            break;
          }
          j++;
        }
      }
    }
    i++;
  }
  return names;
}

// ─── strPartition ─────────────────────────────────────────────────────────────

/**
 * Result of {@link strPartition} / {@link strRPartition} on a scalar input:
 * a 3-tuple `[before, separator, after]`.
 */
export type PartitionResult = [string, string, string];

/** Partition a scalar string at the first occurrence of `sep`. */
export function strPartition(input: string, sep: string): PartitionResult;
/** Partition each element and expand to a DataFrame with columns `"0"`, `"1"`, `"2"`. */
export function strPartition(input: readonly Scalar[] | Series<Scalar>, sep: string): DataFrame;
/** @internal */
export function strPartition(input: StrInput, sep: string): PartitionResult | DataFrame {
  function partitionOne(s: string | null): [string | null, string | null, string | null] {
    if (s === null) {
      return [null, null, null];
    }
    const idx = s.indexOf(sep);
    if (idx === -1) {
      return [s, "", ""];
    }
    return [s.slice(0, idx), sep, s.slice(idx + sep.length)];
  }

  if (typeof input === "string") {
    return partitionOne(input) as PartitionResult;
  }

  const vals = toValues(input);
  const rows = vals.map((v) => partitionOne(toStrOrNull(v)));

  return DataFrame.fromColumns(
    {
      "0": rows.map((r) => r[0]),
      "1": rows.map((r) => r[1]),
      "2": rows.map((r) => r[2]),
    },
    { index: rowIndex(input) },
  );
}

// ─── strRPartition ────────────────────────────────────────────────────────────

/** Partition a scalar string at the LAST occurrence of `sep`. */
export function strRPartition(input: string, sep: string): PartitionResult;
/** Partition each element at the last occurrence and expand to a DataFrame. */
export function strRPartition(input: readonly Scalar[] | Series<Scalar>, sep: string): DataFrame;
/** @internal */
export function strRPartition(input: StrInput, sep: string): PartitionResult | DataFrame {
  function rpartitionOne(s: string | null): [string | null, string | null, string | null] {
    if (s === null) {
      return [null, null, null];
    }
    const idx = s.lastIndexOf(sep);
    if (idx === -1) {
      return ["", "", s];
    }
    return [s.slice(0, idx), sep, s.slice(idx + sep.length)];
  }

  if (typeof input === "string") {
    return rpartitionOne(input) as PartitionResult;
  }

  const vals = toValues(input);
  const rows = vals.map((v) => rpartitionOne(toStrOrNull(v)));

  return DataFrame.fromColumns(
    {
      "0": rows.map((r) => r[0]),
      "1": rows.map((r) => r[1]),
      "2": rows.map((r) => r[2]),
    },
    { index: rowIndex(input) },
  );
}

// ─── strMultiReplace ──────────────────────────────────────────────────────────

/** A single find/replace pair for {@link strMultiReplace}. */
export interface ReplacePair {
  /** Pattern to search for (string literal or regular expression). */
  readonly pat: string | RegExp;
  /** Replacement string (may use `$1`, `$2`, … back-references for RegExp patterns). */
  readonly repl: string;
}

/** Apply a sequence of find/replace pairs to a scalar string. */
export function strMultiReplace(input: string, replacements: readonly ReplacePair[]): string;
/** Apply a sequence of find/replace pairs to each element of a Series or array. */
export function strMultiReplace(
  input: readonly Scalar[] | Series<Scalar>,
  replacements: readonly ReplacePair[],
): Series<Scalar>;
/** @internal */
export function strMultiReplace(
  input: StrInput,
  replacements: readonly ReplacePair[],
): string | Series<Scalar> {
  function applyAll(s: string | null): string | null {
    if (s === null) {
      return null;
    }
    let result = s;
    for (const { pat, repl } of replacements) {
      result = result.replace(
        pat instanceof RegExp ? pat : new RegExp(escapeRegex(pat), "g"),
        repl,
      );
    }
    return result;
  }

  if (typeof input === "string") {
    return applyAll(input) ?? "";
  }

  const vals = toValues(input);
  const out: Scalar[] = vals.map((v) => applyAll(toStrOrNull(v)));
  if (input instanceof Series) {
    return input.withValues(out);
  }
  return new Series({ data: out });
}

// ─── strIndent ────────────────────────────────────────────────────────────────

/** Options for {@link strIndent}. */
export interface IndentOptions {
  /**
   * Predicate to decide which lines get the prefix.
   * Defaults to all non-empty lines (lines that are not solely whitespace).
   */
  readonly predicate?: (line: string) => boolean;
}

/** Prefix every (non-empty) line in a scalar string. */
export function strIndent(input: string, prefix: string, options?: IndentOptions): string;
/** Prefix every (non-empty) line in each element of a Series or array. */
export function strIndent(
  input: readonly Scalar[] | Series<Scalar>,
  prefix: string,
  options?: IndentOptions,
): Series<Scalar>;
/** @internal */
export function strIndent(
  input: StrInput,
  prefix: string,
  options: IndentOptions = {},
): string | Series<Scalar> {
  const predicate = options.predicate ?? ((line: string) => line.trim().length > 0);

  function indentOne(s: string | null): string | null {
    if (s === null) {
      return null;
    }
    return s
      .split("\n")
      .map((line) => (predicate(line) ? prefix + line : line))
      .join("\n");
  }

  if (typeof input === "string") {
    return indentOne(input) ?? "";
  }

  const vals = toValues(input);
  const out: Scalar[] = vals.map((v) => indentOne(toStrOrNull(v)));
  if (input instanceof Series) {
    return input.withValues(out);
  }
  return new Series({ data: out });
}

// ─── strDedent ────────────────────────────────────────────────────────────────

/**
 * Remove the common leading whitespace from every line of a string.
 *
 * Mirrors `textwrap.dedent` from Python's standard library.
 * Lines that are entirely whitespace are not used to compute the common
 * prefix but are still included in the output (trimmed to empty).
 *
 * @example
 * ```ts
 * strDedent("    hello\n    world") // "hello\nworld"
 * strDedent("  a\n    b")          // "a\n  b"
 * ```
 */
export function strDedent(input: string): string;
/** Remove common leading whitespace from each element of a Series or array. */
export function strDedent(input: readonly Scalar[] | Series<Scalar>): Series<Scalar>;
/** @internal */
export function strDedent(input: StrInput): string | Series<Scalar> {
  function dedentOne(s: string | null): string | null {
    if (s === null) {
      return null;
    }
    const lines = s.split("\n");
    // find the minimum leading-whitespace length among non-whitespace-only lines
    let minIndent = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }
      const leading = line.length - line.trimStart().length;
      if (leading < minIndent) {
        minIndent = leading;
      }
    }
    if (minIndent === Number.POSITIVE_INFINITY || minIndent === 0) {
      return s;
    }
    return lines.map((line) => (line.trim().length === 0 ? "" : line.slice(minIndent))).join("\n");
  }

  if (typeof input === "string") {
    return dedentOne(input) ?? "";
  }

  const vals = toValues(input);
  const out: Scalar[] = vals.map((v) => dedentOne(toStrOrNull(v)));
  if (input instanceof Series) {
    return input.withValues(out);
  }
  return new Series({ data: out });
}
