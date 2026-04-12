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
export { cut, qcut } from "./cut_qcut.ts";
export type { BinResult, CutOptions, QCutOptions } from "./cut_qcut.ts";
export { rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "./window_extended.ts";
export type { WindowExtOptions, RollingQuantileOptions } from "./window_extended.ts";
export { seriesWhere, seriesMask, dataFrameWhere, dataFrameMask } from "./where_mask.ts";
export type {
  SeriesCond,
  DataFrameCond,
  SeriesWhereOptions,
  DataFrameWhereOptions,
} from "./where_mask.ts";
export {
  isna,
  notna,
  isnull,
  notnull,
  fillna,
  dropna,
  countna,
  countValid,
} from "./notna_isna.ts";
export type { IsnaInput, FillnaOptions, DropnaOptions } from "./notna_isna.ts";
export {
  strNormalize,
  strGetDummies,
  strExtractAll,
  strRemovePrefix,
  strRemoveSuffix,
  strTranslate,
  strCharWidth,
  strByteLength,
} from "./string_ops.ts";
export type {
  NormalizeForm,
  StrInput,
  GetDummiesOptions,
  ExtractAllOptions,
} from "./string_ops.ts";
export {
  strSplitExpand,
  strExtractGroups,
  strPartition,
  strRPartition,
  strMultiReplace,
  strIndent,
  strDedent,
} from "./string_ops_extended.ts";
export type {
  SplitExpandOptions,
  ExtractGroupsOptions,
  PartitionResult,
  ReplacePair,
  IndentOptions,
} from "./string_ops_extended.ts";
export {
  digitize,
  histogram,
  linspace,
  arange,
  percentileOfScore,
  zscore,
  minMaxNormalize,
  coefficientOfVariation,
  seriesDigitize,
} from "./numeric_extended.ts";
export type {
  HistogramOptions,
  HistogramResult,
  ZscoreOptions,
  MinMaxOptions,
  CvOptions,
} from "./numeric_extended.ts";
export {
  catFromCodes,
  catUnionCategories,
  catIntersectCategories,
  catDiffCategories,
  catEqualCategories,
  catSortByFreq,
  catToOrdinal,
  catFreqTable,
  catCrossTab,
  catRecode,
} from "./categorical_ops.ts";
export type {
  CatFromCodesOptions,
  CatSortByFreqOptions,
  CatCrossTabOptions,
} from "./categorical_ops.ts";
export {
  formatFloat,
  formatPercent,
  formatScientific,
  formatEngineering,
  formatThousands,
  formatCurrency,
  formatCompact,
  makeFloatFormatter,
  makePercentFormatter,
  makeCurrencyFormatter,
  applySeriesFormatter,
  applyDataFrameFormatter,
  seriesToString,
  dataFrameToString,
} from "./format_ops.ts";
export type {
  Formatter,
  SeriesToStringOptions,
  DataFrameToStringOptions,
} from "./format_ops.ts";
