/**
 * DataFrame — a two-dimensional labeled table with heterogeneous column dtypes.
 *
 * Mirrors `pandas.DataFrame`: a column-oriented, 2-D data structure where each
 * column is a `Series<Scalar>` sharing a common row `Index<Label>`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   name: ["Alice", "Bob", "Carol"],
 *   age:  [30, 25, 35],
 * });
 * df.shape;             // [3, 2]
 * df.col("age").mean(); // 30
 * df.head(2).toRecords();
 * // [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]
 * ```
 */

import { DataFrameGroupBy } from "../groupby/index.ts";
import type { Label, Scalar } from "../types.ts";
import { EWM } from "../window/ewm.ts";
import type { EwmOptions } from "../window/ewm.ts";
import { Expanding } from "../window/expanding.ts";
import type { ExpandingOptions } from "../window/expanding.ts";
import { Rolling } from "../window/rolling.ts";
import type { RollingOptions } from "../window/rolling.ts";
import { Index } from "./base-index.ts";
import { RangeIndex } from "./range-index.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value should be treated as missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Build a default RangeIndex of length `n`. */
function defaultRowIndex(n: number): Index<Label> {
  return new RangeIndex(n) as unknown as Index<Label>;
}

/** Clamp n to [0, max]. */
function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(n, max));
}

/** Extract a sub-array by integer positions. */
function selectByPositions<T>(arr: readonly T[], positions: readonly number[]): T[] {
  return positions.map((p) => arr[p] as T);
}

