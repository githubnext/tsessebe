/**
 * Sorting utilities — nlargest, nsmallest, rank, rankDataFrame.
 *
 * Mirrors the pandas sorting API:
 *   - `pd.Series.nlargest` / `pd.Series.nsmallest`
 *   - `pd.DataFrame.nlargest` / `pd.DataFrame.nsmallest`
 *   - `pd.Series.rank`
 *   - `pd.DataFrame.rank`
 *
 * These complement the existing `sortValues`/`sortIndex` methods on
 * `Series` and `DataFrame` with higher-level selection and ranking utilities.
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { RangeIndex } from "./range-index.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Convert a scalar to a comparable number; returns NaN for non-numeric. */
function toNumber(v: Scalar): number {
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  return Number.NaN;
}

/** Build a default RangeIndex of length n. */
function rangeIndex(n: number): Index<Label> {
  return new RangeIndex(n) as unknown as Index<Label>;
}

// ─── keep-tie helpers ─────────────────────────────────────────────────────────

/** Pair of original position + numeric value used for sorting. */
interface Pair {
  i: number;
  v: number;
}

/**
 * Positions for `keep="all"`: include every row whose value equals the
 * nth element (there may be more than n).
 */
function applyKeepAll(sorted: readonly Pair[], n: number): readonly number[] {
  const cutoff = sorted[n - 1]?.v;
  if (cutoff === undefined) {
    return sorted.map((p) => p.i);
  }
  return sorted.filter((p) => p.v === cutoff || sorted.indexOf(p) < n).map((p) => p.i);
}

/**
 * Positions for `keep="last"`: among boundary ties, prefer later occurrences.
 */
function applyKeepLast(sorted: readonly Pair[], n: number): readonly number[] {
  const boundary = sorted[n - 1];
  if (boundary === undefined) {
    return sorted.slice(0, n).map((p) => p.i);
  }
  const notTied = sorted.filter((p, idx) => idx < n && p.v !== boundary.v);
  const tied = sorted.filter((p) => p.v === boundary.v);
  const want = n - notTied.length;
  return [...notTied, ...tied.slice(tied.length - want)].map((p) => p.i);
}

/**
 * Given sorted (index, numericValue) pairs and a target count `n`,
 * expand or contract to honour `keep` tie-breaking semantics.
 *
 * - `"first"` — keep the first-occurring tied element.
 * - `"last"`  — keep the last-occurring tied element.
 * - `"all"`   — keep all tied values at the boundary (may exceed n).
 */
function applyKeep(
  sorted: readonly Pair[],
  n: number,
  keep: "first" | "last" | "all",
): readonly number[] {
  if (keep === "all") {
    return applyKeepAll(sorted, n);
  }
  if (keep === "last") {
    return applyKeepLast(sorted, n);
  }
  return sorted.slice(0, n).map((p) => p.i);
}

// ─── rank helpers ─────────────────────────────────────────────────────────────

/** Average (mean) of two boundary ranks — used for `average` rank method. */
function avgRange(start: number, end: number): number {
  return (start + end) / 2;
}

/** Assign "first" method ranks for tied positions [pos, end). */
function assignFirstRanks(
  pairs: readonly Pair[],
  ranks: number[],
  pos: number,
  end: number,
  ascending: boolean,
  nonMissingCount: number,
): void {
  for (let k = pos; k < end; k++) {
    const p = pairs[k] as Pair;
    ranks[p.i] = ascending ? k + 1 : nonMissingCount - k;
  }
}

/** Assign a single rank value to all tied positions [pos, end). */
function assignUniformRanks(
  pairs: readonly Pair[],
  ranks: number[],
  pos: number,
  end: number,
  assignedRank: number,
  ascending: boolean,
  nonMissingCount: number,
): void {
  for (let k = pos; k < end; k++) {
    const p = pairs[k] as Pair;
    ranks[p.i] = ascending ? assignedRank : nonMissingCount - assignedRank + 1;
  }
}

/** Compute the rank to assign for a single tie-group given method. */
function tieGroupRank(method: RankMethod, pos: number, end: number): number | null {
  if (method === "min") {
    return pos + 1;
  }
  if (method === "max") {
    return end;
  }
  if (method === "dense") {
    return pos + 1; // placeholder; corrected in dense pass
  }
  // average
  return avgRange(pos + 1, end);
}

