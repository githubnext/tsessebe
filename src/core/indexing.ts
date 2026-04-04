/**
 * Indexing utilities — label-based and position-based selection.
 *
 * Provides `Slice`, `BooleanMask`, and standalone `loc`/`iloc`/`at`/`iat`
 * helpers for `Series` and `DataFrame`, extending the basic scalar-or-array
 * access already built into those classes.
 *
 * New capabilities over the existing Series/DataFrame methods:
 * - **Boolean mask** filtering for both Series and DataFrame.
 * - **Slice** range selection (mirroring Python's `start:stop:step`).
 * - **2-D DataFrame** indexing: `dataFrameLoc(df, rows, cols)` and
 *   `dataFrameIloc(df, rows, cols)`.
 *
 * @example
 * ```ts
 * import { Series, DataFrame, locSeries, ilocDataFrame, Slice } from "tsb";
 *
 * const s = new Series({ data: [10, 20, 30, 40, 50], name: "x" });
 * locSeries(s, [true, false, true, false, true]);  // Series [10, 30, 50]
 * ilocSeries(s, new Slice(1, 4));                  // Series [20, 30, 40]
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * ilocDataFrame(df, new Slice(0, 2), [0]);         // first 2 rows, col 0
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── BooleanMask ──────────────────────────────────────────────────────────────

/** A boolean array used to select rows by mask (true = keep). */
export type BooleanMask = readonly boolean[];

// ─── Slice ────────────────────────────────────────────────────────────────────

/**
 * A Python-like slice specification — `start : stop : step`.
 *
 * All parameters default to `null` (meaning "use the natural boundary"):
 * - `start = null` → 0 (or len-1 for negative step)
 * - `stop  = null` → len (or -1 for negative step)
 * - `step  = 1`
 *
 * @example
 * ```ts
 * new Slice(1, 4).toPositions(6);      // [1, 2, 3]
 * new Slice(null, null, 2).toPositions(6); // [0, 2, 4]
 * new Slice(-2).toPositions(5);        // [3, 4]
 * new Slice(4, 1, -1).toPositions(6); // [4, 3, 2]
 * ```
 */
export class Slice {
  readonly start: number | null;
  readonly stop: number | null;
  readonly step: number;

  constructor(start: number | null = null, stop: number | null = null, step = 1) {
    if (step === 0) {
      throw new RangeError("Slice step cannot be zero");
    }
    this.start = start;
    this.stop = stop;
    this.step = step;
  }

  /**
   * Resolve `start` to an absolute (non-negative) position for a container of
   * the given `length`.  Negative values count from the end.
   */
  resolveStart(length: number): number {
    const { step } = this;
    if (this.start === null) {
      return step > 0 ? 0 : length - 1;
    }
    const s = this.start < 0 ? length + this.start : this.start;
    return step > 0 ? Math.max(0, Math.min(s, length)) : Math.max(-1, Math.min(s, length - 1));
  }

  /**
   * Resolve `stop` to an absolute (exclusive) boundary for a container of the
   * given `length`.
   */
  resolveStop(length: number): number {
    const { step } = this;
    if (this.stop === null) {
      return step > 0 ? length : -1;
    }
    const s = this.stop < 0 ? length + this.stop : this.stop;
    return step > 0 ? Math.max(0, Math.min(s, length)) : Math.max(-1, Math.min(s, length - 1));
  }

  /**
   * Expand this slice into a concrete array of integer positions for a
   * container of the given `length`.
   */
  toPositions(length: number): number[] {
    const start = this.resolveStart(length);
    const stop = this.resolveStop(length);
    const { step } = this;
    const positions: number[] = [];
    if (step > 0) {
      for (let i = start; i < stop; i += step) {
        positions.push(i);
      }
    } else {
      for (let i = start; i > stop; i += step) {
        positions.push(i);
      }
    }
    return positions;
  }
}

// ─── key types ────────────────────────────────────────────────────────────────

