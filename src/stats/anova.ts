/**
 * Analysis of Variance (ANOVA).
 *
 * - `oneWayAnova`  — one-way ANOVA (single factor)
 * - `twoWayAnova`  — two-way ANOVA (two factors, no interaction term)
 *
 * Both return an F-statistic, p-value, and supplementary table.
 *
 * @example
 * ```ts
 * import { oneWayAnova } from "tsb";
 * const result = oneWayAnova([[2, 3, 5], [6, 7, 9], [10, 11, 13]]);
 * console.log(result.fStatistic, result.pValue); // large F, small p
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── result types ─────────────────────────────────────────────────────────────

/** A single row in an ANOVA summary table. */
export interface AnovaRow {
  /** Source of variation. */
  source: string;
  /** Sum of squares. */
  ss: number;
  /** Degrees of freedom. */
  df: number;
  /** Mean squares (ss / df). */
  ms: number;
  /** F-statistic (null for error/total rows). */
  f: number | null;
  /** p-value (null for error/total rows). */
  pValue: number | null;
}

/** Result of a one-way ANOVA. */
export interface OneWayAnovaResult {
  /** F-statistic. */
  fStatistic: number;
  /** p-value for the F-test. */
  pValue: number;
  /** Degrees of freedom for the between-groups variance. */
  dfBetween: number;
  /** Degrees of freedom for the within-groups (error) variance. */
  dfWithin: number;
  /** ANOVA summary table as a DataFrame. */
  table: DataFrame;
}

/** Result of a two-way ANOVA. */
export interface TwoWayAnovaResult {
  /** ANOVA summary table as a DataFrame. */
  table: DataFrame;
  /** Row entries (parallel to the table). */
  rows: readonly AnovaRow[];
}

// ─── math helpers ─────────────────────────────────────────────────────────────

function mean(xs: readonly number[]): number {
  if (xs.length === 0) {
    return Number.NaN;
  }
  let s = 0;
  for (const x of xs) {
    s += x;
  }
  return s / xs.length;
}

/** Log-gamma via Lanczos approximation. */
function lnGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0] ?? 0;
  for (let i = 1; i < g + 2; i++) {
    x += (c[i] ?? 0) / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Lentz continued-fraction for regularized incomplete beta. */
function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200;
  let f = 1e-30;
  let c = f;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) {
    d = 1e-30;
  }
  d = 1 / d;
  f = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    // Even step
    let num = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    f *= d * c;
    // Odd step
    num = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) {
      d = 1e-30;
    }
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) {
      c = 1e-30;
    }
    d = 1 / d;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-12) {
      break;
    }
  }
  return f;
}

/** Regularized incomplete beta I_x(a, b). */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCF(a, b, x)) / a;
  }
  return 1 - (bt * betaCF(b, a, 1 - x)) / b;
}

/**
 * Survival function of the F-distribution: P(F(df1, df2) > f).
 *
 * Uses the identity: P(F > f) = I_x(df2/2, df1/2)
 * where x = df2 / (df2 + df1 * f).
 */
function fSf(f: number, df1: number, df2: number): number {
  if (f <= 0) {
    return 1;
  }
  const x = df2 / (df2 + df1 * f);
  return incompleteBeta(df2 / 2, df1 / 2, x);
}

// ─── helpers for building summary table ──────────────────────────────────────

function buildTable(rows: readonly AnovaRow[]): DataFrame {
  const source: Scalar[] = rows.map((r) => r.source);
  const ss: Scalar[] = rows.map((r) => r.ss);
  const df: Scalar[] = rows.map((r) => r.df);
  const ms: Scalar[] = rows.map((r) => r.ms);
  const fCol: Scalar[] = rows.map((r) => r.f ?? null);
  const pCol: Scalar[] = rows.map((r) => r.pValue ?? null);
  return DataFrame.fromColumns(
    { source, SS: ss, df, MS: ms, F: fCol, "p-value": pCol },
    { index: rows.map((_, i) => String(i)) },
  );
}

