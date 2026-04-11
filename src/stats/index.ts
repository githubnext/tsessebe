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
export { replaceSeries, replaceDataFrame } from "./replace.ts";
export type {
  ReplaceMapping,
  ReplaceSpec,
  ReplaceOptions,
  DataFrameReplaceOptions,
} from "./replace.ts";
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./where_mask.ts";
export type {
  SeriesCond,
  DataFrameCond,
  WhereOptions,
  WhereDataFrameOptions,
} from "./where_mask.ts";
export { diffSeries, diffDataFrame, shiftSeries, shiftDataFrame } from "./diff_shift.ts";
export type {
  DiffOptions,
  DataFrameDiffOptions,
  ShiftOptions,
  DataFrameShiftOptions,
} from "./diff_shift.ts";
export {
  duplicatedSeries,
  duplicatedDataFrame,
  dropDuplicatesSeries,
  dropDuplicatesDataFrame,
} from "./duplicated.ts";
export type { KeepPolicy, DuplicatedOptions, DataFrameDuplicatedOptions } from "./duplicated.ts";
export { clipAdvancedSeries, clipAdvancedDataFrame } from "./clip_advanced.ts";
export type {
  SeriesBound,
  DataFrameBound,
  ClipAdvancedSeriesOptions,
  ClipAdvancedDataFrameOptions,
} from "./clip_advanced.ts";
export {
  applySeries,
  mapSeries,
  applyDataFrame,
  applyExpandDataFrame,
  mapDataFrame,
} from "./apply.ts";
export type {
  MapLookup,
  ApplyDataFrameOptions,
  ApplyExpandDataFrameOptions,
} from "./apply.ts";
export { cut, qcut, cutCodes, cutCategories } from "./cut.ts";
export type {
  CutOptions,
  QcutOptions,
  CutResult,
  CutResultWithBins,
} from "./cut.ts";
export { Interval, IntervalIndex, intervalRange } from "./interval.ts";
export type { ClosedType, IntervalOptions, IntervalRangeOptions } from "./interval.ts";
export { getDummies, getDummiesSeries, getDummiesDataFrame, fromDummies } from "./get_dummies.ts";
export type { GetDummiesOptions, FromDummiesOptions } from "./get_dummies.ts";
export { crosstab, crosstabSeries } from "./crosstab.ts";
export type { CrosstabOptions, CrosstabAggFunc, CrosstabNormalize } from "./crosstab.ts";
