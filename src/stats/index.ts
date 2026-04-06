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
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./where_mask.ts";
export type {
  WherePredicate,
  SeriesCond,
  DataFrameCond,
  WhereMaskOptions,
} from "./where_mask.ts";
export {
  seriesEq,
  seriesNe,
  seriesLt,
  seriesGt,
  seriesLe,
  seriesGe,
  dataFrameEq,
  dataFrameNe,
  dataFrameLt,
  dataFrameGt,
  dataFrameLe,
  dataFrameGe,
} from "./compare.ts";
export type { CompareOp, SeriesOther, DataFrameOther } from "./compare.ts";
export { shiftSeries, diffSeries, dataFrameShift, dataFrameDiff } from "./shift_diff.ts";
export type { ShiftDiffDataFrameOptions } from "./shift_diff.ts";
export { interpolateSeries, dataFrameInterpolate } from "./interpolate.ts";
export type {
  InterpolateMethod,
  LimitDirection,
  InterpolateOptions,
  DataFrameInterpolateOptions,
} from "./interpolate.ts";
export { fillnaSeries, fillnaDataFrame } from "./fillna.ts";
export type {
  FillnaMethod,
  FillnaSeriesOptions,
  ColumnFillMap,
  FillnaDataFrameOptions,
} from "./fillna.ts";
export { cut, qcut, cutIntervalIndex, qcutIntervalIndex } from "./cut.ts";
export type { CutOptions, QCutOptions } from "./cut.ts";
export { sampleSeries, sampleDataFrame } from "./sample.ts";
export type { SampleSeriesOptions, SampleDataFrameOptions } from "./sample.ts";
export { applySeries, applymap, dataFrameApply } from "./apply.ts";
export type { DataFrameApplyOptions } from "./apply.ts";
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
  pipeSeries,
  dataFramePipe,
  pipeTo,
  dataFramePipeTo,
  pipeChain,
  dataFramePipeChain,
} from "./pipe.ts";
export {
  seriesFloor,
  dataFrameFloor,
  seriesCeil,
  dataFrameCeil,
  seriesTrunc,
  dataFrameTrunc,
  seriesSqrt,
  dataFrameSqrt,
  seriesExp,
  dataFrameExp,
  seriesLog,
  dataFrameLog,
  seriesLog2,
  dataFrameLog2,
  seriesLog10,
  dataFrameLog10,
  seriesSign,
  dataFrameSign,
} from "./numeric_ops.ts";

export {
  seriesPow,
  dataFramePow,
  seriesMod,
  dataFrameMod,
  seriesFloorDiv,
  dataFrameFloorDiv,
} from "./pow_mod.ts";
