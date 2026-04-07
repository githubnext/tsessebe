/**
 * rank — assign numerical ranks to values in a Series or DataFrame.
 *
 * Mirrors `pandas.Series.rank()` and `pandas.DataFrame.rank()`:
 * - `rankSeries(series, options)` — rank values in a Series
 * - `rankDataFrame(df, options)` — rank each column (or row) of a DataFrame
 *
 * Tie-breaking: `average`, `min`, `max`, `first`, `dense`
 * NaN handling: `keep` (→ NaN), `top` (lowest ranks), `bottom` (highest ranks)
 * Percentage rank: `pct: true` divides by the number of ranked observations.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Tie-breaking method for rank(). Mirrors pandas `method` parameter. */
export type RankMethod = "average" | "min" | "max" | "first" | "dense";

/** How NaN/null values are ranked. Mirrors pandas `na_option` parameter. */
export type NaOption = "keep" | "top" | "bottom";

/** Options for {@link rankSeries} and {@link rankDataFrame}. */
export interface RankOptions {
  /**
   * Tie-breaking method.
   * - `"average"` (default): average of the ranks for the tie group
   * - `"min"`: minimum rank of the tie group
   * - `"max"`: maximum rank of the tie group
   * - `"first"`: rank in order of first appearance (stable sort)
   * - `"dense"`: like `"min"`, but no rank gaps between distinct values
   */
  readonly method?: RankMethod;
  /**
   * If `true` (default), rank smallest value as 1.
   * If `false`, rank largest value as 1.
   */
  readonly ascending?: boolean;
  /**
   * How to handle NaN/null values.
   * - `"keep"` (default): NaN/null → NaN in result
   * - `"top"`: NaN/null get the lowest ranks (1, 2, …)
   * - `"bottom"`: NaN/null get the highest ranks (…, n−1, n)
   */
  readonly naOption?: NaOption;
  /**
   * If `true`, return fractional rank (rank ÷ denominator).
   * Denominator is the number of valid observations for `"keep"`,
   * or total `n` for `"top"` / `"bottom"`.  Default `false`.
   */
  readonly pct?: boolean;
  /**
   * Axis for {@link rankDataFrame}.
   * - `0` or `"index"` (default): rank each **column** independently
   * - `1` or `"columns"`: rank each **row** independently
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Compare two non-missing scalars; used for sort ordering. */
function cmpNonNull(a: number | string | boolean, b: number | string | boolean): -1 | 0 | 1 {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Return indices of non-missing values, sorted by value.
 * The sort is **stable** so ties preserve original order (used by "first").
 */
function sortedValidPositions(values: readonly Scalar[], ascending: boolean): number[] {
  const positions: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!isMissing(values[i] as Scalar)) {
      positions.push(i);
    }
  }
  positions.sort((a, b) => {
    const av = values[a] as number | string | boolean;
    const bv = values[b] as number | string | boolean;
    const c = cmpNonNull(av, bv);
    return ascending ? c : -c;
  });
  return positions;
}

/** Rank for a tie group occupying 0-indexed positions [start, end] in sorted array. */
function tieGroupRank(method: RankMethod, start: number, end: number, denseCount: number): number {
  if (method === "average") {
    return (start + end + 2) / 2;
  }
  if (method === "max") {
    return end + 1;
  }
  if (method === "dense") {
    return denseCount;
  }
  return start + 1; // "min" and fallback
}

/** Build position → rank map for "first" (1-indexed sorted position). */
function buildFirstRanks(sorted: readonly number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    map.set(sorted[i] as number, i + 1);
  }
  return map;
}

/** Build position → rank map for tie-aware methods (average/min/max/dense). */
function buildGroupedRanks(
  sorted: readonly number[],
  values: readonly Scalar[],
  method: RankMethod,
): Map<number, number> {
  const map = new Map<number, number>();
  const n = sorted.length;
  let i = 0;
  let denseCount = 0;
  while (i < n) {
    const start = i;
    const v = values[sorted[start] as number];
    let j = start + 1;
    while (j < n && values[sorted[j] as number] === v) {
      j++;
    }
    denseCount++;
    const rank = tieGroupRank(method, start, j - 1, denseCount);
    for (let k = start; k < j; k++) {
      map.set(sorted[k] as number, rank);
    }
    i = j;
  }
  return map;
}

/** Pct denominator: 1 when pct is false; nValid when keep; total n otherwise. */
function rankDenom(pct: boolean, naOption: NaOption, nValid: number, n: number): number {
  if (!pct) {
    return 1;
  }
  return naOption === "keep" ? nValid : n;
}

/** Convert null (naOption="keep" sentinel) to NaN for the output Series. */
function nullToNaN(v: number | null): number {
  return v === null ? Number.NaN : v;
}

/** Write ranks for valid (non-missing) positions into `result`. */
function fillValidRanks(
  result: (number | null)[],
  values: readonly Scalar[],
  validMap: Map<number, number>,
  naOption: NaOption,
  nMissing: number,
  pct: boolean,
  denom: number,
): void {
  for (let i = 0; i < values.length; i++) {
    if (isMissing(values[i] as Scalar)) {
      continue;
    }
    const baseRank = validMap.get(i);
    if (baseRank !== undefined) {
      const r = naOption === "top" ? baseRank + nMissing : baseRank;
      result[i] = pct && denom > 0 ? r / denom : r;
    }
  }
}

