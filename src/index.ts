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
