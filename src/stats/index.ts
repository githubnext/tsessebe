/**
 * Statistical functions for tsb.
 *
 * Re-exports all stats utilities: `describe`, `corr`, `cov`, skewness, and kurtosis.
 */

export { describe, describeDataFrame } from "./describe.ts";
export { corrSeries, corrDataFrame } from "./corr.ts";
export type { CorrMethod } from "./corr.ts";
export { covSeries, covDataFrame } from "./cov.ts";
export {
  skewSeries,
  skewDataFrame,
  kurtosisSeries,
  kurtSeries,
  kurtosisDataFrame,
  kurtDataFrame,
} from "./moments.ts";