// ─── one-way ANOVA ────────────────────────────────────────────────────────────

/**
 * One-way ANOVA: tests whether the means of multiple groups are equal.
 *
 * H₀: μ₁ = μ₂ = … = μₖ
 *
 * @param groups - Array of numeric arrays, one per group. Each must have ≥1 value.
 * @returns OneWayAnovaResult with F-statistic, p-value, df, and summary table.
 *
 * @example
 * ```ts
 * const result = oneWayAnova([[2, 3, 5], [6, 7, 9], [10, 11, 13]]);
 * result.fStatistic; // high → groups differ significantly
 * result.pValue;     // small
 * ```
 */
export function oneWayAnova(groups: readonly (readonly number[])[]): OneWayAnovaResult {
  if (groups.length < 2) {
    throw new Error("oneWayAnova requires at least 2 groups");
  }
  for (const g of groups) {
    if (g.length === 0) {
      throw new Error("oneWayAnova: each group must have at least one value");
    }
  }

  const k = groups.length;
  const N = groups.reduce((s, g) => s + g.length, 0);

  // Grand mean
  const allValues = ([] as number[]).concat(...(groups as number[][]));
  const grandMean = mean(allValues);

  // SS between
  let ssBetween = 0;
  const groupMeans: number[] = [];
  for (const g of groups) {
    const gMean = mean(g);
    groupMeans.push(gMean);
    ssBetween += g.length * (gMean - grandMean) ** 2;
  }

  // SS within
  let ssWithin = 0;
  for (let i = 0; i < groups.length; i++) {
    const gm = groupMeans[i] ?? 0;
    for (const v of groups[i] ?? []) {
      ssWithin += (v - gm) ** 2;
    }
  }

  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;

  const fStatistic = msWithin > 0 ? msBetween / msWithin : Number.POSITIVE_INFINITY;
  const pValue = msWithin > 0 ? fSf(fStatistic, dfBetween, dfWithin) : 0;

  const rows: AnovaRow[] = [
    {
      source: "Between Groups",
      ss: ssBetween,
      df: dfBetween,
      ms: msBetween,
      f: fStatistic,
      pValue,
    },
    {
      source: "Within Groups",
      ss: ssWithin,
      df: dfWithin,
      ms: msWithin,
      f: null,
      pValue: null,
    },
    {
      source: "Total",
      ss: ssBetween + ssWithin,
      df: N - 1,
      ms: (ssBetween + ssWithin) / (N - 1),
      f: null,
      pValue: null,
    },
  ];

  return { fStatistic, pValue, dfBetween, dfWithin, table: buildTable(rows) };
}

// ─── two-way ANOVA helpers ────────────────────────────────────────────────────

/** Compute marginal means for each level of a factor. */
function marginalMeans(
  values: readonly number[],
  factor: readonly string[],
  levels: readonly string[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const lv of levels) {
    const vals = (values as number[]).filter((_, i) => factor[i] === lv);
    map.set(lv, mean(vals));
  }
  return map;
}

/** SS for a main factor. */
function computeSSMainEffect(
  levels: readonly string[],
  factor: readonly string[],
  margMean: Map<string, number>,
  grandMean: number,
): number {
  return levels.reduce((s, lv) => {
    const nLv = factor.filter((v) => v === lv).length;
    const mLv = margMean.get(lv) ?? grandMean;
    return s + nLv * (mLv - grandMean) ** 2;
  }, 0);
}

interface CellStats {
  cellMean: Map<string, number>;
  cellCount: Map<string, number>;
}

