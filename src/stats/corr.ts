/**
 * Correlation — Pearson, Spearman, and Kendall correlation coefficients.
 *
 * Mirrors `pandas.Series.corr` / `pandas.DataFrame.corr`.
 *
 * Supported methods:
 * - `"pearson"` (default) — linear correlation coefficient
 * - `"spearman"` — rank-based correlation
 * - `"kendall"` — Kendall's tau-b
 *
 * All methods use pairwise-complete observations.
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Supported correlation methods. */
export type CorrMethod = "pearson" | "spearman" | "kendall";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when scalar is considered missing (null | undefined | NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Extract aligned numeric pairs from two Series. */
function alignedNumericPairs(a: Series<Scalar>, b: Series<Scalar>): [number[], number[]] {
  const n = Math.min(a.values.length, b.values.length);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = a.values[i];
    const y = b.values[i];
    if (!isMissing(x) && !isMissing(y) && typeof x === "number" && typeof y === "number") {
      xs.push(x);
      ys.push(y);
    }
  }
  return [xs, ys];
}

// ─── Pearson ──────────────────────────────────────────────────────────────────

/** Pearson r correlation between two numeric arrays of equal length. */
function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) {
    return Number.NaN;
  }
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sx2 = 0;
  let sy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    sxy += dx * dy;
    sx2 += dx * dx;
    sy2 += dy * dy;
  }
  const denom = Math.sqrt(sx2 * sy2);
  if (denom === 0) {
    return Number.NaN;
  }
  return sxy / denom;
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────

/** Assign average ranks to an array (handles ties). */
function averageRanks(xs: readonly number[]): number[] {
  const n = xs.length;
  const indexed = xs.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && (indexed[j + 1]?.v ?? 0) === (indexed[j]?.v ?? 0)) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      const item = indexed[k];
      if (item !== undefined) {
        ranks[item.i] = avgRank;
      }
    }
    i = j + 1;
  }
  return ranks;
}

// ─── Spearman ─────────────────────────────────────────────────────────────────

/** Spearman rank correlation. */
function spearman(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length < 2) {
    return Number.NaN;
  }
  const rx = averageRanks(xs);
  const ry = averageRanks(ys);
  return pearson(rx, ry);
}

// ─── Kendall tau-b ────────────────────────────────────────────────────────────

/** Kendall's tau-b correlation. */
function kendall(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) {
    return Number.NaN;
  }
  let concordant = 0;
  let discordant = 0;
  let tiesX = 0;
  let tiesY = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = (xs[j] as number) - (xs[i] as number);
      const dy = (ys[j] as number) - (ys[i] as number);
      if (dx === 0 && dy === 0) {
        tiesX++;
        tiesY++;
      } else if (dx === 0) {
        tiesX++;
      } else if (dy === 0) {
        tiesY++;
      } else if (dx * dy > 0) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }
  const pairs = (n * (n - 1)) / 2;
  const denom = Math.sqrt((pairs - tiesX) * (pairs - tiesY));
  if (denom === 0) {
    return Number.NaN;
  }
  return (concordant - discordant) / denom;
}

// ─── dispatch ─────────────────────────────────────────────────────────────────

/** Dispatch to the selected correlation method. */
function computeCorr(
  xs: readonly number[],
  ys: readonly number[],
  method: CorrMethod,
): number {
  if (method === "spearman") {
    return spearman(xs, ys);
  }
  if (method === "kendall") {
    return kendall(xs, ys);
  }
  return pearson(xs, ys);
}

// ─── corrSeries ───────────────────────────────────────────────────────────────

/**
 * Compute the correlation between two Series.
 *
 * @param a      - First Series.
 * @param b      - Second Series.
 * @param method - `"pearson"` (default), `"spearman"`, or `"kendall"`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, 3, 4, 5] });
 * const b = new Series({ data: [5, 4, 3, 2, 1] });
 * corrSeries(a, b);            // -1
 * corrSeries(a, b, "spearman"); // -1
 * ```
 */
export function corrSeries(
  a: Series<Scalar>,
  b: Series<Scalar>,
  method: CorrMethod = "pearson",
): number {
  const [xs, ys] = alignedNumericPairs(a, b);
  return computeCorr(xs, ys, method);
}

// ─── corrDataFrame ────────────────────────────────────────────────────────────

/**
 * Compute pairwise correlation of all numeric columns in a DataFrame.
 *
 * Returns a square correlation matrix as a new DataFrame.
 *
 * @param df     - Input DataFrame.
 * @param method - `"pearson"` (default), `"spearman"`, or `"kendall"`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [3,2,1], c: [1,1,1] });
 * corrDataFrame(df);
 * // 3×3 DataFrame with 1s on diagonal, -1 for a/b
 * ```
 */
export function corrDataFrame(df: DataFrame, method: CorrMethod = "pearson"): DataFrame {
  const numericCols = collectNumericCols(df);
  const colData: Record<string, Scalar[]> = {};

  for (const ci of numericCols) {
    const row: Scalar[] = [];
    for (const cj of numericCols) {
      if (ci === cj) {
        row.push(1);
      } else {
        const [xs, ys] = alignedNumericPairs(df.col(ci), df.col(cj));
        row.push(computeCorr(xs, ys, method));
      }
    }
    colData[ci] = row;
  }

  return DataFrame.fromColumns(colData, { index: numericCols });
}

/** Collect names of numeric columns from a DataFrame. */
function collectNumericCols(df: DataFrame): string[] {
  const out: string[] = [];
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    let isNumeric = true;
    for (const v of col.values) {
      if (!isMissing(v) && typeof v !== "number") {
        isNumeric = false;
        break;
      }
    }
    if (isNumeric) {
      out.push(colName);
    }
  }
  return out;
}