/** Keys accepted by `locSeries` / `locDataFrame` row axis. */
export type LocKey = Label | readonly Label[] | BooleanMask | Slice;

/** Keys accepted by `ilocSeries` / `ilocDataFrame` row axis. */
export type ILocKey = number | readonly number[] | BooleanMask | Slice;

/** Column key accepted by `locDataFrame`. */
export type ColLocKey = string | readonly string[];

/** Column key accepted by `ilocDataFrame`. */
export type ColILocKey = number | readonly number[];

// ─── internal helpers ─────────────────────────────────────────────────────────

/** True if every element of `arr` is a boolean. */
function isBooleanArray(arr: readonly unknown[]): arr is BooleanMask {
  return arr.length > 0 && arr.every((v) => typeof v === "boolean");
}

/** True if every element of `arr` is a number. */
function isNumberArray(arr: readonly unknown[]): arr is readonly number[] {
  return arr.length === 0 || arr.every((v) => typeof v === "number");
}

/** Convert a boolean array to the positions of `true` entries. */
function boolMaskToPositions(mask: BooleanMask): number[] {
  const positions: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      positions.push(i);
    }
  }
  return positions;
}

/** Validate and normalise a single integer position within `[0, length)`. */
function normaliseSinglePos(pos: number, length: number): number {
  const idx = pos < 0 ? length + pos : pos;
  if (idx < 0 || idx >= length) {
    throw new RangeError(`Position ${pos} is out of bounds for axis of size ${length}`);
  }
  return idx;
}

/** Resolve a label to one or more integer positions via `index.getLoc`. */
function labelToPositions(lbl: Label, index: Index<Label>): number[] {
  const loc = index.getLoc(lbl);
  return typeof loc === "number" ? [loc] : [...loc];
}

/** Resolve an `ILocKey` to a list of integer positions. */
function resolveILocPositions(key: ILocKey, length: number): number[] {
  if (key instanceof Slice) {
    return key.toPositions(length);
  }
  if (Array.isArray(key)) {
    const arr = key as readonly unknown[];
    if (isBooleanArray(arr)) {
      return boolMaskToPositions(arr);
    }
    if (isNumberArray(arr)) {
      return arr.slice() as number[];
    }
    throw new TypeError("iloc array must be all-boolean or all-number");
  }
  return [normaliseSinglePos(key as number, length)];
}

/** Resolve a label array to integer positions. */
function labelArrayToPositions(arr: readonly Label[], index: Index<Label>): number[] {
  const positions: number[] = [];
  for (const lbl of arr) {
    for (const p of labelToPositions(lbl, index)) {
      positions.push(p);
    }
  }
  return positions;
}

/** Resolve a `LocKey` to a list of integer positions using the provided index. */
function resolveLocPositions(key: LocKey, index: Index<Label>): number[] {
  if (key instanceof Slice) {
    return key.toPositions(index.size);
  }
  if (Array.isArray(key)) {
    const arr = key as readonly unknown[];
    if (isBooleanArray(arr)) {
      return boolMaskToPositions(arr);
    }
    return labelArrayToPositions(arr as readonly Label[], index);
  }
  return labelToPositions(key as Label, index);
}

/** Build a new Index<Label> from selected positions of an existing index. */
function subIndex(index: Index<Label>, positions: readonly number[]): Index<Label> {
  const labels = positions.map((p) => index.at(p));
  return new Index<Label>(labels as Label[]);
}

/** Extract a sub-Series by integer positions. */
function seriesByPositions<T extends Scalar>(
  s: Series<T>,
  positions: readonly number[],
): Series<T> {
  const vals = s.values;
  const data = positions.map((p) => vals[p] as T);
  const idx = subIndex(s.index, positions);
  return new Series<T>({ data, index: idx, dtype: s.dtype, name: s.name });
}

// ─── Series: locSeries / ilocSeries ──────────────────────────────────────────