/** Compute per-cell means and counts for a 2-factor design. */
function computeCellStats(
  values: readonly number[],
  levelsA: readonly string[],
  levelsB: readonly string[],
  factorA: readonly string[],
  factorB: readonly string[],
): CellStats {
  const cellMean = new Map<string, number>();
  const cellCount = new Map<string, number>();
  for (const la of levelsA) {
    for (const lb of levelsB) {
      const key = `${la}|${lb}`;
      const vals = (values as number[]).filter((_, i) => factorA[i] === la && factorB[i] === lb);
      cellMean.set(key, vals.length > 0 ? mean(vals) : 0);
      cellCount.set(key, vals.length);
    }
  }
  return { cellMean, cellCount };
}

/** SS interaction term (A × B). */
function computeSSInteraction(
  levelsA: readonly string[],
  levelsB: readonly string[],
  { cellMean, cellCount }: CellStats,
  meanA: Map<string, number>,
  meanB: Map<string, number>,
  grandMean: number,
): number {
  let ssAB = 0;
  for (const la of levelsA) {
    for (const lb of levelsB) {
      const key = `${la}|${lb}`;
      const n = cellCount.get(key) ?? 0;
      if (n === 0) {
        continue;
      }
      const cm = cellMean.get(key) ?? grandMean;
      const mA = meanA.get(la) ?? grandMean;
      const mB = meanB.get(lb) ?? grandMean;
      ssAB += n * (cm - mA - mB + grandMean) ** 2;
    }
  }
  return ssAB;
}

/** SS error within cells. */
function computeSSErrorCells(
  values: readonly number[],
  factorA: readonly string[],
  factorB: readonly string[],
  cellMean: Map<string, number>,
  grandMean: number,
): number {
  let ssError = 0;
  for (let i = 0; i < values.length; i++) {
    const la = factorA[i] ?? "";
    const lb = factorB[i] ?? "";
    const cm = cellMean.get(`${la}|${lb}`) ?? grandMean;
    ssError += ((values[i] ?? 0) - cm) ** 2;
  }
  return ssError;
}

/** Build rows for two-way ANOVA with interaction term. */
function buildRowsWithInteraction(
  ssA: number,
  ssB: number,
  ssTotal: number,
  a: number,
  b: number,
  N: number,
  values: readonly number[],
  levelsA: readonly string[],
  levelsB: readonly string[],
  factorA: readonly string[],
  factorB: readonly string[],
  meanA: Map<string, number>,
  meanB: Map<string, number>,
  grandMean: number,
): AnovaRow[] {
  const cellStats = computeCellStats(values, levelsA, levelsB, factorA, factorB);
  const ssAB = computeSSInteraction(levelsA, levelsB, cellStats, meanA, meanB, grandMean);
  const ssError = computeSSErrorCells(values, factorA, factorB, cellStats.cellMean, grandMean);

  const dfA = a - 1;
  const dfB = b - 1;
  const dfAB = (a - 1) * (b - 1);
  const dfError = N - a * b;

  const msA = ssA / dfA;
  const msB = ssB / dfB;
  const msAB = dfAB > 0 ? ssAB / dfAB : 0;
  const msError = dfError > 0 ? ssError / dfError : 0;

  const fA = msError > 0 ? msA / msError : Number.POSITIVE_INFINITY;
  const fB = msError > 0 ? msB / msError : Number.POSITIVE_INFINITY;
  const fAB = msError > 0 && dfAB > 0 ? msAB / msError : Number.POSITIVE_INFINITY;

  return [
    { source: "Factor A", ss: ssA, df: dfA, ms: msA, f: fA, pValue: fSf(fA, dfA, dfError) },
    { source: "Factor B", ss: ssB, df: dfB, ms: msB, f: fB, pValue: fSf(fB, dfB, dfError) },
    {
      source: "A × B",
      ss: ssAB,
      df: dfAB,
      ms: msAB,
      f: fAB,
      pValue: dfAB > 0 ? fSf(fAB, dfAB, dfError) : null,
    },
    { source: "Error", ss: ssError, df: dfError, ms: msError, f: null, pValue: null },
    { source: "Total", ss: ssTotal, df: N - 1, ms: ssTotal / (N - 1), f: null, pValue: null },
  ];
}

