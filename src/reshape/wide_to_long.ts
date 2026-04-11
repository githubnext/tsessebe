/**
 * wide_to_long — reshape a wide-format DataFrame to long format.
 *
 * Mirrors `pandas.wide_to_long()`:
 * - Finds columns whose names start with any stub in `stubnames`
 *   (optionally followed by a `sep` separator, then a suffix).
 * - Stacks those columns into rows, pairing each stub value with its
 *   corresponding suffix level.
 * - Columns listed in `i` become the identifier (key) columns.
 * - A new column named `j` holds the suffix values.
 *
 * @example
 * ```ts
 * import { wideToLong, DataFrame } from "tsb";
 * const df = DataFrame.fromColumns({
 *   id: [1, 2],
 *   math_2020: [90, 80],
 *   math_2021: [95, 85],
 *   eng_2020: [70, 75],
 *   eng_2021: [72, 78],
 * });
 * const long = wideToLong(df, ["math", "eng"], "id", "year", { sep: "_" });
 * // id  year  math  eng
 * //  1  2020    90   70
 * //  1  2021    95   72
 * //  2  2020    80   75
 * //  2  2021    85   78
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// Top-level regex: suffix is all-digit characters.
const DIGIT_RE = /^\d+$/;

// ─── public API types ─────────────────────────────────────────────────────────

/** Options for {@link wideToLong}. */
export interface WideToLongOptions {
  /**
   * Character separating the stub name from the suffix in column names.
   * Default `""` (no separator — suffix immediately follows stub).
   */
  readonly sep?: string;
  /**
   * A regex pattern string that the suffix portion of matching column
   * names must satisfy.  Default `"\\d+"` (digits only, matching
   * pandas' default `suffix='\\d+'`).
   * Pass `".*"` to allow any suffix.
   */
  readonly suffix?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Match a column name against a stub prefix and return its suffix, or null. */
function matchStub(colName: string, stub: string, sep: string, suffixRe: RegExp): string | null {
  const prefix = stub + sep;
  if (!colName.startsWith(prefix)) {
    return null;
  }
  const tail = colName.slice(prefix.length);
  return suffixRe.test(tail) ? tail : null;
}

/** Sort suffixes: numeric ascending when all-digit, else lexicographic. */
function sortSuffixes(suffixes: string[]): string[] {
  return [...suffixes].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!(Number.isNaN(na) || Number.isNaN(nb))) {
      return na - nb;
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
}

/**
 * Discover all stub column mappings: suffix → (stub → source column name).
 */
function discoverSuffixMap(
  colNames: readonly string[],
  stubs: readonly string[],
  sep: string,
  suffixRe: RegExp,
): Map<string, Map<string, string>> {
  const suffixMap = new Map<string, Map<string, string>>();
  for (const col of colNames) {
    for (const stub of stubs) {
      const suf = matchStub(col, stub, sep, suffixRe);
      if (suf !== null) {
        let entry = suffixMap.get(suf);
        if (entry === undefined) {
          entry = new Map<string, string>();
          suffixMap.set(suf, entry);
        }
        entry.set(stub, col);
        break;
      }
    }
  }
  return suffixMap;
}

/** Pre-read stub column data indexed by suffix then stub. */
function buildStubSourceData(
  df: DataFrame,
  orderedSuffixes: readonly string[],
  stubs: readonly string[],
  suffixMap: Map<string, Map<string, string>>,
): Map<string, Map<string, readonly Scalar[]>> {
  const result = new Map<string, Map<string, readonly Scalar[]>>();
  for (const suf of orderedSuffixes) {
    const entry = suffixMap.get(suf);
    const colData = new Map<string, readonly Scalar[]>();
    for (const stub of stubs) {
      const colName = entry?.get(stub);
      colData.set(stub, colName !== undefined ? df.col(colName).values : []);
    }
    result.set(suf, colData);
  }
  return result;
}

/** Build a j-column scalar value from a suffix string. */
function jValue(suf: string): Scalar {
  return DIGIT_RE.test(suf) ? Number(suf) : suf;
}

/** Accumulate one row of output for a given (rowIdx, suffix) pair. */
function accumulateRow(
  rowIdx: number,
  suf: string,
  idCols: readonly string[],
  stubs: readonly string[],
  idData: Map<string, readonly Scalar[]>,
  stubSourceData: Map<string, Map<string, readonly Scalar[]>>,
  outId: Map<string, Scalar[]>,
  outJ: Scalar[],
  outStub: Map<string, Scalar[]>,
): void {
  for (const idCol of idCols) {
    const src = idData.get(idCol);
    outId.get(idCol)?.push(src !== undefined ? (src[rowIdx] ?? null) : null);
  }
  outJ.push(jValue(suf));
  const colData = stubSourceData.get(suf);
  for (const stub of stubs) {
    const src = colData?.get(stub);
    const v = src !== undefined && src.length > rowIdx ? (src[rowIdx] ?? null) : null;
    outStub.get(stub)?.push(v);
  }
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Reshape a wide-format DataFrame to long format.
 *
 * @param df        - Input wide-format DataFrame.
 * @param stubnames - One or more column-name prefixes (stubs) to gather.
 * @param i         - Column(s) to use as identifier (key) variables.
 * @param j         - Name for the new column that holds the suffix values.
 * @param options   - {@link WideToLongOptions}.
 * @returns A long-format DataFrame with `i` columns, a `j` column, and
 *          one column per stub containing the corresponding gathered values.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   A: [1, 2],
 *   x1: [10, 20],
 *   x2: [11, 21],
 *   y1: [30, 40],
 *   y2: [31, 41],
 * });
 * const long = wideToLong(df, ["x", "y"], "A", "time");
 * // A  time  x   y
 * // 1     1  10  30
 * // 1     2  11  31
 * // 2     1  20  40
 * // 2     2  21  41
 * ```
 */
export function wideToLong(
  df: DataFrame,
  stubnames: readonly string[] | string,
  i: readonly string[] | string,
  j: string,
  options: WideToLongOptions = {},
): DataFrame {
  const { sep = "", suffix = "\\d+" } = options;
  const stubs = typeof stubnames === "string" ? [stubnames] : [...stubnames];
  const idCols = typeof i === "string" ? [i] : [...i];

  const suffixRe = new RegExp(`^(?:${suffix})$`);
  const colNames = df.columns.values;

  const suffixMap = discoverSuffixMap(colNames, stubs, sep, suffixRe);
  const orderedSuffixes = sortSuffixes([...suffixMap.keys()]);

  const idData = new Map<string, readonly Scalar[]>(idCols.map((c) => [c, df.col(c).values]));
  const stubSourceData = buildStubSourceData(df, orderedSuffixes, stubs, suffixMap);

  const outId = new Map<string, Scalar[]>(idCols.map((c) => [c, []]));
  const outJ: Scalar[] = [];
  const outStub = new Map<string, Scalar[]>(stubs.map((s) => [s, []]));

  const nRows = df.index.size;
  for (let rowIdx = 0; rowIdx < nRows; rowIdx++) {
    for (const suf of orderedSuffixes) {
      accumulateRow(rowIdx, suf, idCols, stubs, idData, stubSourceData, outId, outJ, outStub);
    }
  }

  const outRecord: Record<string, readonly Scalar[]> = {};
  for (const idCol of idCols) {
    const arr = outId.get(idCol);
    if (arr !== undefined) {
      outRecord[idCol] = arr;
    }
  }
  outRecord[j] = outJ;
  for (const stub of stubs) {
    const arr = outStub.get(stub);
    if (arr !== undefined) {
      outRecord[stub] = arr;
    }
  }

  return DataFrame.fromColumns(outRecord);
}
