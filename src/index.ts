/**
 * tsb — A TypeScript port of pandas, built from first principles.
 *
 * @packageDocumentation
 */
// merged: 2026-04-09T19:37Z (re-merge main into PR branch, barrel-export conflicts resolved by keeping PR superset)

// Core exports will be added here as features are implemented.
// Each module is imported and re-exported from its feature file in src/.
//
// Planned export structure (mirrors pandas top-level API):
//   export * from "./core/frame.ts";        // DataFrame
//   export * from "./core/series.ts";       // Series
//   export * from "./core/dtypes.ts";       // Dtype system
//   export * from "./io/read_csv.ts";       // I/O utilities
//   ... (see .autoloop/memory/migration-plan.md for full roadmap)

export const TSB_VERSION = "0.0.1";

export type {
  Axis,
  DtypeName,
  FillMethod,
  JoinHow,
  Label,
  Scalar,
  SortOrder,
} from "./types.ts";

export { Index } from "./core/index.ts";
export type { IndexOptions } from "./core/index.ts";
export { RangeIndex } from "./core/index.ts";
export { Dtype } from "./core/index.ts";
export type { DtypeKind, ItemSize } from "./core/index.ts";
export { Series } from "./core/index.ts";
export type { SeriesOptions } from "./core/index.ts";
export { DataFrame } from "./core/index.ts";
export type { DataFrameOptions } from "./core/index.ts";
export { concat } from "./merge/index.ts";
export type { ConcatOptions } from "./merge/index.ts";
export { merge } from "./merge/index.ts";
export type { MergeOptions } from "./merge/index.ts";
export { StringAccessor } from "./core/index.ts";
export type { StringSeriesLike } from "./core/index.ts";
export { DatetimeAccessor } from "./core/index.ts";
export type { DatetimeSeriesLike } from "./core/index.ts";
export { DataFrameGroupBy, SeriesGroupBy } from "./groupby/index.ts";
export type { AggFn, AggName, AggSpec } from "./groupby/index.ts";
export { NamedAgg, namedAgg, isNamedAggSpec } from "./groupby/index.ts";
export type { NamedAggSpec } from "./groupby/index.ts";
export { describe, quantile } from "./stats/index.ts";
export type { DescribeOptions } from "./stats/index.ts";
export { readCsv, toCsv } from "./io/index.ts";
export type { ReadCsvOptions, ToCsvOptions } from "./io/index.ts";
export { readJson, toJson } from "./io/index.ts";
export type { ReadJsonOptions, ToJsonOptions, JsonOrient } from "./io/index.ts";
export { jsonNormalize } from "./io/index.ts";
export type { JsonNormalizeOptions, JsonPath } from "./io/index.ts";
export { pearsonCorr, dataFrameCorr, dataFrameCov } from "./stats/index.ts";
export type { CorrMethod, CorrOptions, CovOptions } from "./stats/index.ts";
export { Rolling } from "./window/index.ts";
export type { RollingOptions, RollingSeriesLike } from "./window/index.ts";
export { DataFrameRolling } from "./core/index.ts";
export { Expanding } from "./window/index.ts";
export type { ExpandingOptions, ExpandingSeriesLike } from "./window/index.ts";
export { DataFrameExpanding } from "./core/index.ts";
export { EWM } from "./window/index.ts";
export type { EwmOptions, EwmSeriesLike } from "./window/index.ts";
export {
  rollingApply,
  rollingAgg,
  dataFrameRollingApply,
  dataFrameRollingAgg,
} from "./window/index.ts";
export type { RollingApplyOptions, RollingAggOptions, AggFunctions } from "./window/index.ts";
export { DataFrameEwm } from "./core/index.ts";
export { CategoricalAccessor } from "./core/index.ts";
export type { CatSeriesLike } from "./core/index.ts";
export { melt } from "./reshape/index.ts";
export type { MeltOptions } from "./reshape/index.ts";
export { pivot, pivotTable } from "./reshape/index.ts";
export type {
  PivotOptions,
  PivotTableOptions,
  AggFuncName as PivotAggFuncName,
} from "./reshape/index.ts";
export { stack, unstack, STACK_DEFAULT_SEP } from "./reshape/index.ts";
export type { StackOptions, UnstackOptions } from "./reshape/index.ts";
export { wideToLong } from "./reshape/index.ts";
export type { WideToLongOptions } from "./reshape/index.ts";
export { pivotTableFull } from "./reshape/index.ts";
export type { PivotTableFullOptions } from "./reshape/index.ts";
export { MultiIndex } from "./core/index.ts";
export type { MultiIndexOptions } from "./core/index.ts";
export { rankSeries, rankDataFrame } from "./stats/index.ts";
export type { RankMethod, NaOption, RankOptions } from "./stats/index.ts";
export {
  nlargestSeries,
  nsmallestSeries,
  nlargestDataFrame,
  nsmallestDataFrame,
} from "./stats/index.ts";
export type { NKeep, NTopOptions, NTopDataFrameOptions } from "./stats/index.ts";
export {
  cumsum,
  cumprod,
  cummax,
  cummin,
  dataFrameCumsum,
  dataFrameCumprod,
  dataFrameCummax,
  dataFrameCummin,
} from "./stats/index.ts";
export type { CumOpsOptions, DataFrameCumOpsOptions } from "./stats/index.ts";
export {
  clip,
  dataFrameClip,
  seriesAbs,
  dataFrameAbs,
  seriesRound,
  dataFrameRound,
} from "./stats/index.ts";
export type { ClipOptions, RoundOptions, DataFrameElemOptions } from "./stats/index.ts";
export { valueCounts, dataFrameValueCounts } from "./stats/index.ts";
export type { ValueCountsOptions, DataFrameValueCountsOptions } from "./stats/index.ts";
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./stats/index.ts";
export type {
  WherePredicate,
  SeriesCond,
  DataFrameCond,
  WhereMaskOptions,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export type { CompareOp, SeriesOther, DataFrameOther } from "./stats/index.ts";
export { shiftSeries, diffSeries, dataFrameShift, dataFrameDiff } from "./stats/index.ts";
export type { ShiftDiffDataFrameOptions } from "./stats/index.ts";
export { interpolateSeries, dataFrameInterpolate } from "./stats/index.ts";
export type {
  InterpolateMethod,
  LimitDirection,
  InterpolateOptions,
  DataFrameInterpolateOptions,
} from "./stats/index.ts";
export { fillnaSeries, fillnaDataFrame } from "./stats/index.ts";
export type {
  FillnaMethod,
  FillnaSeriesOptions,
  ColumnFillMap,
  FillnaDataFrameOptions,
} from "./stats/index.ts";
export { Interval, IntervalIndex } from "./core/index.ts";
export type { IntervalClosed, IntervalIndexOptions } from "./core/index.ts";
export { cut, qcut, cutIntervalIndex, qcutIntervalIndex } from "./stats/index.ts";
export type { CutOptions, QCutOptions } from "./stats/index.ts";
export { sampleSeries, sampleDataFrame } from "./stats/index.ts";
export type { SampleSeriesOptions, SampleDataFrameOptions } from "./stats/index.ts";
export { applySeries, applymap, dataFrameApply } from "./stats/index.ts";
export type { DataFrameApplyOptions } from "./stats/index.ts";
export { CategoricalIndex } from "./core/index.ts";
export type { CategoricalIndexOptions } from "./core/index.ts";
export {
  pipeSeries,
  dataFramePipe,
  pipeTo,
  dataFramePipeTo,
  pipeChain,
  dataFramePipeChain,
} from "./stats/index.ts";

export { Period, PeriodIndex } from "./core/index.ts";
export type { PeriodFreq, PeriodIndexOptions } from "./core/index.ts";
export { Timedelta, TimedeltaIndex } from "./core/index.ts";
export type { TimedeltaComponents, TimedeltaIndexOptions } from "./core/index.ts";
export {
  Day,
  Hour,
  Minute,
  Second,
  Milli,
  Week,
  MonthEnd,
  MonthBegin,
  YearEnd,
  YearBegin,
  BusinessDay,
} from "./core/index.ts";
export type { DateOffset, WeekOptions } from "./core/index.ts";
export { DatetimeIndex, date_range, bdate_range, resolveFreq } from "./core/index.ts";
export type { DateRangeFreq, DateRangeOptions, DatetimeIndexOptions } from "./core/index.ts";
export { TZDatetimeIndex, tz_localize, tz_convert } from "./core/index.ts";
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
} from "./stats/index.ts";
export {
  seriesPow,
  dataFramePow,
  seriesMod,
  dataFrameMod,
  seriesFloorDiv,
  dataFrameFloorDiv,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export { getDummies, dataFrameGetDummies } from "./stats/index.ts";
export type { GetDummiesOptions, DataFrameGetDummiesOptions } from "./stats/index.ts";
export { factorize, seriesFactorize } from "./stats/index.ts";
export type { FactorizeOptions, FactorizeResult } from "./stats/index.ts";
export { crosstab, seriesCrosstab } from "./stats/index.ts";
export type { AggFunc, Normalize, CrosstabOptions } from "./stats/index.ts";
export { toNumeric, toNumericArray, toNumericScalar, toNumericSeries } from "./stats/index.ts";
export type { ToNumericDowncast, ToNumericErrors, ToNumericOptions } from "./stats/index.ts";
export { seriesMemoryUsage, dataFrameMemoryUsage } from "./stats/index.ts";
export type { MemoryUsageOptions } from "./stats/index.ts";
export { selectDtypes } from "./stats/index.ts";
export type { DtypeSelector, SelectDtypesOptions } from "./stats/index.ts";
export { clipSeriesWithBounds, clipDataFrameWithBounds } from "./stats/index.ts";
export type {
  BoundArg,
  SeriesClipBoundsOptions,
  DataFrameClipBoundsOptions,
} from "./stats/index.ts";
export { Timestamp } from "./core/index.ts";
export type { TimestampOptions, TimestampComponents, TimestampUnit } from "./core/index.ts";
export { dataFrameAssign } from "./core/index.ts";
export type { AssignColSpec, AssignSpec } from "./core/index.ts";
export { inferDtype } from "./stats/index.ts";
export type { InferredDtype, InferDtypeOptions } from "./stats/index.ts";
export { isna, notna, isnull, notnull } from "./stats/index.ts";
export { dropna, dropnaSeries, dropnaDataFrame } from "./stats/index.ts";
export type { DropnaHow, DropnaDataFrameOptions } from "./stats/index.ts";
export { combineFirstSeries, combineFirstDataFrame } from "./stats/index.ts";
export { natCompare, natSorted, natSortKey, natArgSort } from "./core/index.ts";
export type { NatSortOptions, NatSortedOptions } from "./core/index.ts";
export { searchsorted, searchsortedMany, argsortScalars } from "./core/index.ts";
export type { SearchSortedSide, SearchSortedOptions } from "./core/index.ts";
export { valueCountsBinned } from "./stats/index.ts";
export type { ValueCountsBinnedOptions } from "./stats/index.ts";

export {
  duplicatedSeries,
  duplicatedDataFrame,
  dropDuplicatesSeries,
  dropDuplicatesDataFrame,
} from "./stats/index.ts";
export type {
  KeepPolicy,
  DuplicatedDataFrameOptions,
  DuplicatedSeriesOptions,
} from "./stats/index.ts";
export { reindexSeries, reindexDataFrame } from "./core/index.ts";
export type { ReindexMethod, ReindexSeriesOptions, ReindexDataFrameOptions } from "./core/index.ts";

export { alignSeries, alignDataFrame } from "./core/index.ts";
export type { AlignSeriesOptions, AlignDataFrameOptions } from "./core/index.ts";

export { explodeSeries, explodeDataFrame } from "./stats/index.ts";
export type { ExplodeOptions, ExplodeDataFrameOptions } from "./stats/index.ts";

export { isin, dataFrameIsin } from "./stats/index.ts";
export type { IsinValues, IsinDict, DataFrameIsinValues } from "./stats/index.ts";

export {
  insertColumn,
  popColumn,
  reorderColumns,
  moveColumn,
  dataFrameFromPairs,
} from "./core/index.ts";
export type { PopResult } from "./core/index.ts";
export { toDictOriented, fromDictOriented } from "./core/index.ts";
export type {
  ToDictOrient,
  FromDictOrient,
  DictSplit,
  DictTight,
  SplitInput,
} from "./core/index.ts";
export { rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "./stats/index.ts";
export type { WindowExtOptions, RollingQuantileOptions } from "./stats/index.ts";
export { fillna, countna, countValid } from "./stats/index.ts";
export type { IsnaInput, FillnaOptions, DropnaOptions } from "./stats/index.ts";
export {
  getAttrs,
  setAttrs,
  updateAttrs,
  copyAttrs,
  withAttrs,
  clearAttrs,
  hasAttrs,
  getAttr,
  setAttr,
  deleteAttr,
  attrsCount,
  attrsKeys,
  mergeAttrs,
} from "./core/index.ts";
export type { Attrs } from "./core/index.ts";
export {
  pipe,
  seriesApply,
  seriesTransform,
  dataFrameApplyMap,
  dataFrameTransform,
  dataFrameTransformRows,
} from "./core/index.ts";
export {
  isScalar,
  isListLike,
  isArrayLike,
  isDictLike,
  isIterator,
  isNumber,
  isBool,
  isStringValue,
  isFloat,
  isInteger,
  isBigInt,
  isRegExp,
  isReCompilable,
  isMissing,
  isHashable,
  isDate,
  isNumericDtype,
  isIntegerDtype,
  isSignedIntegerDtype,
  isUnsignedIntegerDtype,
  isFloatDtype,
  isBoolDtype,
  isStringDtype,
  isDatetimeDtype,
  isTimedeltaDtype,
  isCategoricalDtype,
  isObjectDtype,
  isComplexDtype,
  isExtensionArrayDtype,
  isPeriodDtype,
  isIntervalDtype,
} from "./core/index.ts";
export {
  strNormalize,
  strGetDummies,
  strExtractAll,
  strRemovePrefix,
  strRemoveSuffix,
  strTranslate,
  strCharWidth,
  strByteLength,
  strSplitExpand,
  strExtractGroups,
  strPartition,
  strRPartition,
  strMultiReplace,
  strIndent,
  strDedent,
} from "./stats/index.ts";
export type {
  NormalizeForm,
  StrInput,
  ExtractAllOptions,
  SplitExpandOptions,
  ExtractGroupsOptions,
  PartitionResult,
  ReplacePair,
  IndentOptions,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export type {
  HistogramOptions,
  HistogramResult,
  ZscoreOptions,
  MinMaxOptions,
  CvOptions,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export type {
  CatFromCodesOptions,
  CatSortByFreqOptions,
  CatCrossTabOptions,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export type {
  Formatter,
  SeriesToStringOptions,
  DataFrameToStringOptions,
} from "./stats/index.ts";
