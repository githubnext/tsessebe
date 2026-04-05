/**
 * Apply / map / pipe utilities — standalone functions mirroring:
 *   - `pandas.Series.apply`
 *   - `pandas.Series.map`
 *   - `pandas.DataFrame.apply` (axis=0/1)
 *   - `pandas.DataFrame.applymap` / `applyDF`
 *   - `pandas.Series.pipe` / `pandas.DataFrame.pipe`
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── Series apply ─────────────────────────────────────────────────────────────

/**
 * Apply a function element-wise to a Series.
 *
 * @example
 * ```ts
 * applySeries(s, (v) => (v as number) * 2);
 * ```
 */
export function applySeries(
  s: Series<Scalar>,
  fn: (v: Scalar, i: number) => Scalar,
): Series<Scalar> {
  const out: Scalar[] = [];
  const vals = s.values;
  for (let i = 0; i < vals.length; i++) {
    out.push(fn(vals[i] ?? null, i));
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── Series map ───────────────────────────────────────────────────────────────

/**
 * Map values using a dictionary or a function.
 *
 * @example
 * ```ts
 * const m = new Map<Scalar, Scalar>([["a", 1], ["b", 2]]);
 * mapSeries(s, m);
 * ```
 */
export function mapSeries(
  s: Series<Scalar>,
  mapper: Map<Scalar, Scalar> | ((v: Scalar) => Scalar),
): Series<Scalar> {
  if (typeof mapper === "function") {
    return applySeries(s, (v) => mapper(v));
  }
  const out: Scalar[] = [];
  for (const v of s.values) {
    out.push(mapper.has(v) ? (mapper.get(v) ?? null) : null);
  }
  return new Series<Scalar>({ data: out, index: s.index, name: s.name });
}

// ─── DataFrame applymap ───────────────────────────────────────────────────────

/**
 * Apply a function element-wise to every cell in a DataFrame.
 *
 * @example
 * ```ts
 * applyMap(df, (v) => (v as number) ** 2);
 * ```
 */
export function applyMap(df: DataFrame, fn: (v: Scalar) => Scalar): DataFrame {
  const cols = df.columns.toArray();
  const data: Record<string, Scalar[]> = {};
  for (const col of cols) {
    const s = df.col(col) as Series<Scalar>;
    data[col] = applySeries(s, (v) => fn(v)).values as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

// ─── DataFrame apply (axis=0 column-wise, axis=1 row-wise) ───────────────────

/** Reduce a column (Series) to a scalar. */
type ColReducer = (s: Series<Scalar>, colName: string) => Scalar;
/** Reduce a row (Record<string, Scalar>) to a scalar. */
type RowReducer = (row: Record<string, Scalar>, rowLabel: unknown) => Scalar;

/**
 * Apply a reducer function along axis=0 (column-wise), producing a Series
 * indexed by column names.
 */
function applyAxis0(df: DataFrame, fn: ColReducer): Series<Scalar> {
  const cols = df.columns.toArray();
  const out: Scalar[] = [];
  for (const col of cols) {
    out.push(fn(df.col(col) as Series<Scalar>, col));
  }
  return new Series<Scalar>({ data: out, index: df.columns });
}

/**
 * Apply a reducer function along axis=1 (row-wise), producing a Series
 * indexed by the DataFrame's index.
 */
function applyAxis1(df: DataFrame, fn: RowReducer): Series<Scalar> {
  const cols = df.columns.toArray();
  const idx = df.index;
  const out: Scalar[] = [];
  const colArrays: Scalar[][] = cols.map((c) => (df.col(c) as Series<Scalar>).values as Scalar[]);
  for (let i = 0; i < df.shape[0]; i++) {
    const row: Record<string, Scalar> = {};
    for (let j = 0; j < cols.length; j++) {
      const c = cols[j];
      if (c !== undefined) {
        row[c] = colArrays[j]?.[i] ?? null;
      }
    }
    out.push(fn(row, idx.toArray()[i]));
  }
  return new Series<Scalar>({ data: out, index: idx });
}

/**
 * Apply a function along an axis of a DataFrame.
 *
 * @param axis - 0 = column-wise (default), 1 = row-wise
 *
 * @example
 * ```ts
 * applyDataFrame(df, (s) => (s.values as number[]).reduce((a, b) => a + b, 0), 0);
 * applyDataFrame(df, (row) => Object.values(row).reduce<number>((a, b) => a + (b as number), 0), 1);
 * ```
 */
export function applyDataFrame(
  df: DataFrame,
  fn: ColReducer | RowReducer,
  axis: 0 | 1 = 0,
): Series<Scalar> {
  if (axis === 1) {
    return applyAxis1(df, fn as RowReducer);
  }
  return applyAxis0(df, fn as ColReducer);
}

// ─── pipe ─────────────────────────────────────────────────────────────────────

/**
 * Pipe a Series through a function, returning the result.
 *
 * @example
 * ```ts
 * pipeSeries(s, (x) => applySeries(x, (v) => (v as number) * 2));
 * ```
 */
export function pipeSeries(
  s: Series<Scalar>,
  ...fns: Array<(s: Series<Scalar>) => Series<Scalar>>
): Series<Scalar> {
  let result = s;
  for (const fn of fns) {
    result = fn(result);
  }
  return result;
}

/**
 * Pipe a DataFrame through a function, returning the result.
 *
 * @example
 * ```ts
 * pipeDataFrame(df, (x) => applyMap(x, (v) => (v as number) * 2));
 * ```
 */
export function pipeDataFrame(
  df: DataFrame,
  ...fns: Array<(df: DataFrame) => DataFrame>
): DataFrame {
  let result = df;
  for (const fn of fns) {
    result = fn(result);
  }
  return result;
}