/**
 * Label-based selection for a `Series`.
 *
 * - **scalar `Label`** → returns the element value.
 * - **`Label[]`** → returns a sub-Series with those labels.
 * - **`BooleanMask`** → returns rows where the mask is `true`.
 * - **`Slice`** → returns rows in the positional range.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
 * locSeries(s, "b");                  // 20
 * locSeries(s, ["a", "c"]);           // Series [10, 30]
 * locSeries(s, [true, false, true]);  // Series [10, 30]
 * locSeries(s, new Slice(0, 2));      // Series [10, 20]
 * ```
 */
export function locSeries<T extends Scalar>(s: Series<T>, key: Label): T;
export function locSeries<T extends Scalar>(
  s: Series<T>,
  key: readonly Label[] | BooleanMask | Slice,
): Series<T>;
export function locSeries<T extends Scalar>(s: Series<T>, key: LocKey): T | Series<T> {
  if (
    key instanceof Slice ||
    (Array.isArray(key) && (key.length === 0 || typeof key[0] === "boolean"))
  ) {
    const positions = resolveLocPositions(key, s.index);
    return seriesByPositions(s, positions);
  }
  if (Array.isArray(key)) {
    const positions = resolveLocPositions(key, s.index);
    return seriesByPositions(s, positions);
  }
  // scalar label — return element value
  return s.at(key as Label);
}

/**
 * Integer position-based selection for a `Series`.
 *
 * - **`number`** → returns the element at that position.
 * - **`number[]`** → returns a sub-Series at those positions.
 * - **`BooleanMask`** → returns rows where the mask is `true`.
 * - **`Slice`** → returns rows in the integer range.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30, 40, 50] });
 * ilocSeries(s, 2);                          // 30
 * ilocSeries(s, [0, 2, 4]);                  // Series [10, 30, 50]
 * ilocSeries(s, [true, false, true, false, true]); // Series [10, 30, 50]
 * ilocSeries(s, new Slice(1, 4));            // Series [20, 30, 40]
 * ilocSeries(s, new Slice(null, null, 2));   // Series [10, 30, 50]
 * ```
 */
export function ilocSeries<T extends Scalar>(s: Series<T>, key: number): T;
export function ilocSeries<T extends Scalar>(
  s: Series<T>,
  key: readonly number[] | BooleanMask | Slice,
): Series<T>;
export function ilocSeries<T extends Scalar>(s: Series<T>, key: ILocKey): T | Series<T> {
  const length = s.values.length;
  if (
    key instanceof Slice ||
    (Array.isArray(key) && (key.length === 0 || typeof key[0] === "boolean")) ||
    (Array.isArray(key) && isNumberArray(key as readonly unknown[]))
  ) {
    const positions = resolveILocPositions(key, length);
    return seriesByPositions(s, positions);
  }
  if (Array.isArray(key)) {
    const positions = resolveILocPositions(key, length);
    return seriesByPositions(s, positions);
  }
  // scalar integer position
  return s.iat(key as number);
}

// ─── DataFrame: locDataFrame / ilocDataFrame ──────────────────────────────────

/**
 * Resolve a `ColLocKey` (column name or list of names) to an ordered list of
 * column names, checking that every requested name exists.
 */
function resolveColNames(df: DataFrame, cols: ColLocKey): string[] {
  if (typeof cols === "string") {
    if (!df.columns.contains(cols)) {
      throw new Error(`Column '${cols}' does not exist`);
    }
    return [cols];
  }
  for (const name of cols) {
    if (!df.columns.contains(name)) {
      throw new Error(`Column '${name}' does not exist`);
    }
  }
  return [...cols];
}

/**
 * Resolve a `ColILocKey` (column position or list of positions) to column
 * names.
 */