/** Arithmetic mean of a non-empty numeric array. */
function mean(nums: readonly number[]): number {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

/** Sample standard deviation. */
function stdDev(nums: readonly number[]): number {
  if (nums.length < 2) {
    return Number.NaN;
  }
  const m = mean(nums);
  const variance = nums.reduce((s, v) => s + (v - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

// ─── DataFrame options ────────────────────────────────────────────────────────

/** Options shared by multiple DataFrame constructors. */
export interface DataFrameOptions {
  /** Optional row-axis index. Defaults to a `RangeIndex`. */
  readonly index?: Index<Label> | readonly Label[];
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * A two-dimensional, size-mutable, potentially heterogeneous tabular data structure.
 *
 * Columns are stored as `Series<Scalar>` objects and share a common row `Index<Label>`.
 */
export class DataFrame {
  /** Column data: ordered map from column name → Series. */
  private readonly _columns: ReadonlyMap<string, Series<Scalar>>;

  /** Row axis. */
  readonly index: Index<Label>;

  /** Column axis. */
  readonly columns: Index<string>;

  // ─── construction ─────────────────────────────────────────────────────────

  /**
   * Low-level constructor.  Prefer the static factory methods for typical use.
   *
   * @param columns - Ordered map of column name → Series (all same length and index).
   * @param index   - Row index (must match each Series' length).
   */
  constructor(
    columns: ReadonlyMap<string, Series<Scalar>>,
    index: Index<Label>,
    columnNames?: readonly string[],
  ) {
    this._columns = columns;
    this.index = index;
    this.columns = new Index<string>(columnNames ?? [...columns.keys()]);
  }

  /**
   * Create a DataFrame from an object mapping column names to value arrays.
   *
   * @example
   * ```ts
   * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
   * ```
   */
  static fromColumns(
    data: Readonly<Record<string, readonly Scalar[]>>,
    options?: DataFrameOptions,
  ): DataFrame {
    const keys = Object.keys(data);
    const nRows = keys.length === 0 ? 0 : (data[keys[0] as string]?.length ?? 0);
    const rowIndex = resolveRowIndex(nRows, options?.index);
    const colMap = buildColumnMapFromArrays(data, keys, rowIndex);
    return new DataFrame(colMap, rowIndex);
  }

  /**
   * Create a DataFrame from an array of row objects.
   *
   * @example
   * ```ts
   * const df = DataFrame.fromRecords([{ a: 1, b: 4 }, { a: 2, b: 5 }]);
   * ```
   */
  static fromRecords(
    records: readonly Readonly<Record<string, Scalar>>[],
    options?: DataFrameOptions,
  ): DataFrame {
    if (records.length === 0) {
      return new DataFrame(new Map(), defaultRowIndex(0));
    }
    const firstRecord = records[0];
    const keys = firstRecord !== undefined ? Object.keys(firstRecord) : [];
    const colData: Record<string, Scalar[]> = {};
    for (const key of keys) {
      colData[key] = [];
    }
    for (const row of records) {
      for (const key of keys) {
        const col = colData[key];
        if (col !== undefined) {
          col.push(row[key] ?? null);
        }
      }
    }
    const nRows = records.length;
    const rowIndex = resolveRowIndex(nRows, options?.index);
    const colMap = buildColumnMapFromArrays(
      colData as Record<string, readonly Scalar[]>,
      keys,
      rowIndex,
    );
    return new DataFrame(colMap, rowIndex);
  }

  /**
   * Create a DataFrame from a 2-D array (rows × columns).
   *
   * @example
   * ```ts
   * const df = DataFrame.from2D([[1, 4], [2, 5]], ["a", "b"]);
   * ```
   */
  static from2D(
    data: readonly (readonly Scalar[])[],
    colNames: readonly string[],
    options?: DataFrameOptions,
  ): DataFrame {
    const nCols = colNames.length;
    const rowIndex = resolveRowIndex(data.length, options?.index);
    const colData: Record<string, Scalar[]> = {};
    for (const name of colNames) {
      colData[name] = [];
    }
    for (const row of data) {
      for (let c = 0; c < nCols; c++) {
        const name = colNames[c];
        if (name !== undefined) {
          const col = colData[name];
          if (col !== undefined) {
            col.push(row[c] ?? null);
          }
        }
      }
    }
    const colMap = buildColumnMapFromArrays(
      colData as Record<string, readonly Scalar[]>,
      [...colNames],
      rowIndex,
    );
    return new DataFrame(colMap, rowIndex);
  }

  // ─── shape ────────────────────────────────────────────────────────────────

  /** `[nRows, nCols]` — mirrors `pandas.DataFrame.shape`. */
  get shape(): [number, number] {
    return [this.index.size, this.columns.size];
  }

  /** Always `2`. */
  get ndim(): 2 {
    return 2;
  }

  /** Total number of cells (`nRows * nCols`). */
  get size(): number {
    return this.index.size * this.columns.size;
  }

  /** `true` when the DataFrame has no rows or no columns. */
  get empty(): boolean {
    return this.index.size === 0 || this.columns.size === 0;
  }

  // ─── column access ────────────────────────────────────────────────────────

  /**
   * Return the named column as a `Series`.
   * Throws if the column does not exist.
   */
  col(name: string): Series<Scalar> {
    const s = this._columns.get(name);
    if (s === undefined) {
      throw new RangeError(`Column "${name}" does not exist.`);
    }
    return s;
  }

  /**
   * Return the named column as a `Series`, or `undefined` if it doesn't exist.
   */
  get(name: string): Series<Scalar> | undefined {
    return this._columns.get(name);
  }

  /**
   * Return `true` if the named column exists.
   */
  has(name: string): boolean {
    return this._columns.has(name);
  }

  // ─── slicing ──────────────────────────────────────────────────────────────

  /** Return the first `n` rows (default 5). */
  head(n = 5): DataFrame {
    return this._sliceRows(0, clamp(n, this.index.size));
  }

  /** Return the last `n` rows (default 5). */
  tail(n = 5): DataFrame {
    const total = this.index.size;
    return this._sliceRows(clamp(total - n, total), total);
  }

  /** Select rows by integer positions (like `iloc`). */
  iloc(positions: readonly number[]): DataFrame {
    return this._selectRows(positions);
  }

  /** Select rows by row-index labels (like `loc`). */
  loc(labels: readonly Label[]): DataFrame {
    const positions: number[] = [];
    for (const lbl of labels) {
      const result = this.index.getLoc(lbl);
      if (typeof result === "number") {
        positions.push(result);
      } else {
        for (const p of result) {
          positions.push(p);
        }
      }
    }
    return this._selectRows(positions);
  }

  // ─── column mutations (returns new DataFrame) ─────────────────────────────

  /**
   * Add or replace columns.  Returns a new DataFrame.
   *
   * @example
   * ```ts
   * const df2 = df.assign({ c: [7, 8, 9] });
   * ```
   */
  assign(newCols: Readonly<Record<string, readonly Scalar[] | Series<Scalar>>>): DataFrame {
    const colMap = new Map<string, Series<Scalar>>(this._columns);
    for (const [name, val] of Object.entries(newCols)) {
      if (val instanceof Series) {
        colMap.set(name, val);
      } else {
        colMap.set(name, new Series({ data: val, index: this.index }));
      }
    }
    return new DataFrame(colMap, this.index);
  }

  /** Drop one or more columns by name.  Returns a new DataFrame. */
  drop(names: readonly string[]): DataFrame {
    const colMap = new Map<string, Series<Scalar>>(this._columns);
    for (const name of names) {
      colMap.delete(name);
    }
    return new DataFrame(colMap, this.index);
  }

  /**
   * Select a subset of columns.  Returns a new DataFrame with columns in given order.
   */
  select(names: readonly string[]): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const name of names) {
      const s = this._columns.get(name);
      if (s === undefined) {
        throw new RangeError(`Column "${name}" does not exist.`);
      }
      colMap.set(name, s);
    }
    return new DataFrame(colMap, this.index);
  }

  /**
   * Rename columns.  Returns a new DataFrame.
   *
   * @example
   * ```ts
   * df.rename({ oldName: "newName" });
   * ```
   */
  rename(mapping: Readonly<Record<string, string>>): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      const newName = mapping[name] ?? name;
      colMap.set(newName, series);
    }
    return new DataFrame(colMap, this.index);
  }

  // ─── missing values ───────────────────────────────────────────────────────

  /** Return a boolean DataFrame indicating missing values. */
  isna(): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      colMap.set(name, series.isna() as Series<Scalar>);
    }
    return new DataFrame(colMap, this.index);
  }

  /** Return a boolean DataFrame indicating non-missing values. */
  notna(): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      colMap.set(name, series.notna() as Series<Scalar>);
    }
    return new DataFrame(colMap, this.index);
  }

  /** Drop rows that contain any missing value. */
  dropna(): DataFrame {
    const nRows = this.index.size;
    const keep: number[] = [];
    for (let i = 0; i < nRows; i++) {
      if (rowHasNoMissing(this._columns, i)) {
        keep.push(i);
      }
    }
    return this._selectRows(keep);
  }

  /** Fill missing values with a scalar. */
  fillna(value: Scalar): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      colMap.set(name, series.fillna(value));
    }
    return new DataFrame(colMap, this.index);
  }

  // ─── boolean mask filter ──────────────────────────────────────────────────

  /** Filter rows by a boolean mask (array or boolean Series). */
  filter(mask: readonly boolean[] | Series<boolean>): DataFrame {
    const bools = mask instanceof Series ? (mask.values as readonly boolean[]) : mask;
    const keep: number[] = [];
    for (let i = 0; i < bools.length; i++) {
      if (bools[i] === true) {
        keep.push(i);
      }
    }
    return this._selectRows(keep);
  }

  // ─── aggregations ─────────────────────────────────────────────────────────

  /** Column-wise sum (numeric columns only; non-numeric → NaN). */
  sum(): Series<Scalar> {
    return this._colAgg((s) => s.sum());
  }

  /** Column-wise mean. */
  mean(): Series<Scalar> {
    return this._colAgg((s) => s.mean());
  }

  /** Column-wise minimum. */
  min(): Series<Scalar> {
    return this._colAgg((s) => s.min());
  }

  /** Column-wise maximum. */
  max(): Series<Scalar> {
    return this._colAgg((s) => s.max());
  }

  /** Column-wise standard deviation. */
  std(): Series<Scalar> {
    return this._colAgg((s) => s.std());
  }

  /** Column-wise non-null count. */
  count(): Series<Scalar> {
    return this._colAgg((s) => s.count());
  }

  /** Column-wise descriptive statistics (count, mean, std, min, max). */
  describe(): DataFrame {
    const statNames = ["count", "mean", "std", "min", "max"] as const;
    const statIndex = new Index<Label>([...statNames]);
    const transposedMap = new Map<string, Series<Scalar>>();
    for (const [colName, series] of this._columns) {
      const colStats = computeColumnStats(series.values as readonly Scalar[]);
      transposedMap.set(colName, new Series({ data: colStats, index: statIndex }));
    }
    return new DataFrame(transposedMap, statIndex);
  }

  /**
   * Pairwise Pearson correlation matrix for all numeric columns.
   *
   * Returns a symmetric DataFrame whose row-index and column labels are the
   * numeric column names.  Diagonal entries are `1.0`.
   *
   * @param minPeriods - Minimum valid observation pairs (default 1).
   *
   * @example
   * ```ts
   * const df = new DataFrame({ a: [1, 2, 3], b: [4, 5, 6] });
   * df.corr().col("a").at(0); // 1.0
   * ```
   */
  corr(minPeriods = 1): DataFrame {
    return buildPairwiseDf(this, (a, b) => a.corr(b, minPeriods));
  }

  /**
   * Pairwise sample covariance matrix for all numeric columns.
   *
   * Returns a symmetric DataFrame whose row-index and column labels are the
   * numeric column names.  Diagonal entries are the variance of each column.
   *
   * @param ddof       - Delta degrees of freedom (default 1).
   * @param minPeriods - Minimum valid observation pairs (default 1).
   *
   * @example
   * ```ts
   * const df = new DataFrame({ a: [1, 2, 3], b: [2, 4, 6] });
   * df.cov().col("a").at(0); // 1.0
   * ```
   */
  cov(ddof = 1, minPeriods = 1): DataFrame {
    return buildPairwiseDf(this, (a, b) => seriesCov(a, b, ddof, minPeriods));
  }

  // ─── sorting ──────────────────────────────────────────────────────────────

  /**
   * Sort rows by one or more columns.
   *
   * @param by        - Column name(s) to sort by.
   * @param ascending - Sort direction (default `true`).
   */
  sortValues(
    by: string | readonly string[],
    ascending: boolean | readonly boolean[] = true,
  ): DataFrame {
    const keys = typeof by === "string" ? [by] : [...by];
    const dirs = buildSortDirs(ascending, keys.length);
    const nRows = this.index.size;
    const perm = Array.from({ length: nRows }, (_, i) => i);
    perm.sort((a, b) => compareRows(this._columns, keys, dirs, a, b));
    return this._selectRows(perm);
  }

  /** Sort rows by the row index. */
  sortIndex(ascending = true): DataFrame {
    const nRows = this.index.size;
    const idxVals = this.index.values;
    const perm = Array.from({ length: nRows }, (_, i) => i);
    perm.sort((a, b) => {
      const av = idxVals[a] as Label;
      const bv = idxVals[b] as Label;
      if (av === bv) {
        return 0;
      }
      const cmp = (av as string | number) < (bv as string | number) ? -1 : 1;
      return ascending ? cmp : -cmp;
    });
    return this._selectRows(perm);
  }

  // ─── apply ────────────────────────────────────────────────────────────────

  /**
   * Apply a function to each column (axis=0, default) or each row (axis=1).
   *
   * - axis=0: `fn` receives a `Series` for each column; returns a `Series` of results.
   * - axis=1: `fn` receives a `Series` for each row; returns a `Series` of results.
   */
  apply(fn: (s: Series<Scalar>) => Scalar, axis: 0 | 1 = 0): Series<Scalar> {
    if (axis === 0) {
      return applyOverColumns(fn, this._columns, this.columns);
    }
    return applyOverRows(fn, this._columns, this.columns, this.index);
  }

  // ─── iteration ────────────────────────────────────────────────────────────

  /** Iterate over `(columnName, Series)` pairs — mirrors `DataFrame.items()`. */
  *items(): IterableIterator<[string, Series<Scalar>]> {
    yield* this._columns.entries();
  }

  /** Alias for `items()` — mirrors `DataFrame.iteritems()`. */
  *iteritems(): IterableIterator<[string, Series<Scalar>]> {
    yield* this._columns.entries();
  }

  /** Iterate over `(rowLabel, rowSeries)` pairs — mirrors `DataFrame.iterrows()`. */
  *iterrows(): IterableIterator<[Label, Series<Scalar>]> {
    const nRows = this.index.size;
    const colIndex = this.columns;
    for (let i = 0; i < nRows; i++) {
      yield [this.index.at(i), buildRowSeries(this._columns, colIndex, i)];
    }
  }

  // ─── conversion ───────────────────────────────────────────────────────────

  /** Convert to an array of row records. */
  toRecords(): Record<string, Scalar>[] {
    const nRows = this.index.size;
    const result: Record<string, Scalar>[] = [];
    for (let i = 0; i < nRows; i++) {
      result.push(buildRowRecord(this._columns, i));
    }
    return result;
  }

  /** Convert to an object mapping column name → value array. */
  toDict(): Record<string, Scalar[]> {
    const result: Record<string, Scalar[]> = {};
    for (const [name, series] of this._columns) {
      result[name] = [...(series.values as readonly Scalar[])];
    }
    return result;
  }

  /** Convert to a 2-D array (rows × columns). */
  toArray(): Scalar[][] {
    const nRows = this.index.size;
    const colNames = [...this.columns.values];
    return Array.from({ length: nRows }, (_, i) =>
      colNames.map((name) => {
        const col = this._columns.get(name);
        return col !== undefined ? (col.values[i] ?? null) : null;
      }),
    );
  }

  // ─── index manipulation ───────────────────────────────────────────────────

  /**
   * Reset the row index to a default `RangeIndex`.
   *
   * @param drop - If `false` (default), the old index is added as a column named `"index"`.
   */
  resetIndex(drop = false): DataFrame {
    const nRows = this.index.size;
    const newIndex = defaultRowIndex(nRows);
    if (drop) {
      return new DataFrame(this._columns, newIndex);
    }
    const colMap = new Map<string, Series<Scalar>>();
    const indexSeries = new Series({
      data: [...this.index.values] as Scalar[],
      index: newIndex,
    });
    colMap.set("index", indexSeries);
    for (const [name, series] of this._columns) {
      colMap.set(name, new Series({ data: series.values as Scalar[], index: newIndex }));
    }
    return new DataFrame(colMap, newIndex);
  }

  /**
   * Set a column as the row index.
   *
   * @param col  - Column name to use as the new index.
   * @param drop - If `true` (default), remove the column from the DataFrame.
   */
  setIndex(col: string, drop = true): DataFrame {
    const series = this._columns.get(col);
    if (series === undefined) {
      throw new RangeError(`Column "${col}" does not exist.`);
    }
    const newIndex = new Index<Label>([...series.values] as Label[]);
    const colMap = new Map<string, Series<Scalar>>(this._columns);
    if (drop) {
      colMap.delete(col);
    }
    return new DataFrame(reindexColumns(colMap, newIndex), newIndex);
  }

  // ─── display ──────────────────────────────────────────────────────────────

  /** Return a human-readable string representation of the DataFrame. */
  toString(): string {
    return formatDataFrame(this._columns, this.index, this.columns);
  }

  // ─── rolling window ───────────────────────────────────────────────────────

  /**
   * Provide a rolling (sliding-window) view of the DataFrame.
   *
   * Aggregations are applied independently to each column.
   *
   * @param window  - Size of the moving window (positive integer).
   * @param options - Optional {@link RollingOptions} (`minPeriods`, `center`).
   *
   * @example
   * ```ts
   * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
   * df.rolling(2).mean();
   * // DataFrame: { a: [null, 1.5, 2.5, 3.5], b: [null, 15, 25, 35] }
   * ```
   */
  rolling(window: number, options?: RollingOptions): DataFrameRolling {
    return new DataFrameRolling(this, window, options);
  }

  // ─── expanding window ─────────────────────────────────────────────────────

  /**
   * Provide an expanding (growing-window) view of the DataFrame.
   *
   * @param options - Optional {@link ExpandingOptions} (`minPeriods`).
   *
   * @example
   * ```ts
   * const df = DataFrame.fromColumns({ a: [1, 2, 3] });
   * df.expanding().mean();
   * ```
   */
  expanding(options?: ExpandingOptions): DataFrameExpanding {
    return new DataFrameExpanding(this, options);
  }

  // ─── ewm window ───────────────────────────────────────────────────────────

  /**
   * Provide an Exponentially Weighted Moving (EWM) view of the DataFrame.
   *
   * @param options - {@link EwmOptions} specifying decay via `span`, `com`,
   *                  `halflife`, or `alpha`.
   *
   * @example
   * ```ts
   * const df = DataFrame.fromColumns({ a: [1, 2, 3] });
   * df.ewm({ span: 2 }).mean();
   * ```
   */
  ewm(options: EwmOptions): DataFrameEwm {
    return new DataFrameEwm(this, options);
  }

  // ─── groupby ──────────────────────────────────────────────────────────────

  /**
   * Group the DataFrame by one or more columns.
   *
   * Returns a `DataFrameGroupBy` object that can be used to apply
   * aggregation, transformation, or filtering operations on each group.
   *
   * @example
   * ```ts
   * df.groupby("dept").sum();
   * df.groupby(["dept", "region"]).mean();
   * ```
   */
  groupby(by: string | readonly string[]): DataFrameGroupBy {
    const cols = typeof by === "string" ? [by] : [...by];
    return new DataFrameGroupBy(this, cols);
  }

  // ─── private helpers ──────────────────────────────────────────────────────

  private _sliceRows(start: number, end: number): DataFrame {
    const positions = Array.from({ length: end - start }, (_, i) => start + i);
    return this._selectRows(positions);
  }

  private _selectRows(positions: readonly number[]): DataFrame {
    const newIndex = new Index<Label>(selectByPositions(this.index.values as Label[], positions));
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      const newData = selectByPositions(series.values as Scalar[], positions);
      colMap.set(name, new Series({ data: newData, index: newIndex }));
    }
    return new DataFrame(colMap, newIndex);
  }

  private _colAgg(fn: (s: Series<Scalar>) => Scalar): Series<Scalar> {
    return applyOverColumns(fn, this._columns, this.columns);
  }
}

