/**
 * Time-based resampling of Series and DataFrame.
 *
 * Mirrors `pandas.DataFrame.resample` / `pandas.Series.resample`.
 *
 * Supported frequencies (rule strings):
 * - `"D"` — calendar day
 * - `"W"` — week (Sunday-end by default)
 * - `"ME"` / `"M"` — month-end
 * - `"QE"` / `"Q"` — quarter-end
 * - `"YE"` / `"Y"` / `"A"` — year-end
 * - `"h"` / `"H"` — hour
 * - `"min"` / `"T"` — minute
 * - `"s"` / `"S"` — second
 * - `"ms"` — millisecond
 * - `"N"` multiplier prefix: e.g. `"2D"`, `"3h"`, `"15min"`
 *
 * @example
 * ```ts
 * import { resampleSeries, asfreq } from "tsb";
 * const s = new Series({
 *   data: [1, 2, 3, 4, 5, 6],
 *   index: ["2024-01-01","2024-01-02","2024-01-05","2024-01-06","2024-01-07","2024-01-10"],
 * });
 * const weekly = resampleSeries(s, "W").sum();
 * ```
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── rule parsing ─────────────────────────────────────────────────────────────

const RULE_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  S: 1_000,
  min: 60_000,
  T: 60_000,
  h: 3_600_000,
  H: 3_600_000,
};

/** Top-level regex for parsing rule strings like "2D", "15min". */
const RULE_REGEX = /^(\d+)?([A-Za-z]+)$/;

/** Returns millisecond bucket size for non-calendar rules, or null for calendar. */
function ruleToMs(rule: string): number | null {
  const m = RULE_REGEX.exec(rule);
  if (!m) {
    throw new Error(`resample: unsupported rule '${rule}'`);
  }
  const n = m[1] !== undefined ? Number.parseInt(m[1], 10) : 1;
  const unit = m[2] ?? "";
  const ms = RULE_MS[unit];
  if (ms !== undefined) {
    return n * ms;
  }
  return null; // calendar rule (D, W, M, Q, Y, etc.)
}

/** Calendar rule names that require date arithmetic. */
type CalendarUnit = "D" | "W" | "ME" | "M" | "QE" | "Q" | "YE" | "Y" | "A";

const CALENDAR_ALIASES: Record<string, CalendarUnit> = {
  D: "D",
  W: "W",
  ME: "ME",
  M: "ME",
  QE: "QE",
  Q: "QE",
  YE: "YE",
  Y: "YE",
  A: "YE",
};

function getCalendarUnit(rule: string): CalendarUnit | null {
  const m = RULE_REGEX.exec(rule);
  const unit = m?.[2] ?? rule;
  return CALENDAR_ALIASES[unit] ?? null;
}

/** Compute the bin key (period label) for a timestamp under a calendar rule. */
function calendarBinKey(ts: number, unit: CalendarUnit, n: number): string {
  const d = new Date(ts);
  switch (unit) {
    case "D": {
      // floor to n-day bucket from epoch
      const dayMs = 86_400_000;
      const epochDay = Math.floor(ts / dayMs);
      const bucketDay = Math.floor(epochDay / n) * n;
      const bd = new Date(bucketDay * dayMs);
      return bd.toISOString().slice(0, 10);
    }
    case "W": {
      // ISO week containing the date — sunday-start
      const dow = d.getUTCDay(); // 0=Sun
      const weekStart = new Date(ts - dow * 86_400_000);
      return weekStart.toISOString().slice(0, 10);
    }
    case "ME": {
      // year-month
      const yr = d.getUTCFullYear();
      const mo = d.getUTCMonth(); // 0-based
      const bucketMo = Math.floor(mo / n) * n;
      return `${yr}-${String(bucketMo + 1).padStart(2, "0")}`;
    }
    case "QE": {
      const yr = d.getUTCFullYear();
      const q = Math.floor(d.getUTCMonth() / 3);
      const bucketQ = Math.floor(q / n) * n;
      return `${yr}-Q${bucketQ + 1}`;
    }
    case "YE": {
      const yr = d.getUTCFullYear();
      const bucketYr = Math.floor(yr / n) * n;
      return String(bucketYr);
    }
    default: {
      return String(ts);
    }
  }
}

/** Parse a label string or number into milliseconds since epoch. */
function toTimestamp(label: Scalar): number {
  if (typeof label === "number") {
    return label;
  }
  if (typeof label === "string") {
    const ts = Date.parse(label);
    if (Number.isNaN(ts)) {
      throw new TypeError(`resample: cannot parse '${label}' as a date`);
    }
    return ts;
  }
  throw new TypeError(`resample: index labels must be strings or numbers, got ${typeof label}`);
}

// ─── grouping helpers ─────────────────────────────────────────────────────────

