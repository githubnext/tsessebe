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
export { DataFrameGroupBy, SeriesGroupBy } from "./groupby/index.ts";
export type { AggFn, AggName, AggSpec } from "./groupby/index.ts";
export {
  alignSeries,
  alignedBinaryOp,
  alignDataFrames,
  alignedDataFrameBinaryOp,
} from "./core/index.ts";
export type { AlignJoin, SeriesAlignResult, DataFrameAlignResult } from "./core/index.ts";
export { StringAccessor } from "./core/index.ts";
export { DateTimeAccessor } from "./core/index.ts";
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
} from "./core/index.ts";
export type {
  FillPropagateOptions,
  FillnaMethod,
  FillnaOptions,
  DropnaOptions,
  InterpolateMethod,
  InterpolateOptions,
} from "./core/index.ts";
export {
  nlargest,
  nsmallest,
  dataFrameNlargest,
  dataFrameNsmallest,
  rank,
  rankDataFrame,
} from "./core/index.ts";
export type { RankMethod, RankOptions, NSelectOptions } from "./core/index.ts";
export {
  Slice,
  locSeries,
  ilocSeries,
  locDataFrame,
  ilocDataFrame,
  atDataFrame,
  iatDataFrame,
} from "./core/index.ts";
export type { BooleanMask, LocKey, ILocKey, ColLocKey, ColILocKey } from "./core/index.ts";
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
} from "./core/index.ts";
export type { CompareOp, SeriesCompareOptions, DataFrameCompareOptions } from "./core/index.ts";

// ─── reshape ──────────────────────────────────────────────────────────────────
export { pivot, pivotTable } from "./reshape/index.ts";
export type { AggFunc, PivotOptions, PivotTableOptions } from "./reshape/index.ts";
export { melt } from "./reshape/index.ts";
export type { MeltOptions } from "./reshape/index.ts";
export { stack, unstack } from "./reshape/index.ts";
export type { StackOptions, UnstackOptions } from "./reshape/index.ts";

// ─── window ───────────────────────────────────────────────────────────────────
export { rolling, SeriesRolling, DataFrameRolling } from "./window/index.ts";
export type { RollingOptions } from "./window/index.ts";
export { expanding, SeriesExpanding, DataFrameExpanding } from "./window/index.ts";
export { ewm, SeriesEWM, DataFrameEWM } from "./window/index.ts";
export type { EWMOptions } from "./window/index.ts";

// ─── I/O ──────────────────────────────────────────────────────────────────────
export { readCsv } from "./io/index.ts";
export type { ReadCsvOptions } from "./io/index.ts";
export { readJson } from "./io/index.ts";
export type { ReadJsonOptions, JsonOrient } from "./io/index.ts";
export { toCsv, seriesToCsv } from "./io/index.ts";
export type { ToCsvOptions } from "./io/index.ts";
export { toJson, seriesToJson } from "./io/index.ts";
export type { ToJsonOptions, ToJsonOrient } from "./io/index.ts";

// ─── stats ────────────────────────────────────────────────────────────────────
export { describe, describeDataFrame } from "./stats/index.ts";
export { corrSeries, corrDataFrame } from "./stats/index.ts";
export type { CorrMethod } from "./stats/index.ts";
export { covSeries, covDataFrame } from "./stats/index.ts";
export {
  skewSeries,
  skewDataFrame,
  kurtosisSeries,
  kurtSeries,
  kurtosisDataFrame,
  kurtDataFrame,
} from "./stats/index.ts";

// ─── categorical ──────────────────────────────────────────────────────────────
export { Categorical, CategoricalDtype, CategoricalAccessor, factorize } from "./core/index.ts";
export type { CategoricalOptions, FactorizeResult } from "./core/index.ts";

// ─── multi-index ──────────────────────────────────────────────────────────────
export { MultiIndex } from "./core/index.ts";
export type { MultiIndexTuple, MultiIndexOptions } from "./core/index.ts";

