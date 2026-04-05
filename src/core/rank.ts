/**
 * rankSeries — element-wise rank of a Series.
 *
 * Mirrors `pandas.Series.rank` with method=average/min/max/first/dense
 * and na_option=keep/top/bottom.
 *
 * This is a standalone export that does not conflict with the `rank`
 * function exported from sort.ts (which returns a full rank-sorted
 * DataFrame).
 */

import type { Scalar } from "../types.ts";
import { Series } from "./series.ts";

/** Ranking method — matches pandas `method` parameter. */
export type RankMethod2 = "average" | "min" | "max" | "first" | "dense";

/** How NaN/null values are ranked. */
export type RankNa = "keep" | "top" | "bottom";

/** Options for {@link rankSeries2}. */
export interface RankSeriesOptions {
  method?: RankMethod2;
  ascending?: boolean;
  na_option?: RankNa;
  pct?: boolean;
}

/** Pair of index and value used during ranking. */
interface RankPair {
  i: number;
  v: number;
}

/** True if v is a finite number (not NaN, not null/undefined). */
function isFinite2(v: Scalar): v is number {
  return (
    typeof v === "number" &&
    !Number.isNaN(v) &&
    v !== Number.POSITIVE_INFINITY &&
    v !== Number.NEGATIVE_INFINITY
  );
}

/** Assign average rank to a run of equal values. */
function assignAverageRank(
  ranks: number[],
  pairs: readonly RankPair[],
  start: number,
  end: number,
): void {
  const avg = pairs.slice(start, end).reduce((s, p) => s + p.i + 1, 0) / (end - start);
  for (let k = start; k < end; k++) {
    const p = pairs[k];
    if (p !== undefined) {
      ranks[p.i] = avg;
    }
  }
}

/** Assign min rank to a run. */
function assignMinRank(
  ranks: number[],
  pairs: readonly RankPair[],
  start: number,
  end: number,
): void {
  const minR = start + 1;
  for (let k = start; k < end; k++) {
    const p = pairs[k];
    if (p !== undefined) {
      ranks[p.i] = minR;
    }
  }
}

/** Assign max rank to a run. */
function assignMaxRank(
  ranks: number[],
  pairs: readonly RankPair[],
  start: number,
  end: number,
): void {
  const maxR = end;
  for (let k = start; k < end; k++) {
    const p = pairs[k];
    if (p !== undefined) {
      ranks[p.i] = maxR;
    }
  }
}

/** Assign first rank (positional) to a run. */
function assignFirstRank(
  ranks: number[],
  pairs: readonly RankPair[],
  start: number,
  end: number,
): void {
  for (let k = start; k < end; k++) {
    const p = pairs[k];
    if (p !== undefined) {
      ranks[p.i] = k + 1;
    }
  }
}

/** Assign dense rank to a run. */
function assignDenseRank(
  ranks: number[],
  pairs: readonly RankPair[],
  start: number,
  _end: number,
  denseR: number,
): void {
  for (let k = start; k < _end; k++) {
    const p = pairs[k];
    if (p !== undefined) {
      ranks[p.i] = denseR;
    }
  }
}

/** Assign ranks to sorted pairs according to method. */
function assignRanks(ranks: number[], sorted: readonly RankPair[], method: RankMethod2): void {
  let denseCounter = 1;
  let runStart = 0;
  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = i < sorted.length ? sorted[i] : undefined;
    const endRun = cur === undefined || prev === undefined || cur.v !== prev.v;
    if (endRun) {
      switch (method) {
        case "average":
          assignAverageRank(ranks, sorted, runStart, i);
          break;
        case "min":
          assignMinRank(ranks, sorted, runStart, i);
          break;
        case "max":
          assignMaxRank(ranks, sorted, runStart, i);
          break;
        case "first":
          assignFirstRank(ranks, sorted, runStart, i);
          break;
        case "dense": {
          assignDenseRank(ranks, sorted, runStart, i, denseCounter);
          denseCounter++;
          break;
        }
        default:
          assignAverageRank(ranks, sorted, runStart, i);
          break;
      }
      runStart = i;
    }
  }
}

/** Apply NA option ranks. */
function applyNaOption(
  ranks: number[],
  naPosns: readonly number[],
  naOption: RankNa,
  total: number,
): void {
  if (naOption === "top") {
    for (const pos of naPosns) {
      ranks[pos] = 0;
    }
  } else if (naOption === "bottom") {
    for (const pos of naPosns) {
      ranks[pos] = total + 1;
    }
  }
}

/** Apply pct normalization to numeric ranks. */
function applyPct(ranks: number[], n: number, total: number, naOption: RankNa): void {
  const skipNa = naOption !== "top" && naOption !== "bottom";
  for (let i = 0; i < n; i++) {
    if (skipNa && !Number.isNaN(ranks[i] ?? Number.NaN)) {
      ranks[i] = (ranks[i] ?? 0) / total;
    }
  }
}

/**
 * Compute element-wise rank of a numeric Series.
 *
 * @example
 * ```ts
 * rankSeries2(new Series({ data: [3, 1, 2] })); // [3, 1, 2]
 * rankSeries2(new Series({ data: [1, 1, 2] }), { method: "min" }); // [1, 1, 3]
 * ```
 */
export function rankSeries2(s: Series<Scalar>, opts: RankSeriesOptions = {}): Series<Scalar> {
  const method = opts.method ?? "average";
  const ascending = opts.ascending ?? true;
  const naOption = opts.na_option ?? "keep";
  const pct = opts.pct ?? false;

  const vals = s.values;
  const n = vals.length;
  const ranks: number[] = new Array<number>(n).fill(Number.NaN);

  const numericPairs: RankPair[] = [];
  const naPosns: number[] = [];

  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
      naPosns.push(i);
    } else if (isFinite2(v)) {
      numericPairs.push({ i, v });
    }
  }

  numericPairs.sort((a, b) => (ascending ? a.v - b.v : b.v - a.v));
  assignRanks(ranks, numericPairs, method);

  const total = numericPairs.length;

  applyNaOption(ranks, naPosns, naOption, total);

  if (pct && total > 0) {
    applyPct(ranks, n, total, naOption);
  }

  const out: Scalar[] = ranks.map((r) => (Number.isNaN(r) ? null : r));
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}
