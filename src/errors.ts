/**
 * `pd.errors` — pandas-compatible error and warning classes.
 *
 * Provides the full hierarchy of exceptions and warnings that pandas raises,
 * adapted to TypeScript idioms. All classes extend native Error (or its
 * subclasses) so they integrate naturally with `try/catch` and `instanceof`.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Base error helpers (must be declared first so derived classes can extend them)
// ---------------------------------------------------------------------------

/** TypeError-compatible base for value-related errors (mirrors Python's ValueError). */
export class ValueError extends TypeError {
  override readonly name: string = "ValueError";
}

/** Error-compatible base for key-related errors (mirrors Python's KeyError). */
export class KeyError extends Error {
  override readonly name: string = "KeyError";
}

/** Error-compatible base for index-related errors (mirrors Python's IndexError). */
export class IndexError extends RangeError {
  override readonly name: string = "IndexError";
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/** Raised when an abstract method is called that subclasses must override. */
export class AbstractMethodError extends Error {
  override readonly name = "AbstractMethodError";
  constructor(classOrMethod: string) {
    super(`This method must be defined in the concrete class: ${classOrMethod}`);
  }
}

/** Raised when there is a conflicting attribute during attribute access. */
export class AttributeConflictWarning extends Error {
  override readonly name = "AttributeConflictWarning";
}

/** Raised when CSS stylesheet parsing encounters a problem. */
export class CSSWarning extends Error {
  override readonly name = "CSSWarning";
}

/**
 * Raised when chained assignment is detected.
 * Equivalent to pandas `ChainedAssignmentError`.
 */
export class ChainedAssignmentError extends Error {
  override readonly name = "ChainedAssignmentError";
  constructor(message = "A value is trying to be set on a copy of a slice from a DataFrame") {
    super(message);
  }
}

/** Raised when there is a database-related error. */
export class DatabaseError extends Error {
  override readonly name = "DatabaseError";
}

/** Raised when a groupby aggregate operation encounters an error with the data. */
export class DataError extends Error {
  override readonly name = "DataError";
}

/**
 * Warning raised when reading a file with mismatched dtypes.
 * Equivalent to pandas `DtypeWarning`.
 */
export class DtypeWarning extends Error {
  override readonly name = "DtypeWarning";
}

/** Raised when attempting to read an empty file. */
export class EmptyDataError extends Error {
  override readonly name = "EmptyDataError";
  constructor(message = "No columns to parse from file") {
    super(message);
  }
}

/** Raised when casting to integer would lose data due to NaN values. */
export class IntCastingNaNError extends Error {
  override readonly name = "IntCastingNaNError";
  constructor(message = "Cannot convert non-finite values (NA or inf) to integer") {
    super(message);
  }
}

/** Raised when an invalid column name is used. */
export class InvalidColumnName extends Error {
  override readonly name = "InvalidColumnName";
}

/** Raised when a comparison is attempted with incompatible types. */
export class InvalidComparison extends TypeError {
  override readonly name = "InvalidComparison";
}

/** Raised when an invalid label is used for indexing. */
export class InvalidIndexError extends Error {
  override readonly name = "InvalidIndexError";
  constructor(message = "label not found in index") {
    super(message);
  }
}

/** Raised when a boolean index with an invalid shape is used. */
export class InvalidUseOfBooleanIndex extends IndexError {
  override readonly name = "InvalidUseOfBooleanIndex";
}

/** Raised when a version string cannot be parsed. */
export class InvalidVersion extends ValueError {
  override readonly name = "InvalidVersion";
}

/** Raised when a setitem operation would silently lose information. */
export class LossySetitemError extends Error {
  override readonly name = "LossySetitemError";
}

/** Raised when a merge operation is performed incorrectly. */
export class MergeError extends ValueError {
  override readonly name = "MergeError";
}

/** Raised when an operation requires a non-null frequency but the frequency is null. */
export class NullFrequencyError extends ValueError {
  override readonly name = "NullFrequencyError";
  constructor(message = "Cannot have a null frequency with a non-trivial period index") {
    super(message);
  }
}

/** Raised when a Numba utility encounters an error. */
export class NumbaUtilError extends Error {
  override readonly name = "NumbaUtilError";
}

/** Raised when an invalid option is encountered. */
export class OptionError extends KeyError {
  override readonly name = "OptionError";
}

/** Raised when a datetime value is out of the supported range. */
export class OutOfBoundsDatetime extends ValueError {
  override readonly name = "OutOfBoundsDatetime";
  constructor(message = "Out of bounds nanosecond timestamp") {
    super(message);
  }
}

/** Raised when a timedelta value is out of the supported range. */
export class OutOfBoundsTimedelta extends ValueError {
  override readonly name = "OutOfBoundsTimedelta";
  constructor(message = "Out of bounds timedelta") {
    super(message);
  }
}

/** Raised when a file or string cannot be parsed. */
export class ParserError extends ValueError {
  override readonly name = "ParserError";
}

/** Warning raised when a parser falls back to a less-efficient parser. */
export class ParserWarning extends Error {
  override readonly name = "ParserWarning";
}

/** Warning raised when a performance issue is detected. */
export class PerformanceWarning extends Error {
  override readonly name = "PerformanceWarning";
}

/** Raised when writing to a file may result in data loss. */
export class PossibleDataLossError extends Error {
  override readonly name = "PossibleDataLossError";
}

/** Warning raised when floating-point precision loss may occur. */
export class PossiblePrecisionLoss extends Error {
  override readonly name = "PossiblePrecisionLoss";
}

/** Raised when there is a specification error in a groupby agg call. */
export class SpecificationError extends ValueError {
  override readonly name = "SpecificationError";
}

/** Raised when an unsorted MultiIndex is used in a way that requires sorting. */
export class UnsortedIndexError extends KeyError {
  override readonly name = "UnsortedIndexError";
  constructor(message = "MultiIndex slicing requires the index to be lexsorted") {
    super(message);
  }
}

/** Raised when calling a function on an object that does not support it. */
export class UnsupportedFunctionCall extends ValueError {
  override readonly name = "UnsupportedFunctionCall";
}

/** Warning raised when accessor registration may shadow a built-in attribute. */
export class AccessorRegistrationWarning extends Error {
  override readonly name = "AccessorRegistrationWarning";
}

/** Raised when a value and label have mismatched types in a Categorical. */
export class ValueLabelTypeMismatch extends Error {
  override readonly name = "ValueLabelTypeMismatch";
}

// ---------------------------------------------------------------------------
// Namespace export (mirrors `pd.errors`)
// ---------------------------------------------------------------------------

/** All pandas-compatible error and warning classes, grouped as `pd.errors`. */
export const errors = {
  AbstractMethodError,
  AccessorRegistrationWarning,
  AttributeConflictWarning,
  CSSWarning,
  ChainedAssignmentError,
  DatabaseError,
  DataError,
  DtypeWarning,
  EmptyDataError,
  IntCastingNaNError,
  InvalidColumnName,
  InvalidComparison,
  InvalidIndexError,
  InvalidUseOfBooleanIndex,
  InvalidVersion,
  LossySetitemError,
  MergeError,
  NullFrequencyError,
  NumbaUtilError,
  OptionError,
  OutOfBoundsDatetime,
  OutOfBoundsTimedelta,
  ParserError,
  ParserWarning,
  PerformanceWarning,
  PossibleDataLossError,
  PossiblePrecisionLoss,
  SpecificationError,
  UnsortedIndexError,
  UnsupportedFunctionCall,
  ValueLabelTypeMismatch,
  // base classes
  ValueError,
  KeyError,
  IndexError,
} as const;

export type PandasError = InstanceType<(typeof errors)[keyof typeof errors]>;