interface BinGroup {
  key: string;
  values: number[];
  indices: number[];
}

/**
 * Group index labels into time bins.
 * Returns ordered (by first appearance) array of BinGroup.
 */
function binValues(
  indexLabels: readonly Scalar[],
  values: readonly Scalar[],
  rule: string,
): BinGroup[] {
  const msRule = ruleToMs(rule);
  const ruleMatch = RULE_REGEX.exec(rule);
  const n = ruleMatch?.[1] !== undefined ? Number.parseInt(ruleMatch[1], 10) : 1;
  const calUnit = getCalendarUnit(rule);

  const map = new Map<string, BinGroup>();
  const order: string[] = [];

  for (let i = 0; i < indexLabels.length; i++) {
    const ts = toTimestamp(indexLabels[i] ?? null);
    let key: string;

    if (msRule !== null) {
      const bucket = Math.floor(ts / msRule) * msRule;
      key = String(bucket);
    } else if (calUnit !== null) {
      key = calendarBinKey(ts, calUnit, n);
    } else {
      throw new Error(`resample: unsupported rule '${rule}'`);
    }

    let group = map.get(key);
    if (group === undefined) {
      group = { key, values: [], indices: [] };
      map.set(key, group);
      order.push(key);
    }

    const v = values[i];
    if (typeof v === "number") {
      group.values.push(v);
    }
    group.indices.push(i);
  }

  return order.map((k) => {
    const g = map.get(k);
    // k was inserted into map when added to order, so g is always defined
    return g ?? { key: k, values: [], indices: [] };
  });
}

// ─── aggregators ─────────────────────────────────────────────────────────────

function aggSum(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : g.values.reduce((a, b) => a + b, 0);
}
function aggMean(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : g.values.reduce((a, b) => a + b, 0) / g.values.length;
}
function aggMin(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : Math.min(...g.values);
}
function aggMax(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : Math.max(...g.values);
}
function aggCount(g: BinGroup): Scalar {
  return g.indices.length;
}
function aggFirst(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : (g.values[0] ?? null);
}
function aggLast(g: BinGroup): Scalar {
  return g.values.length === 0 ? null : (g.values.at(-1) ?? null);
}
function aggStd(g: BinGroup): Scalar {
  if (g.values.length < 2) {
    return null;
  }
  const m = g.values.reduce((a, b) => a + b, 0) / g.values.length;
  const variance = g.values.reduce((a, v) => a + (v - m) ** 2, 0) / (g.values.length - 1);
  return Math.sqrt(variance);
}

// ─── SeriesResampler ──────────────────────────────────────────────────────────

/**
 * A grouped Series resampler — the result of `resampleSeries(series, rule)`.
 *
 * Call `.sum()`, `.mean()`, `.count()` etc. to aggregate each time bin.
 */
export class SeriesResampler {
  readonly #series: Series<Scalar>;
  readonly #rule: string;

  constructor(series: Series<Scalar>, rule: string) {
    this.#series = series;
    this.#rule = rule;
  }

