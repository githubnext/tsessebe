/**
 * Survival analysis — Kaplan-Meier estimator and log-rank test.
 *
 * Mirrors `lifelines.KaplanMeierFitter` and `statsmodels.duration.survfunc`.
 * Provides non-parametric survival curve estimation and group comparison.
 *
 * @example
 * ```ts
 * import { kaplanMeier, logRankTest } from "tsb";
 *
 * const events = [
 *   { time: 5, event: true }, { time: 8, event: true },
 *   { time: 10, event: false }, { time: 12, event: true },
 * ];
 * const km = kaplanMeier(events);
 * // km.survivalProb: [0.75, 0.5, 0.25]
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** A single observation in a survival dataset. */
export interface SurvivalEvent {
  /** Observed time (follow-up duration). */
  time: number;
  /** Whether the event occurred (`true`) or was censored (`false`). */
  event: boolean;
}

/** Result of a Kaplan-Meier estimator. */
export interface KaplanMeierResult {
  /** Unique event times (ascending). */
  readonly times: readonly number[];
  /** Survival probability S(t) at each event time. */
  readonly survivalProb: readonly number[];
  /** Number at risk just before each event time. */
  readonly nAtRisk: readonly number[];
  /** Number of events at each event time. */
  readonly nEvents: readonly number[];
  /** Number of censored observations between consecutive event times. */
  readonly nCensored: readonly number[];
  /** Median survival time (first t where S(t) ≤ 0.5), or null if not reached. */
  readonly medianSurvival: number | null;
}

/** Result of a log-rank test comparing two or more survival curves. */
export interface LogRankResult {
  /** Chi-squared test statistic. */
  statistic: number;
  /** P-value derived from chi-squared distribution (df = groups - 1). */
  pValue: number;
  /** Degrees of freedom. */
  df: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

/** Error function approximation (Abramowitz & Stegun 7.1.26). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * ax);
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1.0 - poly * Math.exp(-ax * ax));
}

/** CDF of chi-squared distribution with 1 degree of freedom. */
function chi2Cdf1(x: number): number {
  if (x <= 0) {
    return 0;
  }
  return erf(Math.sqrt(x / 2));
}

/** Sort a copy of events by time ascending. */
function sortedEvents(events: readonly SurvivalEvent[]): SurvivalEvent[] {
  return events.slice().sort((a, b) => a.time - b.time);
}

/** Collect all unique event times (where event === true) from multiple groups. */
function allEventTimes(groups: readonly (readonly SurvivalEvent[])[]): number[] {
  const times = new Set<number>();
  for (const g of groups) {
    for (const e of g) {
      if (e.event) {
        times.add(e.time);
      }
    }
  }
  return [...times].sort((a, b) => a - b);
}

// ─── Kaplan-Meier ─────────────────────────────────────────────────────────────

/**
 * Count events and censored observations at a specific time point.
 * Returns `{ d, censored, nextIdx }` where `d` is the number of events
 * at `t`, `censored` is the number censored strictly before `t`, and
 * `nextIdx` is the index in `sorted` just after all records at time `t`.
 */
function countAtTime(
  sorted: readonly SurvivalEvent[],
  startIdx: number,
  t: number,
): { d: number; censored: number; nextIdx: number } {
  let idx = startIdx;
  let censored = 0;
  // advance past censored obs strictly before t
  while (idx < sorted.length && (sorted[idx]?.time ?? 0) < t) {
    if (!(sorted[idx]?.event ?? false)) {
      censored++;
    }
    idx++;
  }
  // count events at t
  let d = 0;
  const afterCensored = idx;
  while (idx < sorted.length && (sorted[idx]?.time ?? 0) === t) {
    if (sorted[idx]?.event ?? false) {
      d++;
    }
    idx++;
  }
  return { d, censored: censored + (afterCensored - startIdx - censored), nextIdx: idx };
}

/**
 * Kaplan-Meier non-parametric survival estimator.
 *
 * @param events - Array of `{ time, event }` observations.
 * @returns Estimated survival curve at each observed event time.
 * @throws {RangeError} If `events` is empty.
 */
export function kaplanMeier(events: readonly SurvivalEvent[]): KaplanMeierResult {
  if (events.length === 0) {
    throw new RangeError("events must be non-empty");
  }

  const sorted = sortedEvents(events);
  const eventTimes = allEventTimes([sorted]);

  const times: number[] = [];
  const survivalProb: number[] = [];
  const nAtRisk: number[] = [];
  const nEvents: number[] = [];
  const nCensored: number[] = [];

  let s = 1.0;
  let n = sorted.length;
  let idx = 0;

  for (const t of eventTimes) {
    const prevN = n;
    const { d, nextIdx } = countAtTime(sorted, idx, t);
    const censoredBefore = prevN - n - (nextIdx - idx - d);
    idx = nextIdx;

    nAtRisk.push(n);
    nEvents.push(d);
    nCensored.push(censoredBefore);
    times.push(t);

    if (n > 0) {
      s *= (n - d) / n;
    }
    survivalProb.push(s);
    n -= d;
  }

  let medianSurvival: number | null = null;
  for (let i = 0; i < survivalProb.length; i++) {
    if ((survivalProb[i] ?? 1) <= 0.5) {
      medianSurvival = times[i] ?? null;
      break;
    }
  }

  return { times, survivalProb, nAtRisk, nEvents, nCensored, medianSurvival };
}

// ─── log-rank test ────────────────────────────────────────────────────────────

/**
 * Log-rank (Mantel-Cox) test comparing two survival curves.
 *
 * Tests H₀: the two survival curves are identical.
 *
 * @param group1 - Observations from group 1.
 * @param group2 - Observations from group 2.
 * @returns Chi-squared statistic, p-value, and df = 1.
 * @throws {RangeError} If either group is empty.
 */
export function logRankTest(
  group1: readonly SurvivalEvent[],
  group2: readonly SurvivalEvent[],
): LogRankResult {
  if (group1.length === 0 || group2.length === 0) {
    throw new RangeError("Both groups must be non-empty");
  }

  const times = allEventTimes([group1, group2]);
  let observedMinusExpected = 0;
  let variance = 0;

  for (const t of times) {
    const n1 = group1.filter((e) => e.time >= t).length;
    const n2 = group2.filter((e) => e.time >= t).length;
    const d1 = group1.filter((e) => e.time === t && e.event).length;
    const d2 = group2.filter((e) => e.time === t && e.event).length;
    const n = n1 + n2;
    const d = d1 + d2;
    if (n < 2 || d === 0) {
      continue;
    }
    const e1 = (d * n1) / n;
    const vt = (d * n1 * n2 * (n - d)) / (n * n * (n - 1));
    observedMinusExpected += d1 - e1;
    variance += vt;
  }

  if (variance <= 0) {
    return { statistic: 0, pValue: 1, df: 1 };
  }
  const chi2 = (observedMinusExpected * observedMinusExpected) / variance;
  return { statistic: chi2, pValue: 1 - chi2Cdf1(chi2), df: 1 };
}
