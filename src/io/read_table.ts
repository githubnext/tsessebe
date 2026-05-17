/**
 * readTable — read a general delimiter-separated text file into a DataFrame.
 *
 * Mirrors `pandas.read_table()`:
 * - Same signature as `readCsv` but defaults `sep` to `"\t"`.
 * - Handles any single-character (or multi-character) delimiter.
 * - All `ReadCsvOptions` are supported; when `sep` is omitted it falls back
 *   to `"\t"` (tab), distinguishing this function from `readCsv` (whose
 *   default is `","`).
 *
 * @module
 */

import { readCsv } from "./csv.ts";
import type { ReadCsvOptions } from "./csv.ts";
import type { DataFrame } from "../core/index.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Options for {@link readTable}.
 *
 * Identical to {@link ReadCsvOptions} except the default `sep` is `"\t"`.
 */
export interface ReadTableOptions extends ReadCsvOptions {
  /** Column separator. Default: `"\t"` (tab). */
  readonly sep?: string;
}

// ─── implementation ───────────────────────────────────────────────────────────

/**
 * Parse a delimiter-separated text string into a {@link DataFrame}.
 *
 * Equivalent to `pandas.read_table()` — the same as {@link readCsv} but
 * defaults to a tab separator instead of a comma.
 *
 * ```ts
 * import { readTable } from "tsb";
 *
 * const tsv = "name\tage\tscity\nAlice\t30\tNY\nBob\t25\tLA";
 * const df = readTable(tsv);
 * // DataFrame with columns: name, age, city
 * ```
 *
 * @param text    Raw text content of the file.
 * @param options Parsing options (see {@link ReadTableOptions}).
 */
export function readTable(text: string, options: ReadTableOptions = {}): DataFrame {
  const sep = options.sep ?? "\t";
  return readCsv(text, { ...options, sep });
}
