/**
 * pipe_apply — functional pipeline and apply utilities for Series and DataFrame.
 *
 * Provides standalone equivalents of the pandas `.pipe()` chaining pattern and
 * various `.apply()` / `applymap()` operations, usable without method-call syntax.
 *
 * | Function             | Pandas equivalent                         |
 * |----------------------|-------------------------------------------|
 * | `pipe`               | `df.pipe(fn)` / `s.pipe(fn)` chained      |
 * | `seriesApply`        | `s.apply(fn)`                             |
 * | `seriesTransform`    | `s.transform(fn)` (scalar→scalar variant) |
 * | `dataFrameApply`     | `df.apply(fn, axis=0\|1)`                 |
 * | `dataFrameApplyMap`  | `df.applymap(fn)` / `df.map(fn)` (≥2.1)  |
 * | `dataFrameTransform` | `df.transform(fn)`                        |
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── pipe ─────────────────────────────────────────────────────────────────────

/**
 * Pass `value` through a sequence of unary functions left-to-right.
 *
 * Each function receives the output of the previous one.  The overloads
 * preserve precise return types at each step up to 8 functions deep; beyond
 * that the return type widens to `unknown`.
 *
 * ```ts
 * const result = pipe(
 *   df,
 *   (d) => d.dropna(),
 *   (d) => d.assign({ z: d.col("x").add(d.col("y")).values }),
 *   (d) => d.head(10),
 * );
 * ```
 *
 * Mirrors `pandas.DataFrame.pipe(fn)` / `pandas.Series.pipe(fn)` chaining,
 * but works on **any** value — not just DataFrames and Series.
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: (a: A) => B): B;
export function pipe<A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
export function pipe<A, B, C, D>(value: A, fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): D;
export function pipe<A, B, C, D, E>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
  fn5: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
  fn5: (e: E) => F,
  fn6: (f: F) => G,
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  value: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
  fn5: (e: E) => F,
  fn6: (f: F) => G,
  fn7: (g: G) => H,
): H;
// Implementation (untyped fallback for arbitrarily long pipelines)
export function pipe(value: unknown, ...fns: ReadonlyArray<(x: unknown) => unknown>): unknown {
  let acc = value;
  for (const fn of fns) {
    acc = fn(acc);
  }
  return acc;
}

// ─── Series apply ─────────────────────────────────────────────────────────────

/**
 * Apply `fn` to every element of `series`, returning a new `Series<Scalar>`.
 *
 * `fn` receives `(value, label, position)`:
 * - `value`    — the raw element
 * - `label`    — the index label at this position
 * - `position` — the zero-based integer position
 *
 * Mirrors `pandas.Series.apply(func)`.
 *
 * ```ts
 * const doubled = seriesApply(s, (v) => typeof v === "number" ? v * 2 : v);
 * ```
 */
export function seriesApply(
  series: Series<Scalar>,
  fn: (value: Scalar, label: Label, position: number) => Scalar,
): Series<Scalar> {
  const n = series.size;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(series.iat(i), series.index.at(i), i);
  }
  return new Series({
    data: out,
    index: series.index,
    ...(series.name !== null ? { name: series.name } : {}),
  });
}

/**
 * Apply a scalar-to-scalar `fn` to every element and return a new Series.
 *
 * Unlike {@link seriesApply}, `fn` only receives the value — no label or
 * position.  This matches the most common pandas `s.apply(lambda x: …)` usage.
 *
 * ```ts
 * const capped = seriesTransform(s, (v) => typeof v === "number" ? Math.min(v, 100) : v);
 * ```
 */
export function seriesTransform(
  series: Series<Scalar>,
  fn: (value: Scalar) => Scalar,
): Series<Scalar> {
  const n = series.size;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(series.iat(i));
  }
  return new Series({
    data: out,
    index: series.index,
    ...(series.name !== null ? { name: series.name } : {}),
  });
}

// ─── DataFrame apply ──────────────────────────────────────────────────────────

/**
 * Apply `fn` to each column or row of `df`, aggregating to a scalar per column/row.
 *
 * - **axis = 0** (default): `fn` receives each column `Series`; results are
 *   indexed by column names, mirroring `df.apply(fn, axis=0)`.
 * - **axis = 1**: `fn` receives each row as a `Series` indexed by column names;
 *   results are indexed by the DataFrame's row labels, mirroring `df.apply(fn, axis=1)`.
 *
 * ```ts
 * // max value in each column
 * const colMax = dataFrameApply(df, (s) => s.max() ?? null);
 *
 * // sum across each row
 * const rowSums = dataFrameApply(df, (s) => s.sum(), 1);
 * ```
 */
