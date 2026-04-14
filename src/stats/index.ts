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

export {
  seriesAdd,
  seriesRadd,
  seriesSub,
  seriesRsub,
  seriesMul,
  seriesRmul,
  seriesDiv,
  seriesRdiv,
  dataFrameAdd,
  dataFrameRadd,
  dataFrameSub,
  dataFrameRsub,
  dataFrameMul,
  dataFrameRmul,
  dataFrameDiv,
  dataFrameRdiv,
} from "./add_sub_mul_div.ts";

export { getDummies, dataFrameGetDummies } from "./get_dummies.ts";
export type { GetDummiesOptions, DataFrameGetDummiesOptions } from "./get_dummies.ts";

export { factorize, seriesFactorize } from "./factorize.ts";
export type { FactorizeOptions, FactorizeResult } from "./factorize.ts";

export { crosstab, seriesCrosstab } from "./crosstab.ts";
export type { AggFunc, Normalize, CrosstabOptions } from "./crosstab.ts";

export { toNumeric, toNumericArray, toNumericScalar, toNumericSeries } from "./to_numeric.ts";
export type { ToNumericDowncast, ToNumericErrors, ToNumericOptions } from "./to_numeric.ts";

export { seriesMemoryUsage, dataFrameMemoryUsage } from "./memory_usage.ts";
export type { MemoryUsageOptions } from "./memory_usage.ts";

export { selectDtypes } from "./select_dtypes.ts";
export type { DtypeSelector, SelectDtypesOptions } from "./select_dtypes.ts";

export { clipSeriesWithBounds, clipDataFrameWithBounds } from "./clip_with_bounds.ts";
export type {
  BoundArg,
  SeriesClipBoundsOptions,
  DataFrameClipBoundsOptions,
} from "./clip_with_bounds.ts";

export { inferDtype } from "./infer_dtype.ts";
export type { InferredDtype, InferDtypeOptions } from "./infer_dtype.ts";

export { isna, notna, isnull, notnull } from "./notna.ts";

export { dropna, dropnaSeries, dropnaDataFrame } from "./dropna.ts";
export type { DropnaHow, DropnaDataFrameOptions } from "./dropna.ts";

export { combineFirstSeries, combineFirstDataFrame } from "./combine_first.ts";

export { valueCountsBinned } from "./value_counts_full.ts";
export type { ValueCountsBinnedOptions } from "./value_counts_full.ts";

export {
  duplicatedSeries,
  duplicatedDataFrame,
  dropDuplicatesSeries,
  dropDuplicatesDataFrame,
} from "./duplicated.ts";
export type {
  KeepPolicy,
  DuplicatedDataFrameOptions,
  DuplicatedSeriesOptions,
} from "./duplicated.ts";

export { explodeSeries, explodeDataFrame } from "./explode.ts";
export type { ExplodeOptions, ExplodeDataFrameOptions } from "./explode.ts";

export { isin, dataFrameIsin } from "./isin.ts";
export type { IsinValues, IsinDict, DataFrameIsinValues } from "./isin.ts";

export { rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "./window_extended.ts";
export type { WindowExtOptions, RollingQuantileOptions } from "./window_extended.ts";
export { fillna, countna, countValid } from "./notna_isna.ts";
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
export type { NormalizeForm, StrInput, ExtractAllOptions } from "./string_ops.ts";
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