/** Build rows for two-way ANOVA without interaction term. */
function buildRowsNoInteraction(
  ssA: number,
  ssB: number,
  ssTotal: number,
  a: number,
  b: number,
  N: number,
): AnovaRow[] {
  const ssError = ssTotal - ssA - ssB;
  const dfA = a - 1;
  const dfB = b - 1;
  const dfError = N - a - b + 1;

  const msA = ssA / dfA;
  const msB = ssB / dfB;
  const msError = dfError > 0 ? ssError / dfError : 0;

  const fA = msError > 0 ? msA / msError : Number.POSITIVE_INFINITY;
  const fB = msError > 0 ? msB / msError : Number.POSITIVE_INFINITY;

  return [
    { source: "Factor A", ss: ssA, df: dfA, ms: msA, f: fA, pValue: fSf(fA, dfA, dfError) },
    { source: "Factor B", ss: ssB, df: dfB, ms: msB, f: fB, pValue: fSf(fB, dfB, dfError) },
    { source: "Error", ss: ssError, df: dfError, ms: msError, f: null, pValue: null },
    { source: "Total", ss: ssTotal, df: N - 1, ms: ssTotal / (N - 1), f: null, pValue: null },
  ];
}

// ─── two-way ANOVA ────────────────────────────────────────────────────────────

/**
 * Options for two-way ANOVA.
 */
export interface TwoWayAnovaOptions {
  /**
   * If true, include an interaction term (factor A × factor B) in the model.
   * Requires a balanced design (equal cell sizes). Default: false.
   */
  interaction?: boolean;
}

/**
 * Two-way ANOVA: tests main effects of two categorical factors.
 *
 * The input is a flat array of observations with factor labels.
 *
 * @param values   - Observed numeric values.
 * @param factorA  - Factor-A label for each observation (must match `values` length).
 * @param factorB  - Factor-B label for each observation (must match `values` length).
 * @param options  - Optional settings (interaction term, etc.).
 * @returns TwoWayAnovaResult with a summary table.
 *
 * @example
 * ```ts
 * const values  = [5, 6, 7, 8, 9, 10, 3, 4, 5, 6, 7,  8];
 * const factorA = ["A1","A1","A1","A1","A1","A1","A2","A2","A2","A2","A2","A2"];
 * const factorB = ["B1","B1","B1","B2","B2","B2","B1","B1","B1","B2","B2","B2"];
 * const result = twoWayAnova(values, factorA, factorB);
 * ```
 */
export function twoWayAnova(
  values: readonly number[],
  factorA: readonly string[],
  factorB: readonly string[],
  options: TwoWayAnovaOptions = {},
): TwoWayAnovaResult {
  const N = values.length;
  if (factorA.length !== N || factorB.length !== N) {
    throw new Error("twoWayAnova: values, factorA, and factorB must have the same length");
  }
  if (N === 0) {
    throw new Error("twoWayAnova requires at least one observation");
  }

  const levelsA = [...new Set(factorA)].sort();
  const levelsB = [...new Set(factorB)].sort();
  const a = levelsA.length;
  const b = levelsB.length;

  const grandMean = mean(values as number[]);
  const meanA = marginalMeans(values, factorA, levelsA);
  const meanB = marginalMeans(values, factorB, levelsB);

  const ssTotal = (values as number[]).reduce((s, v) => s + (v - grandMean) ** 2, 0);
  const ssA = computeSSMainEffect(levelsA, factorA, meanA, grandMean);
  const ssB = computeSSMainEffect(levelsB, factorB, meanB, grandMean);

  const rows =
    options.interaction === true
      ? buildRowsWithInteraction(
          ssA,
          ssB,
          ssTotal,
          a,
          b,
          N,
          values,
          levelsA,
          levelsB,
          factorA,
          factorB,
          meanA,
          meanB,
          grandMean,
        )
      : buildRowsNoInteraction(ssA, ssB, ssTotal, a, b, N);

  return { table: buildTable(rows), rows };
}
