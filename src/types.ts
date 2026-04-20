/**
 * Core type definitions shared across tsb.
 *
 * These types form the foundation of the tsb type system.
 * They are designed to closely mirror pandas' type hierarchy
 * while being idiomatic TypeScript.
 */

/** Scalar value types — the atomic units of data in tsb. */
export type Scalar = number | string | boolean | bigint | null | undefined | Date | TimedeltaLike;

/** Timedelta-like object: any value representing a temporal duration (has totalMs). */
export interface TimedeltaLike {
  readonly totalMs: number;
}

/** A label used to identify rows or columns (similar to pandas Index). */
export type Label = number | string | boolean | null;

/** Axis identifiers — pandas supports axis=0 (rows) and axis=1 (columns). */
export type Axis = 0 | 1 | "index" | "columns";

/** Sort order direction. */
export type SortOrder = "ascending" | "descending";

/** Fill method for missing values. */
export type FillMethod = "ffill" | "bfill" | "pad" | "backfill";

/** How to handle missing values in joins. */
export type JoinHow = "inner" | "outer" | "left" | "right";

/** String representation of supported dtypes. */
export type DtypeName =
  | "int8"
  | "int16"
  | "int32"
  | "int64"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "float32"
  | "float64"
  | "bool"
  | "string"
  | "object"
  | "datetime"
  | "timedelta"
  | "category";