/** Write ranks for missing positions when naOption is not "keep". */
function fillMissingRanks(
  result: (number | null)[],
  values: readonly Scalar[],
  naOption: NaOption,
  nValid: number,
  pct: boolean,
  denom: number,
): void {
  let ordinal = 0;
  for (let i = 0; i < values.length; i++) {
    if (!isMissing(values[i] as Scalar)) {
      continue;
    }
    const r = naOption === "top" ? ordinal + 1 : nValid + ordinal + 1;
    result[i] = pct && denom > 0 ? r / denom : r;
    ordinal++;
  }
}

/**
 * Core ranking of a scalar array.
 * Missing positions get `null` when `naOption="keep"`, a rank otherwise.
 */
function rankValues(
  values: readonly Scalar[],
  method: RankMethod,
  ascending: boolean,
  naOption: NaOption,
  pct: boolean,
): readonly (number | null)[] {
  const n = values.length;
  if (n === 0) {
    return [];
  }
  const sorted = sortedValidPositions(values, ascending);
  const nValid = sorted.length;
  const nMissing = n - nValid;
  const validMap =
    method === "first" ? buildFirstRanks(sorted) : buildGroupedRanks(sorted, values, method);
  const denom = rankDenom(pct, naOption, nValid, n);
  const result = new Array<number | null>(n).fill(null);
  fillValidRanks(result, values, validMap, naOption, nMissing, pct, denom);
  if (naOption !== "keep") {
    fillMissingRanks(result, values, naOption, nValid, pct, denom);
  }
  return result;
}

// ─── axis-1 helper ────────────────────────────────────────────────────────────

interface ResolvedOpts {
  readonly method: RankMethod;
  readonly ascending: boolean;
  readonly naOption: NaOption;
  readonly pct: boolean;
}

/** Rank a DataFrame row-by-row (axis=1). */
function rankByRow(df: DataFrame, opts: ResolvedOpts): DataFrame {
  const colNames = [...df.columns.values];
  const nRows = df.index.size;
  const nCols = colNames.length;
  const colData: number[][] = colNames.map(() => new Array<number>(nRows).fill(Number.NaN));
  for (let i = 0; i < nRows; i++) {
    const rowVals: Scalar[] = colNames.map((name) => df.col(name).values[i] as Scalar);
    const ranked = rankValues(rowVals, opts.method, opts.ascending, opts.naOption, opts.pct);
    for (let j = 0; j < nCols; j++) {
      const r = ranked[j];
      const col = colData[j];
      if (col !== undefined) {
        col[i] = r == null ? Number.NaN : r;
      }
    }
  }
  const colMap = new Map<string, Series<Scalar>>();
  for (let j = 0; j < nCols; j++) {
    const name = colNames[j];
    const col = colData[j];
    if (name !== undefined && col !== undefined) {
      colMap.set(name, new Series<number>({ data: col, index: df.index }));
    }
  }
  return new DataFrame(colMap, df.index);
}

// ─── resolve options ──────────────────────────────────────────────────────────

function resolveOpts(options: RankOptions): ResolvedOpts {
  return {
    method: options.method ?? "average",
    ascending: options.ascending ?? true,
    naOption: options.naOption ?? "keep",
    pct: options.pct ?? false,
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Assign numerical ranks to the values of a Series.
 *
 * Mirrors `pandas.Series.rank()`.
 *
 * @param series  - Input Series (numeric, string, or boolean values).
 * @param options - Ranking options.
 * @returns A new `Series<number>` of the same length and index as the input.
 *          NaN entries appear where the input was missing and `naOption="keep"`.
 *
 * @example
 * ```ts
 * import { Series, rankSeries } from "tsb";
 *
 * const s = new Series({ data: [3, 1, 4, 1, 5] });
 * rankSeries(s).values;                          // [3, 1.5, 4, 1.5, 5]
 * rankSeries(s, { method: "first" }).values;     // [3, 1, 4, 2, 5]
 * rankSeries(s, { method: "dense" }).values;     // [3, 1, 4, 1, 5]
 * rankSeries(s, { ascending: false }).values;    // [3, 4.5, 2, 4.5, 1]
 * ```
 */
export function rankSeries(series: Series<Scalar>, options: RankOptions = {}): Series<number> {
  const opts = resolveOpts(options);
  const ranked = rankValues(series.values, opts.method, opts.ascending, opts.naOption, opts.pct);
  return new Series<number>({
    data: ranked.map(nullToNaN),
    index: series.index,
    name: series.name,
  });
}

/**
 * Assign numerical ranks to each column (or row) of a DataFrame.
 *
 * Mirrors `pandas.DataFrame.rank()`.
 *
 * @param df      - Input DataFrame.
 * @param options - Ranking options.  Use `axis: 1` to rank each row instead
 *                  of each column.
 * @returns A new DataFrame with the same shape and labels as the input,
 *          where every value has been replaced by its rank.
 *
 * @example
 * ```ts
 * import { DataFrame, rankDataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
 * rankDataFrame(df).col("a").values; // [3, 1, 2]
 * rankDataFrame(df).col("b").values; // [1, 3, 2]
 * ```
 */
export function rankDataFrame(df: DataFrame, options: RankOptions = {}): DataFrame {
  const opts = resolveOpts(options);
  const axis = options.axis ?? 0;
  if (axis === 1 || axis === "columns") {
    return rankByRow(df, opts);
  }
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of df.columns.values) {
    const col = df.col(name);
    const ranked = rankValues(col.values, opts.method, opts.ascending, opts.naOption, opts.pct);
    colMap.set(name, new Series<number>({ data: ranked.map(nullToNaN), index: df.index }));
  }
  return new DataFrame(colMap, df.index);
}
