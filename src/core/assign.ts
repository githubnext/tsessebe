/**
 * DataFrame.assign() — add new columns to a DataFrame, mirroring `pandas.DataFrame.assign()`.
 *
 * Supports three kinds of column specifiers:
 * - **Array**: `readonly Scalar[]` — values aligned by position with the row index
 * - **Series**: `Series<Scalar>` — values aligned by position with the row index
 * - **Callable**: `(df: DataFrame) => readonly Scalar[] | Series<Scalar>` — receives the
 *   *in-progress* DataFrame (i.e. any columns added earlier in the same `assign` call are
 *   already present), enabling chained column derivations that mirror the pandas behaviour.
 *
 * Columns are applied in insertion order; each callable sees the result of all earlier
 * assignments in the same call.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameAssign } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
 *
 * // Mix of array, Series, and callable
 * const df2 = dataFrameAssign(df, {
 *   c: [7, 8, 9],                        // plain array
 *   d: df.col("a").add(df.col("b")),     // Series
 *   e: (d) => d.col("c").add(d.col("a")), // callable — sees column "c" already added
 * });
 * // df2.columns → ["a", "b", "c", "d", "e"]
 * ```
 *
 * @packageDocumentation
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── types ─────────────────────────────────────────────────────────────────

/**
 * A single column specifier accepted by {@link dataFrameAssign}.
 *
 * - `readonly Scalar[]` — raw values (must equal `df.shape[0]` in length)
 * - `Series<Scalar>` — a Series (values aligned by position)
 * - `(df: DataFrame) => readonly Scalar[] | Series<Scalar>` — callable, receives the
 *   in-progress DataFrame and must return values or a Series
 */
export type AssignColSpec =
  | readonly Scalar[]
  | Series<Scalar>
  | ((df: DataFrame) => readonly Scalar[] | Series<Scalar>);

/**
 * A mapping from new (or overwritten) column name to an {@link AssignColSpec}.
 *
 * Column names present in the original DataFrame are overwritten; new names are appended.
 * Application order matches the insertion order of the object, which in modern JavaScript
 * is the declaration order for string keys (consistent with pandas).
 */
export type AssignSpec = Readonly<Record<string, AssignColSpec>>;

// ─── implementation ──────────────────────────────────────────────────────────

/**
 * Add or replace columns on `df` and return a new DataFrame.
 *
 * Columns are processed in the declaration order of `spec`.  Callable entries receive the
 * DataFrame **as updated so far** within this `assign` call, which allows chained
 * derivations:
 *
 * ```ts
 * dataFrameAssign(df, {
 *   total: (d) => d.col("price").mul(d.col("qty")),
 *   tax:   (d) => d.col("total").mul(0.1),   // sees "total" already added
 * });
 * ```
 *
 * @param df   The source DataFrame.  Not mutated.
 * @param spec Column specifiers keyed by column name.
 * @returns    A new DataFrame with the columns added / replaced.
 */
export function dataFrameAssign(df: DataFrame, spec: AssignSpec): DataFrame {
  // Start from a mutable copy of the existing column map.
  // We build a working DataFrame after each step so callables see up-to-date state.
  let working: DataFrame = df;

  for (const [name, colSpec] of Object.entries(spec)) {
    const resolved: readonly Scalar[] | Series<Scalar> =
      typeof colSpec === "function" ? colSpec(working) : colSpec;

    working = _addOrReplaceColumn(working, name, resolved);
  }

  return working;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Return a new DataFrame with column `name` set to `resolved`.
 * Preserves column order: if `name` already exists, its position is kept;
 * if new, it is appended.
 */
function _addOrReplaceColumn(
  df: DataFrame,
  name: string,
  resolved: readonly Scalar[] | Series<Scalar>,
): DataFrame {
  const series: Series<Scalar> =
    resolved instanceof Series
      ? resolved
      : new Series<Scalar>({ data: resolved, index: df.index });

  // Rebuild the column map preserving insertion order.
  const colMap = new Map<string, Series<Scalar>>();
  let inserted = false;

  for (const colName of df.columns.values) {
    if (colName === name) {
      colMap.set(name, series);
      inserted = true;
    } else {
      colMap.set(colName, df.col(colName));
    }
  }

  if (!inserted) {
    colMap.set(name, series);
  }

  // Use the DataFrame's internal constructor to preserve the row index.
  return new DataFrame(colMap, df.index);
}
