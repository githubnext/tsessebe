/**
 * resample — time-based resampling for Series and DataFrame.
 *
 * Mirrors `pandas.DataFrame.resample` / `pandas.Series.resample`.
 *
 * Supported frequency strings:
 * | String | Interval |
 * |--------|----------|
 * | `"S"` | Second |
 * | `"T"` / `"min"` | Minute |
 * | `"H"` | Hour |
 * | `"D"` | Calendar day (UTC) |
 * | `"W"` / `"W-SUN"` | Week ending Sunday (closed right, labeled right) |
 * | `"W-MON"` … `"W-SAT"` | Week ending on the specified weekday |
 * | `"MS"` | Month start — 1st of each month (closed left, labeled left) |
 * | `"ME"` | Month end — last day of each month (labeled right) |
 * | `"QS"` | Quarter start — Jan/Apr/Jul/Oct 1 (labeled left) |
 * | `"QE"` | Quarter end — Mar 31 / Jun 30 / Sep 30 / Dec 31 (labeled right) |
 * | `"AS"` / `"YS"` | Year start — Jan 1 (labeled left) |
 * | `"AE"` / `"YE"` | Year end — Dec 31 (labeled right) |
 *
 * @example
 * ```ts
 * const dates = [new Date("2024-01-01"), new Date("2024-01-02"), new Date("2024-02-01")];
 * const s = new Series({ data: [1, 2, 3], index: dates });
 * resampleSeries(s, "MS").sum().toArray(); // [3, 3]
 * ```
 *
 * @module
 */

import { Index } from "../core/base-index.ts";
import { DataFrame } from "../core/frame.ts";
import { Series } from "../core/series.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Recognised frequency abbreviations for {@link resampleSeries} and
 * {@link resampleDataFrame}.
 */
export type ResampleFreq =
  | "S"
  | "T"
  | "min"
  | "H"
  | "D"
  | "W"
  | "W-SUN"
  | "W-MON"
  | "W-TUE"
  | "W-WED"
  | "W-THU"
  | "W-FRI"
  | "W-SAT"
  | "MS"
  | "ME"
  | "QS"
  | "QE"
  | "AS"
  | "YS"
  | "AE"
  | "YE";

/** Which end of the bin interval labels the output index. */
export type ResampleLabel = "left" | "right";

/** Built-in aggregation names understood by `agg()`. */
export type ResampleAggName =
  | "sum"
  | "mean"
  | "min"
  | "max"
  | "count"
  | "first"
  | "last"
  | "std"
  | "var"
  | "size";

/** Custom aggregation function accepted by `agg()`. */
export type ResampleAggFn = (values: readonly Scalar[]) => Scalar;

/** Options accepted by {@link resampleSeries} and {@link resampleDataFrame}. */
export interface ResampleOptions {
  /**
   * Which end of the bin interval labels the output index.
   * Defaults to `"right"` for `W`, `ME`, `QE`, `YE`/`AE`; `"left"` for all others.
   */
  readonly label?: ResampleLabel;
}

// ─── internal constants ───────────────────────────────────────────────────────

const MS_S = 1_000;
const MS_T = 60_000;
const MS_H = 3_600_000;
const MS_D = 86_400_000;
const MS_W = 7 * MS_D;

// ─── helpers: missing value ────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── helpers: date coercion ────────────────────────────────────────────────────

function toDate(v: Label): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ─── helpers: default label side per frequency ─────────────────────────────────

function freqDefaultLabel(freq: string): ResampleLabel {
  return freq.startsWith("W") || freq === "ME" || freq === "QE" || freq === "AE" || freq === "YE"
    ? "right"
    : "left";
}

// ─── helpers: bin group key ────────────────────────────────────────────────────

