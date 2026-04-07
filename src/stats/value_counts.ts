/**
 * value_counts — count unique values (or combinations) in a Series / DataFrame.
 *
 * Mirrors:
 * - `pandas.Series.value_counts(normalize, sort, ascending, dropna)`
 * - `pandas.DataFrame.value_counts(subset, normalize, sort, ascending, dropna)`
 *
 * Both functions return a `Series<number>` (or `Series<number>` of proportions
 * when `normalize=true`) whose index labels are the unique values / tuples.
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link valueCounts}. */
export interface ValueCountsOptions {
  /**
   * If `true`, return relative frequencies (proportions) instead of counts.
   * @defaultValue `false`
   */
  readonly normalize?: boolean;
  /**
   * If `true` (default), sort results by frequency (highest first, unless
   * `ascending=true`).  If `false`, preserve the order in which values were
   * first encountered.
   * @defaultValue `true`
   */
  readonly sort?: boolean;
  /**
   * Sort direction when `sort=true`.
   * @defaultValue `false` (descending — highest count first)
   */
  readonly ascending?: boolean;
  /**
   * If `true` (default), don't include counts for missing values (null / NaN).
   * If `false`, count missing values under the key `null`.
   * @defaultValue `true`
   */
  readonly dropna?: boolean;
}

/** Options for {@link dataFrameValueCounts}. */
export interface DataFrameValueCountsOptions extends ValueCountsOptions {
  /**
   * A subset of column names to use.  When omitted, all columns are used.
   */
  readonly subset?: readonly string[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Stable scalar key for a `Map` — turns any `Scalar` into a string key. */
function scalarKey(v: Scalar): string {
  if (v === null || v === undefined) {
    return "\x00null";
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return "\x00nan";
  }
  if (v instanceof Date) {
    return `\x01date:${v.getTime().toString()}`;
  }
  return `\x02${typeof v}:${String(v)}`;
}

/** True when the value is missing (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Build the `Map<key, count>` from an iterable of `[key, label]` pairs. */
function buildCountMap(
  pairs: Iterable<[string, Label]>,
): Map<string, { label: Label; count: number }> {
  const map = new Map<string, { label: Label; count: number }>();
  for (const [k, label] of pairs) {
    const entry = map.get(k);
    if (entry !== undefined) {
      entry.count += 1;
    } else {
      map.set(k, { label, count: 1 });
    }
  }
  return map;
}

/** Sort a `[label, count]` array in-place by count. */
function sortCounts(entries: Array<{ label: Label; count: number }>, ascending: boolean): void {
  entries.sort((a, b) => {
    const diff = a.count - b.count;
    return ascending ? diff : -diff;
  });
}

/**
 * Build the result `Series<number>` from a count map.
 *
 * @param countMap  Key → {label, count} mapping
 * @param total     Denominator for normalization
 * @param opts      User options
 * @param seriesName  Optional name for the result Series
 */
function buildResult(
  countMap: Map<string, { label: Label; count: number }>,
  total: number,
  opts: ValueCountsOptions,
  seriesName: string | null,
): Series<number> {
  const normalize = opts.normalize ?? false;
  const sort = opts.sort ?? true;
  const ascending = opts.ascending ?? false;

  const entries = [...countMap.values()];

  if (sort) {
    sortCounts(entries, ascending);
  }

  const labels: Label[] = entries.map((e) => e.label);
  const counts: number[] = entries.map((e) => (normalize ? e.count / total : e.count));

  return new Series<number>({
    data: counts,
    index: new Index<Label>(labels),
    dtype: normalize ? Dtype.float64 : Dtype.int64,
    name: seriesName,
  });
}

// ─── Series value_counts ───────────────────────────────────────────────────────

/**
 * Count unique values in a Series.
 *
 * Returns a `Series<number>` indexed by the unique values, with counts
 * (or proportions when `normalize=true`) as values.
 *
 * Missing values (null / NaN) are excluded by default (`dropna=true`).
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["a", "b", "a", "c", "b", "a"] });
 * const vc = valueCounts(s);
 * // index: ["a", "b", "c"], values: [3, 2, 1]
 * ```
 */
export function valueCounts(series: Series<Scalar>, options?: ValueCountsOptions): Series<number> {
  const opts = options ?? {};
  const dropna = opts.dropna ?? true;

  const pairs = buildCountMap(
    (function* () {
      for (const v of series.values) {
        if (dropna && isMissing(v)) {
          continue;
        }
        const key = scalarKey(v);
        const label = isMissing(v) ? null : (v as Label);
        yield [key, label] as [string, Label];
      }
    })(),
  );

  const total = dropna ? series.values.filter((v) => !isMissing(v)).length : series.values.length;

  return buildResult(pairs, total, opts, series.name ?? null);
}

// ─── DataFrame value_counts ────────────────────────────────────────────────────

/**
 * Count unique row combinations in a DataFrame (or a subset of columns).
 *
 * Returns a `Series<number>` whose index labels are `"v1|v2|…"` composite
 * strings formed from the unique value combinations across the selected columns,
 * with counts (or proportions when `normalize=true`) as values.
 *
 * Missing values (null / NaN) are excluded by default (`dropna=true`).
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([
 *   { a: "x", b: 1 }, { a: "x", b: 2 }, { a: "y", b: 1 }, { a: "x", b: 1 },
 * ]);
 * const vc = dataFrameValueCounts(df, { subset: ["a", "b"] });
 * // index: ["x|1", "x|2", "y|1"], values: [2, 1, 1]
 * ```
 */
export function dataFrameValueCounts(
  df: DataFrame,
  options?: DataFrameValueCountsOptions,
): Series<number> {
  const opts = options ?? {};
  const dropna = opts.dropna ?? true;

  const colNames = resolveSubset(df, opts.subset);
  const nrows = df.shape[0];

  const pairs = buildCountMap(buildRowPairs(df, colNames, nrows, dropna));

  const total = dropna ? countValidRows(df, colNames, nrows) : nrows;

  return buildResult(pairs, total === 0 ? 1 : total, opts, null);
}

/** Resolve the subset of columns to use, defaulting to all columns. */
function resolveSubset(df: DataFrame, subset: readonly string[] | undefined): readonly string[] {
  if (subset !== undefined && subset.length > 0) {
    return subset;
  }
  return df.columns.values;
}

/** Yield `[rowKey, rowLabel]` pairs for each row. */
function* buildRowPairs(
  df: DataFrame,
  colNames: readonly string[],
  nrows: number,
  dropna: boolean,
): Generator<[string, Label]> {
  for (let i = 0; i < nrows; i++) {
    const rowValues = getRowValues(df, colNames, i);
    if (dropna && rowValues.some(isMissing)) {
      continue;
    }
    const key = rowValues.map(scalarKey).join("|");
    const label = rowValues.map((v) => (isMissing(v) ? "null" : String(v))).join("|");
    yield [key, label];
  }
}

/** Get the scalar values for a row across the selected columns. */
function getRowValues(df: DataFrame, colNames: readonly string[], row: number): Scalar[] {
  return colNames.map((name) => {
    const col = df.get(name);
    return col !== undefined ? (col.values[row] ?? null) : null;
  });
}

/** Count rows with no missing value in any of the selected columns. */
function countValidRows(df: DataFrame, colNames: readonly string[], nrows: number): number {
  let count = 0;
  for (let i = 0; i < nrows; i++) {
    const rowValues = getRowValues(df, colNames, i);
    if (!rowValues.some(isMissing)) {
      count += 1;
    }
  }
  return count;
}
