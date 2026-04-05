/**
 * tsb/stats — statistical functions.
 *
 * @module
 */

export { describe, quantile } from "./describe.ts";
export type { DescribeOptions } from "./describe.ts";
export { pearsonCorr, dataFrameCorr, dataFrameCov } from "./corr.ts";
export type { CorrMethod, CorrOptions, CovOptions } from "./corr.ts";
export { rankSeries, rankDataFrame } from "./rank.ts";
export type { RankMethod, NaOption, RankOptions } from "./rank.ts";
export { nlargestSeries, nsmallestSeries, nlargestDataFrame, nsmallestDataFrame } from "./nlargest.ts";
export type { NKeep, NTopOptions, NTopDataFrameOptions } from "./nlargest.ts";
