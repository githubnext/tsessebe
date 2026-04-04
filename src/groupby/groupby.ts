/**
 * GroupBy — split-apply-combine for Series and DataFrame.
 *
 * Mirrors `pandas.core.groupby`: splits a data structure by one or more keys,
 * applies an aggregation or transformation function independently to each
 * group, and combines the results into a new data structure.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([
 *   { team: "A", score: 10 },
 *   { team: "B", score: 20 },
 *   { team: "A", score: 30 },
 * ]);
 * const result = dataFrameGroupBy(df, "team").sum();
 * // DataFrame with index ["A","B"] and column "score" = [40, 20]
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "../core/base-index.ts";
import { Series } from "../core/series.ts";
import { DataFrame } from "../core/frame.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Aggregation function: maps an array of values to a single scalar. */
export type AggFunc = (values: readonly Scalar[]) => Scalar;

/** Named aggregation spec: maps column name → aggregation function. */
export type AggSpec = Record<string, AggFunc | string>;

/** Built-in aggregation names. */
export type BuiltinAgg = "sum" | "mean" | "min" | "max" | "count" | "first" | "last" | "std";

// ─── scalar → label coercion ─────────────────────────────────────────────────

/** Coerce any Scalar to a Label (bigint and Date are stringified). */
function toLabel(v: Scalar): Label {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return String(v);
  if (v instanceof Date) return v.toISOString();
  return v as Label;
}

// ─── built-in aggregators ─────────────────────────────────────────────────────

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

function numericValues(vals: readonly Scalar[]): number[] {
  return vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
}

const BUILTIN_AGGS: Record<BuiltinAgg, AggFunc> = {
  sum(vals) {
    const nums = numericValues(vals);
    return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0);
  },
  mean(vals) {
    const nums = numericValues(vals);
    if (nums.length === 0) return Number.NaN;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },
  min(vals) {
    const nums = numericValues(vals);
    if (nums.length === 0) return Number.NaN;
    return Math.min(...nums);
  },
  max(vals) {
    const nums = numericValues(vals);
    if (nums.length === 0) return Number.NaN;
    return Math.max(...nums);
  },
  count(vals) {
    return vals.filter((v) => !isMissing(v)).length;
  },
  first(vals) {
    return vals.length > 0 ? (vals[0] ?? null) : null;
  },
  last(vals) {
    return vals.length > 0 ? (vals[vals.length - 1] ?? null) : null;
  },
  std(vals) {
    const nums = numericValues(vals);
    if (nums.length < 2) return Number.NaN;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((sum, v) => sum + (v - m) ** 2, 0) / (nums.length - 1);
    return Math.sqrt(variance);
  },
};

/** Resolve a builtin name or custom AggFunc to an AggFunc. */
function resolveAgg(f: AggFunc | string): AggFunc {
  if (typeof f === "function") return f;
  const builtin = BUILTIN_AGGS[f as BuiltinAgg];
  if (!builtin) {
    throw new Error(
      `Unknown aggregation: "${f}". Use one of: ${Object.keys(BUILTIN_AGGS).join(", ")}`,
    );
  }
  return builtin;
}

// ─── grouping helpers ─────────────────────────────────────────────────────────

/**
 * Build a map from group key → row indices (in original order).
 * Keys are in first-occurrence order; undefined is normalized to null.
 */
function buildGroups(keys: readonly Label[]): Map<Label, number[]> {
  const groups = new Map<Label, number[]>();
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] ?? null;
    let indices = groups.get(k);
    if (indices === undefined) {
      indices = [];
      groups.set(k, indices);
    }
    indices.push(i);
  }
  return groups;
}

/** Retrieve a value from an array by index, guarding against out-of-bounds. */
function arrGet<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined && i >= 0 && i < arr.length) {
    // arr[i] is explicitly undefined (e.g., a Scalar[] containing undefined)
    return v as T;
  }
  if (i < 0 || i >= arr.length) throw new RangeError(`Index ${i} out of bounds [0, ${arr.length})`);
  return v as T;
}

// ─── SeriesGroupBy ────────────────────────────────────────────────────────────

/**
 * A GroupBy object for a `Series`.
 *
 * Created via `seriesGroupBy(series, by)`.
 */
export class SeriesGroupBy {
  private readonly _source: Series<Scalar>;
  private readonly _groups: Map<Label, number[]>;

  /** @internal */
  constructor(source: Series<Scalar>, groups: Map<Label, number[]>) {
    this._source = source;
    this._groups = groups;
  }

  // ─── group inspection ───────────────────────────────────────────────────────

  /** Number of distinct groups. */
  get ngroups(): number {
    return this._groups.size;
  }