/**
 * Returns the UTC ms timestamp of the canonical bin key for `d`.
 *
 * For "closed-left" frequencies (S, T, min, H, D, MS, QS, YS/AS): returns the
 * left boundary (bin start) — i.e., the floor of `d` to that period.
 *
 * For "closed-right" / anchor frequencies (W*, ME, QE, YE/AE): returns the
 * natural right anchor — e.g., the upcoming Sunday for W, the last-of-month for ME.
 *
 * This value uniquely identifies the bin AND, in the default label-setting,
 * IS the output label.
 */
function binGroupKey(d: Date, freq: string): number {
  const yr = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDay();
  const baseDay = Date.UTC(yr, mo, d.getUTCDate());

  switch (freq) {
    case "S":
      return Math.floor(d.getTime() / MS_S) * MS_S;
    case "T":
    case "min":
      return Math.floor(d.getTime() / MS_T) * MS_T;
    case "H":
      return Math.floor(d.getTime() / MS_H) * MS_H;
    case "D":
      return baseDay;

    // Weekly — closed right, label = the anchor weekday
    case "W":
    case "W-SUN":
      return baseDay + (day === 0 ? 0 : 7 - day) * MS_D;
    case "W-MON":
      return baseDay + (day === 1 ? 0 : (8 - day) % 7) * MS_D;
    case "W-TUE":
      return baseDay + (day === 2 ? 0 : (9 - day) % 7) * MS_D;
    case "W-WED":
      return baseDay + (day === 3 ? 0 : (10 - day) % 7) * MS_D;
    case "W-THU":
      return baseDay + (day === 4 ? 0 : (11 - day) % 7) * MS_D;
    case "W-FRI":
      return baseDay + (day === 5 ? 0 : (12 - day) % 7) * MS_D;
    case "W-SAT":
      return baseDay + (day === 6 ? 0 : (13 - day) % 7) * MS_D;

    // Calendar — closed left
    case "MS":
      return Date.UTC(yr, mo, 1);
    case "ME":
      return Date.UTC(yr, mo + 1, 0); // last day of month
    case "QS":
      return Date.UTC(yr, Math.floor(mo / 3) * 3, 1);
    case "QE": {
      const qm = Math.floor(mo / 3) * 3 + 2;
      return Date.UTC(yr, qm + 1, 0);
    }
    case "AS":
    case "YS":
      return Date.UTC(yr, 0, 1);
    case "AE":
    case "YE":
      return Date.UTC(yr, 11, 31);

    default:
      throw new Error(`Unsupported resample frequency: "${freq}"`);
  }
}

/** Advance a bin group key (UTC ms timestamp) by exactly one period. */
function nextGroupKey(ts: number, freq: string): number {
  const d = new Date(ts);
  const yr = d.getUTCFullYear();
  const mo = d.getUTCMonth();

  switch (freq) {
    case "S":
      return ts + MS_S;
    case "T":
    case "min":
      return ts + MS_T;
    case "H":
      return ts + MS_H;
    case "D":
      return ts + MS_D;
    case "W":
    case "W-SUN":
    case "W-MON":
    case "W-TUE":
    case "W-WED":
    case "W-THU":
    case "W-FRI":
    case "W-SAT":
      return ts + MS_W;
    case "MS":
      return Date.UTC(yr, mo + 1, 1);
    case "ME":
      return Date.UTC(yr, mo + 2, 0);
    case "QS":
      return Date.UTC(yr, mo + 3, 1);
    case "QE":
      return Date.UTC(yr, mo + 4, 0);
    case "AS":
    case "YS":
      return Date.UTC(yr + 1, 0, 1);
    case "AE":
    case "YE":
      return Date.UTC(yr + 1, 11, 31);
    default:
      throw new Error(`Unsupported resample frequency: "${freq}"`);
  }
}

/**
 * Convert a group key to the final output label timestamp.
 * When the user requests a label side different from the frequency default,
 * the key is shifted by one period.
 */