// ─── timedelta ────────────────────────────────────────────────────────────────
export { Timedelta, TimedeltaAccessor } from "./core/index.ts";
export type { TimedeltaUnit } from "./core/index.ts";

// ─── interval-index ───────────────────────────────────────────────────────────
export { Interval, IntervalIndex, intervalRange } from "./core/index.ts";
export type { IntervalClosed, IntervalRangeOptions } from "./core/index.ts";

// ─── categorical-index ────────────────────────────────────────────────────────
export { CategoricalIndex } from "./core/index.ts";
export type { CategoricalIndexOptions } from "./core/index.ts";

// ─── datetime-index ───────────────────────────────────────────────────────────
export { DatetimeTZDtype, DatetimeIndex, date_range } from "./core/index.ts";
export type { DateLike, DatetimeIndexOptions, DateRangeOptions } from "./core/index.ts";

// ─── shift / diff / pctChange ─────────────────────────────────────────────────
export { shiftSeries, diffSeries, pctChangeSeries, shiftDataFrame, diffDataFrame } from "./core/index.ts";
export type { ShiftOptions } from "./core/index.ts";

// ─── str-advanced ─────────────────────────────────────────────────────────────
export {
  strZfill, strLjust, strRjust, strCenter, strWrap,
  strExtract, strFindall, strNormalize, strTitle, strRepeat,
  strCountPattern, strRemovePrefix, strRemoveSuffix,
} from "./core/index.ts";
export type { NormalizeForm } from "./core/index.ts";

// ─── apply / map / pipe ───────────────────────────────────────────────────────
export { applySeries, mapSeries, applyMap, applyDataFrame, pipeSeries, pipeDataFrame } from "./core/index.ts";

// ─── datetime-convert ─────────────────────────────────────────────────────────
export { toDatetime, toTimedelta } from "./core/index.ts";
export type { ToDatetimeOptions, ToTimedeltaOptions } from "./core/index.ts";

// ─── rank2 (element-wise rank) ────────────────────────────────────────────────
export { rankSeries2 } from "./core/index.ts";
export type { RankMethod2, RankNa, RankSeriesOptions } from "./core/index.ts";

// ─── frequency / crosstab ─────────────────────────────────────────────────────
export { valueCounts, crosstab } from "./core/index.ts";
export type { ValueCountsOptions, CrosstabNormalize, CrosstabOptions } from "./core/index.ts";

// ─── cut / qcut ───────────────────────────────────────────────────────────────
export { cut, qcut } from "./core/index.ts";
export type { CutOptions, CutResult, QCutOptions, QCutResult } from "./core/index.ts";

// ─── get_dummies / from_dummies ───────────────────────────────────────────────
export { getDummies, fromDummies } from "./core/index.ts";
export type { GetDummiesOptions, FromDummiesOptions } from "./core/index.ts";

// ─── assign / filter ──────────────────────────────────────────────────────────
export { assignDataFrame, filterDataFrame } from "./core/index.ts";
export type { AssignSpec, AssignSpecs, FilterOptions } from "./core/index.ts";

// ─── explode ──────────────────────────────────────────────────────────────────
export { explodeSeries, explodeDataFrame } from "./core/index.ts";

// ─── clip ─────────────────────────────────────────────────────────────────────
export { clipSeries, clipDataFrame } from "./core/index.ts";
export type { ClipOptions } from "./core/index.ts";

// ─── where / mask ─────────────────────────────────────────────────────────────
export { whereSeries, maskSeries, whereDataFrame, maskDataFrame } from "./core/index.ts";
export type { DataFrameCond } from "./core/index.ts";

// ─── sample ───────────────────────────────────────────────────────────────────
export { sampleSeries, sampleDataFrame } from "./core/index.ts";
export type { SampleOptions } from "./core/index.ts";

// ─── cumulative ───────────────────────────────────────────────────────────────
export {
  cumsumSeries, cumprodSeries, cummaxSeries, cumminSeries,
  cumsumDataFrame, cumprodDataFrame, cummaxDataFrame, cumminDataFrame,
} from "./core/index.ts";
export type { CumulativeOptions } from "./core/index.ts";