function resolveColILoc(df: DataFrame, cols: ColILocKey): string[] {
  const colVals = df.columns.values;
  if (typeof cols === "number") {
    const len = colVals.length;
    const idx = cols < 0 ? len + cols : cols;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Column position ${cols} is out of bounds (${len} columns)`);
    }
    return [colVals[idx] as string];
  }
  return (cols as readonly number[]).map((pos) => {
    const len = colVals.length;
    const idx = pos < 0 ? len + pos : pos;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Column position ${pos} is out of bounds (${len} columns)`);
    }
    return colVals[idx] as string;
  });
}

/** Build a new DataFrame from selected row positions and column names. */
function dataFrameByPosAndCols(
  df: DataFrame,
  rowPositions: readonly number[],
  colNames: readonly string[],
): DataFrame {
  // Build the new row index preserving original labels.
  const origLabels = rowPositions.map((p) => df.index.at(p) as Label);
  const newIdx = new Index<Label>(origLabels);
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.get(name);
    if (col === undefined) {
      throw new Error(`Column '${name}' not found`);
    }
    const colVals = col.values;
    const selectedVals = rowPositions.map((p) => colVals[p] as Scalar);
    colMap.set(name, new Series<Scalar>({ data: selectedVals, index: newIdx, dtype: col.dtype }));
  }
  return new DataFrame(colMap, newIdx);
}

/**
 * Label-based 2-D selection for a `DataFrame`.
 *
 * `rows` selects rows by label (or boolean mask, or Slice);
 * `cols` (optional) selects a subset of columns by name (or a single name).
 *
 * Return type depends on arguments:
 * - `rows` = scalar Label, `cols` = single string → `Scalar`
 * - `rows` = scalar Label, `cols` = string[] → `Series<Scalar>` (row as series)
 * - otherwise → `DataFrame`
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [4,5,6] });
 * // all rows, column 'a'
 * locDataFrame(df, new Slice(), "a");   // DataFrame with only column 'a'
 * // first 2 rows
 * locDataFrame(df, new Slice(0, 2));    // 2-row DataFrame
 * // boolean mask
 * locDataFrame(df, [true, false, true]); // rows 0 and 2
 * ```
 */
export function locDataFrame(df: DataFrame, rows: LocKey): DataFrame;
export function locDataFrame(
  df: DataFrame,
  rows: LocKey,
  cols: ColLocKey,
): DataFrame | Series<Scalar> | Scalar;
export function locDataFrame(
  df: DataFrame,
  rows: LocKey,
  cols?: ColLocKey,
): DataFrame | Series<Scalar> | Scalar {
  const rowPositions = resolveLocPositions(rows, df.index);
  const colNames = cols !== undefined ? resolveColNames(df, cols) : [...df.columns.values];
  return buildResult(df, rowPositions, colNames, rows, cols);
}

/**
 * Integer position-based 2-D selection for a `DataFrame`.
 *
 * `rows` selects rows by integer position, slice, or boolean mask;
 * `cols` (optional) selects columns by position.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1,2,3], b: [4,5,6] });
 * ilocDataFrame(df, new Slice(0, 2));       // first 2 rows
 * ilocDataFrame(df, [0, 2], [1]);           // rows 0 & 2, column index 1
 * ilocDataFrame(df, 1, 0);                  // scalar: row 1, col 0
 * ```
 */
export function ilocDataFrame(df: DataFrame, rows: ILocKey): DataFrame;
export function ilocDataFrame(
  df: DataFrame,
  rows: ILocKey,
  cols: ColILocKey,
): DataFrame | Series<Scalar> | Scalar;
export function ilocDataFrame(
  df: DataFrame,
  rows: ILocKey,
  cols?: ColILocKey,
): DataFrame | Series<Scalar> | Scalar {
  const rowPositions = resolveILocPositions(rows, df.index.size);
  const colNames = cols !== undefined ? resolveColILoc(df, cols) : [...df.columns.values];
  return buildResult(df, rowPositions, colNames, rows, cols);
}

