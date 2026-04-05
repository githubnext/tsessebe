/**
 * wide_to_long — reshape wide-format DataFrames to long format.
 *
 * Mirrors `pandas.wide_to_long`:
 *   - Takes "stub" column prefixes and converts them to rows.
 *   - Produces a long-format DataFrame with a `variable` column.
 */

import { Index } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for {@link wideToLong}. */
export interface WideToLongOptions {
  /** Column name prefixes (stubs) to unpivot. */
  stubnames: readonly string[];
  /** Column(s) to use as the row identifier. */
  i: string | readonly string[];
  /** Name for the new suffix column. Default `"year"`. */
  j?: string;
  /** Separator between stubname and suffix. Default `""`. */
  sep?: string;
  /** Suffix regex pattern. Default `"\\d+"`. */
  suffix?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Ensure i is always an array. */
function normaliseI(i: string | readonly string[]): string[] {
  return typeof i === "string" ? [i] : [...i];
}

/** Extract unique suffixes for a given stubname from column names. */
function extractSuffixes(
  columns: readonly string[],
  stub: string,
  sep: string,
  suffixRe: RegExp,
): string[] {
  const prefix = stub + sep;
  const result: string[] = [];
  for (const col of columns) {
    if (col.startsWith(prefix)) {
      const sfx = col.slice(prefix.length);
      if (suffixRe.test(sfx)) {
        result.push(sfx);
      }
    }
  }
  return [...new Set(result)];
}

/** Collect all unique suffixes across all stubs. */
function collectSuffixes(
  cols: readonly string[],
  stubnames: readonly string[],
  sep: string,
  suffixRe: RegExp,
): string[] {
  const suffixSet = new Set<string>();
  for (const stub of stubnames) {
    for (const sfx of extractSuffixes(cols, stub, sep, suffixRe)) {
      suffixSet.add(sfx);
    }
  }
  return [...suffixSet].sort();
}

/** Push one expanded row into the accumulator. */
function pushRow(
  df: DataFrame,
  rowIdx: number,
  idCols: string[],
  stubnames: readonly string[],
  suffix: string,
  sep: string,
  jCol: string,
  data: Record<string, Scalar[]>,
): void {
  for (const id of idCols) {
    const v = (df.col(id) as Series<Scalar>).values[rowIdx] ?? null;
    data[id]?.push(v);
  }
  data[jCol]?.push(suffix as Scalar);
  for (const stub of stubnames) {
    const colName = `${stub}${sep}${suffix}`;
    const colExists = df.columns.toArray().includes(colName);
    const v = colExists ? ((df.col(colName) as Series<Scalar>).values[rowIdx] ?? null) : null;
    data[stub]?.push(v);
  }
}

// ─── wideToLong ───────────────────────────────────────────────────────────────

/**
 * Reshape wide-format DataFrame to long format.
 *
 * @example
 * ```ts
 * // const df = DataFrame.fromColumns({ id: [1, 2], A2020: [10, 20], A2021: [11, 21] });
 * wideToLong(df, { stubnames: ["A"], i: "id", j: "year", sep: "" });
 * // => DataFrame with columns [id, year, A]
 * ```
 */
export function wideToLong(df: DataFrame, opts: WideToLongOptions): DataFrame {
  const idCols = normaliseI(opts.i);
  const jCol = opts.j ?? "year";
  const sep = opts.sep ?? "";
  const suffixPattern = opts.suffix ?? "\\d+";
  const suffixRe = new RegExp(`^${suffixPattern}$`);

  const cols = df.columns.toArray();
  const suffixes = collectSuffixes(cols, opts.stubnames, sep, suffixRe);

  const nRows = df.shape[0];
  const allCols = [...idCols, jCol, ...opts.stubnames];
  const data: Record<string, Scalar[]> = {};
  for (const col of allCols) {
    data[col] = [];
  }

  const newIdx: Label[] = [];
  const origIdx = df.index.toArray();

  for (let i = 0; i < nRows; i++) {
    for (const sfx of suffixes) {
      pushRow(df, i, idCols, opts.stubnames, sfx, sep, jCol, data);
      newIdx.push(origIdx[i] as Label);
    }
  }

  return DataFrame.fromColumns(data, { index: new Index<Label>(newIdx) });
}