export function dataFrameApply(
  df: DataFrame,
  fn: (s: Series<Scalar>, label: string | Label) => Scalar,
  axis: 0 | 1 = 0,
): Series<Scalar> {
  if (axis === 0) {
    const colNames = df.columns.values as readonly string[];
    const out: Scalar[] = colNames.map((name) => fn(df.col(name), name));
    return new Series({ data: out, index: df.columns });
  }
  // axis === 1
  const colNames = df.columns.values as readonly string[];
  const n = df.index.size;
  const out: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    const rowData: Scalar[] = colNames.map((name) => df.col(name).iat(i));
    const rowSeries = new Series<Scalar>({ data: rowData, index: [...colNames] });
    out[i] = fn(rowSeries, df.index.at(i));
  }
  return new Series({ data: out, index: df.index });
}

/**
 * Apply `fn` to every element of `df`, returning a new DataFrame with the same
 * shape (same index, same columns).
 *
 * `fn` receives `(value, rowLabel, columnName)`:
 * - `value`      — the scalar at `(row, col)`
 * - `rowLabel`   — the row index label
 * - `columnName` — the column name
 *
 * Mirrors `pandas.DataFrame.applymap(fn)` (renamed `DataFrame.map` in pandas 2.1).
 *
 * ```ts
 * // zero-out negatives
 * const clamped = dataFrameApplyMap(df, (v) => typeof v === "number" && v < 0 ? 0 : v);
 * ```
 */
export function dataFrameApplyMap(
  df: DataFrame,
  fn: (value: Scalar, rowLabel: Label, colName: string) => Scalar,
): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const rowLabels = df.index.values as readonly Label[];
  const n = rowLabels.length;
  const newData: Record<string, readonly Scalar[]> = {};
  for (const colName of colNames) {
    const col = df.col(colName);
    const out: Scalar[] = new Array<Scalar>(n);
    for (let i = 0; i < n; i++) {
      out[i] = fn(col.iat(i), rowLabels[i] as Label, colName);
    }
    newData[colName] = out;
  }
  return DataFrame.fromColumns(newData, { index: df.index });
}

/**
 * Apply `fn` to each column of `df`, replacing each column with the transformed
 * Series.  Returns a new DataFrame with the same index and column names.
 *
 * `fn` receives a column `Series<Scalar>` and must return a `Series<Scalar>` of
 * the **same length**.
 *
 * Mirrors `pandas.DataFrame.transform(fn)` (column-wise variant).
 *
 * ```ts
 * // z-score normalise every column
 * const normed = dataFrameTransform(df, (col) => {
 *   const mu = col.mean();
 *   const sd = col.std();
 *   return seriesTransform(col, (v) => typeof v === "number" ? (v - mu) / sd : v);
 * });
 * ```
 */
export function dataFrameTransform(
  df: DataFrame,
  fn: (col: Series<Scalar>, colName: string) => Series<Scalar>,
): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const newData: Record<string, readonly Scalar[]> = {};
  for (const colName of colNames) {
    const transformed = fn(df.col(colName), colName);
    if (transformed.size !== df.index.size) {
      throw new RangeError(
        `dataFrameTransform: column "${colName}" — transform returned ${transformed.size} rows, expected ${df.index.size}`,
      );
    }
    newData[colName] = transformed.values;
  }
  return DataFrame.fromColumns(newData, { index: df.index });
}

/**
 * Apply `fn` to each row of `df`, replacing each row with the transformed
 * record.  Returns a new DataFrame with the same index and column names.
 *
 * `fn` receives an object `{ colName: value, … }` for the row and must return
 * a partial or full record of the same columns.  Missing keys keep their
 * original value; extra keys are ignored.
 *
 * ```ts
 * // negate every value in each row
 * const neg = dataFrameTransformRows(df, (row) =>
 *   Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? -v : v]))
 * );
 * ```
 */
export function dataFrameTransformRows(
  df: DataFrame,
  fn: (
    row: Readonly<Record<string, Scalar>>,
    rowLabel: Label,
    position: number,
  ) => Readonly<Record<string, Scalar>>,
): DataFrame {
  const colNames = df.columns.values as readonly string[];
  const rowLabels = df.index.values as readonly Label[];
  const n = rowLabels.length;
  // build output arrays per column
  const colArrays = new Map<string, Scalar[]>();
  for (const c of colNames) {
    colArrays.set(c, new Array<Scalar>(n));
  }
  for (let i = 0; i < n; i++) {
    const rowIn: Record<string, Scalar> = {};
    for (const c of colNames) {
      rowIn[c] = df.col(c).iat(i);
    }
    const rowOut = fn(rowIn, rowLabels[i] as Label, i);
    for (const c of colNames) {
      const colArr = colArrays.get(c);
      if (colArr === undefined) {
        continue;
      }
      // use the transformed value if present, else keep original
      colArr[i] = c in rowOut ? (rowOut[c] as Scalar) : rowIn[c];
    }
  }
  const newData: Record<string, readonly Scalar[]> = {};
  for (const c of colNames) {
    newData[c] = colArrays.get(c) as Scalar[];
  }
  return DataFrame.fromColumns(newData, { index: df.index });
}