function keyToLabel(key: number, freq: string, label: ResampleLabel): number {
  const dflt = freqDefaultLabel(freq);
  if (label === dflt) return key;

  if (label === "right") {
    // User wants right label on a left-default freq → next bin start
    return nextGroupKey(key, freq);
  }

  // User wants left label on a right-default freq (W*, ME, QE, YE/AE)
  if (freq.startsWith("W")) return key - 6 * MS_D; // anchor → Mon/+1
  if (freq === "ME") {
    const d = new Date(key);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  if (freq === "QE") {
    const d = new Date(key);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 2, 1);
  }
  if (freq === "AE" || freq === "YE") {
    return Date.UTC(new Date(key).getUTCFullYear(), 0, 1);
  }
  return key;
}

// ─── helpers: grouping ────────────────────────────────────────────────────────

interface Groups {
  /** Sorted list of unique group-key timestamps. */
  readonly keys: readonly number[];
  /** Map from group key → sorted array of row positions. */
  readonly map: ReadonlyMap<number, readonly number[]>;
}

function buildGroups(index: Index<Label>, freq: string): Groups {
  const map = new Map<number, number[]>();
  for (let i = 0; i < index.size; i++) {
    const label = index.at(i) as Label;
    const d = toDate(label);
    if (d === null) continue;
    const key = binGroupKey(d, freq);
    let arr = map.get(key);
    if (arr === undefined) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(i);
  }
  const keys = [...map.keys()].sort((a, b) => a - b);
  return { keys, map };
}

/** All bin keys in the inclusive range [first, last]. */
function allKeys(first: number, last: number, freq: string): number[] {
  const result: number[] = [];
  let cur = first;
  while (cur <= last) {
    result.push(cur);
    cur = nextGroupKey(cur, freq);
  }
  return result;
}

// ─── helpers: aggregation functions ──────────────────────────────────────────

type AggFn = (vals: readonly Scalar[]) => Scalar;

function aggNums(vals: readonly Scalar[]): number[] {
  return vals.filter((v): v is number => !isMissing(v) && typeof v === "number");
}

function aggSum(vals: readonly Scalar[]): Scalar {
  const ns = aggNums(vals);
  if (ns.length === 0) return Number.NaN;
  return ns.reduce((a, b) => a + b, 0);
}

function aggMean(vals: readonly Scalar[]): Scalar {
  const ns = aggNums(vals);
  if (ns.length === 0) return Number.NaN;
  return ns.reduce((a, b) => a + b, 0) / ns.length;
}

function aggMin(vals: readonly Scalar[]): Scalar {
  const c = vals.filter((v): v is Exclude<Scalar, null | undefined> => !isMissing(v));
  if (c.length === 0) return Number.NaN;
  return c.reduce((a, b) => (a < b ? a : b));
}

function aggMax(vals: readonly Scalar[]): Scalar {
  const c = vals.filter((v): v is Exclude<Scalar, null | undefined> => !isMissing(v));
  if (c.length === 0) return Number.NaN;
  return c.reduce((a, b) => (a > b ? a : b));
}

function aggCount(vals: readonly Scalar[]): Scalar {
  return vals.filter((v) => !isMissing(v)).length;
}

function aggFirst(vals: readonly Scalar[]): Scalar {
  for (const v of vals) if (!isMissing(v)) return v;
  return Number.NaN;
}

function aggLast(vals: readonly Scalar[]): Scalar {
  for (let i = vals.length - 1; i >= 0; i--) {
    const v = vals[i]!;
    if (!isMissing(v)) return v;
  }
  return Number.NaN;
}

function aggStd(vals: readonly Scalar[]): Scalar {
  const ns = aggNums(vals);
  if (ns.length < 2) return Number.NaN;
  const m = ns.reduce((a, b) => a + b, 0) / ns.length;
  return Math.sqrt(ns.reduce((s, v) => s + (v - m) ** 2, 0) / (ns.length - 1));
}

function aggVar(vals: readonly Scalar[]): Scalar {
  const ns = aggNums(vals);
  if (ns.length < 2) return Number.NaN;
  const m = ns.reduce((a, b) => a + b, 0) / ns.length;
  return ns.reduce((s, v) => s + (v - m) ** 2, 0) / (ns.length - 1);
}