// ─── module-level helpers (extracted to keep methods lean) ───────────────────

function resolveRowIndex(nRows: number, supplied?: Index<Label> | readonly Label[]): Index<Label> {
  if (supplied === undefined) {
    return defaultRowIndex(nRows);
  }
  if (supplied instanceof Index) {
    return supplied;
  }
  return new Index<Label>(supplied as Label[]);
}

function buildColumnMapFromArrays(
  data: Readonly<Record<string, readonly Scalar[]>>,
  keys: readonly string[],
  rowIndex: Index<Label>,
): Map<string, Series<Scalar>> {
  const colMap = new Map<string, Series<Scalar>>();
  for (const key of keys) {
    const arr = data[key] ?? [];
    colMap.set(key, new Series<Scalar>({ data: arr, index: rowIndex }));
  }
  return colMap;
}

function rowHasNoMissing(columns: ReadonlyMap<string, Series<Scalar>>, row: number): boolean {
  for (const [, series] of columns) {
    const v = series.values[row];
    if (v === undefined || isMissing(v)) {
      return false;
    }
  }
  return true;
}

function applyOverColumns(
  fn: (s: Series<Scalar>) => Scalar,
  columns: ReadonlyMap<string, Series<Scalar>>,
  colIndex: Index<string>,
): Series<Scalar> {
  const names = [...columns.keys()];
  const data = names.map((name) => fn(columns.get(name) as Series<Scalar>));
  return new Series({ data, index: colIndex as unknown as Index<Label> });
}