  /** Ordered array of group keys. */
  get groupKeys(): readonly Label[] {
    return [...this._groups.keys()];
  }

  /** Map of group key → row indices in that group. */
  get groups(): ReadonlyMap<Label, readonly number[]> {
    return this._groups;
  }

  /** Return the sub-Series for a single group key. */
  getGroup(key: Label): Series<Scalar> {
    const indices = this._groups.get(key);
    if (indices === undefined) throw new Error(`Group key not found: ${String(key)}`);
    return this._selectRows(indices);
  }

  // ─── aggregation ────────────────────────────────────────────────────────────

  /**
   * Apply an aggregation function to each group.
   *
   * @param func A built-in name (`"sum"`, `"mean"`, …) or a custom function.
   */
  agg(func: AggFunc | BuiltinAgg): Series<Scalar> {
    return this._applyAgg(resolveAgg(func));
  }

  /** Sum of each group (numeric values only). */
  sum(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.sum);
  }

  /** Arithmetic mean of each group. */
  mean(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.mean);
  }

  /** Minimum of each group. */
  min(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.min);
  }

  /** Maximum of each group. */
  max(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.max);
  }

  /** Count of non-missing values in each group. */
  count(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.count);
  }

  /** First value of each group. */
  first(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.first);
  }

  /** Last value of each group. */
  last(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.last);
  }

  /** Sample standard deviation of each group. */
  std(): Series<Scalar> {
    return this._applyAgg(BUILTIN_AGGS.std);
  }

  // ─── transform ──────────────────────────────────────────────────────────────

  /**
   * Apply a transformation to each group, returning a Series of the same
   * length as the source.  The function receives the group's values and must
   * return an array of the same length.
   */
  transform(func: (values: readonly Scalar[]) => readonly Scalar[]): Series<Scalar> {
    const result = new Array<Scalar>(this._source.size);
    for (const [, indices] of this._groups) {
      const vals = indices.map((i) => arrGet(this._source.values, i));
      const transformed = func(vals);
      if (transformed.length !== indices.length) {
        throw new RangeError(
          `transform function must return the same number of values as the group ` +
            `(got ${transformed.length}, expected ${indices.length})`,
        );
      }
      for (let j = 0; j < indices.length; j++) {
        result[indices[j] as number] = transformed[j] as Scalar;
      }
    }
    return new Series<Scalar>({
      data: result,
      index: this._source.index,
      ...(this._source.name !== null ? { name: this._source.name } : {}),
    });
  }

  // ─── apply ──────────────────────────────────────────────────────────────────

  /**
   * Apply a function to each group's sub-Series and collect scalar results
   * into a new Series indexed by group keys.
   */
  apply(func: (group: Series<Scalar>) => Scalar): Series<Scalar> {
    const keys: Label[] = [];
    const values: Scalar[] = [];
    for (const [key, indices] of this._groups) {
      keys.push(key);
      values.push(func(this._selectRows(indices)));
    }
    return new Series<Scalar>({
      data: values,
      index: new Index<Label>(keys),
      ...(this._source.name !== null ? { name: this._source.name } : {}),
    });
  }

  // ─── iteration ──────────────────────────────────────────────────────────────

  /** Iterate over `[groupKey, subSeries]` pairs in first-occurrence order. */
  *[Symbol.iterator](): IterableIterator<[Label, Series<Scalar>]> {
    for (const [key, indices] of this._groups) {
      yield [key, this._selectRows(indices)];
    }
  }

  // ─── private ────────────────────────────────────────────────────────────────

  private _applyAgg(fn: AggFunc): Series<Scalar> {
    const keys: Label[] = [];
    const values: Scalar[] = [];
    for (const [key, indices] of this._groups) {
      const vals = indices.map((i) => arrGet(this._source.values, i));
      keys.push(key);
      values.push(fn(vals));
    }
    return new Series<Scalar>({
      data: values,
      index: new Index<Label>(keys),
      ...(this._source.name !== null ? { name: this._source.name } : {}),
    });
  }

  private _selectRows(indices: readonly number[]): Series<Scalar> {
    const data = indices.map((i) => arrGet(this._source.values, i));
    const idxLabels = indices.map((i) => this._source.index.at(i));
    return new Series<Scalar>({
      data,
      index: new Index<Label>(idxLabels),
      ...(this._source.name !== null ? { name: this._source.name } : {}),
    });
  }
}

// ─── DataFrameGroupBy ─────────────────────────────────────────────────────────