const BUILTIN: Readonly<Record<ResampleAggName, AggFn>> = {
  sum: aggSum,
  mean: aggMean,
  min: aggMin,
  max: aggMax,
  count: aggCount,
  first: aggFirst,
  last: aggLast,
  std: aggStd,
  var: aggVar,
  size: (vals) => vals.length,
};

function resolveAgg(spec: ResampleAggName | ResampleAggFn): AggFn {
  if (typeof spec === "function") return spec;
  const fn = BUILTIN[spec];
  if (!fn) throw new Error(`Unknown resample aggregation: "${spec}"`);
  return fn;
}

// ─── helpers: output index construction ───────────────────────────────────────

function buildDateIndex(
  groupKeys: readonly number[],
  freq: string,
  label: ResampleLabel,
): Index<Label> {
  return new Index<Label>(groupKeys.map((k) => new Date(keyToLabel(k, freq, label))));
}

// ─── SeriesResampler ──────────────────────────────────────────────────────────

/**
 * Time-based resampler for a {@link Series} with a datetime index.
 *
 * Obtained via {@link resampleSeries}.
 *
 * @example
 * ```ts
 * const s = new Series({
 *   data: [1, 2, 3],
 *   index: [new Date("2024-01-01"), new Date("2024-01-01T12:00Z"), new Date("2024-01-02")],
 * });
 * resampleSeries(s, "D").sum().toArray(); // [3, 3]
 * ```
 */
export class SeriesResampler {
  private readonly _s: Series;
  private readonly _freq: string;
  private readonly _label: ResampleLabel;
  private _cachedGroups: Groups | null = null;

  constructor(series: Series, freq: string, options: ResampleOptions = {}) {
    this._s = series;
    this._freq = freq;
    this._label = options.label ?? freqDefaultLabel(freq);
  }

  private _groups(): Groups {
    if (this._cachedGroups === null) {
      this._cachedGroups = buildGroups(this._s.index, this._freq);
    }
    return this._cachedGroups;
  }

  /**
   * Apply an aggregation to each time bin.
   *
   * @param spec - Built-in name (e.g. `"sum"`) or a custom `(vals) => Scalar` function.
   */
  agg(spec: ResampleAggName | ResampleAggFn): Series<Scalar> {
    const fn = resolveAgg(spec);
    const { keys, map } = this._groups();
    if (keys.length === 0) {
      return new Series<Scalar>({ data: [], index: new Index<Label>([]), name: this._s.name });
    }
    const vals = this._s.values;
    const binKeys = allKeys(keys[0]!, keys[keys.length - 1]!, this._freq);
    const data: Scalar[] = binKeys.map((k) => {
      const positions = map.get(k) ?? [];
      return fn(positions.map((p) => vals[p] as Scalar));
    });
    return new Series<Scalar>({
      data,
      index: buildDateIndex(binKeys, this._freq, this._label),
      name: this._s.name,
    });
  }

  /** Sum of each bin (NaN for empty bins). */
  sum(): Series<Scalar> {
    return this.agg("sum");
  }

  /** Mean of each bin (NaN for empty bins). */
  mean(): Series<Scalar> {
    return this.agg("mean");
  }

  /** Minimum of each bin (NaN for empty bins). */
  min(): Series<Scalar> {
    return this.agg("min");
  }

  /** Maximum of each bin (NaN for empty bins). */
  max(): Series<Scalar> {
    return this.agg("max");
  }

  /** Count of non-missing values in each bin (0 for empty bins). */
  count(): Series<Scalar> {
    return this.agg("count");
  }

  /** First non-missing value in each bin (NaN for empty bins). */
  first(): Series<Scalar> {
    return this.agg("first");
  }

  /** Last non-missing value in each bin (NaN for empty bins). */
  last(): Series<Scalar> {
    return this.agg("last");
  }

  /** Sample standard deviation per bin (NaN if fewer than 2 values). */
  std(): Series<Scalar> {
    return this.agg("std");
  }