function applyOverRows(
  fn: (s: Series<Scalar>) => Scalar,
  columns: ReadonlyMap<string, Series<Scalar>>,
  colIndex: Index<string>,
  rowIndex: Index<Label>,
): Series<Scalar> {
  const nRows = rowIndex.size;
  const data: Scalar[] = [];
  for (let i = 0; i < nRows; i++) {
    data.push(fn(buildRowSeries(columns, colIndex, i)));
  }
  return new Series({ data, index: rowIndex });
}

function buildRowSeries(
  columns: ReadonlyMap<string, Series<Scalar>>,
  colIndex: Index<string>,
  row: number,
): Series<Scalar> {
  const colNames = [...columns.keys()];
  const rowData = colNames.map((name) => (columns.get(name)?.values[row] ?? null) as Scalar);
  return new Series({ data: rowData, index: colIndex as unknown as Index<Label> });
}

function buildRowRecord(
  columns: ReadonlyMap<string, Series<Scalar>>,
  row: number,
): Record<string, Scalar> {
  const rec: Record<string, Scalar> = {};
  for (const [name, series] of columns) {
    rec[name] = (series.values[row] ?? null) as Scalar;
  }
  return rec;
}

function reindexColumns(
  colMap: Map<string, Series<Scalar>>,
  newIndex: Index<Label>,
): Map<string, Series<Scalar>> {
  const result = new Map<string, Series<Scalar>>();
  for (const [name, series] of colMap) {
    result.set(name, new Series({ data: series.values as Scalar[], index: newIndex }));
  }
  return result;
}