/**
 * A GroupBy object for a `DataFrame`.
 *
 * Created via `dataFrameGroupBy(df, by)` where `by` is one or more column
 * name(s).  When grouping by multiple columns, the group key is a
 * tab-separated composite string `"v1\tv2\t…"` (MultiIndex support is planned
 * for a future iteration).
 */
export class DataFrameGroupBy {
  private readonly _source: DataFrame;
  private readonly _by: readonly string[];
  private readonly _groups: Map<Label, number[]>;

  /** @internal */
  constructor(source: DataFrame, by: readonly string[], groups: Map<Label, number[]>) {
    this._source = source;
    this._by = by;
    this._groups = groups;
  }

  // ─── group inspection ───────────────────────────────────────────────────────

  /** Number of distinct groups. */
  get ngroups(): number {
    return this._groups.size;
  }

  /** Column name(s) used for grouping. */
  get by(): readonly string[] {
    return this._by;
  }

  /** Ordered array of group keys. */
  get groupKeys(): readonly Label[] {
    return [...this._groups.keys()];
  }

  /** Map of group key → row indices in that group. */
  get groups(): ReadonlyMap<Label, readonly number[]> {
    return this._groups;
  }

  /** Return the sub-DataFrame for a single group key. */
  getGroup(key: Label): DataFrame {
    const indices = this._groups.get(key);
    if (indices === undefined) throw new Error(`Group key not found: ${String(key)}`);
    return this._selectRows(indices);
  }

  // ─── single-function aggregation ────────────────────────────────────────────

  /**
   * Aggregate all non-key columns with the same function.
   *
   * @example
   * ```ts
   * dataFrameGroupBy(df, "team").agg("sum");
   * dataFrameGroupBy(df, "team").agg(vals => vals.length);
   * ```
   */
  agg(func: AggFunc | BuiltinAgg): DataFrame;

  /**
   * Aggregate specific columns with different functions.
   *
   * @example
   * ```ts
   * dataFrameGroupBy(df, "team").agg({ score: "sum", weight: "mean" });
   * ```
   */
  agg(spec: AggSpec): DataFrame;

  agg(arg: AggFunc | BuiltinAgg | AggSpec): DataFrame {
    if (typeof arg === "function" || typeof arg === "string") {
      return this._applyUniformAgg(resolveAgg(arg as AggFunc | string));
    }
    return this._applySpecAgg(arg as AggSpec);
  }

  /** Sum of each group for all numeric columns. */
  sum(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.sum);
  }

  /** Mean of each group for all numeric columns. */
  mean(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.mean);
  }

  /** Minimum of each group for all numeric columns. */
  min(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.min);
  }

  /** Maximum of each group for all numeric columns. */
  max(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.max);
  }

  /** Count of non-missing values in each group for all columns. */
  count(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.count);
  }

  /** First value in each group for all columns. */
  first(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.first);
  }

  /** Last value in each group for all columns. */
  last(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.last);
  }

  /** Sample standard deviation of each group for all numeric columns. */
  std(): DataFrame {
    return this._applyUniformAgg(BUILTIN_AGGS.std);
  }

  // ─── transform ──────────────────────────────────────────────────────────────

  /**
   * Apply a transformation to each group for a named column, returning a
   * `Series` of the same length as the source DataFrame.
   */
  transform(
    column: string,
    func: (values: readonly Scalar[]) => readonly Scalar[],
  ): Series<Scalar> {
    const col = this._source.col(column);
    const result = new Array<Scalar>(this._source.shape[0]);
    for (const [, indices] of this._groups) {
      const vals = indices.map((i) => arrGet(col.values, i));
      const transformed = func(vals);
      if (transformed.length !== indices.length) {
        throw new RangeError(`transform function must return the same number of values as the group`);
      }
      for (let j = 0; j < indices.length; j++) {
        result[indices[j] as number] = transformed[j] as Scalar;
      }
    }
    return new Series<Scalar>({
      data: result,
      index: this._source.index,
      ...(col.name !== null ? { name: col.name } : {}),
    });
  }

  // ─── apply ──────────────────────────────────────────────────────────────────

  /**
   * Apply a function to each group's sub-DataFrame and collect scalar results.
   * Returns a Series indexed by the group keys.
   */
  apply(func: (group: DataFrame) => Scalar): Series<Scalar> {
    const keys: Label[] = [];
    const values: Scalar[] = [];
    for (const [key, indices] of this._groups) {
      keys.push(key);
      values.push(func(this._selectRows(indices)));
    }
    return new Series<Scalar>({ data: values, index: new Index<Label>(keys) });
  }

  // ─── iteration ──────────────────────────────────────────────────────────────

  /** Iterate over `[groupKey, subDataFrame]` pairs in first-occurrence order. */
  *[Symbol.iterator](): IterableIterator<[Label, DataFrame]> {
    for (const [key, indices] of this._groups) {
      yield [key, this._selectRows(indices)];
    }
  }

  // ─── private ────────────────────────────────────────────────────────────────

  private _valueColumns(): string[] {
    return this._source.columns.values.filter((c) => !this._by.includes(c));
  }

  private _applyUniformAgg(fn: AggFunc): DataFrame {
    const valueCols = this._valueColumns();
    const keys: Label[] = [];
    const colData = new Map<string, Scalar[]>();
    for (const c of valueCols) {
      colData.set(c, []);
    }
    for (const [key, indices] of this._groups) {
      keys.push(key);
      for (const c of valueCols) {
        const col = this._source.col(c);
        const vals = indices.map((i) => arrGet(col.values, i));
        const arr = colData.get(c);
        if (arr !== undefined) {
          arr.push(fn(vals));
        }
      }
    }
    return buildAggDataFrame(keys, valueCols, colData);
  }

  private _applySpecAgg(spec: AggSpec): DataFrame {
    const specCols = Object.keys(spec);
    const keys: Label[] = [];
    const colData = new Map<string, Scalar[]>();
    for (const c of specCols) {
      colData.set(c, []);
    }
    for (const [key, indices] of this._groups) {
      keys.push(key);
      for (const c of specCols) {
        if (!this._source.has(c)) throw new Error(`Column not found: "${c}"`);
        const col = this._source.col(c);
        const vals = indices.map((i) => arrGet(col.values, i));
        const fn = resolveAgg(spec[c] as AggFunc | string);
        const arr = colData.get(c);
        if (arr !== undefined) {
          arr.push(fn(vals));
        }
      }
    }
    return buildAggDataFrame(keys, specCols, colData);
  }

  private _selectRows(indices: readonly number[]): DataFrame {
    return this._source.iloc(indices);
  }
}

