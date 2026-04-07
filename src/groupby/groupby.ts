/**
 * GroupBy — split-apply-combine engine for DataFrame and Series.
 *
 * Mirrors `pandas.core.groupby`:
 *   - `DataFrame.groupby(by)` returns a `DataFrameGroupBy`
 *   - `Series.groupby(by)` returns a `SeriesGroupBy`
 *   - Both support `.agg()`, `.transform()`, `.apply()`, `.filter()`,
 *     `.first()`, `.last()`, `.sum()`, `.mean()`, `.min()`, `.max()`,
 *     `.count()`, `.std()`, `.size()`, `.ngroups`, `.groups`
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ dept: ["A","A","B","B"], val: [1,2,3,4] });
 * df.groupby("dept").sum();
 * // DataFrame { dept: ["A","B"], val: [3,7] }
 * ```
 */

import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** An aggregation function applied to an array of scalars. */
export type AggFn = (values: readonly Scalar[]) => Scalar;

/** Built-in aggregation names understood by `agg()`. */
export type AggName = "sum" | "mean" | "min" | "max" | "count" | "std" | "first" | "last" | "size";

/** Aggregation specification: a single name, a function, or a map of column→spec. */
export type AggSpec = AggName | AggFn | Readonly<Record<string, AggName | AggFn>>;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Sum of a numeric array (skipping missing). */
function aggSum(vals: readonly Scalar[]): Scalar {
  let s = 0;
  for (const v of vals) {
    if (!isMissing(v) && typeof v === "number") {
      s += v;
    }
  }
  return s;
}

/** Count of non-missing values. */
function aggCount(vals: readonly Scalar[]): Scalar {
  return vals.filter((v) => !isMissing(v)).length;
}