function buildSortDirs(ascending: boolean | readonly boolean[], n: number): boolean[] {
  if (typeof ascending === "boolean") {
    return Array.from({ length: n }, () => ascending);
  }
  return Array.from({ length: n }, (_, i) => ascending[i] ?? true);
}

/** Compare two scalar values for sorting (null-safe). */
function compareScalarPair(av: Scalar, bv: Scalar, ascending: boolean): number | null {
  const aNull = isMissing(av);
  const bNull = isMissing(bv);
  if (aNull && bNull) {
    return null; // tie, keep going
  }
  if (aNull) {
    return 1;
  }
  if (bNull) {
    return -1;
  }
  if (av === bv) {
    return null; // tie, keep going
  }
  const cmp = (av as string | number) < (bv as string | number) ? -1 : 1;
  return ascending ? cmp : -cmp;
}

function compareRows(
  columns: ReadonlyMap<string, Series<Scalar>>,
  keys: readonly string[],
  dirs: readonly boolean[],
  a: number,
  b: number,
): number {
  for (let k = 0; k < keys.length; k++) {
    const colName = keys[k];
    if (colName === undefined) {
      continue;
    }
    const series = columns.get(colName);
    if (series === undefined) {
      continue;
    }
    const result = compareScalarPair(
      series.values[a] as Scalar,
      series.values[b] as Scalar,
      dirs[k] ?? true,
    );
    if (result !== null) {
      return result;
    }
  }
  return 0;
}