/** Get the maximum non-NaN rank for dense pct normalisation. */
function getDenseMax(ranks: readonly number[], missing: readonly boolean[]): number {
  let max = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (!missing[i]) {
      const r = ranks[i] as number;
      if (!Number.isNaN(r) && r > max) {
        max = r;
      }
    }
  }
  return max;
}

/** Apply ascending dense-rank numbering across sorted pairs. */
function applyDenseAscending(
  pairs: readonly Pair[],
  ranks: number[],
  values: readonly number[],
): void {
  let denseRank = 1;
  let prevVal: number | undefined;
  for (const p of pairs) {
    const v = values[p.i] as number;
    if (prevVal !== undefined && v !== prevVal) {
      denseRank++;
    }
    prevVal = v;
    ranks[p.i] = denseRank;
  }
}

/** Invert dense ranks so higher values get lower ranks. */
function invertDenseRanks(ranks: number[], missing: readonly boolean[]): void {
  const maxDense = getDenseMax(ranks, missing);
  for (let i = 0; i < ranks.length; i++) {
    if (!missing[i]) {
      ranks[i] = maxDense - (ranks[i] as number) + 1;
    }
  }
}

/** Apply the dense-rank second pass (renumber without gaps). */
function applyDensePass(
  pairs: readonly Pair[],
  ranks: number[],
  values: readonly number[],
  ascending: boolean,
  missing: readonly boolean[],
): void {
  applyDenseAscending(pairs, ranks, values);
  if (!ascending) {
    invertDenseRanks(ranks, missing);
  }
}

/** NA rank: position given naOption and direction. */
function missingRank(
  naOption: "keep" | "top" | "bottom",
  ascending: boolean,
  nonMissingCount: number,
): number {
  if (naOption === "top") {
    return ascending ? 0 : nonMissingCount + 1;
  }
  if (naOption === "bottom") {
    return ascending ? nonMissingCount + 1 : 0;
  }
  return Number.NaN; // keep
}

/** Assign initial ranks to all non-missing pairs in tie-groups. */
function assignInitialRanks(
  pairs: readonly Pair[],
  ranks: number[],
  method: RankMethod,
  ascending: boolean,
  nonMissingCount: number,
): void {
  let pos = 0;
  while (pos < pairs.length) {
    let end = pos + 1;
    const val = (pairs[pos] as Pair).v;
    while (end < pairs.length && (pairs[end] as Pair).v === val) {
      end++;
    }
    if (method === "first") {
      assignFirstRanks(pairs, ranks, pos, end, ascending, nonMissingCount);
    } else {
      const assignedRank = tieGroupRank(method, pos, end);
      if (assignedRank !== null) {
        assignUniformRanks(pairs, ranks, pos, end, assignedRank, ascending, nonMissingCount);
      }
    }
    pos = end;
  }
}

/** Normalise ranks to percentile (0, 1] in-place. */
function normaliseToPct(
  ranks: number[],
  missing: readonly boolean[],
  naOption: "keep" | "top" | "bottom",
  denom: number,
): void {
  for (let i = 0; i < ranks.length; i++) {
    if (!missing[i] || naOption !== "keep") {
      const r = ranks[i] as number;
      if (!Number.isNaN(r)) {
        ranks[i] = r / denom;
      }
    }
  }
}

/**
 * Compute raw ranks (1-based) for an array of numeric values.
 *
 * @param values            - numeric values (NaN = missing)
 * @param method            - how to break ties
 * @param ascending         - rank direction
 * @param naOption          - how to handle NaN
 * @param pct               - if true, normalise to [0, 1]
 */
