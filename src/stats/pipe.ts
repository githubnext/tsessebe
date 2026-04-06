/**
 * pipe — function application utilities for method chaining.
 *
 * Mirrors the following pandas methods:
 * - `Series.pipe(fn, *args)` — apply a function to the whole Series in a chain.
 * - `DataFrame.pipe(fn, *args)` — apply a function to the whole DataFrame in a chain.
 *
 * These helpers make it easy to build transformation pipelines without deeply
 * nested function calls.  The idiom:
 *
 * ```ts
 * const result = dataFramePipe(
 *   dataFramePipe(df, normalise),
 *   addColumn, "score",
 * );
 * ```
 *
 * is equivalent to `addColumn(normalise(df), "score")` but reads left-to-right.
 *
 * ### pandas tuple form
 *
 * pandas also supports a tuple form: `df.pipe((fn, 'target_kwarg'), ...)` where
 * `'target_kwarg'` names the parameter that should receive `self`.  TypeScript
 * does not use keyword arguments, so we instead provide
 * {@link pipeTo}/{@link dataFramePipeTo} which accept a parameter index to
 * control the insertion point.
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── pipeSeries ───────────────────────────────────────────────────────────────

/**
 * Apply `fn(series, ...args)` and return the result.
 *
 * This mirrors `pandas.Series.pipe(fn, *args, **kwargs)`.
 *
 * @param series  The input Series passed as the first argument to `fn`.
 * @param fn      A function that receives the Series (and optional extra args)
 *                and returns a result of any type.
 * @param args    Zero or more additional arguments forwarded to `fn`.
 * @returns       Whatever `fn` returns.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3, 4] });
 * const doubled = pipeSeries(s, (x) => x.mul(2)); // hypothetical .mul()
 * ```
 */
export function pipeSeries<A extends unknown[], R>(
  series: Series<Scalar>,
  fn: (s: Series<Scalar>, ...args: A) => R,
  ...args: A
): R {
  return fn(series, ...args);
}

// ─── dataFramePipe ────────────────────────────────────────────────────────────

/**
 * Apply `fn(df, ...args)` and return the result.
 *
 * This mirrors `pandas.DataFrame.pipe(fn, *args, **kwargs)`.
 *
 * @param df    The input DataFrame passed as the first argument to `fn`.
 * @param fn    A function that receives the DataFrame (and optional extra args)
 *              and returns a result of any type.
 * @param args  Zero or more additional arguments forwarded to `fn`.
 * @returns     Whatever `fn` returns.
 *
 * @example
 * ```ts
 * const df2 = dataFramePipe(df, dropNa);
 * const df3 = dataFramePipe(df, rename, { age: "years" });
 * ```
 */
export function dataFramePipe<A extends unknown[], R>(
  df: DataFrame,
  fn: (df: DataFrame, ...args: A) => R,
  ...args: A
): R {
  return fn(df, ...args);
}

// ─── pipeTo / dataFramePipeTo ─────────────────────────────────────────────────

/**
 * Apply `fn` to `series` but insert it at argument position `pos` instead of
 * the first position.  This mirrors pandas' tuple form
 * `Series.pipe((fn, target_kwarg))`.
 *
 * @param series  The Series to insert.
 * @param pos     Zero-based index of the argument slot for `series`.
 * @param fn      Function accepting the full argument list with the Series
 *                at position `pos`.
 * @param args    All arguments *except* the slot at `pos`.  The Series is
 *                spliced in automatically.
 * @returns       Whatever `fn` returns.
 *
 * @example
 * ```ts
 * // merge(left, right) — insert series as the *second* argument
 * const merged = pipeTo(seriesB, 1, mergeFn, seriesA);
 * // equivalent to: mergeFn(seriesA, seriesB)
 * ```
 */
export function pipeTo<R>(
  series: Series<Scalar>,
  pos: number,
  fn: (...args: unknown[]) => R,
  ...args: unknown[]
): R {
  const spliced = [...args.slice(0, pos), series, ...args.slice(pos)];
  return fn(...spliced);
}

/**
 * Apply `fn` to `df` but insert it at argument position `pos` instead of the
 * first position.  Mirrors pandas' tuple form
 * `DataFrame.pipe((fn, target_kwarg))`.
 *
 * @param df    The DataFrame to insert.
 * @param pos   Zero-based index of the argument slot for `df`.
 * @param fn    Function accepting the full argument list with the DataFrame
 *              at position `pos`.
 * @param args  All arguments *except* the slot at `pos`.
 * @returns     Whatever `fn` returns.
 *
 * @example
 * ```ts
 * // merge(left, right) — insert df as the *second* argument
 * const merged = dataFramePipeTo(right, 1, mergeFn, left);
 * // equivalent to: mergeFn(left, right)
 * ```
 */
export function dataFramePipeTo<R>(
  df: DataFrame,
  pos: number,
  fn: (...args: unknown[]) => R,
  ...args: unknown[]
): R {
  const spliced = [...args.slice(0, pos), df, ...args.slice(pos)];
  return fn(...spliced);
}

// ─── pipeChain ────────────────────────────────────────────────────────────────

/**
 * Apply a sequence of `Series → Series` transforms to a Series in order.
 *
 * Equivalent to `fns.reduce((acc, fn) => fn(acc), series)` but with a more
 * readable API when chaining many steps.
 *
 * @param series  Starting Series.
 * @param fns     Ordered list of unary transforms.
 * @returns       The Series produced after applying all transforms.
 *
 * @example
 * ```ts
 * const result = pipeChain(s, normalise, clip, dropNa);
 * ```
 */
export function pipeChain(
  series: Series<Scalar>,
  ...fns: ReadonlyArray<(s: Series<Scalar>) => Series<Scalar>>
): Series<Scalar> {
  let current: Series<Scalar> = series;
  for (const fn of fns) {
    current = fn(current);
  }
  return current;
}

/**
 * Apply a sequence of `DataFrame → DataFrame` transforms to a DataFrame in
 * order.
 *
 * @param df   Starting DataFrame.
 * @param fns  Ordered list of unary transforms.
 * @returns    The DataFrame produced after applying all transforms.
 *
 * @example
 * ```ts
 * const result = dataFramePipeChain(df, dropNa, normalise, addFeature);
 * ```
 */
export function dataFramePipeChain(
  df: DataFrame,
  ...fns: ReadonlyArray<(d: DataFrame) => DataFrame>
): DataFrame {
  let current: DataFrame = df;
  for (const fn of fns) {
    current = fn(current);
  }
  return current;
}