// ─── reshape: wide_to_long ────────────────────────────────────────────────────
export { wideToLong } from "./reshape/index.ts";
export type { WideToLongOptions } from "./reshape/index.ts";

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
} from "./core/index.ts";
export type { ConvertDtypesOptions } from "./core/index.ts";

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
} from "./core/index.ts";
export type {
  SeriesAccessorFactory,
  DataFrameAccessorFactory,
  IndexAccessorFactory,
} from "./core/index.ts";

// ─── style / Styler ───────────────────────────────────────────────────────────
export { Styler, styleDataFrame } from "./core/index.ts";
export type { StylerFunc, HighlightOptions, GradientOptions } from "./core/index.ts";

// ─── to_numeric ───────────────────────────────────────────────────────────────
export { toNumeric, toNumericSeries, toNumericArray } from "./core/index.ts";
export type { NumericErrors, ToNumericOptions } from "./core/index.ts";

// ─── Period / PeriodIndex ─────────────────────────────────────────────────────
export { Period, PeriodIndex, periodRange } from "./core/index.ts";
export type { PeriodFreq } from "./core/index.ts";

// ─── I/O: parquet / excel ─────────────────────────────────────────────────────
export { readParquet } from "./io/index.ts";
export type { ReadParquetOptions } from "./io/index.ts";
export { readExcel } from "./io/index.ts";
export type { ReadExcelOptions } from "./io/index.ts";
export { toParquet, parquetSchema } from "./io/index.ts";
export type { ToParquetOptions, ParquetColumnSchema, ParquetMetadata } from "./io/index.ts";

// ─── stats: linear algebra ────────────────────────────────────────────────────
export { dot, outer, vadd, vsub, vscale, norm, matmul, transpose, matvec, lstsq, det } from "./stats/index.ts";
export type { Vector, Matrix, LstsqResult } from "./stats/index.ts";

// ─── sparse arrays ────────────────────────────────────────────────────────────
export { SparseArray, SparseDtype } from "./core/index.ts";
export type { SparseFillValue } from "./core/index.ts";

// ─── date offsets ─────────────────────────────────────────────────────────────
export {
  DateOffset,
  BusinessDay,
  MonthEnd,
  MonthBegin,
  YearEnd,
  YearBegin,
  BaseOffset,
  addOffset,
  dateRange,
} from "./core/index.ts";
export type { OffsetUnit } from "./core/index.ts";

// ─── testing utilities ────────────────────────────────────────────────────────
export { assertSeriesEqual, assertDataFrameEqual, assertIndexEqual, AssertionError } from "./core/index.ts";
export type { CheckOptions } from "./core/index.ts";

// ─── hypothesis testing ───────────────────────────────────────────────────────
export { ttest1samp, ttestInd, ttestRel, chi2test, kstest, ztest } from "./stats/index.ts";
export type { TestResult } from "./stats/index.ts";

// ─── I/O: to_excel ────────────────────────────────────────────────────────────
export { toExcel, seriesToExcel } from "./io/index.ts";
export type { ToExcelOptions } from "./io/index.ts";

// ─── NA singleton ─────────────────────────────────────────────────────────────
export { NAType, NA, isNA, naIf, naOr } from "./core/index.ts";

// ─── Flags ────────────────────────────────────────────────────────────────────
export { Flags, DuplicateLabelError, labelsAreUnique, getDuplicateLabels } from "./core/index.ts";
export type { FlagsOptions } from "./core/index.ts";

// ─── I/O: to_markdown ─────────────────────────────────────────────────────────
export { toMarkdown, seriesToMarkdown } from "./io/index.ts";
export type { ToMarkdownOptions, MarkdownAlign } from "./io/index.ts";

// ─── I/O: to_html ─────────────────────────────────────────────────────────────
export { toHtml, seriesToHtml } from "./io/index.ts";
export type { ToHtmlOptions } from "./io/index.ts";

