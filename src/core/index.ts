export { Index } from "./base-index.ts";
export type { IndexOptions } from "./base-index.ts";
export { RangeIndex } from "./range-index.ts";
export { Dtype } from "./dtype.ts";
export type { DtypeKind, ItemSize } from "./dtype.ts";
export { Series } from "./series.ts";
export type { SeriesOptions } from "./series.ts";
export { DataFrame } from "./frame.ts";
export type { DataFrameOptions } from "./frame.ts";
export { alignSeries, alignedBinaryOp, alignDataFrames, alignedDataFrameBinaryOp } from "./ops.ts";
export type { AlignJoin, SeriesAlignResult, DataFrameAlignResult } from "./ops.ts";
export { StringAccessor } from "./strings.ts";
export { DateTimeAccessor } from "./datetime.ts";
export {
  isna,
  isnull,
  notna,
  notnull,
  ffill,
  ffillDataFrame,
  bfill,
  bfillDataFrame,
  fillnaSeries,
  fillnaDataFrame,
  dropnaSeries,
  dropnaDataFrame,
  interpolate,
  interpolateDataFrame,
} from "./missing.ts";
export type {
  FillPropagateOptions,
  FillnaMethod,
  FillnaOptions,
  DropnaOptions,
  InterpolateMethod,
  InterpolateOptions,
} from "./missing.ts";
export {
  nlargest,
  nsmallest,
  dataFrameNlargest,
  dataFrameNsmallest,
  rank,
  rankDataFrame,
} from "./sort.ts";
export type { RankMethod, RankOptions, NSelectOptions } from "./sort.ts";
export {
  Slice,
  locSeries,
  ilocSeries,
  locDataFrame,
  ilocDataFrame,
  atDataFrame,
  iatDataFrame,
} from "./indexing.ts";
export type { BooleanMask, LocKey, ILocKey, ColLocKey, ColILocKey } from "./indexing.ts";
export {
  compareSeries,
  eqSeries,
  neSeries,
  ltSeries,
  gtSeries,
  leSeries,
  geSeries,
  anySeries,
  allSeries,
  logicalAndSeries,
  logicalOrSeries,
  logicalXorSeries,
  logicalNotSeries,
  compareDataFrame,
  eqDataFrame,
  neDataFrame,
  ltDataFrame,
  gtDataFrame,
  leDataFrame,
  geDataFrame,
  anyDataFrame,
  allDataFrame,
} from "./compare.ts";
export type { CompareOp, SeriesCompareOptions, DataFrameCompareOptions } from "./compare.ts";
export { Categorical, CategoricalDtype, CategoricalAccessor, factorize } from "./categorical.ts";
export type { CategoricalOptions, FactorizeResult } from "./categorical.ts";
export { MultiIndex } from "./multi-index.ts";
export type { MultiIndexTuple, MultiIndexOptions } from "./multi-index.ts";
export { Timedelta, TimedeltaAccessor } from "./timedelta.ts";
export type { TimedeltaUnit } from "./timedelta.ts";
export { Interval, IntervalIndex, intervalRange } from "./interval-index.ts";
export type { IntervalClosed, IntervalRangeOptions } from "./interval-index.ts";
export { CategoricalIndex } from "./categorical-index.ts";
export type { CategoricalIndexOptions } from "./categorical-index.ts";
export { DatetimeTZDtype, DatetimeIndex, date_range } from "./datetime-index.ts";
export type { DateLike, DatetimeIndexOptions, DateRangeOptions } from "./datetime-index.ts";

// ─── shift / diff / pctChange ─────────────────────────────────────────────────
export { shiftSeries, diffSeries, pctChangeSeries, shiftDataFrame, diffDataFrame } from "./shift.ts";
export type { ShiftOptions } from "./shift.ts";

// ─── str-advanced ─────────────────────────────────────────────────────────────
export {
  strZfill, strLjust, strRjust, strCenter, strWrap,
  strExtract, strFindall, strNormalize, strTitle, strRepeat,
  strCountPattern, strRemovePrefix, strRemoveSuffix,
} from "./str-advanced.ts";
export type { NormalizeForm } from "./str-advanced.ts";

// ─── apply / map / pipe ───────────────────────────────────────────────────────
export { applySeries, mapSeries, applyMap, applyDataFrame, pipeSeries, pipeDataFrame } from "./apply.ts";

// ─── datetime-convert ─────────────────────────────────────────────────────────
export { toDatetime, toTimedelta } from "./datetime-convert.ts";
export type { ToDatetimeOptions, ToTimedeltaOptions } from "./datetime-convert.ts";

// ─── rank2 (element-wise rank) ────────────────────────────────────────────────
export { rankSeries2 } from "./rank.ts";
export type { RankMethod2, RankNa, RankSeriesOptions } from "./rank.ts";

// ─── frequency / crosstab ─────────────────────────────────────────────────────
export { valueCounts, crosstab } from "./frequency.ts";
export type { ValueCountsOptions, CrosstabNormalize, CrosstabOptions } from "./frequency.ts";

// ─── cut / qcut ───────────────────────────────────────────────────────────────
export { cut, qcut } from "./cut.ts";
export type { CutOptions, CutResult, QCutOptions, QCutResult } from "./cut.ts";

// ─── get_dummies / from_dummies ───────────────────────────────────────────────
export { getDummies, fromDummies } from "./get-dummies.ts";
export type { GetDummiesOptions, FromDummiesOptions } from "./get-dummies.ts";

