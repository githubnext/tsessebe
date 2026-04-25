/**
 * str_get_dummies — split string Series by separator and return a DataFrame of
 * binary dummy/indicator variables.
 *
 * Mirrors `pandas.Series.str.get_dummies(sep='|')`.
 *
 * Each element is split by `sep`; the unique tokens across all elements become
 * columns.  A cell is **1** if the token appeared in that row, **0** otherwise.
 * Missing values (`null` / `undefined` / `NaN`) contribute no tokens and
 * produce a row of all zeros.  Columns are sorted lexicographically and the
 * original Series index is preserved on the returned DataFrame.
 *
 * @example
 * ```ts
 * import { Series, strGetDummies } from "tsb";
 *
 * const s = new Series({ data: ["a|b", "b|c", "a"], name: "flags" });
 * const df = strGetDummies(s);
 * // DataFrame:
 * //    a  b  c
 * // 0  1  1  0
 * // 1  0  1  1
 * // 2  1  0  0
 * ```
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── Options ─────────────────────────────────────────────────────────────────

/** Options for {@link strGetDummies}. */
export interface StrGetDummiesOptions {
  /**
   * Separator string used to split each element.
   * @default "|"
   */
  readonly sep?: string;

  /**
   * Optional prefix prepended to every column name.
   * @default ""
   */
  readonly prefix?: string;

  /**
   * Separator between the prefix and the token name.
   * @default "_"
   */
  readonly prefixSep?: string;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Split each string in `series` by `sep` and return a DataFrame of binary
 * dummy/indicator variables — one column per unique token.
 *
 * Mirrors `pandas.Series.str.get_dummies(sep)`.
 *
 * @param series  A Series whose values are strings (or null/undefined/NaN).
 * @param options Options controlling the separator (default `"|"`).
 * @returns       A DataFrame with the same index as `series` and integer
 *                (`0`/`1`) columns — one per unique token, sorted
 *                lexicographically.
 *
 * @example
 * ```ts
 * import { Series, strGetDummies } from "tsb";
 *
 * const s = new Series({ data: ["a|b", "b|c", null], name: "tags" });
 * const df = strGetDummies(s, { sep: "|" });
 * //    a  b  c
 * // 0  1  1  0
 * // 1  0  1  1
 * // 2  0  0  0
 * ```
 */
export function strGetDummies(
  series: Series<Scalar>,
  options: StrGetDummiesOptions = {},
): DataFrame {
  const sep = options.sep ?? "|";
  const prefix = options.prefix ?? "";
  const prefixSep = options.prefixSep ?? "_";
  const colName = (token: string): string =>
    prefix === "" ? token : `${prefix}${prefixSep}${token}`;
  const vals = series.values;
  const n = vals.length;

  // Collect all unique tokens and per-row token sets.
  const tokenSet = new Set<string>();
  const rowTokens: Set<string>[] = new Array<Set<string>>(n);

  for (let i = 0; i < n; i++) {
    const v = vals[i];
    const tokens = new Set<string>();
    if (v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v))) {
      const str = typeof v === "string" ? v : String(v);
      if (str !== "") {
        for (const tok of str.split(sep)) {
          tokens.add(tok);
          tokenSet.add(tok);
        }
      }
    }
    rowTokens[i] = tokens;
  }

  // Sort tokens lexicographically (pandas sorts columns for get_dummies).
  const columns = [...tokenSet].sort();

  // Build one Series per column.  Use a Map (rather than a plain object)
  // so that lexicographic order is preserved even for integer-like token
  // names (plain object keys re-order numeric strings).
  const idx = series.index;
  const colMap = new Map<string, Series<Scalar>>();
  for (const col of columns) {
    const arr: Scalar[] = new Array<Scalar>(n);
    for (let i = 0; i < n; i++) {
      arr[i] = rowTokens[i]?.has(col) === true ? 1 : 0;
    }
    colMap.set(colName(col), new Series<Scalar>({ data: arr, index: idx }));
  }

  return new DataFrame(colMap, idx);
}