/** Mean of numeric values (skipping missing). */
function aggMean(vals: readonly Scalar[]): Scalar {
  const nums = vals.filter((v): v is number => !isMissing(v) && typeof v === "number");
  if (nums.length === 0) {
    return Number.NaN;
  }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Minimum of non-missing values. */
function aggMin(vals: readonly Scalar[]): Scalar {
  const clean = vals.filter((v) => !isMissing(v)) as Array<number | string | boolean>;
  if (clean.length === 0) {
    return Number.NaN;
  }
  return clean.reduce((a, b) => (a < b ? a : b));
}

/** Maximum of non-missing values. */
function aggMax(vals: readonly Scalar[]): Scalar {
  const clean = vals.filter((v) => !isMissing(v)) as Array<number | string | boolean>;
  if (clean.length === 0) {
    return Number.NaN;
  }
  return clean.reduce((a, b) => (a > b ? a : b));
}

/** Sample standard deviation (skipping missing). */
function aggStd(vals: readonly Scalar[]): Scalar {
  const nums = vals.filter((v): v is number => !isMissing(v) && typeof v === "number");
  if (nums.length < 2) {
    return Number.NaN;
  }
  const m = (nums.reduce((a, b) => a + b, 0) / nums.length) as number;
  const variance = nums.reduce((s, v) => s + (v - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

/** First non-missing value. */
function aggFirst(vals: readonly Scalar[]): Scalar {
  for (const v of vals) {
    if (!isMissing(v)) {
      return v;
    }
  }
  return null;
}

/** Last non-missing value. */
function aggLast(vals: readonly Scalar[]): Scalar {
  for (let i = vals.length - 1; i >= 0; i--) {
    const v = vals[i] as Scalar;
    if (!isMissing(v)) {
      return v;
    }
  }
  return null;
}

/** Group size (including missing). */
function aggSize(vals: readonly Scalar[]): Scalar {
  return vals.length;
}

/** Dispatch a named aggregation to its implementation. */
function applyAggName(name: AggName, vals: readonly Scalar[]): Scalar {
  switch (name) {
    case "sum":
      return aggSum(vals);
    case "mean":
      return aggMean(vals);
    case "min":
      return aggMin(vals);
    case "max":
      return aggMax(vals);
    case "count":
      return aggCount(vals);
    case "std":
      return aggStd(vals);
    case "first":
      return aggFirst(vals);
    case "last":
      return aggLast(vals);
    case "size":
      return aggSize(vals);
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}

/** Resolve an AggSpec entry to a concrete function. */
function resolveAgg(spec: AggName | AggFn): AggFn {
  if (typeof spec === "function") {
    return spec;
  }
  return (vals: readonly Scalar[]): Scalar => applyAggName(spec, vals);
}

/** Build a default RangeIndex of length `n`. */
function defaultIndex(n: number): Index<Label> {
  return new RangeIndex(n) as unknown as Index<Label>;
}

// ─── GroupMap ────────────────────────────────────────────────────────────────

/**
 * Internal representation of the split result: an ordered map from group key
 * (as a string) to the row positions that belong to it.
 */
interface GroupEntry {
  readonly key: Label;
  readonly positions: readonly number[];
}

/** Build group entries from a single key column. */
function buildGroupMap(keyValues: readonly Scalar[]): GroupEntry[] {
  const order: Label[] = [];
  const posMap = new Map<string, { key: Label; positions: number[] }>();
  for (let i = 0; i < keyValues.length; i++) {
    const raw = keyValues[i] as Scalar;
    const keyStr = raw === null || raw === undefined ? "__NaN__" : String(raw);
    if (!posMap.has(keyStr)) {
      const key: Label = raw === null || raw === undefined ? null : (raw as Label);
      posMap.set(keyStr, { key, positions: [] });
      order.push(key);
    }
    (posMap.get(keyStr) as { key: Label; positions: number[] }).positions.push(i);
  }
  return order.map((k) => {
    const keyStr = k === null ? "__NaN__" : String(k);
    return posMap.get(keyStr) as GroupEntry;
  });
}

/** Build group entries for a multi-key groupby. */
function buildMultiGroupMap(keyColumns: readonly (readonly Scalar[])[]): GroupEntry[] {
  if (keyColumns.length === 0 || (keyColumns[0] as readonly Scalar[]).length === 0) {
    return [];
  }
  const n = (keyColumns[0] as readonly Scalar[]).length;
  const order: string[] = [];
  const posMap = new Map<string, { key: Label; positions: number[] }>();
  for (let i = 0; i < n; i++) {
    const keyStr = keyColumns
      .map((col) => {
        const v = col[i] as Scalar;
        return v === null || v === undefined ? "__NaN__" : String(v);
      })
      .join("__SEP__");
    if (!posMap.has(keyStr)) {
      posMap.set(keyStr, { key: keyStr as Label, positions: [] });
      order.push(keyStr);
    }
    (posMap.get(keyStr) as { key: Label; positions: number[] }).positions.push(i);
  }
  return order.map((k) => posMap.get(k) as GroupEntry);
}

// ─── DataFrameGroupBy ────────────────────────────────────────────────────────

/**
 * A grouped DataFrame, ready for aggregation or transformation.
 *
 * Produced by `DataFrame.groupby(by)`.
 */
export class DataFrameGroupBy {
  private readonly _df: DataFrame;
  private readonly _by: readonly string[];
  private readonly _groups: readonly GroupEntry[];

  /** @internal */
  constructor(df: DataFrame, by: readonly string[]) {
    this._df = df;
    this._by = by;

    const keyCols = by.map((col) => {
      const s = df.col(col);
      return s.values as readonly Scalar[];
    });

    this._groups =
      by.length === 1
        ? buildGroupMap(keyCols[0] as readonly Scalar[])
        : buildMultiGroupMap(keyCols);
  }

  // ── introspection ──────────────────────────────────────────────────────────

  /** Number of groups. */
  get ngroups(): number {
    return this._groups.length;
  }

  /**
   * Map from group key label to the row-index labels belonging to that group.
   * For single-key groupby, keys are scalar labels.
   */
  get groups(): ReadonlyMap<Label, readonly Label[]> {
    const rowLabels = this._df.index.toArray();
    const m = new Map<Label, readonly Label[]>();
    for (const g of this._groups) {
      m.set(
        g.key,
        g.positions.map((p) => rowLabels[p] as Label),
      );
    }
    return m;
  }

  /** All group key labels in order. */
  get groupKeys(): readonly Label[] {
    return this._groups.map((g) => g.key);
  }

  // ── sub-frame access ───────────────────────────────────────────────────────

  /** Return the sub-DataFrame for a single group key. */
  getGroup(key: Label): DataFrame {
    const keyStr = key === null ? "__NaN__" : String(key);
    const g = this._groups.find(
      (entry) => (entry.key === null ? "__NaN__" : String(entry.key)) === keyStr,
    );
    if (!g) {
      throw new RangeError(`GroupBy: key not found: ${String(key)}`);
    }
    return this._selectRows(g.positions);
  }

  // ── aggregation ────────────────────────────────────────────────────────────

  /**
   * Aggregate each group using the given specification.
   *
   * - `agg("sum")` — apply `sum` to every non-key column
   * - `agg({ col1: "mean", col2: "max" })` — per-column specs
   * - `agg(fn)` — custom function `(vals: readonly Scalar[]) => Scalar`
   *
   * Returns a new DataFrame with group keys as the index or as columns,
   * depending on `asIndex`.
   */
  agg(spec: AggSpec, asIndex = true): DataFrame {
    const valueCols = this._valueCols();
    const colSpecs = this._resolveColSpecs(spec, valueCols);
    return this._runAgg(colSpecs, asIndex);
  }

  /** Shorthand for `agg("sum")`. */
  sum(): DataFrame {
    return this.agg("sum");
  }
  /** Shorthand for `agg("mean")`. */
  mean(): DataFrame {
    return this.agg("mean");
  }
  /** Shorthand for `agg("min")`. */
  min(): DataFrame {
    return this.agg("min");
  }
  /** Shorthand for `agg("max")`. */
  max(): DataFrame {
    return this.agg("max");
  }
  /** Shorthand for `agg("count")`. */
  count(): DataFrame {
    return this.agg("count");
  }
  /** Shorthand for `agg("std")`. */
  std(): DataFrame {
    return this.agg("std");
  }
  /** Shorthand for `agg("first")`. */
  first(): DataFrame {
    return this.agg("first");
  }
  /** Shorthand for `agg("last")`. */
  last(): DataFrame {
    return this.agg("last");
  }

  /**
   * Return a Series with group sizes (includes missing values).
   */
  size(): Series<number> {
    const keys = this._groups.map((g) => g.key);
    const sizes = this._groups.map((g) => g.positions.length);
    return new Series<number>({
      data: sizes,
      index: new Index<Label>(keys),
      name: "size",
    });
  }

  // ── transform ────────────────────────────────────────────────────────────

  /**
   * Apply a function group-wise and return a same-shape DataFrame.
   *
   * Unlike `agg()`, `transform()` preserves the original row alignment —
   * the result has the same index as the input DataFrame. Each column value is
   * replaced by the result of applying `fn` to the group's column values
   * and broadcasting back to the original positions.
   *
   * @param fn - receives `(vals: readonly Scalar[], col: string) => readonly Scalar[]`
   */
  transform(fn: (vals: readonly Scalar[], col: string) => readonly Scalar[]): DataFrame {
    const valueCols = this._valueCols();
    const n = this._df.shape[0];

    const colData: Record<string, readonly Scalar[]> = {};

    // preserve key columns as-is
    for (const key of this._by) {
      const s = this._df.col(key);
      colData[key] = s.values as readonly Scalar[];
    }

    for (const col of valueCols) {
      const srcVals = this._df.col(col).values as readonly Scalar[];
      const out = new Array<Scalar>(n);

      for (const g of this._groups) {
        const groupVals = g.positions.map((p) => srcVals[p] as Scalar);
        const transformed = fn(groupVals, col);
        for (let i = 0; i < g.positions.length; i++) {
          const p = g.positions[i];
          if (p !== undefined) {
            out[p] = transformed[i] ?? null;
          }
        }
      }
      colData[col] = out;
    }

    return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, {
      index: this._df.index,
    });
  }

  // ── apply ────────────────────────────────────────────────────────────────

  /**
   * Apply a function to each group (as a sub-DataFrame) and concatenate
   * the results vertically.
   *
   * The `fn` receives the sub-DataFrame for each group and must return
   * a DataFrame. Results are stacked in group-key order.
   */
  apply(fn: (subDf: DataFrame) => DataFrame): DataFrame {
    const frames = this._groups.map((g) => fn(this._selectRows(g.positions)));
    return concatDataFrames(frames);
  }

  /**
   * Keep only groups for which `predicate` returns true.
   * Returns a DataFrame with the rows from matching groups, in original order.
   */
  filter(predicate: (subDf: DataFrame) => boolean): DataFrame {
    const kept: number[] = [];
    for (const g of this._groups) {
      if (predicate(this._selectRows(g.positions))) {
        for (const p of g.positions) {
          kept.push(p);
        }
      }
    }
    kept.sort((a, b) => a - b);
    return this._selectRows(kept);
  }

  // ── private helpers ───────────────────────────────────────────────────────

  /** Columns that are NOT part of the groupby keys. */
  private _valueCols(): readonly string[] {
    const bySet = new Set(this._by);
    return this._df.columns.toArray().filter((c) => !bySet.has(c));
  }

  /**
   * Resolve `AggSpec` into a per-column map of `AggFn`.
   */
  private _resolveColSpecs(
    spec: AggSpec,
    valueCols: readonly string[],
  ): ReadonlyMap<string, AggFn> {
    const m = new Map<string, AggFn>();
    if (typeof spec === "string" || typeof spec === "function") {
      const fn = resolveAgg(spec as AggName | AggFn);
      for (const col of valueCols) {
        m.set(col, fn);
      }
    } else {
      // Record<string, AggName | AggFn>
      for (const [col, colSpec] of Object.entries(spec)) {
        m.set(col, resolveAgg(colSpec));
      }
    }
    return m;
  }

  /**
   * Run aggregation across all groups and return a DataFrame.
   * If `asIndex` is true the group keys form the row index;
   * otherwise they appear as regular columns.
   */
  private _runAgg(colSpecs: ReadonlyMap<string, AggFn>, asIndex: boolean): DataFrame {
    const groupKeys = this._groups.map((g) => g.key);
    const resultCols: Record<string, Scalar[]> = {};

    if (!asIndex) {
      // include key columns in result
      if (this._by.length === 1) {
        const byCol = this._by[0] as string;
        resultCols[byCol] = groupKeys.slice();
      } else {
        // multi-key: split composite key back into individual columns
        for (const by of this._by) {
          resultCols[by] = [];
        }
        for (const g of this._groups) {
          const parts = (g.key as string).split("__SEP__");
          this._by.forEach((by, idx) => {
            const byArr = resultCols[by];
            if (byArr !== undefined) {
              byArr.push(parts[idx] ?? null);
            }
          });
        }
      }
    }

    for (const [col, fn] of colSpecs) {
      const srcVals = this._df.col(col).values as readonly Scalar[];
      resultCols[col] = this._groups.map((g) => fn(g.positions.map((p) => srcVals[p] as Scalar)));
    }

    const rowIdx: Index<Label> = asIndex
      ? new Index<Label>(groupKeys)
      : defaultIndex(groupKeys.length);

    return DataFrame.fromColumns(resultCols as Record<string, readonly Scalar[]>, {
      index: rowIdx,
    });
  }

  /** Select rows by position from the underlying DataFrame. */
  private _selectRows(positions: readonly number[]): DataFrame {
    return this._df.iloc(positions);
  }
}

// ─── SeriesGroupBy ────────────────────────────────────────────────────────────

/**
 * A grouped Series, ready for aggregation or transformation.
 *
 * Produced by `Series.groupby(by)`.
 */
export class SeriesGroupBy {
  private readonly _series: Series<Scalar>;
  private readonly _groups: readonly GroupEntry[];

  /** @internal */
  constructor(series: Series<Scalar>, by: readonly Scalar[] | Series<Scalar>) {
    this._series = series;
    const keyVals: readonly Scalar[] = by instanceof Series ? (by.values as readonly Scalar[]) : by;
    this._groups = buildGroupMap(keyVals);
  }

  /** Number of groups. */
  get ngroups(): number {
    return this._groups.length;
  }

  /** Map from group key to array of row-index labels. */
  get groups(): ReadonlyMap<Label, readonly Label[]> {
    const rowLabels = this._series.index.toArray();
    const m = new Map<Label, readonly Label[]>();
    for (const g of this._groups) {
      m.set(
        g.key,
        g.positions.map((p) => rowLabels[p] as Label),
      );
    }
    return m;
  }

  /** Return the sub-Series for a single group key. */
  getGroup(key: Label): Series<Scalar> {
    const keyStr = key === null ? "__NaN__" : String(key);
    const g = this._groups.find(
      (entry) => (entry.key === null ? "__NaN__" : String(entry.key)) === keyStr,
    );
    if (!g) {
      throw new RangeError(`SeriesGroupBy: key not found: ${String(key)}`);
    }
    return this._selectRows(g.positions);
  }

  /** Aggregate each group using the given spec. */
  agg(spec: AggName | AggFn): Series<Scalar> {
    const fn = resolveAgg(spec);
    const srcVals = this._series.values as readonly Scalar[];
    const keys = this._groups.map((g) => g.key);
    const vals = this._groups.map((g) => fn(g.positions.map((p) => srcVals[p] as Scalar)));
    return new Series<Scalar>({
      data: vals,
      index: new Index<Label>(keys),
      ...(this._series.name !== null && this._series.name !== undefined
        ? { name: this._series.name }
        : {}),
    });
  }

  /** Shorthand aggregations. */
  sum(): Series<Scalar> {
    return this.agg("sum");
  }
  mean(): Series<Scalar> {
    return this.agg("mean");
  }
  min(): Series<Scalar> {
    return this.agg("min");
  }
  max(): Series<Scalar> {
    return this.agg("max");
  }
  count(): Series<Scalar> {
    return this.agg("count");
  }
  std(): Series<Scalar> {
    return this.agg("std");
  }
  first(): Series<Scalar> {
    return this.agg("first");
  }
  last(): Series<Scalar> {
    return this.agg("last");
  }

  /** Return a Series with group sizes. */
  size(): Series<number> {
    const keys = this._groups.map((g) => g.key);
    const sizes = this._groups.map((g) => g.positions.length);
    return new Series<number>({
      data: sizes,
      index: new Index<Label>(keys),
      ...(this._series.name !== null && this._series.name !== undefined
        ? { name: this._series.name }
        : {}),
    });
  }

  /**
   * Apply function group-wise, return a same-length Series.
   */
  transform(fn: (vals: readonly Scalar[]) => readonly Scalar[]): Series<Scalar> {
    const n = this._series.values.length;
    const srcVals = this._series.values as readonly Scalar[];
    const out = new Array<Scalar>(n);

    for (const g of this._groups) {
      const groupVals = g.positions.map((p) => srcVals[p] as Scalar);
      const transformed = fn(groupVals);
      for (let i = 0; i < g.positions.length; i++) {
        const p = g.positions[i];
        if (p !== undefined) {
          out[p] = transformed[i] ?? null;
        }
      }
    }

    return new Series<Scalar>({
      data: out,
      index: this._series.index,
      ...(this._series.name !== null && this._series.name !== undefined
        ? { name: this._series.name }
        : {}),
    });
  }

  /** Apply `fn` to each group and concatenate results. */
  apply(fn: (s: Series<Scalar>) => Series<Scalar>): Series<Scalar> {
    const parts = this._groups.map((g) => fn(this._selectRows(g.positions)));
    return concatSeries(parts);
  }

  /** Keep only groups where `predicate` returns true. */
  filter(predicate: (s: Series<Scalar>) => boolean): Series<Scalar> {
    const kept: number[] = [];
    for (const g of this._groups) {
      if (predicate(this._selectRows(g.positions))) {
        for (const p of g.positions) {
          kept.push(p);
        }
      }
    }
    kept.sort((a, b) => a - b);
    return this._selectRows(kept);
  }

  private _selectRows(positions: readonly number[]): Series<Scalar> {
    const vals = this._series.values as readonly Scalar[];
    const rowLabels = this._series.index.toArray();
    return new Series<Scalar>({
      data: positions.map((p) => vals[p] as Scalar),
      index: new Index<Label>(positions.map((p) => rowLabels[p] as Label)),
      ...(this._series.name !== null && this._series.name !== undefined
        ? { name: this._series.name }
        : {}),
    });
  }
}

// ─── concat helpers ───────────────────────────────────────────────────────────

/** Concatenate DataFrames vertically (used internally by apply). */
function concatDataFrames(frames: readonly DataFrame[]): DataFrame {
  if (frames.length === 0) {
    return DataFrame.fromColumns({});
  }
  const firstFrame = frames[0];
  if (firstFrame === undefined) {
    return DataFrame.fromColumns({});
  }
  const cols = firstFrame.columns.toArray();
  const colData: Record<string, Scalar[]> = {};
  for (const c of cols) {
    colData[c] = [];
  }

  const allRowLabels: Label[] = [];
  for (const frame of frames) {
    const rowLabels = frame.index.toArray();
    for (let i = 0; i < frame.shape[0]; i++) {
      allRowLabels.push(rowLabels[i] as Label);
      for (const c of cols) {
        const arr = colData[c];
        if (arr !== undefined) {
          arr.push((frame.col(c).values as readonly Scalar[])[i] ?? null);
        }
      }
    }
  }

  return DataFrame.fromColumns(colData as Record<string, readonly Scalar[]>, {
    index: new Index<Label>(allRowLabels),
  });
}

/** Concatenate Series vertically (used internally by apply). */
function concatSeries(parts: readonly Series<Scalar>[]): Series<Scalar> {
  if (parts.length === 0) {
    return new Series<Scalar>({ data: [] });
  }
  const vals: Scalar[] = [];
  const labels: Label[] = [];
  for (const s of parts) {
    for (const v of s.values) {
      vals.push(v as Scalar);
    }
    for (const l of s.index.toArray()) {
      labels.push(l as Label);
    }
  }
  return new Series<Scalar>({
    data: vals,
    index: new Index<Label>(labels),
    ...(parts[0]?.name !== null && parts[0]?.name !== undefined ? { name: parts[0]?.name } : {}),
  });
}
