/**
 * window — module re-exports.
 *
 * Re-exports all public symbols from the window sub-modules.
 *
 * @module
 */

export { rolling, SeriesRolling, DataFrameRolling } from "./rolling.ts";
export type { RollingOptions } from "./rolling.ts";

export { expanding, SeriesExpanding, DataFrameExpanding } from "./expanding.ts";

export { ewm, SeriesEWM, DataFrameEWM } from "./ewm.ts";
export type { EWMOptions } from "./ewm.ts";