  /** Sample variance per bin (NaN if fewer than 2 values). */
  var(): Series<Scalar> {
    return this.agg("var");
  }

  /** Total number of observations (including missing) per bin. */
  size(): Series<Scalar> {
    return this.agg("size");
  }

  /**
   * Open-High-Low-Close aggregation.
   *
   * Returns a DataFrame with columns `["open", "high", "low", "close"]` indexed
   * by the bin labels.
   */
  ohlc(): DataFrame {
    const { keys, map } = this._groups();
    if (keys.length === 0) {
      return DataFrame.fromColumns({ open: [], high: [], low: [], close: [] });
    }
    const vals = this._s.values;
    const binKeys = allKeys(keys[0]!, keys[keys.length - 1]!, this._freq);

    const open: Scalar[] = [];
    const high: Scalar[] = [];
    const low: Scalar[] = [];
    const close: Scalar[] = [];

    for (const k of binKeys) {
      const positions = map.get(k) ?? [];
      const binVals = positions.map((p) => vals[p] as Scalar);
      open.push(aggFirst(binVals));
      high.push(aggMax(binVals));
      low.push(aggMin(binVals));
      close.push(aggLast(binVals));
    }

    return DataFrame.fromColumns(
      { open, high, low, close },
      { index: buildDateIndex(binKeys, this._freq, this._label) },
    );
  }
}

// ─── DataFrameResampler ───────────────────────────────────────────────────────

/**
 * Time-based resampler for a {@link DataFrame} with a datetime row index.
 *
 * Obtained via {@link resampleDataFrame}.
 *
 * @example
 * ```ts
 * const idx = [new Date("2024-01-01"), new Date("2024-01-01T12:00Z"), new Date("2024-01-02")];
 * const df = DataFrame.fromColumns({ v: [1, 2, 3] }, { index: new Index(idx) });
 * resampleDataFrame(df, "D").sum();
 * // DataFrame { v: [3, 3] }
 * ```
 */
export class DataFrameResampler {
  private readonly _df: DataFrame;
  private readonly _freq: string;
  private readonly _label: ResampleLabel;
  private _cachedGroups: Groups | null = null;

  constructor(df: DataFrame, freq: string, options: ResampleOptions = {}) {
    this._df = df;
    this._freq = freq;
    this._label = options.label ?? freqDefaultLabel(freq);
  }

  private _groups(): Groups {
    if (this._cachedGroups === null) {
      this._cachedGroups = buildGroups(this._df.index, this._freq);
    }
    return this._cachedGroups;
  }

  /**
   * Apply aggregation(s) to each time bin.
   *
   * @param spec
   *   - A single built-in name or function: applied to every column.
   *   - A `Record<colName, aggSpec>`: per-column aggregations; unmapped columns default to `"sum"`.
   */
  agg(
    spec:
      | ResampleAggName
      | ResampleAggFn
      | Readonly<Record<string, ResampleAggName | ResampleAggFn>>,
  ): DataFrame {
    const { keys, map } = this._groups();
    const colNames = this._df.columns.values as readonly string[];

    if (keys.length === 0) {
      const emptyCols: Record<string, readonly Scalar[]> = {};
      for (const c of colNames) emptyCols[c] = [];
      return DataFrame.fromColumns(emptyCols);
    }

    const binKeys = allKeys(keys[0]!, keys[keys.length - 1]!, this._freq);
    const idx = buildDateIndex(binKeys, this._freq, this._label);
    const colData: Record<string, Scalar[]> = {};

    for (const colName of colNames) {
      let fn: AggFn;
      if (typeof spec === "object" && spec !== null && typeof spec !== "function") {
        const s = (spec as Readonly<Record<string, ResampleAggName | ResampleAggFn>>)[colName];
        fn = resolveAgg(s ?? "sum");
      } else {
        fn = resolveAgg(spec as ResampleAggName | ResampleAggFn);
      }

      const colVals = this._df.col(colName).values;
      colData[colName] = binKeys.map((k) => {
        const positions = map.get(k) ?? [];
        return fn(positions.map((p) => colVals[p] as Scalar));
      });
    }

    return DataFrame.fromColumns(colData, { index: idx });
  }

