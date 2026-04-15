/**
 * GroupBy module barrel.
 *
 * Re-exports all public symbols from the groupby sub-package.
 */

export { DataFrameGroupBy, SeriesGroupBy } from "./groupby.ts";
export type { AggFn, AggName, AggSpec } from "./groupby.ts";
export { NamedAgg, namedAgg, isNamedAggSpec } from "./named_agg.ts";
export type { NamedAggSpec } from "./named_agg.ts";