/**
 * Shared result-builder used by `locDataFrame` and `ilocDataFrame`.
 * When the row key is a scalar and the col key is a scalar, returns a `Scalar`.
 * When only the col key is a scalar string/number, returns a `Series`.
 * Otherwise returns a `DataFrame`.
 */
function buildResult(
  df: DataFrame,
  rowPositions: readonly number[],
  colNames: readonly string[],
  rowKey: LocKey | ILocKey,
  colKey: ColLocKey | ColILocKey | undefined,
): DataFrame | Series<Scalar> | Scalar {
  const scalarRow =
    typeof rowKey === "number" ||
    (typeof rowKey !== "object" && typeof rowKey !== "undefined" && !Array.isArray(rowKey));
  const scalarCol =
    colKey !== undefined && (typeof colKey === "string" || typeof colKey === "number");

  if (scalarRow && scalarCol && rowPositions.length === 1 && colNames.length === 1) {
    const col = df.get(colNames[0] as string);
    if (col === undefined) {
      throw new Error(`Column '${colNames[0]}' not found`);
    }
    return col.values[rowPositions[0] as number] as Scalar;
  }

  if (scalarRow && rowPositions.length === 1) {
    // Return the selected row as a Series, indexed by column names
    const rowIdx = rowPositions[0] as number;
    const rowData = colNames.map((name) => {
      const col = df.get(name);
      return col !== undefined ? (col.values[rowIdx] as Scalar) : null;
    });
    const colIndex = new Index<Label>(colNames as Label[]);
    return new Series<Scalar>({ data: rowData, index: colIndex });
  }

  if (scalarCol && colNames.length === 1) {
    const col = df.get(colNames[0] as string);
    if (col === undefined) {
      throw new Error(`Column '${colNames[0]}' not found`);
    }
    const colVals = col.values;
    const selectedVals = rowPositions.map((p) => colVals[p] as Scalar);
    const origLabels = rowPositions.map((p) => df.index.at(p) as Label);
    const newIdx = new Index<Label>(origLabels);
    return new Series<Scalar>({
      data: selectedVals,
      index: newIdx,
      dtype: col.dtype,
      name: colNames[0] ?? null,
    });
  }

  return dataFrameByPosAndCols(df, rowPositions, colNames);
}

// ─── DataFrame: scalar at/iat ─────────────────────────────────────────────────

/**
 * Access a single scalar value in a `DataFrame` by row label and column name.
 *
 * Mirrors `pandas.DataFrame.at[row, col]`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3] });
 * atDataFrame(df, 0, "a");  // 1
 * ```
 */
export function atDataFrame(df: DataFrame, row: Label, col: string): Scalar {
  const pos = df.index.getLoc(row);
  const rowPos = typeof pos === "number" ? pos : (pos[0] as number);
  const colSeries = df.get(col);
  if (colSeries === undefined) {
    throw new Error(`Column '${col}' does not exist`);
  }
  return colSeries.values[rowPos] as Scalar;
}

/**
 * Access a single scalar value in a `DataFrame` by integer row and column
 * positions.
 *
 * Mirrors `pandas.DataFrame.iat[row, col]`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 * iatDataFrame(df, 1, 1);  // 5
 * ```
 */
export function iatDataFrame(df: DataFrame, row: number, col: number): Scalar {
  const nRows = df.index.size;
  const nCols = df.columns.size;
  const ri = row < 0 ? nRows + row : row;
  const ci = col < 0 ? nCols + col : col;
  if (ri < 0 || ri >= nRows) {
    throw new RangeError(`Row position ${row} is out of bounds (${nRows} rows)`);
  }
  if (ci < 0 || ci >= nCols) {
    throw new RangeError(`Column position ${col} is out of bounds (${nCols} columns)`);
  }
  const colName = df.columns.values[ci] as string;
  const colSeries = df.get(colName);
  if (colSeries === undefined) {
    throw new Error(`Column at position ${col} not found`);
  }
  return colSeries.values[ri] as Scalar;
}
