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
export { dataFrameShift, dataFrameDiff } from "./shift_diff.ts";
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
  strExtractAll,
  strRemovePrefix,
  strRemoveSuffix,
  strTranslate,
  strCharWidth,
  strByteLength,
} from "./string_ops.ts";
export type { NormalizeForm, StrInput, ExtractAllOptions } from "./string_ops.ts";
export { strGetDummies } from "./str_get_dummies.ts";
export type { StrGetDummiesOptions } from "./str_get_dummies.ts";
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

export { clipAdvancedSeries, clipAdvancedDataFrame } from "./clip_advanced.ts";
export type {
  SeriesBound,
  DataFrameBound,
  ClipAdvancedSeriesOptions,
  ClipAdvancedDataFrameOptions,
} from "./clip_advanced.ts";

export { idxminSeries, idxmaxSeries, idxminDataFrame, idxmaxDataFrame } from "./idxmin_idxmax.ts";
export type { IdxOptions, IdxDataFrameOptions } from "./idxmin_idxmax.ts";

export { modeSeries, modeDataFrame } from "./mode.ts";
export type { ModeSeriesOptions, ModeDataFrameOptions } from "./mode.ts";

export {
  nancount,
  nansum,
  nanmean,
  nanmedian,
  nanvar,
  nanstd,
  nanmin,
  nanmax,
  nanprod,
} from "./nancumops.ts";
export type { NanInput, NanAggOptions } from "./nancumops.ts";

export {
  nuniqueSeries,
  nuniqueDataFrame,
  anySeries,
  allSeries,
  anyDataFrame,
  allDataFrame,
} from "./nunique.ts";
export type {
  NuniqueSeriesOptions,
  NuniqueDataFrameOptions,
  AnyAllSeriesOptions,
  AnyAllDataFrameOptions,
} from "./nunique.ts";

export { pctChangeSeries, pctChangeDataFrame } from "./pct_change.ts";
export type {
  PctChangeFillMethod,
  PctChangeOptions,
  DataFramePctChangeOptions,
} from "./pct_change.ts";

export { quantileSeries, quantileDataFrame } from "./quantile.ts";
export type {
  QuantileInterpolation,
  QuantileSeriesOptions,
  QuantileDataFrameOptions,
} from "./quantile.ts";

export { replaceSeries, replaceDataFrame } from "./replace.ts";
export type {
  ReplaceMapping,
  ReplaceSpec,
  ReplaceOptions,
  DataFrameReplaceOptions,
} from "./replace.ts";

export { varSeries, semSeries, varDataFrame, semDataFrame } from "./sem_var.ts";
export type { VarSemSeriesOptions, VarSemDataFrameOptions } from "./sem_var.ts";

export { skewSeries, kurtSeries, skewDataFrame, kurtDataFrame } from "./skew_kurt.ts";
export type {
  SkewKurtSeriesOptions,
  SkewKurtDataFrameOptions,
} from "./skew_kurt.ts";

export { toDatetime } from "./to_datetime.ts";
export type { DatetimeUnit, DatetimeErrors, ToDatetimeOptions } from "./to_datetime.ts";

export { toTimedelta, parseFrac, formatTimedelta } from "./to_timedelta.ts";
export type { TimedeltaUnit, TimedeltaErrors, ToTimedeltaOptions } from "./to_timedelta.ts";
export { dateRange, parseFreq, advanceDate, toDateInput } from "./date_range.ts";
export type {
  DateRangeInclusive,
  DateRangeOptions,
  ParsedFreq,
} from "./date_range.ts";
export { diffDataFrame, shiftDataFrame, diffSeries, shiftSeries } from "./diff_shift.ts";
export type {
  DiffOptions,
  DataFrameDiffOptions,
  ShiftOptions,
  DataFrameShiftOptions,
} from "./diff_shift.ts";
export { ffillSeries, bfillSeries, dataFrameFfill, dataFrameBfill } from "./na_ops.ts";
export type { FillDirectionOptions, DataFrameFillOptions } from "./na_ops.ts";
export { intervalRange } from "./interval.ts";
export type { ClosedType } from "./interval.ts";
export { nunique } from "./reduce_ops.ts";
export { queryDataFrame, evalDataFrame } from "./eval_query.ts";
export { strFindall, strFindallCount, strFindFirst, strFindallExpand } from "./str_findall.ts";
export {
  cutBinsToFrame,
  cutBinCounts,
  binEdges,
} from "./cut_bins_to_frame.ts";
export type { CutBinsToFrameOptions } from "./cut_bins_to_frame.ts";
export { xsDataFrame, xsSeries } from "./xs.ts";
export type { XsDataFrameOptions, XsSeriesOptions } from "./xs.ts";
export {
  swapLevelSeries,
  swapLevelDataFrame,
  reorderLevelsSeries,
  reorderLevelsDataFrame,
} from "./swaplevel.ts";
export type { SwapLevelDataFrameOptions, ReorderLevelsDataFrameOptions } from "./swaplevel.ts";
export { truncateSeries, truncateDataFrame } from "./truncate.ts";
export type { TruncateOptions } from "./truncate.ts";
export { seriesBetween } from "./between.ts";
export type { BetweenInclusive, BetweenOptions } from "./between.ts";
export { seriesUpdate, dataFrameUpdate } from "./update.ts";
export type { UpdateOptions } from "./update.ts";
export { filterDataFrame, filterSeries } from "./filter_labels.ts";
export type { FilterLabelsOptions } from "./filter_labels.ts";

