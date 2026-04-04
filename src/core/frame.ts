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
  constructor(columns: ReadonlyMap<string, Series<Scalar>>, index: Index<Label>) {
    this._columns = columns;
    this.index = index;
    this.columns = new Index<string>([...columns.keys()]);
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
    return [this.index.size, this._columns.size];
  }

  /** Always `2`. */
  get ndim(): 2 {
    return 2;
  }

  /** Total number of cells (`nRows * nCols`). */
  get size(): number {
    return this.index.size * this._columns.size;
  }

  /** `true` when the DataFrame has no rows or no columns. */
  get empty(): boolean {
    return this.index.size === 0 || this._columns.size === 0;
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

  // ─── arithmetic ───────────────────────────────────────────────────────────

  /**
   * Element-wise addition.
   *
   * - **scalar `other`**: adds `other` to every numeric cell.
   * - **DataFrame `other`**: aligns on both row and column indexes, then adds.
   *   Missing cells produce `null`.
   *
   * @param fillValue - Fill value for missing cells when aligning two DataFrames.
   */
  add(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a + b, fillValue);
  }

  /**
   * Element-wise subtraction.
   *
   * - **scalar `other`**: subtracts `other` from every numeric cell.
   * - **DataFrame `other`**: aligns on both indexes, then subtracts.
   */
  sub(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a - b, fillValue);
  }

  /**
   * Element-wise multiplication.
   *
   * - **scalar `other`**: multiplies every numeric cell by `other`.
   * - **DataFrame `other`**: aligns on both indexes, then multiplies.
   */
  mul(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a * b, fillValue);
  }

  /**
   * Element-wise (true) division.
   *
   * - **scalar `other`**: divides every numeric cell by `other`.
   * - **DataFrame `other`**: aligns on both indexes, then divides.
   */
  div(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a / b, fillValue);
  }

  /**
   * Element-wise floor division.
   */
  floordiv(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => Math.floor(a / b), fillValue);
  }

  /**
   * Element-wise modulo.
   */
  mod(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a % b, fillValue);
  }

  /**
   * Element-wise exponentiation.
   */
  pow(other: number | DataFrame, fillValue: number | null = null): DataFrame {
    return this._dfBinaryOp(other, (a, b) => a ** b, fillValue);
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
    // Column Series get a fresh RangeIndex so that integer-positional `.at(i)` works.
    const colRangeIndex = new RangeIndex(positions.length) as unknown as Index<Label>;
    const colMap = new Map<string, Series<Scalar>>();
    for (const [name, series] of this._columns) {
      const newData = selectByPositions(series.values as Scalar[], positions);
      colMap.set(name, new Series({ data: newData, index: colRangeIndex, dtype: series.dtype }));
    }
    return new DataFrame(colMap, newIndex);
  }

  private _colAgg(fn: (s: Series<Scalar>) => Scalar): Series<Scalar> {
    return applyOverColumns(fn, this._columns, this.columns);
  }

  /** Core implementation for DataFrame binary operations (scalar or aligned DataFrame). */
  private _dfBinaryOp(
    other: number | DataFrame,
    fn: (a: number, b: number) => number,
    fillValue: number | null,
  ): DataFrame {
    if (!(other instanceof DataFrame)) {
      const b = other as number;
      const cols: Record<string, readonly Scalar[]> = {};
      for (const [name, series] of this._columns) {
        cols[name] = series.values.map((v) => {
          if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
            return null;
          }
          return fn(v as unknown as number, b);
        });
      }
      return DataFrame.fromColumns(cols, { index: this.index });
    }
    // Align both DataFrames on row and column indexes
    const rowIdx = this.index.union(other.index) as Index<Label>;
    const colIdx = this.columns.union(other.columns) as Index<Label>;
    const left = reindexDf(this, rowIdx, colIdx);
    const right = reindexDf(other, rowIdx, colIdx);
    const cols: Record<string, readonly Scalar[]> = {};
    for (const colLabel of colIdx.values) {
      const colName = String(colLabel);
      const lSeries = left.col(colName);
      const rSeries = right.col(colName);
      const data: Scalar[] = lSeries.values.map((l, i) => {
        const r = rSeries.values[i] as Scalar;
        const a = isMissing(l) ? fillValue : (l as unknown as number);
        const b = isMissing(r) ? fillValue : (r as unknown as number);
        if (a === null || b === null) {
          return null;
        }
        return fn(a, b);
      });
      cols[colName] = data;
    }
    return DataFrame.fromColumns(cols, { index: rowIdx });
  }
}

// ─── module-level helpers (extracted to keep methods lean) ───────────────────

/**
 * Reindex a DataFrame to `rowIndex` and `colIndex`, filling missing cells
 * with `null`.  Used internally by `_dfBinaryOp` for alignment.
 */
function reindexDf(df: DataFrame, rowIndex: Index<Label>, colIndex: Index<Label>): DataFrame {
  const labelToPos = new Map<Label, number>();
  const dfRowLabels = df.index.values;
  for (let i = 0; i < dfRowLabels.length; i++) {
    const lbl = dfRowLabels[i] as Label;
    if (!labelToPos.has(lbl)) {
      labelToPos.set(lbl, i);
    }
  }
  const cols: Record<string, readonly Scalar[]> = {};
  for (const colLabel of colIndex.values) {
    const colName = String(colLabel);
    const data: Scalar[] = rowIndex.values.map((rowLbl) => {
      const pos = labelToPos.get(rowLbl);
      if (pos === undefined) {
        return null;
      }
      if (!df.columns.contains(colLabel)) {
        return null;
      }
      const v = df.col(colName).values[pos];
      return v !== undefined ? (v as Scalar) : null;
    });
    cols[colName] = data;
  }
  return DataFrame.fromColumns(cols, { index: rowIndex });
}

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
