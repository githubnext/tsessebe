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
export { readExcel, xlsxSheetNames } from "./io/index.ts";
export type { ReadExcelOptions } from "./io/index.ts";
export { jsonNormalize } from "./io/index.ts";
export type { JsonNormalizeOptions } from "./io/index.ts";
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
export { pivotTableFull } from "./reshape/index.ts";
export type { PivotTableFullOptions, PivotAggFunc } from "./reshape/index.ts";
export { explodeSeries, explodeDataFrame } from "./reshape/index.ts";
export type { ExplodeOptions } from "./reshape/index.ts";
export { wideToLong } from "./reshape/index.ts";
export type { WideToLongOptions } from "./reshape/index.ts";
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
  isna,
  notna,
  isnull,
  notnull,
  ffillSeries,
  bfillSeries,
  dataFrameFfill,
  dataFrameBfill,
} from "./stats/index.ts";
export type { FillDirectionOptions, DataFrameFillOptions } from "./stats/index.ts";
export { pctChangeSeries, pctChangeDataFrame } from "./stats/index.ts";
export type {
  PctChangeFillMethod,
  PctChangeOptions,
  DataFramePctChangeOptions,
} from "./stats/index.ts";
export { idxminSeries, idxmaxSeries, idxminDataFrame, idxmaxDataFrame } from "./stats/index.ts";
export type { IdxOptions, IdxDataFrameOptions } from "./stats/index.ts";
export { astypeSeries, astype, castScalar } from "./core/index.ts";
export type { AstypeOptions, DataFrameAstypeOptions } from "./core/index.ts";
export { replaceSeries, replaceDataFrame } from "./stats/index.ts";
export type {
  ReplaceMapping,
  ReplaceSpec,
  ReplaceOptions,
  DataFrameReplaceOptions,
} from "./stats/index.ts";
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./stats/index.ts";
export type {
  SeriesCond,
  DataFrameCond,
  WhereOptions,
  WhereDataFrameOptions,
} from "./stats/index.ts";
export { diffSeries, diffDataFrame, shiftSeries, shiftDataFrame } from "./stats/index.ts";
export type {
  DiffOptions,
  DataFrameDiffOptions,
  ShiftOptions,
  DataFrameShiftOptions,
} from "./stats/index.ts";
export {
  duplicatedSeries,
  duplicatedDataFrame,
  dropDuplicatesSeries,
  dropDuplicatesDataFrame,
} from "./stats/index.ts";
export type { KeepPolicy, DuplicatedOptions, DataFrameDuplicatedOptions } from "./stats/index.ts";
export { sampleSeries, sampleDataFrame } from "./core/index.ts";
export type { SampleOptions } from "./core/index.ts";
export { clipAdvancedSeries, clipAdvancedDataFrame } from "./stats/index.ts";
export type {
  SeriesBound,
  DataFrameBound,
  ClipAdvancedSeriesOptions,
  ClipAdvancedDataFrameOptions,
} from "./stats/index.ts";
export {
  applySeries,
  mapSeries,
  applyDataFrame,
  applyExpandDataFrame,
  mapDataFrame,
} from "./stats/index.ts";
export type {
  MapLookup,
  ApplyDataFrameOptions,
  ApplyExpandDataFrameOptions,
} from "./stats/index.ts";
export { cut, qcut, cutCodes, cutCategories } from "./stats/index.ts";
export type {
  CutOptions,
  QcutOptions,
  CutResult,
  CutResultWithBins,
} from "./stats/index.ts";
export { Interval, IntervalIndex, intervalRange } from "./stats/index.ts";
export type { ClosedType, IntervalOptions, IntervalRangeOptions } from "./stats/index.ts";
export { getDummies, getDummiesSeries, getDummiesDataFrame, fromDummies } from "./stats/index.ts";
export type { GetDummiesOptions, FromDummiesOptions } from "./stats/index.ts";
export { crosstab, crosstabSeries } from "./stats/index.ts";
export type { CrosstabOptions, CrosstabAggFunc, CrosstabNormalize } from "./stats/index.ts";
export { factorize, factorizeSeries } from "./stats/index.ts";
export type { FactorizeOptions, FactorizeResult } from "./stats/index.ts";
export { interpolateSeries, interpolateDataFrame } from "./stats/index.ts";
export type {
  InterpolateMethod,
  LimitDirection,
  LimitArea,
  InterpolateOptions,
  InterpolateDataFrameOptions,
} from "./stats/index.ts";
export { selectDtypes } from "./stats/index.ts";
export type { SelectDtypesOptions, DtypeSpecifier, DtypeAlias } from "./stats/index.ts";
export { modeSeries, modeDataFrame } from "./stats/index.ts";
export type { ModeSeriesOptions, ModeDataFrameOptions } from "./stats/index.ts";
export { skewSeries, kurtSeries, skewDataFrame, kurtDataFrame } from "./stats/index.ts";
export type {
  SkewKurtSeriesOptions,
  SkewKurtDataFrameOptions,
} from "./stats/index.ts";
export { varSeries, semSeries, varDataFrame, semDataFrame } from "./stats/index.ts";
export type { VarSemSeriesOptions, VarSemDataFrameOptions } from "./stats/index.ts";
export {
  nuniqueSeries,
  nuniqueDataFrame,
  anySeries,
  allSeries,
  anyDataFrame,
  allDataFrame,
} from "./stats/index.ts";
export type {
  NuniqueSeriesOptions,
  NuniqueDataFrameOptions,
  AnyAllSeriesOptions,
  AnyAllDataFrameOptions,
} from "./stats/index.ts";
export { quantileSeries, quantileDataFrame } from "./stats/index.ts";
export type {
  QuantileInterpolation,
  QuantileSeriesOptions,
  QuantileDataFrameOptions,
} from "./stats/index.ts";
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
} from "./stats/index.ts";
export type { NanInput, NanAggOptions } from "./stats/index.ts";
export { toDatetime } from "./stats/index.ts";
export type { DatetimeUnit, DatetimeErrors, ToDatetimeOptions } from "./stats/index.ts";
export { toTimedelta, parseFrac, formatTimedelta, Timedelta } from "./stats/index.ts";
export type { TimedeltaUnit, TimedeltaErrors, ToTimedeltaOptions } from "./stats/index.ts";