// ─── assign / filter ──────────────────────────────────────────────────────────
export { assignDataFrame, filterDataFrame } from "./assign.ts";
export type { AssignSpec, AssignSpecs, FilterOptions } from "./assign.ts";

// ─── explode ──────────────────────────────────────────────────────────────────
export { explodeSeries, explodeDataFrame } from "./explode.ts";

// ─── clip ─────────────────────────────────────────────────────────────────────
export { clipSeries, clipDataFrame } from "./clip.ts";
export type { ClipOptions } from "./clip.ts";

// ─── where / mask ─────────────────────────────────────────────────────────────
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./where.ts";
export type { DataFrameCond } from "./where.ts";

// ─── sample ───────────────────────────────────────────────────────────────────
export { sampleSeries, sampleDataFrame } from "./sample.ts";
export type { SampleOptions } from "./sample.ts";

// ─── cumulative ───────────────────────────────────────────────────────────────
export {
  cumsumSeries, cumprodSeries, cummaxSeries, cumminSeries,
  cumsumDataFrame, cumprodDataFrame, cummaxDataFrame, cumminDataFrame,
} from "./cumulative.ts";
export type { CumulativeOptions } from "./cumulative.ts";

// ─── infer / convert_dtypes ───────────────────────────────────────────────────
export {
  inferDtype,
  inferObjects,
  inferObjectsDataFrame,
  convertDtypes,
  convertDtypesDataFrame,
  isNumericDtype,
  isStringDtype,
  isBoolDtype,
  isObjectDtype,
  isIntegerDtype,
  isFloatDtype,
} from "./infer.ts";
export type { ConvertDtypesOptions } from "./infer.ts";

// ─── accessor registration ────────────────────────────────────────────────────
export {
  registerSeriesAccessor,
  registerDataFrameAccessor,
  registerIndexAccessor,
  getSeriesAccessor,
  getDataFrameAccessor,
  getIndexAccessor,
  clearAccessorRegistry,
  deregisterSeriesAccessor,
  deregisterDataFrameAccessor,
  deregisterIndexAccessor,
  listSeriesAccessors,
  listDataFrameAccessors,
  listIndexAccessors,
} from "./accessor.ts";
export type {
  SeriesAccessorFactory,
  DataFrameAccessorFactory,
  IndexAccessorFactory,
} from "./accessor.ts";

// ─── style / Styler ───────────────────────────────────────────────────────────
export { Styler, styleDataFrame } from "./style.ts";
export type { StylerFunc, HighlightOptions, GradientOptions } from "./style.ts";

// ─── to_numeric ───────────────────────────────────────────────────────────────
export { toNumeric, toNumericSeries, toNumericArray } from "./numeric.ts";
export type { NumericErrors, ToNumericOptions } from "./numeric.ts";

// ─── Period / PeriodIndex ─────────────────────────────────────────────────────
export { Period, PeriodIndex, periodRange } from "./period.ts";
export type { PeriodFreq } from "./period.ts";

// ─── sparse arrays ────────────────────────────────────────────────────────────
export { SparseArray, SparseDtype } from "./sparse.ts";
export type { SparseFillValue } from "./sparse.ts";

// ─── date offsets ─────────────────────────────────────────────────────────────
export {
  DateOffset,
  BusinessDay,
  MonthEnd,
  MonthBegin,
  YearEnd,
  YearBegin,
  addOffset,
  dateRange,
} from "./offsets.ts";
export type { OffsetUnit } from "./offsets.ts";
export { BaseOffset } from "./offsets.ts";

// ─── memory_usage ─────────────────────────────────────────────────────────────
export { memoryUsage, dataFrameMemoryUsage } from "./memory_usage.ts";
export type { MemoryUsageOptions } from "./memory_usage.ts";

// ─── testing utilities ────────────────────────────────────────────────────────
export {
  assertSeriesEqual,
  assertDataFrameEqual,
  assertIndexEqual,
  AssertionError,
} from "./testing.ts";
export type { CheckOptions } from "./testing.ts";

// ─── NA singleton ──────────────────────────────────────────────────────────────
export { NAType, NA, isNA, naIf, naOr } from "./na-type.ts";

// ─── Flags ────────────────────────────────────────────────────────────────────
export { Flags, DuplicateLabelError, labelsAreUnique, getDuplicateLabels } from "./flags.ts";
export type { FlagsOptions } from "./flags.ts";

// ─── options ──────────────────────────────────────────────────────────────────
export {
  getOption,
  setOption,
  resetOption,
  resetAllOptions,
  describeOption,
  listOptions,
  registerOption,
  OptionError,
} from "./option.ts";
export type { OptionDescriptor } from "./option.ts";

// ─── json normalization ───────────────────────────────────────────────────────
export { jsonNormalize, flattenJson } from "./json.ts";
export type { JsonNormalizeOptions, JsonRecord, JsonValue } from "./json.ts";

// ─── eval / query ─────────────────────────────────────────────────────────────
export { evalDataFrame, queryDataFrame } from "./eval.ts";

// ─── resample ─────────────────────────────────────────────────────────────────
export { resampleSeries, resampleDataFrame, asfreq, SeriesResampler, DataFrameResampler } from "./resample.ts";
export type {} from "./resample.ts";
