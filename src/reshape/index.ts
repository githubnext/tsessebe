/**
 * reshape — pivot, melt, stack, and unstack utilities.
 *
 * @module
 */

export { melt } from "./melt.ts";
export type { MeltOptions } from "./melt.ts";
export { pivot, pivotTable } from "./pivot.ts";
export type { PivotOptions, PivotTableOptions, AggFuncName } from "./pivot.ts";
export { stack, unstack, STACK_DEFAULT_SEP } from "./stack_unstack.ts";
export type { StackOptions, UnstackOptions } from "./stack_unstack.ts";
export { wideToLong } from "./wide_to_long.ts";
export type { WideToLongOptions } from "./wide_to_long.ts";
export { pivotTableFull } from "./pivot_table.ts";
export type { PivotTableFullOptions } from "./pivot_table.ts";