// ─── factory functions ────────────────────────────────────────────────────────

/**
 * Create a `SeriesGroupBy` from a Series and grouping keys.
 *
 * @param source  The Series to group.
 * @param by      Grouping keys:
 *                - `"index"` — use the Series' own index labels as keys
 *                - `readonly Label[]` — an array of labels, one per row
 *                - `Series<Scalar>` — another series used as key values
 */
export function seriesGroupBy(
  source: Series<Scalar>,
  by: "index" | readonly Label[] | Series<Scalar>,
): SeriesGroupBy {
  let keys: readonly Label[];
  if (by === "index") {
    keys = source.index.values;
  } else if (by instanceof Series) {
    if (by.size !== source.size) {
      throw new RangeError(
        `GroupBy key length (${by.size}) must match Series length (${source.size})`,
      );
    }
    keys = by.values.map(toLabel);
  } else {
    const arr = by as readonly Label[];
    if (arr.length !== source.size) {
      throw new RangeError(
        `GroupBy key length (${arr.length}) must match Series length (${source.size})`,
      );
    }
    keys = arr;
  }
  return new SeriesGroupBy(source, buildGroups(keys));
}

/**
 * Create a `DataFrameGroupBy` from a DataFrame and one or more column names.
 *
 * @param source  The DataFrame to group.
 * @param by      Column name or array of column names to group by.
 */
export function dataFrameGroupBy(
  source: DataFrame,
  by: string | readonly string[],
): DataFrameGroupBy {
  const byCols: readonly string[] = typeof by === "string" ? [by] : by;
  for (const c of byCols) {
    if (!source.has(c)) throw new Error(`GroupBy column not found: "${c}"`);
  }
  const nRows = source.shape[0];
  const keys: Label[] = [];
  for (let i = 0; i < nRows; i++) {
    if (byCols.length === 1) {
      keys.push(toLabel(arrGet(source.col(byCols[0] as string).values, i)));
    } else {
      // Composite key: tab-separated stringified values
      const parts = byCols.map((c) => String(arrGet(source.col(c).values, i)));
      keys.push(parts.join("\t"));
    }
  }
  return new DataFrameGroupBy(source, byCols, buildGroups(keys));
}

// ─── internal builder ─────────────────────────────────────────────────────────

function buildAggDataFrame(
  keys: readonly Label[],
  valueCols: readonly string[],
  colData: Map<string, Scalar[]>,
): DataFrame {
  const index = new Index<Label>(keys);
  const columns: Record<string, readonly Scalar[]> = {};
  for (const c of valueCols) {
    const arr = colData.get(c);
    if (arr !== undefined) {
      columns[c] = arr;
    }
  }
  return DataFrame.fromColumns(columns, { index });
}