export { combineSeries, combineDataFrame } from "./combine.ts";
export type { CombineDataFrameOptions } from "./combine.ts";
export { keepTrue, keepFalse, filterBy } from "./notna_boolean.ts";
export {
  squeezeSeries,
  squeezeDataFrame,
  itemSeries,
  boolSeries,
  boolDataFrame,
  firstValidIndex,
  lastValidIndex,
  dataFrameFirstValidIndex,
  dataFrameLastValidIndex,
} from "./scalar_extract.ts";
export type { SqueezeResult } from "./scalar_extract.ts";
export { autoCorr, corrWith } from "./corrwith.ts";
export type { CorrWithOptions } from "./corrwith.ts";
export {
  renameSeriesIndex,
  renameDataFrame,
  addPrefixDataFrame,
  addSuffixDataFrame,
  addPrefixSeries,
  addSuffixSeries,
  setAxisSeries,
  setAxisDataFrame,
  seriesToFrame,
} from "./rename_ops.ts";
export type { LabelMapper, RenameDataFrameOptions } from "./rename_ops.ts";
export { absSeries, absDataFrame, roundSeries, roundDataFrame } from "./math_ops.ts";
export type { RoundDataFrameSpec } from "./math_ops.ts";
export {
  seriesDotSeries,
  seriesDotDataFrame,
  dataFrameDotSeries,
  dataFrameDotDataFrame,
} from "./dot_matmul.ts";
export { seriesTransform, dataFrameTransform } from "./transform_agg.ts";
export type {
  TransformFunc,
  TransformFuncName,
  DataFrameTransformOptions,
} from "./transform_agg.ts";
export { seriesAt, seriesIat, dataFrameAt, dataFrameIat } from "./at_iat.ts";
export {
  sortValuesSeries,
  sortIndexSeries,
  sortValuesDataFrame,
  sortIndexDataFrame,
} from "./sort_ops.ts";
export type {
  SortValuesSeriesOptions,
  SortIndexSeriesOptions,
  SortValuesDataFrameOptions,
  SortIndexDataFrameOptions,
} from "./sort_ops.ts";
export {
  inferObjectsSeries,
  inferObjectsDataFrame,
  convertDtypesSeries,
  convertDtypesDataFrame,
} from "./infer_objects.ts";
export type {
  InferObjectsOptions,
  ConvertDtypesOptions,
} from "./infer_objects.ts";
export {
  resampleSeries,
  resampleDataFrame,
  SeriesResampler,
  DataFrameResampler,
} from "./resample.ts";
export type {
  ResampleFreq,
  ResampleLabel,
  ResampleAggName,
  ResampleAggFn,
  ResampleOptions,
} from "./resample.ts";
export { Styler, dataFrameStyle } from "./style.ts";
export type {
  CellProps,
  TableStyle,
  StyleRecord,
  ValueFormatter,
  ColSubset,
  AxisStyleFn,
  ElementStyleFn,
  HighlightOptions,
  HighlightBetweenOptions,
  GradientOptions,
  BarOptions,
} from "./style.ts";
export { hashPandasObject } from "./hash_pandas_object.ts";
export type { HashPandasObjectOptions } from "./hash_pandas_object.ts";
