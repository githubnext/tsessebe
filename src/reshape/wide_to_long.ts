/**
 * wide_to_long — reshape a wide DataFrame to long format using column name stubs.
 *
 * Mirrors `pandas.wide_to_long(df, stubnames, i, j, sep='', suffix='\\d+')`.
 *
 * Takes a wide-format DataFrame where multiple columns share a common prefix
 * (stub) and a varying suffix, and reshapes it into a long-format DataFrame
 * where each stub becomes a column and the suffixes become values in a new
 * column named `j`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   id:  ["x", "y"],
 *   A1:  [1, 2],
 *   A2:  [3, 4],
 *   B1:  [5, 6],
 *   B2:  [7, 8],
 * });
 * wideToLong(df, ["A", "B"], "id", "year");
 * // id  year  A  B
 * // x   1     1  5
 * // y   1     2  6
 * // x   2     3  7
 * // y   2     4  8
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link wideToLong}. */
export interface WideToLongOptions {
  /**
   * Separator between the stub name and the suffix in column names.
   * For example, `sep: "_"` matches `"A_1"`, `"A_2"`, etc.
   * @defaultValue `""`
   */
  readonly sep?: string;
  /**
   * Regular expression (or string pattern) that matches the suffix portion of
   * column names after the stub and separator.  The entire rest of the column
   * name (after `stub + sep`) must match this pattern.
   * @defaultValue `/\d+/` — numeric suffixes only
   */
  readonly suffix?: RegExp | string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Normalize a string or string-array argument to `string[]`. */
function toStringArray(x: readonly string[] | string): string[] {
  return typeof x === "string" ? [x] : [...x];
}

/** Escape a string for safe embedding in a `RegExp` pattern. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a compiled anchor regex for a single stub.
 *
 * Matches column names of the form `{stub}{sep}{suffix}` where `suffix`
 * matches the full remaining text.  The suffix portion is captured in group 1.
 */
function buildStubRegex(stub: string, sep: string, suffixPattern: string): RegExp {
  return new RegExp(`^${escapeRegex(stub)}${escapeRegex(sep)}(${suffixPattern})$`);
}

/**
 * Try to parse a suffix string as a number; if it is not purely numeric,
 * return it as-is.
 */
function parseSuffix(raw: string): Scalar {
  return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Reshape a wide-format DataFrame to long format using column name stubs.
 *
 * Each group of columns that shares a stub prefix (e.g. `A1`, `A2`, `B1`,
 * `B2` with stubs `["A", "B"]`) is collapsed into a single column per stub,
 * with a new column named `j` holding the extracted suffix values.
 *
 * Columns not listed in `stubnames` or `i` are silently dropped (mirrors
 * pandas behaviour).
 *
 * @param df        - Source wide-format DataFrame.
 * @param stubnames - One or more column-name prefixes (stubs) to reshape.
 * @param i         - Column(s) to use as identifier variables (kept as-is).
 * @param j         - Name of the new column that holds the extracted suffixes.
 * @param options   - Optional `sep` and `suffix` settings.
 * @returns Long-format DataFrame with id columns, `j`, and one column per stub.
 *
 * @throws {RangeError} If an `i` column does not exist.
 * @throws {RangeError} If `j` conflicts with an existing column name that is
 *   not a stub column.
 * @throws {RangeError} If no stub columns are found for any of the stubs.
 */
export function wideToLong(
  df: DataFrame,
  stubnames: readonly string[] | string,
  i: readonly string[] | string,
  j: string,
  options?: WideToLongOptions,
): DataFrame {
  const stubs = toStringArray(stubnames);
  const idCols = toStringArray(i);
  const sep = options?.sep ?? "";
  const rawSuffix = options?.suffix ?? /\d+/;
  const suffixPattern = rawSuffix instanceof RegExp ? rawSuffix.source : rawSuffix;

  // ── validate id columns ────────────────────────────────────────────────────
  for (const col of idCols) {
    if (!df.has(col)) {
      throw new RangeError(`wide_to_long: id column "${col}" not found in DataFrame.`);
    }
  }

  // ── validate j does not shadow a non-stub existing column ─────────────────
  // (pandas raises ValueError if j clashes with a remaining non-stub column)
  const stubSet = new Set(stubs);
  if (!stubSet.has(j) && df.has(j) && !idCols.includes(j)) {
    // Allow j to equal a stub name (it will be overwritten), but not an
    // unrelated column.
    throw new RangeError(
      `wide_to_long: j column name "${j}" conflicts with an existing non-stub column.`,
    );
  }

  // ── build per-stub regexes and find all unique suffixes ───────────────────
  const stubRegexes = new Map<string, RegExp>();
  for (const stub of stubs) {
    stubRegexes.set(stub, buildStubRegex(stub, sep, suffixPattern));
  }

  // Collect unique suffixes in first-seen order (scanning columns left-to-right).
  const suffixOrder: string[] = [];
  const suffixSeen = new Set<string>();

  for (const col of df.columns.values) {
    for (const [, re] of stubRegexes) {
      const m = re.exec(col);
      if (m !== null) {
        const rawSfx = m[1];
        if (rawSfx !== undefined && !suffixSeen.has(rawSfx)) {
          suffixSeen.add(rawSfx);
          suffixOrder.push(rawSfx);
        }
        break; // column matched one stub; no need to check others
      }
    }
  }

  if (suffixOrder.length === 0) {
    throw new RangeError(
      `wide_to_long: no columns matched any of the stub patterns ${JSON.stringify(stubs)}.`,
    );
  }

  // ── allocate output arrays ────────────────────────────────────────────────
  const nRows = df.index.size;
  const totalRows = nRows * suffixOrder.length;

  const idColData: Map<string, Scalar[]> = new Map(idCols.map((c) => [c, []]));
  const jCol: Scalar[] = [];
  const stubColData: Map<string, Scalar[]> = new Map(stubs.map((s) => [s, []]));

  // ── fill output arrays ────────────────────────────────────────────────────
  for (const rawSfx of suffixOrder) {
    const parsedJ = parseSuffix(rawSfx);
    for (let ri = 0; ri < nRows; ri++) {
      // id columns
      for (const col of idCols) {
        (idColData.get(col) as Scalar[]).push(df.col(col).values[ri] ?? null);
      }
      // j column
      jCol.push(parsedJ);
      // stub columns
      for (const stub of stubs) {
        const colName = `${stub}${sep}${rawSfx}`;
        const val: Scalar = df.has(colName) ? (df.col(colName).values[ri] ?? null) : null;
        (stubColData.get(stub) as Scalar[]).push(val);
      }
    }
  }

  // ── assemble output DataFrame ─────────────────────────────────────────────
  const outCols: Record<string, readonly Scalar[]> = {};
  for (const col of idCols) {
    const arr = idColData.get(col);
    if (arr !== undefined) {
      outCols[col] = arr;
    }
  }
  outCols[j] = jCol;
  for (const stub of stubs) {
    const arr = stubColData.get(stub);
    if (arr !== undefined) {
      outCols[stub] = arr;
    }
  }

  const rowIndex: Index<Label> =
    totalRows === 0
      ? (new RangeIndex(0) as unknown as Index<Label>)
      : (new RangeIndex(totalRows) as unknown as Index<Label>);

  return DataFrame.fromColumns(outCols, { index: rowIndex });
}