function computeRanks(
  values: readonly number[],
  method: RankMethod,
  ascending: boolean,
  naOption: "keep" | "top" | "bottom",
  pct: boolean,
): number[] {
  const n = values.length;
  const missing: boolean[] = values.map((v) => Number.isNaN(v));
  const nonMissingCount = missing.filter((m) => !m).length;

  // Build sorted pairs of non-missing (originalIndex, value)
  const pairs: Pair[] = [];
  for (let i = 0; i < n; i++) {
    if (!missing[i]) {
      pairs.push({ i, v: values[i] as number });
    }
  }
  pairs.sort((a, b) => (a.v === b.v ? a.i - b.i : a.v - b.v));

  const ranks = new Array<number>(n).fill(Number.NaN);
  assignInitialRanks(pairs, ranks, method, ascending, nonMissingCount);

  if (method === "dense") {
    applyDensePass(pairs, ranks, values, ascending, missing);
  }

  // Fill NA positions
  const naRank = missingRank(naOption, ascending, nonMissingCount);
  for (let i = 0; i < n; i++) {
    if (missing[i]) {
      ranks[i] = naRank;
    }
  }

  if (pct) {
    const denom = method === "dense" ? getDenseMax(ranks, missing) : nonMissingCount;
    normaliseToPct(ranks, missing, naOption, denom);
  }

  return ranks;
}

// ─── DataFrame row comparison ─────────────────────────────────────────────────

/** Compare a single column value at two row positions. Returns null if equal. */
function compareSingleColValue(av: number, bv: number): number | null {
  const aNaN = Number.isNaN(av);
  const bNaN = Number.isNaN(bv);
  if (aNaN && bNaN) {
    return null; // treat as equal, continue to next column
  }
  if (aNaN) {
    return 1; // NaN sorts last
  }
  if (bNaN) {
    return -1;
  }
  if (av !== bv) {
    return av - bv; // ascending (caller negates for descending)
  }
  return null; // equal
}