  /** Sum per column per bin (NaN for empty bins). */
  sum(): DataFrame {
    return this.agg("sum");
  }

  /** Mean per column per bin (NaN for empty bins). */
  mean(): DataFrame {
    return this.agg("mean");
  }

  /** Minimum per column per bin (NaN for empty bins). */
  min(): DataFrame {
    return this.agg("min");
  }

  /** Maximum per column per bin (NaN for empty bins). */
  max(): DataFrame {
    return this.agg("max");
  }

  /** Count of non-missing values per column per bin. */
  count(): DataFrame {
    return this.agg("count");
  }

  /** First non-missing value per column per bin. */
  first(): DataFrame {
    return this.agg("first");
  }

  /** Last non-missing value per column per bin. */
  last(): DataFrame {
    return this.agg("last");
  }

  /** Sample standard deviation per column per bin. */
  std(): DataFrame {
    return this.agg("std");
  }

  /** Sample variance per column per bin. */
  var(): DataFrame {
    return this.agg("var");
  }

  /**
   * Number of observations per bin (across all columns; a Series of counts).
   */
  size(): Series<Scalar> {
    const { keys, map } = this._groups();
    if (keys.length === 0) {
      return new Series<Scalar>({ data: [], index: new Index<Label>([]) });
    }
    const binKeys = allKeys(keys[0]!, keys[keys.length - 1]!, this._freq);
    const data: Scalar[] = binKeys.map((k) => (map.get(k) ?? []).length);
    return new Series<Scalar>({ data, index: buildDateIndex(binKeys, this._freq, this._label) });
  }
}

// ─── public factory functions ─────────────────────────────────────────────────

/**
 * Create a time-based resampler for a {@link Series}.
 *
 * The Series index must contain `Date` objects (or ISO-8601 strings / Unix
 * timestamps parseable by `new Date()`).
 *
 * @param series  - Source Series with a datetime index.
 * @param freq    - Frequency string, e.g. `"D"`, `"H"`, `"MS"`, `"W"`.
 * @param options - Optional `{ label }` override.
 *
 * @example
 * ```ts
 * const dates = [new Date("2024-01-01"), new Date("2024-01-01T18:00Z"), new Date("2024-01-02")];
 * const s = new Series({ data: [10, 20, 30], index: dates });
 * resampleSeries(s, "D").sum().toArray();  // [30, 30]
 * resampleSeries(s, "D").mean().toArray(); // [15, 30]
 * resampleSeries(s, "D").ohlc().col("open").toArray(); // [10, 30]
 * ```
 */
export function resampleSeries(
  series: Series,
  freq: ResampleFreq | string,
  options?: ResampleOptions,
): SeriesResampler {
  return new SeriesResampler(series, freq, options);
}

/**
 * Create a time-based resampler for a {@link DataFrame}.
 *
 * The DataFrame row index must contain `Date` objects (or parseable values).
 *
 * @param df      - Source DataFrame with a datetime row index.
 * @param freq    - Frequency string, e.g. `"D"`, `"H"`, `"MS"`, `"W"`.
 * @param options - Optional `{ label }` override.
 *
 * @example
 * ```ts
 * const idx = new Index([new Date("2024-01-01"), new Date("2024-01-02"), new Date("2024-02-01")]);
 * const df = DataFrame.fromColumns({ val: [1, 2, 3] }, { index: idx });
 * resampleDataFrame(df, "MS").sum();
 * // DataFrame { val: [3, 3] }
 * ```
 */
export function resampleDataFrame(
  df: DataFrame,
  freq: ResampleFreq | string,
  options?: ResampleOptions,
): DataFrameResampler {
  return new DataFrameResampler(df, freq, options);
}
