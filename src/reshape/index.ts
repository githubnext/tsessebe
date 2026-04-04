/**
 * reshape — module re-exports.
 *
 * Re-exports all public symbols from the reshape sub-modules.
 *
 * @module
 */

export { pivot, pivotTable } from "./pivot.ts";
export type { AggFunc, PivotOptions, PivotTableOptions } from "./pivot.ts";

export { melt } from "./melt.ts";
export type { MeltOptions } from "./melt.ts";

export { stack, unstack } from "./stack.ts";
export type { StackOptions, UnstackOptions } from "./stack.ts";