// ─── I/O: to_latex ────────────────────────────────────────────────────────────
export { toLatex, seriesToLatex } from "./io/index.ts";
export type { ToLatexOptions, LatexColumnAlign } from "./io/index.ts";

// ─── stats: pairwise ─────────────────────────────────────────────────────────
export { pairwiseCorr, pairwiseCov, corrwith, rollingCorr, rollCov } from "./stats/index.ts";
export type { RollingPairwiseOptions } from "./stats/index.ts";

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
} from "./core/index.ts";
export type { OptionDescriptor } from "./core/index.ts";

// ─── json normalization ───────────────────────────────────────────────────────
export { jsonNormalize, flattenJson } from "./core/index.ts";
export type { JsonNormalizeOptions, JsonRecord, JsonValue } from "./core/index.ts";

// ─── eval / query ─────────────────────────────────────────────────────────────
export { evalDataFrame, queryDataFrame } from "./core/index.ts";

// ─── I/O: to_string ───────────────────────────────────────────────────────────
export { dataFrameToString, seriesToString } from "./io/index.ts";
export type { ToStringOptions } from "./io/index.ts";

// ─── I/O: read_fwf ────────────────────────────────────────────────────────────
export { readFwf } from "./io/index.ts";
export type { ReadFwfOptions, ColSpec } from "./io/index.ts";

// ─── I/O: read_html ───────────────────────────────────────────────────────────
export { readHtml } from "./io/index.ts";
export type { ReadHtmlOptions } from "./io/index.ts";

// ─── window: expanding corr/cov ───────────────────────────────────────────────
export { expandingCorr, expandingCov, expandingCorrDF, expandingCovDF } from "./window/index.ts";
export type { ExpandingCovOptions } from "./window/index.ts";

// ─── stats: bootstrap ─────────────────────────────────────────────────────────
export { bootstrapCI, bootstrapMean, bootstrapMedian, bootstrapStd } from "./stats/index.ts";
export type { BootstrapOptions, BootstrapResult } from "./stats/index.ts";

// ─── I/O: read_xml ────────────────────────────────────────────────────────────
export { readXml } from "./io/index.ts";
export type { ReadXmlOptions } from "./io/index.ts";

// ─── I/O: sql ────────────────────────────────────────────────────────────────
export { readSql, toSql } from "./io/index.ts";
export type { SqlConnection, ReadSqlOptions, ToSqlOptions } from "./io/index.ts";

// ─── stats: contingency ──────────────────────────────────────────────────────
export { contingencyTable, chi2Contingency, fisherExact } from "./stats/index.ts";
export type { Chi2Result, FisherResult } from "./stats/index.ts";

// ─── core: memory_usage ───────────────────────────────────────────────────────
export { memoryUsage, dataFrameMemoryUsage } from "./core/index.ts";
export type { MemoryUsageOptions } from "./core/index.ts";

// ─── stats: anova ─────────────────────────────────────────────────────────────
export { oneWayAnova, twoWayAnova } from "./stats/index.ts";
export type { AnovaRow, OneWayAnovaResult, TwoWayAnovaResult, TwoWayAnovaOptions } from "./stats/index.ts";

// ─── core: resample ───────────────────────────────────────────────────────────
export { resampleSeries, resampleDataFrame, asfreq, SeriesResampler, DataFrameResampler } from "./core/index.ts";

// ─── I/O: read_orc ────────────────────────────────────────────────────────────
export { readOrc } from "./io/index.ts";
export type { OrcDecoder, ReadOrcOptions } from "./io/index.ts";

// ─── I/O: read_feather ────────────────────────────────────────────────────────
export { readFeather, toFeather } from "./io/index.ts";
export type { ArrowDecoder, ArrowEncoder, ReadFeatherOptions, ToFeatherOptions } from "./io/index.ts";

