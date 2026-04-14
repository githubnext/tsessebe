/**
 * wide_to_long — reshape a wide DataFrame to a long format by collapsing
 * stub-prefixed column groups into rows.
 *
 * Mirrors `pandas.wide_to_long(df, stubnames, i, j, sep='', suffix='\\d+')`.
 *
 * Given a DataFrame whose columns include groups like
 * `"A1"`, `"A2"`, `"B1"`, `"B2"` (stubs `["A","B"]`, separator `""`, suffix `\\d+`),
 * this function pivots those groups into long format where each unique suffix
 * value becomes a new row:
 *
 * ```
 * id  num  A  B
 *  x    1  1  5
 *  x    2  3  7
 *  y    1  2  6
 *  y    2  4  8
 * ```
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { wideToLong } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   id: ["x", "y"],
 *   A1: [1, 2],
 *   A2: [3, 4],
 *   B1: [5, 6],
 *   B2: [7, 8],
 * });
 *
 * const long = wideToLong(df, ["A", "B"], "id", "num");
 * // long.columns.values → ["id", "num", "A", "B"]
 * // long.shape          → [4, 4]
 * ```
 *
 * @module
 */

import type { Index } from "../core/base-index.ts";
import { DataFrame } from "../core/frame.ts";
import { RangeIndex } from "../core/range-index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Options for {@link wideToLong}. */
export interface WideToLongOptions {
  /**
   * Separator between stub name and suffix in column names.
   * Defaults to `""` (no separator).
   * @example `sep: "_"` matches columns like `"value_2021"`, `"value_2022"`.
   */
  readonly sep?: string;
  /**
   * Regular expression (as a string) that the suffix must match.
   * Defaults to `"\\d+"` (one or more digits).
   * @example `suffix: "[a-z]+"` matches alphabetic suffixes.
   */
  readonly suffix?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Normalise a string-or-string-array option to `string[]`. */
function toStringArray(x: readonly string[] | string): string[] {
  return typeof x === "string" ? [x] : [...x];
}

/**
 * Collect the unique suffix values that appear in the DataFrame column names
 * for the given stubs, separator, and suffix regex.
 *
 * Returns suffixes in the order they first appear (scanning columns left to right).
 */
function collectSuffixes(
  colNames: readonly string[],
  stubs: readonly string[],
  sep: string,
  suffixRe: RegExp,
): string[] {
  const seen = new Map<string, number>(); // suffix → first-seen position
  for (const col of colNames) {
    for (const stub of stubs) {
      const prefix = stub + sep;
      if (col.startsWith(prefix)) {
        const rest = col.slice(prefix.length);
        const m = rest.match(suffixRe);
        if (m !== null && m[0] === rest) {
          const pos = seen.size;
          if (!seen.has(rest)) {
            seen.set(rest, pos);
          }
        }
      }
    }
  }
  return [...seen.keys()].sort((a, b) => {
    // Sort numerically when both look like integers, otherwise lexicographically.
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
      return na - nb;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// ─── wideToLong ───────────────────────────────────────────────────────────────

/**
 * Reshape a wide-format DataFrame to long format by collapsing stub-prefixed
 * column groups into rows.
 *
 * Mirrors `pandas.wide_to_long(df, stubnames, i, j, sep='', suffix='\\d+')`.
 *
 * @param df        Source DataFrame (not mutated).
 * @param stubnames Stub name(s) that prefix the wide columns (e.g. `["A", "B"]`).
 * @param i         Column name(s) to use as id variables (kept for every row).
 * @param j         Name of the new column that will hold the suffix value.
 * @param options   Optional `sep` and `suffix` overrides.
 * @returns A new long-format DataFrame.
 *
 * @throws {RangeError} if any `i` column does not exist in `df`.
 * @throws {RangeError} if `j` conflicts with an existing non-stub column name.
 */
export function wideToLong(
  df: DataFrame,
  stubnames: readonly string[] | string,
  i: readonly string[] | string,
  j: string,
  options: WideToLongOptions = {},
): DataFrame {
  const stubs = toStringArray(stubnames);
  const idCols = toStringArray(i);
  const sep = options.sep ?? "";
  const suffixPattern = options.suffix ?? "\\d+";
  const suffixRe = new RegExp(`^(?:${suffixPattern})$`);

  // Validate id columns exist.
  for (const col of idCols) {
    if (!df.has(col)) {
      throw new RangeError(`id column "${col}" does not exist in DataFrame.`);
    }
  }

  // j must not conflict with a non-stub, non-id column.
  const colNames = [...df.columns.values];
  const stubSet = new Set(stubs);
  for (const col of colNames) {
    if (col === j && !stubSet.has(col) && !idCols.includes(col)) {
      throw new RangeError(`Column name "${j}" conflicts with existing column.`);
    }
  }

  // Collect ordered suffix values.
  const suffixes = collectSuffixes(colNames, stubs, sep, suffixRe);

  const nRows = df.index.size;

  // Build output column arrays.
  const idArrays: Record<string, Scalar[]> = {};
  for (const col of idCols) {
    idArrays[col] = [];
  }
  const jArray: Scalar[] = [];
  const stubArrays: Record<string, Scalar[]> = {};
  for (const stub of stubs) {
    stubArrays[stub] = [];
  }

  // Coerce suffix to number if possible (for the j-column values).
  function coerceSuffix(s: string): Scalar {
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
  }

  for (const suffix of suffixes) {
    for (let row = 0; row < nRows; row++) {
      // Append id column values.
      for (const col of idCols) {
        const arr = idArrays[col];
        if (arr !== undefined) {
          arr.push((df.col(col).values[row] ?? null) as Scalar);
        }
      }
      // Append j value.
      jArray.push(coerceSuffix(suffix));
      // Append stub values.
      for (const stub of stubs) {
        const wideColName = stub + sep + suffix;
        const arr = stubArrays[stub];
        if (arr !== undefined) {
          const wideCol = df.get(wideColName);
          const val: Scalar =
            wideCol !== undefined ? ((wideCol.values[row] ?? null) as Scalar) : null;
          arr.push(val);
        }
      }
    }
  }

  // Assemble output DataFrame column map.
  const outData: Record<string, readonly Scalar[]> = {};
  for (const col of idCols) {
    outData[col] = idArrays[col] ?? [];
  }
  outData[j] = jArray;
  for (const stub of stubs) {
    outData[stub] = stubArrays[stub] ?? [];
  }

  const totalRows = nRows * suffixes.length;
  const rowIndex = new RangeIndex(totalRows) as unknown as Index<Label>;

  return DataFrame.fromColumns(outData as Record<string, readonly Scalar[]>, { index: rowIndex });
}