/** Multi-column comparison for DataFrame row selection. */
function compareRowEntries(
  aVs: readonly number[],
  bVs: readonly number[],
  aIdx: number,
  bIdx: number,
  direction: "largest" | "smallest",
): number {
  for (let k = 0; k < aVs.length; k++) {
    const av = aVs[k] as number;
    const bv = bVs[k] as number;
    const col = compareSingleColValue(av, bv);
    if (col !== null) {
      return direction === "largest" ? -col : col;
    }
  }
  return aIdx - bIdx; // stable by original position
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Tie-breaking method for `rank()`. */
export type RankMethod = "average" | "min" | "max" | "first" | "dense";

/** Options for `rank()` and `rankDataFrame()`. */
export interface RankOptions {
  /**
   * How to break ties.
   * - `"average"` (default) — average of tied ranks.
   * - `"min"` — lowest rank in the group.
   * - `"max"` — highest rank in the group.
   * - `"first"` — rank in order of appearance.
   * - `"dense"` — like `"min"` but ranks are never skipped.
   */
  readonly method?: RankMethod;
  /** If `true` (default), smaller values get lower ranks. */
  readonly ascending?: boolean;
  /**
   * How to handle NaN.
   * - `"keep"` (default) — NaN positions receive NaN rank.
   * - `"top"` — NaN values are treated as smallest (rank first when ascending).
   * - `"bottom"` — NaN values are treated as largest (rank last when ascending).
   */
  readonly naOption?: "keep" | "top" | "bottom";
  /** If `true`, normalise ranks to [0, 1]. */
  readonly pct?: boolean;
}

/** Options for `nlargest()` / `nsmallest()`. */
export interface NSelectOptions {
  /**
   * How to handle ties at the boundary.
   * - `"first"` (default) — use the first occurrence.
   * - `"last"` — use the last occurrence.
   * - `"all"` — keep all tied values at the cut-off (result may be > n rows).
   */
  readonly keep?: "first" | "last" | "all";
}

// ─── nlargest / nsmallest ─────────────────────────────────────────────────────

/**
 * Return the `n` largest values in `series` as a new Series.
 *
 * Mirrors `pd.Series.nlargest(n, keep="first")`.
 *
 * @param series  - input Series (must be numeric)
 * @param n       - number of values to return
 * @param options - tie-breaking options
 */
export function nlargest(
  series: Series<Scalar>,
  n: number,
  options: NSelectOptions = {},
): Series<Scalar> {
  const keep = options.keep ?? "first";
  const vals = series.values;
  const size = series.size;
  const clampedN = Math.min(Math.max(0, n), size);

  const pairs: Pair[] = [];
  for (let i = 0; i < size; i++) {
    const v = toNumber(vals[i] as Scalar);
    if (!Number.isNaN(v)) {
      pairs.push({ i, v });
    }
  }
  // Sort descending; ties broken by original index (stable for "first")
  pairs.sort((a, b) => (b.v !== a.v ? b.v - a.v : a.i - b.i));

  const positions = applyKeep(pairs, clampedN, keep);
  // Preserve the order of the original index (like pandas)
  const sortedPositions = [...positions].sort((a, b) => a - b);

  return new Series<Scalar>({
    data: sortedPositions.map((p) => vals[p] as Scalar),
    index: series.index.take(sortedPositions),
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Return the `n` smallest values in `series` as a new Series.
 *
 * Mirrors `pd.Series.nsmallest(n, keep="first")`.
 *
 * @param series  - input Series (must be numeric)
 * @param n       - number of values to return
 * @param options - tie-breaking options
 */
export function nsmallest(
  series: Series<Scalar>,
  n: number,
  options: NSelectOptions = {},
): Series<Scalar> {
  const keep = options.keep ?? "first";
  const vals = series.values;
  const size = series.size;
  const clampedN = Math.min(Math.max(0, n), size);

  const pairs: Pair[] = [];
  for (let i = 0; i < size; i++) {
    const v = toNumber(vals[i] as Scalar);
    if (!Number.isNaN(v)) {
      pairs.push({ i, v });
    }
  }
  // Sort ascending; ties broken by original index (stable for "first")
  pairs.sort((a, b) => (a.v !== b.v ? a.v - b.v : a.i - b.i));

  const positions = applyKeep(pairs, clampedN, keep);
  const sortedPositions = [...positions].sort((a, b) => a - b);

  return new Series<Scalar>({
    data: sortedPositions.map((p) => vals[p] as Scalar),
    index: series.index.take(sortedPositions),
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Return the rows of `df` containing the `n` largest values in the given column(s).
 *
 * Mirrors `pd.DataFrame.nlargest(n, columns, keep="first")`.
 *
 * @param df      - input DataFrame
 * @param n       - number of rows to return
 * @param columns - column name(s) to compare
 * @param options - tie-breaking options
 */
export function dataFrameNlargest(
  df: DataFrame,
  n: number,
  columns: string | readonly string[],
  options: NSelectOptions = {},
): DataFrame {
  return selectNRows(df, n, columns, "largest", options.keep ?? "first");
}

/**
 * Return the rows of `df` containing the `n` smallest values in the given column(s).
 *
 * Mirrors `pd.DataFrame.nsmallest(n, columns, keep="first")`.
 *
 * @param df      - input DataFrame
 * @param n       - number of rows to return
 * @param columns - column name(s) to compare
 * @param options - tie-breaking options
 */
export function dataFrameNsmallest(
  df: DataFrame,
  n: number,
  columns: string | readonly string[],
  options: NSelectOptions = {},
): DataFrame {
  return selectNRows(df, n, columns, "smallest", options.keep ?? "first");
}

/** Row entry: original position + per-column numeric values. */
interface RowEntry {
  i: number;
  vs: readonly number[];
}

/** Shared implementation for dataFrameNlargest / dataFrameNsmallest. */
function selectNRows(
  df: DataFrame,
  n: number,
  columns: string | readonly string[],
  direction: "largest" | "smallest",
  keep: "first" | "last" | "all",
): DataFrame {
  const cols = typeof columns === "string" ? [columns] : [...columns];
  const nRows = df.index.size;
  const clampedN = Math.min(Math.max(0, n), nRows);

  const pairs: RowEntry[] = Array.from({ length: nRows }, (_, i) => {
    const vs = cols.map((c) => {
      const s = df.get(c);
      return s !== undefined ? toNumber(s.values[i] as Scalar) : Number.NaN;
    });
    return { i, vs };
  });

  pairs.sort((a, b) => compareRowEntries(a.vs, b.vs, a.i, b.i, direction));

  let positions: number[];
  if (keep === "all" && clampedN < pairs.length) {
    const boundary = pairs[clampedN - 1];
    if (boundary !== undefined) {
      positions = pairs
        .filter((p, idx) => {
          return (
            idx < clampedN || compareRowEntries(p.vs, boundary.vs, p.i, boundary.i, direction) === 0
          );
        })
        .map((p) => p.i);
    } else {
      positions = pairs.slice(0, clampedN).map((p) => p.i);
    }
  } else if (keep === "last" && clampedN < pairs.length) {
    const boundary = pairs[clampedN - 1];
    if (boundary !== undefined) {
      const notTied = pairs.filter(
        (p, idx) =>
          idx < clampedN && compareRowEntries(p.vs, boundary.vs, p.i, boundary.i, direction) !== 0,
      );
      const tied = pairs.filter(
        (p) => compareRowEntries(p.vs, boundary.vs, p.i, boundary.i, direction) === 0,
      );
      const want = clampedN - notTied.length;
      positions = [...notTied, ...tied.slice(tied.length - want)].map((p) => p.i);
    } else {
      positions = pairs.slice(0, clampedN).map((p) => p.i);
    }
  } else {
    positions = pairs.slice(0, clampedN).map((p) => p.i);
  }

  // Preserve original row order (like pandas)
  positions.sort((a, b) => a - b);
  return selectDataFrameRows(df, positions);
}

/** Build a new DataFrame with only the rows at the given positions. */
function selectDataFrameRows(df: DataFrame, positions: readonly number[]): DataFrame {
  if (positions.length === 0) {
    const emptyIndex = rangeIndex(0);
    const emptyMap = new Map<string, Series<Scalar>>();
    for (const [name, col] of df.items()) {
      emptyMap.set(
        name,
        new Series<Scalar>({
          data: [],
          index: emptyIndex,
          dtype: col.dtype,
          name: col.name,
        }),
      );
    }
    return new DataFrame(emptyMap, emptyIndex);
  }

  const newIndex = df.index.take(positions);
  const colMap = new Map<string, Series<Scalar>>();
  for (const [name, col] of df.items()) {
    const vals = positions.map((p) => col.values[p] as Scalar);
    colMap.set(
      name,
      new Series<Scalar>({
        data: vals,
        index: newIndex,
        dtype: col.dtype,
        name: col.name,
      }),
    );
  }
  return new DataFrame(colMap, newIndex);
}

// ─── rank ─────────────────────────────────────────────────────────────────────

/**
 * Compute numerical rank for each element in `series`.
 *
 * Mirrors `pd.Series.rank(method='average', ascending=True, na_option='keep', pct=False)`.
 *
 * @param series  - input Series
 * @param options - ranking options
 * @returns a new `Series<number>` of ranks (1-based, or 0–1 if `pct=true`)
 */
export function rank(series: Series<Scalar>, options: RankOptions = {}): Series<number> {
  const method = options.method ?? "average";
  const ascending = options.ascending ?? true;
  const naOption = options.naOption ?? "keep";
  const pct = options.pct ?? false;

  const nums = series.values.map((v) => {
    if (isMissing(v)) {
      return Number.NaN;
    }
    return toNumber(v);
  });

  const ranks = computeRanks(nums, method, ascending, naOption, pct);

  return new Series<number>({
    data: ranks,
    index: series.index,
    dtype: series.dtype,
    name: series.name,
  });
}

/**
 * Compute numerical rank column-by-column in `df`.
 *
 * Mirrors `pd.DataFrame.rank(axis=0, method='average', ascending=True, na_option='keep', pct=False)`.
 *
 * Only numeric columns are ranked; non-numeric columns are replaced with NaN.
 *
 * @param df      - input DataFrame
 * @param options - ranking options
 * @returns a new `DataFrame` of float ranks
 */
export function rankDataFrame(df: DataFrame, options: RankOptions = {}): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  const idx = df.index;

  for (const [name, col] of df.items()) {
    const ranked = rank(col, options);
    colMap.set(
      name,
      new Series<Scalar>({
        data: ranked.values as readonly Scalar[],
        index: idx,
        name: ranked.name,
      }),
    );
  }

  if (colMap.size === 0) {
    return new DataFrame(new Map(), rangeIndex(0));
  }

  return new DataFrame(colMap, idx);
}
