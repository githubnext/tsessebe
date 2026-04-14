/**
 * tsb — A TypeScript port of pandas, built from first principles.
 *
 * @packageDocumentation
 */

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
export { describe, quantile } from "./stats/index.ts";
export type { DescribeOptions } from "./stats/index.ts";
export { readCsv, toCsv } from "./io/index.ts";
export type { ReadCsvOptions, ToCsvOptions } from "./io/index.ts";
export { readJson, toJson } from "./io/index.ts";
export type { ReadJsonOptions, ToJsonOptions, JsonOrient } from "./io/index.ts";
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
export { wideToLong } from "./reshape/index.ts";
export type { WideToLongOptions } from "./reshape/index.ts";
export { cut, qcut } from "./stats/index.ts";
export type { BinResult, CutOptions, QCutOptions } from "./stats/index.ts";
export { rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "./stats/index.ts";
export type { WindowExtOptions, RollingQuantileOptions } from "./stats/index.ts";
export { seriesWhere, seriesMask, dataFrameWhere, dataFrameMask } from "./stats/index.ts";
export type {
  SeriesCond,
  DataFrameCond,
  SeriesWhereOptions,
  DataFrameWhereOptions,
} from "./stats/index.ts";
export {
  isna,
  notna,
  isnull,
  notnull,
  fillna,
  dropna,
  countna,
  countValid,
} from "./stats/index.ts";
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
  dataFrameApply,
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
  GetDummiesOptions,
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