// ─── pairwise corr/cov helpers ────────────────────────────────────────────────

/**
 * Align two Series on their shared index labels and return paired numeric
 * values, dropping pairs where either value is missing.
 */
function alignedNumericPairs(a: Series<Scalar>, b: Series<Scalar>): [number[], number[]] {
  const bMap = new Map<string, number>();
  for (let j = 0; j < b.index.size; j++) {
    bMap.set(String(b.index.at(j)), j);
  }
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < a.index.size; i++) {
    const label = String(a.index.at(i));
    const j = bMap.get(label);
    if (j === undefined) {
      continue;
    }
    const av = a.values[i];
    const bv = b.values[j];
    if (
      av === null ||
      av === undefined ||
      (typeof av === "number" && Number.isNaN(av)) ||
      bv === null ||
      bv === undefined ||
      (typeof bv === "number" && Number.isNaN(bv)) ||
      typeof av !== "number" ||
      typeof bv !== "number"
    ) {
      continue;
    }
    xs.push(av);
    ys.push(bv);
  }
  return [xs, ys];
}

/** Sample covariance of two aligned numeric arrays. */
function seriesCov(a: Series<Scalar>, b: Series<Scalar>, ddof: number, minPeriods: number): number {
  const [xs, ys] = alignedNumericPairs(a, b);
  const n = xs.length;
  if (n < minPeriods || n - ddof <= 0) {
    return Number.NaN;
  }
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i] as number;
    my += ys[i] as number;
  }
  mx /= n;
  my /= n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
  }
  return s / (n - ddof);
}

