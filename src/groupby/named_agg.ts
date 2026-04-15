/**
 * NamedAgg — named aggregation spec for GroupBy.
 *
 * Mirrors `pandas.NamedAgg` (a named tuple of `column` + `aggfunc`).
 * Used with `DataFrameGroupBy.agg()` to rename output columns while selecting
 * which source column to aggregate and how.
 *
 * @example
 * ```ts
 * import { DataFrame, namedAgg } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   dept: ["eng", "eng", "hr", "hr"],
 *   salary: [100, 120, 80, 90],
 *   headcount: [1, 1, 1, 1],
 * });
 *
 * df.groupby("dept").aggNamed({
 *   total_salary: namedAgg("salary", "sum"),
 *   avg_salary:   namedAgg("salary", "mean"),
 *   employees:    namedAgg("headcount", "count"),
 * });
 * // dept  | total_salary | avg_salary | employees
 * // eng   | 220          | 110        | 2
 * // hr    | 170          | 85         | 2
 * ```
 */

import type { AggFn, AggName } from "./groupby.ts";

// ─── NamedAgg ─────────────────────────────────────────────────────────────────

/**
 * Specification that binds a source column, an aggregation function, and
 * (implicitly via the dict key) an output column name.
 *
 * Create with the `namedAgg()` factory to avoid `new` boilerplate.
 */
export class NamedAgg {
  /** Source column to read from the DataFrame. */
  readonly column: string;
  /** Aggregation to apply — a built-in name or a custom function. */
  readonly aggfunc: AggName | AggFn;

  constructor(column: string, aggfunc: AggName | AggFn) {
    this.column = column;
    this.aggfunc = aggfunc;
  }
}

/**
 * Factory shorthand for `new NamedAgg(column, aggfunc)`.
 *
 * @example
 * ```ts
 * df.groupby("dept").aggNamed({
 *   total: namedAgg("salary", "sum"),
 *   avg:   namedAgg("salary", "mean"),
 * });
 * ```
 */
export function namedAgg(column: string, aggfunc: AggName | AggFn): NamedAgg {
  return new NamedAgg(column, aggfunc);
}

/** A dict of output-column-name → NamedAgg spec. */
export type NamedAggSpec = Readonly<Record<string, NamedAgg>>;

/**
 * Returns true if every value in the spec record is a `NamedAgg` instance.
 * Used to distinguish `NamedAggSpec` from plain `Record<string, AggName|AggFn>`.
 */
export function isNamedAggSpec(spec: unknown): spec is NamedAggSpec {
  if (typeof spec !== "object" || spec === null) {
    return false;
  }
  return Object.values(spec as Record<string, unknown>).every((v) => v instanceof NamedAgg);
}
