/**
 * tsb/stats — statistical functions.
 *
 * @module
 */

export {
  cummax,
  cummin,
  cumprod,
  cumsum,
  dataFrameCummax,
  dataFrameCummin,
  dataFrameCumprod,
  dataFrameCumsum,
} from "./cum_ops.ts";
export type { CumOpsOptions, DataFrameCumOpsOptions } from "./cum_ops.ts";
export {
  clip,
  dataFrameClip,
  dataFrameAbs,
  dataFrameRound,
  seriesAbs,
  seriesRound,
} from "./elem_ops.ts";
export type { ClipOptions, RoundOptions, DataFrameElemOptions } from "./elem_ops.ts";
export { valueCounts, dataFrameValueCounts } from "./value_counts.ts";
export type { ValueCountsOptions, DataFrameValueCountsOptions } from "./value_counts.ts";
export { describe, quantile } from "./describe.ts";
export type { DescribeOptions } from "./describe.ts";
export { pearsonCorr, dataFrameCorr, dataFrameCov } from "./corr.ts";
export type { CorrMethod, CorrOptions, CovOptions } from "./corr.ts";
export { rankSeries, rankDataFrame } from "./rank.ts";
export type { RankMethod, NaOption, RankOptions } from "./rank.ts";
export {
  nlargestSeries,
  nsmallestSeries,
  nlargestDataFrame,
  nsmallestDataFrame,
} from "./nlargest.ts";
export type { NKeep, NTopOptions, NTopDataFrameOptions } from "./nlargest.ts";
export {
  isna,
  notna,
  isnull,
  notnull,
  ffillSeries,
  bfillSeries,
  dataFrameFfill,
  dataFrameBfill,
} from "./na_ops.ts";
export type { FillDirectionOptions, DataFrameFillOptions } from "./na_ops.ts";
export { pctChangeSeries, pctChangeDataFrame } from "./pct_change.ts";
export type {
  PctChangeFillMethod,
  PctChangeOptions,
  DataFramePctChangeOptions,
} from "./pct_change.ts";
export { idxminSeries, idxmaxSeries, idxminDataFrame, idxmaxDataFrame } from "./idxmin_idxmax.ts";
export type { IdxOptions, IdxDataFrameOptions } from "./idxmin_idxmax.ts";