  #aggregate(fn: (g: BinGroup) => Scalar): Series<Scalar> {
    const labels = this.#series.index.values;
    const vals = this.#series.values;
    const groups = binValues(labels, vals, this.#rule);
    const keys = groups.map((g) => g.key);
    const data = groups.map(fn);
    return new Series({ data, index: keys, name: this.#series.name });
  }

  /** Sum of each bin. */
  sum(): Series<Scalar> {
    return this.#aggregate(aggSum);
  }

  /** Mean of each bin. */
  mean(): Series<Scalar> {
    return this.#aggregate(aggMean);
  }

  /** Min of each bin. */
  min(): Series<Scalar> {
    return this.#aggregate(aggMin);
  }

  /** Max of each bin. */
  max(): Series<Scalar> {
    return this.#aggregate(aggMax);
  }

  /** Count of non-null observations per bin. */
  count(): Series<Scalar> {
    return this.#aggregate(aggCount);
  }

  /** First value per bin. */
  first(): Series<Scalar> {
    return this.#aggregate(aggFirst);
  }

  /** Last value per bin. */
  last(): Series<Scalar> {
    return this.#aggregate(aggLast);
  }

  /** Sample standard deviation per bin. */
  std(): Series<Scalar> {
    return this.#aggregate(aggStd);
  }

  /** Apply a custom aggregator. */
  agg(fn: (values: readonly number[], indices: readonly number[]) => Scalar): Series<Scalar> {
    return this.#aggregate((g) => fn(g.values, g.indices));
  }
}

// ─── DataFrameResampler ───────────────────────────────────────────────────────

/**
 * A grouped DataFrame resampler — the result of `resampleDataFrame(df, rule)`.
 */
export class DataFrameResampler {
  readonly #df: DataFrame;
  readonly #rule: string;

  constructor(df: DataFrame, rule: string) {
    this.#df = df;
    this.#rule = rule;
  }

  #aggregateAll(fn: (g: BinGroup) => Scalar): DataFrame {
    const cols = this.#df.columns.values;
    const labels = this.#df.index.values;
    // Get bins from first column to establish keys
    const firstCol = this.#df.col(cols[0] ?? "");
    const groups = binValues(labels, firstCol.values, this.#rule);
    const keys = groups.map((g) => g.key);

    const colData: Record<string, Scalar[]> = {};
    for (const col of cols) {
      const vals = this.#df.col(col).values;
      const colGroups = binValues(labels, vals, this.#rule);
      colData[col] = colGroups.map(fn);
    }

    return DataFrame.fromColumns(colData, { index: keys });
  }

  /** Sum of each bin across all numeric columns. */
  sum(): DataFrame {
    return this.#aggregateAll(aggSum);
  }

  /** Mean of each bin across all numeric columns. */
  mean(): DataFrame {
    return this.#aggregateAll(aggMean);
  }

  /** Min per bin. */
  min(): DataFrame {
    return this.#aggregateAll(aggMin);
  }

  /** Max per bin. */
  max(): DataFrame {
    return this.#aggregateAll(aggMax);
  }

  /** Count per bin. */
  count(): DataFrame {
    return this.#aggregateAll(aggCount);
  }

  /** First value per bin. */
  first(): DataFrame {
    return this.#aggregateAll(aggFirst);
  }

  /** Last value per bin. */
  last(): DataFrame {
    return this.#aggregateAll(aggLast);
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Resample a Series by a time-based rule.
 *
 * @param series - A Series whose index contains date strings or epoch-ms numbers.
 * @param rule   - Frequency string: `"D"`, `"W"`, `"ME"`, `"QE"`, `"YE"`,
 *                 `"h"`, `"min"`, `"s"`, `"ms"`, or with multiplier: `"2D"`, `"15min"`.
 * @returns A `SeriesResampler` — call `.sum()`, `.mean()`, etc. to aggregate.
 *
 * @example
 * ```ts
 * const daily = resampleSeries(s, "D").sum();
 * const monthly = resampleSeries(s, "ME").mean();
 * ```
 */
export function resampleSeries(series: Series<Scalar>, rule: string): SeriesResampler {
  return new SeriesResampler(series, rule);
}

/**
 * Resample a DataFrame by a time-based rule.
 *
 * @param df   - A DataFrame whose index contains date strings or epoch-ms numbers.
 * @param rule - Frequency string (same options as `resampleSeries`).
 * @returns A `DataFrameResampler` — call `.sum()`, `.mean()`, etc. to aggregate.
 */
export function resampleDataFrame(df: DataFrame, rule: string): DataFrameResampler {
  return new DataFrameResampler(df, rule);
}

// ─── asfreq ───────────────────────────────────────────────────────────────────

/** Forward-fill null gaps in a mutable Scalar array. */
function ffillInPlace(vals: Scalar[]): void {
  let last: Scalar = null;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] !== null && vals[i] !== undefined) {
      last = vals[i] ?? null;
    } else {
      vals[i] = last;
    }
  }
}

/** Backward-fill null gaps in a mutable Scalar array. */
function bfillInPlace(vals: Scalar[]): void {
  for (let i = vals.length - 1; i >= 0; i--) {
    const v = vals[i];
    if (v !== null && v !== undefined) {
      // carry forward for subsequent bfill iterations handled below
    }
  }
  let next: Scalar = null;
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i] !== null && vals[i] !== undefined) {
      next = vals[i] ?? null;
    } else {
      vals[i] = next;
    }
  }
}

/**
 * Return the value at a specified frequency, forward-filling from the last known value
 * when no observation falls in that bucket.
 *
 * This is the equivalent of `pandas.DataFrame.asfreq` — it reindexes to a regular grid
 * and optionally fills gaps.
 *
 * @param series  - Series with date-string or epoch-ms index.
 * @param rule    - Frequency rule string.
 * @param method  - Fill method for missing values: `"ffill"` | `"bfill"` | `null` (no fill).
 * @returns A new Series aligned to the regular grid.
 *
 * @example
 * ```ts
 * const filled = asfreq(s, "D", "ffill");
 * ```
 */
export function asfreq(
  series: Series<Scalar>,
  rule: string,
  method: "ffill" | "bfill" | null = null,
): Series<Scalar> {
  const resampled = new SeriesResampler(series, rule).last();
  if (method === null) {
    return resampled;
  }

  const vals = [...resampled.values] as Scalar[];
  if (method === "ffill") {
    ffillInPlace(vals);
  } else {
    bfillInPlace(vals);
  }

  return new Series({ data: vals, index: resampled.index.values, name: series.name });
}