/** True when a column's dtype is numeric. */
function isNumericCol(s: Series<Scalar>): boolean {
  const k = s.dtype.kind;
  return k === "int" || k === "uint" || k === "float";
}

/**
 * Build a symmetric N×N DataFrame from a pairwise-value function applied to
 * all numeric columns of `df`.
 */
function buildPairwiseDf(
  df: DataFrame,
  pairFn: (a: Series<Scalar>, b: Series<Scalar>) => number,
): DataFrame {
  const cols = df.columns.values.filter((c) => isNumericCol(df.col(c)));
  const n = cols.length;
  const idx = new Index<Label>([...cols]);
  const colMap = new Map<string, Series<Scalar>>();

  for (let j = 0; j < n; j++) {
    const cj = cols[j] as string;
    const vals: Scalar[] = Array.from({ length: n }) as Scalar[];
    for (let i = 0; i < n; i++) {
      vals[i] = pairFn(df.col(cols[i] as string), df.col(cj));
    }
    colMap.set(cj, new Series<Scalar>({ data: vals, index: idx }));
  }

  return new DataFrame(colMap, idx);
}

/** Compute [count, mean, std, min, max] stats for a column. */
function computeColumnStats(vals: readonly Scalar[]): Scalar[] {
  const nums = vals.filter((v): v is number => typeof v === "number" && !isMissing(v));
  const cnt = nums.length;
  return [
    cnt,
    cnt === 0 ? null : mean(nums),
    cnt < 2 ? null : stdDev(nums),
    cnt === 0 ? null : Math.min(...nums),
    cnt === 0 ? null : Math.max(...nums),
  ];
}

function formatDataFrame(
  columns: ReadonlyMap<string, Series<Scalar>>,
  rowIndex: Index<Label>,
  colIndex: Index<string>,
): string {
  const nRows = rowIndex.size;
  const colNames = [...colIndex.values];
  const header = ["", ...colNames];
  const rows: string[][] = [];
  for (let i = 0; i < nRows; i++) {
    const rowLabel = String(rowIndex.at(i) ?? i);
    const cells = colNames.map((name) => String(columns.get(name)?.values[i] ?? ""));
    rows.push([rowLabel, ...cells]);
  }
  const widths = header.map((h, j) => Math.max(h.length, ...rows.map((r) => (r[j] ?? "").length)));
  const pad = (s: string, w: number): string => s.padEnd(w);
  const headerLine = header.map((h, j) => pad(h, widths[j] ?? h.length)).join("  ");
  const sepLine = widths.map((w) => "-".repeat(w)).join("  ");
  const dataLines = rows.map((r) => r.map((c, j) => pad(c, widths[j] ?? c.length)).join("  "));
  return [headerLine, sepLine, ...dataLines].join("\n");
}

// ─── DataFrameRolling ─────────────────────────────────────────────────────────

/**
 * Sliding-window helper for a {@link DataFrame}.
 *
 * Obtain via {@link DataFrame.rolling}:
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * df.rolling(2).mean();
 * // DataFrame with rolling mean applied column-by-column
 * ```
 */
export class DataFrameRolling {
  private readonly _df: DataFrame;
  private readonly _window: number;
  private readonly _options: RollingOptions | undefined;

  constructor(df: DataFrame, window: number, options?: RollingOptions) {
    if (!Number.isInteger(window) || window < 1) {
      throw new RangeError(`Rolling window must be a positive integer, got ${window}`);
    }
    this._df = df;
    this._window = window;
    this._options = options;
  }

  /** Apply a per-column aggregation method to produce a new DataFrame. */
  private _applyColAgg(
    method: (r: Rolling) => { values: readonly Scalar[]; name: string | null },
  ): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const colName of this._df.columns.values) {
      const col = this._df.col(colName);
      const result = method(new Rolling(col, this._window, this._options));
      colMap.set(
        colName,
        new Series<Scalar>({ data: result.values, index: col.index, name: result.name }),
      );
    }
    return new DataFrame(colMap, this._df.index);
  }

  /** Rolling mean for each column. */
  mean(): DataFrame {
    return this._applyColAgg((r) => r.mean());
  }

  /** Rolling sum for each column. */
  sum(): DataFrame {
    return this._applyColAgg((r) => r.sum());
  }

  /** Rolling standard deviation for each column. */
  std(ddof = 1): DataFrame {
    return this._applyColAgg((r) => r.std(ddof));
  }

  /** Rolling variance for each column. */
  var(ddof = 1): DataFrame {
    return this._applyColAgg((r) => r.var(ddof));
  }

  /** Rolling minimum for each column. */
  min(): DataFrame {
    return this._applyColAgg((r) => r.min());
  }

  /** Rolling maximum for each column. */
  max(): DataFrame {
    return this._applyColAgg((r) => r.max());
  }

  /** Rolling count of valid observations for each column. */
  count(): DataFrame {
    return this._applyColAgg((r) => r.count());
  }

  /** Rolling median for each column. */
  median(): DataFrame {
    return this._applyColAgg((r) => r.median());
  }

  /**
   * Apply a custom aggregation function to each column's window.
   *
   * @param fn - Receives valid numeric values in each window and must return a number.
   */
  apply(fn: (values: readonly number[]) => number): DataFrame {
    return this._applyColAgg((r) => r.apply(fn));
  }
}

