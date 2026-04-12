/**
 * tsb/window — sliding-window aggregations.
 *
 * @module
 */

export { Rolling } from "./rolling.ts";
export type { RollingOptions, RollingSeriesLike } from "./rolling.ts";
export { Expanding } from "./expanding.ts";
export type { ExpandingOptions, ExpandingSeriesLike } from "./expanding.ts";
export { EWM } from "./ewm.ts";
export type { EwmOptions, EwmSeriesLike } from "./ewm.ts";
export {
  rollingApply,
  rollingAgg,
  dataFrameRollingApply,
  dataFrameRollingAgg,
} from "./rolling_apply.ts";
export type { RollingApplyOptions, RollingAggOptions, AggFunctions } from "./rolling_apply.ts";