// ─── stats: kruskal / friedman ────────────────────────────────────────────────
export { kruskalWallis, friedmanTest } from "./stats/index.ts";
export type { KruskalResult } from "./stats/index.ts";

// ─── stats: mann-whitney / wilcoxon ──────────────────────────────────────────
export { mannWhitneyU, wilcoxonSigned } from "./stats/index.ts";
export type { MannWhitneyResult, WilcoxonResult } from "./stats/index.ts";

// ─── stats: OLS/WLS regression ───────────────────────────────────────────────
export { olsRegress, wlsRegress } from "./stats/index.ts";
export type { RegressionResult } from "./stats/index.ts";

// ─── I/O: clipboard ──────────────────────────────────────────────────────────
export { readClipboard, toClipboard } from "./io/index.ts";
export type { ReadClipboardOptions, ToClipboardOptions } from "./io/index.ts";

// ─── core: plotting ───────────────────────────────────────────────────────────
export {
  setPlotRenderer,
  linePlot,
  barPlot,
  barhPlot,
  areaPlot,
  histPlot,
  kdePlot,
  boxPlot,
  piePlot,
  dfLinePlot,
  dfBarPlot,
  dfAreaPlot,
  dfBoxPlot,
  dfScatterPlot,
  dfHistPlot,
} from "./core/index.ts";
export type { PlotKind, PlotOptions, HistOptions, ScatterOptions, PlotSeriesEntry, PlotSpec, PlotRenderer } from "./core/index.ts";

// ─── core: arrow interop ──────────────────────────────────────────────────────
export { fromArrow, toArrow } from "./core/index.ts";
export type { ArrowTableDecoder, ArrowTableEncoder, FromArrowOptions, ToArrowOptions } from "./core/index.ts";

// ─── core: window_apply ───────────────────────────────────────────────────────
export { rollingApply, expandingApply, dataFrameRollingApply, dataFrameExpandingApply } from "./core/index.ts";
export type { RollingApplyOptions, ExpandingApplyOptions } from "./core/index.ts";

// ─── I/O: read_sas ────────────────────────────────────────────────────────────
export { readSas } from "./io/index.ts";
export type { SasDecoder, SasColumn, SasResult, ReadSasOptions } from "./io/index.ts";

// ─── I/O: read_spss ───────────────────────────────────────────────────────────
export { readSpss } from "./io/index.ts";
export type { SpssDecoder, SpssVariable, SpssResult, SpssValueLabels, ReadSpssOptions } from "./io/index.ts";

// ─── stats: survival analysis ─────────────────────────────────────────────────
export { kaplanMeier, logRankTest } from "./stats/index.ts";
export type { SurvivalEvent, KaplanMeierResult, LogRankResult } from "./stats/index.ts";

// ─── stats: time series ───────────────────────────────────────────────────────
export { acf, pacf, fitArma, ljungBox } from "./stats/index.ts";
export type { AutocorrResult, ArmaParams, LjungBoxResult } from "./stats/index.ts";

// ─── stats: PCA / factor analysis ─────────────────────────────────────────────
export { pca, factorAnalysis } from "./stats/index.ts";
export type { PcaResult, PcaOptions, FactorResult } from "./stats/index.ts";

// ─── stats: Bayesian inference ────────────────────────────────────────────────
export {
  betaBinomialUpdate,
  betaMean,
  betaVariance,
  betaMode,
  betaCredibleInterval,
  normalNormalUpdate,
  normalCredibleInterval,
  gammaPoissonUpdate,
  gammaMean,
  gammaVariance,
  dirichletCategoricalUpdate,
  dirichletMean,
} from "./stats/index.ts";
export type {
  BetaParams,
  NormalParams,
  GammaParams,
  DirichletParams,
  CredibleInterval,
} from "./stats/index.ts";

// ─── core: advanced styler ─────────────────────────────────────────────────────
export { AdvancedStyler, advancedStyler } from "./core/index.ts";
export type { BarOptions, HeatmapOptions, TextGradientOptions, ThresholdOptions } from "./core/index.ts";