// ─── DataFrameExpanding ───────────────────────────────────────────────────────

/**
 * Expanding (growing-window) helper for a {@link DataFrame}.
 *
 * Aggregations are applied independently to each numeric column.
 *
 * Obtain via {@link DataFrame.expanding}:
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
 * df.expanding().mean();
 * // DataFrame: { a: [1, 1.5, 2, 2.5], b: [10, 15, 20, 25] }
 * ```
 */
export class DataFrameExpanding {
  private readonly _df: DataFrame;
  private readonly _options: ExpandingOptions | undefined;

  constructor(df: DataFrame, options?: ExpandingOptions) {
    this._df = df;
    this._options = options;
  }

  /** Apply a per-column aggregation method to produce a new DataFrame. */
  private _applyColAgg(
    method: (e: Expanding) => { values: readonly Scalar[]; name: string | null },
  ): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const colName of this._df.columns.values) {
      const col = this._df.col(colName);
      const result = method(new Expanding(col, this._options));
      colMap.set(
        colName,
        new Series<Scalar>({ data: result.values, index: col.index, name: result.name }),
      );
    }
    return new DataFrame(colMap, this._df.index);
  }

  /** Expanding mean for each column. */
  mean(): DataFrame {
    return this._applyColAgg((e) => e.mean());
  }

  /** Expanding sum for each column. */
  sum(): DataFrame {
    return this._applyColAgg((e) => e.sum());
  }

  /** Expanding standard deviation for each column. */
  std(ddof = 1): DataFrame {
    return this._applyColAgg((e) => e.std(ddof));
  }

  /** Expanding variance for each column. */
  var(ddof = 1): DataFrame {
    return this._applyColAgg((e) => e.var(ddof));
  }

  /** Expanding minimum for each column. */
  min(): DataFrame {
    return this._applyColAgg((e) => e.min());
  }

  /** Expanding maximum for each column. */
  max(): DataFrame {
    return this._applyColAgg((e) => e.max());
  }

  /** Expanding count of valid observations for each column. */
  count(): DataFrame {
    return this._applyColAgg((e) => e.count());
  }

  /** Expanding median for each column. */
  median(): DataFrame {
    return this._applyColAgg((e) => e.median());
  }

  /**
   * Apply a custom aggregation function to each column's expanding window.
   *
   * @param fn - Receives valid numeric values in each window and must return a number.
   */
  apply(fn: (values: readonly number[]) => number): DataFrame {
    return this._applyColAgg((e) => e.apply(fn));
  }
}

// ─── DataFrameEwm ─────────────────────────────────────────────────────────────

/**
 * Exponentially Weighted Moving helper for a {@link DataFrame}.
 *
 * Aggregations are applied independently to each numeric column.
 *
 * Obtain via {@link DataFrame.ewm}:
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
 * df.ewm({ span: 3 }).mean();
 * // DataFrame with EWM mean applied column-by-column
 * ```
 */
export class DataFrameEwm {
  private readonly _df: DataFrame;
  private readonly _options: EwmOptions;

  constructor(df: DataFrame, options: EwmOptions) {
    this._df = df;
    this._options = options;
  }

  /** Apply a per-column aggregation method to produce a new DataFrame. */
  private _applyColAgg(
    method: (e: EWM) => { values: readonly Scalar[]; name: string | null },
  ): DataFrame {
    const colMap = new Map<string, Series<Scalar>>();
    for (const colName of this._df.columns.values) {
      const col = this._df.col(colName);
      const result = method(new EWM(col, this._options));
      colMap.set(
        colName,
        new Series<Scalar>({ data: result.values, index: col.index, name: result.name }),
      );
    }
    return new DataFrame(colMap, this._df.index);
  }

  /** EWM mean for each column. */
  mean(): DataFrame {
    return this._applyColAgg((e) => e.mean());
  }

  /**
   * EWM standard deviation for each column.
   *
   * @param bias - Whether to use biased (population) std. Defaults to `false`.
   */
  std(bias = false): DataFrame {
    return this._applyColAgg((e) => e.std(bias));
  }

  /**
   * EWM variance for each column.
   *
   * @param bias - Whether to use biased (population) variance. Defaults to `false`.
   */
  var(bias = false): DataFrame {
    return this._applyColAgg((e) => e.var(bias));
  }
}
