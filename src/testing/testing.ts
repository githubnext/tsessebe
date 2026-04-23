/**
 * Testing utilities — mirrors `pandas.testing`.
 *
 * Provides `assertSeriesEqual` and `assertFrameEqual` for use in test suites
 * to compare tsb objects with detailed, diff-friendly error messages.
 *
 * @example
 * ```ts
 * import { assertSeriesEqual, assertFrameEqual } from "tsb";
 *
 * assertSeriesEqual(s1, s2); // throws if not equal
 * assertFrameEqual(df1, df2, { checkDtypes: false });
 * ```
 */

import type { Index } from "../core/base-index.ts";
import type { DataFrame } from "../core/frame.ts";
import type { Series } from "../core/series.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Absolute tolerance for floating-point comparisons. */
const DEFAULT_RTOL = 1e-5;
const DEFAULT_ATOL = 1e-8;

function isNaN_(v: Scalar): boolean {
  return typeof v === "number" && Number.isNaN(v);
}

function isNull_(v: Scalar): boolean {
  return v === null || v === undefined;
}

/**
 * Compare two scalar values for equality, respecting NaN-equals-NaN when
 * `checkExact` is false and numeric tolerance when `checkExact` is true.
 */
function scalarsEqual(
  a: Scalar,
  b: Scalar,
  checkExact: boolean,
  rtol: number,
  atol: number,
  checkLike: boolean,
): boolean {
  if (isNull_(a) && isNull_(b)) {
    return true;
  }
  if (isNull_(a) !== isNull_(b)) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (isNaN_(a) && isNaN_(b)) {
    return true;
  }
  if (isNaN_(a) !== isNaN_(b)) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") {
    if (checkExact) {
      return a === b;
    }
    return Math.abs(a - b) <= atol + rtol * Math.abs(b);
  }
  if (!checkLike && typeof a !== typeof b) {
    return false;
  }
  return a === b;
}

/** Format a scalar for display in error messages. */
function fmt(v: Scalar): string {
  if (v === null) {
    return "null";
  }
  if (v === undefined) {
    return "undefined";
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return "NaN";
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  return String(v);
}

/** Check that two Index objects are equal, raising AssertionError otherwise. */
function checkIndexEqual<T extends Label>(
  left: Index<T>,
  right: Index<T>,
  msg: string,
  checkNames: boolean,
  checkExact: boolean,
  rtol: number,
  atol: number,
): void {
  if (left.size !== right.size) {
    throw new AssertionError(`${msg}: Index sizes differ. left=${left.size}, right=${right.size}`);
  }
  for (let i = 0; i < left.size; i++) {
    const lv = left.at(i) as Scalar;
    const rv = right.at(i) as Scalar;
    if (!scalarsEqual(lv, rv, checkExact, rtol, atol, false)) {
      throw new AssertionError(
        `${msg}: Index values differ at position ${i}. left=${fmt(lv)}, right=${fmt(rv)}`,
      );
    }
  }
  if (checkNames && left.name !== right.name) {
    throw new AssertionError(
      `${msg}: Index names differ. left=${String(left.name)}, right=${String(right.name)}`,
    );
  }
}

// ─── public error class ───────────────────────────────────────────────────────

/**
 * Error thrown when a tsb testing assertion fails.
 *
 * Extends the built-in `Error` so it integrates cleanly with `bun:test`,
 * Jest, and other frameworks that inspect `error.message`.
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

// ─── assertSeriesEqual ────────────────────────────────────────────────────────

/** Options for {@link assertSeriesEqual}. */
export interface AssertSeriesEqualOptions {
  /**
   * Whether to check the `dtype` of both Series.
   * @default true
   */
  checkDtypes?: boolean;
  /**
   * Whether to check that index labels and name match.
   * @default true
   */
  checkIndex?: boolean;
  /**
   * Whether to check index names (ignored when `checkIndex` is false).
   * @default true
   */
  checkNames?: boolean;
  /**
   * Whether to check exact equality of numeric values (disables tolerance).
   * @default false
   */
  checkExact?: boolean;
  /**
   * Relative tolerance for floating-point comparisons (when `checkExact` is false).
   * @default 1e-5
   */
  rtol?: number;
  /**
   * Absolute tolerance for floating-point comparisons (when `checkExact` is false).
   * @default 1e-8
   */
  atol?: number;
  /**
   * Custom message prefix prepended to any error message.
   */
  objLabel?: string;
}

/**
 * Assert that two Series are equal, raising {@link AssertionError} on failure.
 *
 * Mirrors `pandas.testing.assert_series_equal`.
 *
 * @param left  - The first Series.
 * @param right - The second Series to compare against `left`.
 * @param options - Comparison options.
 *
 * @throws {@link AssertionError} When the Series differ in shape, index, dtype, or values.
 *
 * @example
 * ```ts
 * import { Series, assertSeriesEqual } from "tsb";
 *
 * const a = new Series([1, 2, 3]);
 * const b = new Series([1, 2, 3]);
 * assertSeriesEqual(a, b); // passes
 *
 * const c = new Series([1, 2, 4]);
 * assertSeriesEqual(a, c); // throws AssertionError: values differ at position 2
 * ```
 */
export function assertSeriesEqual(
  left: Series<Scalar>,
  right: Series<Scalar>,
  options?: AssertSeriesEqualOptions,
): void {
  const checkDtypes = options?.checkDtypes ?? true;
  const checkIndex = options?.checkIndex ?? true;
  const checkNames = options?.checkNames ?? true;
  const checkExact = options?.checkExact ?? false;
  const rtol = options?.rtol ?? DEFAULT_RTOL;
  const atol = options?.atol ?? DEFAULT_ATOL;
  const label = options?.objLabel ?? "Series";

  if (left.size !== right.size) {
    throw new AssertionError(`${label}: lengths differ. left=${left.size}, right=${right.size}`);
  }

  if (checkDtypes && left.dtype.name !== right.dtype.name) {
    throw new AssertionError(
      `${label}: dtypes differ. left=${left.dtype.name}, right=${right.dtype.name}`,
    );
  }

  if (checkNames && left.name !== right.name) {
    throw new AssertionError(
      `${label}: names differ. left=${String(left.name)}, right=${String(right.name)}`,
    );
  }

  if (checkIndex) {
    checkIndexEqual(left.index, right.index, `${label} index`, checkNames, checkExact, rtol, atol);
  }

  for (let i = 0; i < left.size; i++) {
    const lv = left.iloc(i) as Scalar;
    const rv = right.iloc(i) as Scalar;
    if (!scalarsEqual(lv, rv, checkExact, rtol, atol, false)) {
      const idxLabel = left.index.at(i);
      throw new AssertionError(
        `${label}: values differ at index ${fmt(idxLabel as Scalar)} (position ${i}). ` +
          `left=${fmt(lv)}, right=${fmt(rv)}`,
      );
    }
  }
}

// ─── assertFrameEqual ─────────────────────────────────────────────────────────

/** Options for {@link assertFrameEqual}. */
export interface AssertFrameEqualOptions {
  /**
   * Whether to check that column dtypes match.
   * @default true
   */
  checkDtypes?: boolean;
  /**
   * Whether to check that the row index matches exactly.
   * @default true
   */
  checkIndex?: boolean;
  /**
   * Whether to check index and column names.
   * @default true
   */
  checkNames?: boolean;
  /**
   * When true, column order is ignored — only column presence matters.
   * @default false
   */
  checkLike?: boolean;
  /**
   * Whether to check exact equality of numeric values (disables tolerance).
   * @default false
   */
  checkExact?: boolean;
  /**
   * Relative tolerance for floating-point comparisons (when `checkExact` is false).
   * @default 1e-5
   */
  rtol?: number;
  /**
   * Absolute tolerance for floating-point comparisons (when `checkExact` is false).
   * @default 1e-8
   */
  atol?: number;
  /**
   * Custom message prefix prepended to any error message.
   */
  objLabel?: string;
}

/**
 * Assert that two DataFrames are equal, raising {@link AssertionError} on failure.
 *
 * Mirrors `pandas.testing.assert_frame_equal`.
 *
 * @param left  - The first DataFrame.
 * @param right - The second DataFrame to compare against `left`.
 * @param options - Comparison options.
 *
 * @throws {@link AssertionError} When the DataFrames differ in shape, columns, index, dtypes, or values.
 *
 * @example
 * ```ts
 * import { DataFrame, assertFrameEqual } from "tsb";
 *
 * const a = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
 * const b = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
 * assertFrameEqual(a, b); // passes
 *
 * const c = DataFrame.fromColumns({ x: [1, 9], y: [3, 4] });
 * assertFrameEqual(a, c); // throws AssertionError
 * ```
 */
export function assertFrameEqual(
  left: DataFrame,
  right: DataFrame,
  options?: AssertFrameEqualOptions,
): void {
  const checkDtypes = options?.checkDtypes ?? true;
  const checkIndex = options?.checkIndex ?? true;
  const checkNames = options?.checkNames ?? true;
  const checkLike = options?.checkLike ?? false;
  const checkExact = options?.checkExact ?? false;
  const rtol = options?.rtol ?? DEFAULT_RTOL;
  const atol = options?.atol ?? DEFAULT_ATOL;
  const label = options?.objLabel ?? "DataFrame";

  const [lRows, lCols] = left.shape;
  const [rRows, rCols] = right.shape;

  if (lRows !== rRows) {
    throw new AssertionError(`${label}: row counts differ. left=${lRows}, right=${rRows}`);
  }
  if (lCols !== rCols) {
    throw new AssertionError(`${label}: column counts differ. left=${lCols}, right=${rCols}`);
  }

  // Column presence check
  const leftCols = [...left.columns.values];
  const rightCols = [...right.columns.values];

  if (checkLike) {
    const leftSet = new Set(leftCols);
    const rightSet = new Set(rightCols);
    for (const c of leftSet) {
      if (!rightSet.has(c)) {
        throw new AssertionError(`${label}: column "${c}" is in left but not right`);
      }
    }
    for (const c of rightSet) {
      if (!leftSet.has(c)) {
        throw new AssertionError(`${label}: column "${c}" is in right but not left`);
      }
    }
  } else {
    for (let ci = 0; ci < leftCols.length; ci++) {
      const lc = leftCols[ci];
      const rc = rightCols[ci];
      if (lc !== rc) {
        throw new AssertionError(
          `${label}: column names differ at position ${ci}. left="${lc}", right="${rc}"`,
        );
      }
    }
  }

  // Row index check
  if (checkIndex) {
    checkIndexEqual(left.index, right.index, `${label} index`, checkNames, checkExact, rtol, atol);
  }

  // Column-by-column value comparison
  const colsToCheck = checkLike ? leftCols : leftCols;
  for (const colName of colsToCheck) {
    const ls = left.col(colName);
    const rs = right.col(colName);

    if (checkDtypes && ls.dtype.name !== rs.dtype.name) {
      throw new AssertionError(
        `${label}["${colName}"]: dtypes differ. left=${ls.dtype.name}, right=${rs.dtype.name}`,
      );
    }

    for (let i = 0; i < lRows; i++) {
      const lv = ls.iloc(i) as Scalar;
      const rv = rs.iloc(i) as Scalar;
      if (!scalarsEqual(lv, rv, checkExact, rtol, atol, checkLike)) {
        const idxLabel = left.index.at(i);
        throw new AssertionError(
          `${label}["${colName}"]: values differ at index ${fmt(idxLabel as Scalar)} (position ${i}). ` +
            `left=${fmt(lv)}, right=${fmt(rv)}`,
        );
      }
    }
  }
}

// ─── assertIndexEqual (public) ────────────────────────────────────────────────

/** Options for {@link assertIndexEqualPublic}. */
export interface AssertIndexEqualOptions {
  /** Whether to check index names. @default true */
  checkNames?: boolean;
  /** Whether to use exact equality (no tolerance). @default false */
  checkExact?: boolean;
  /** Relative tolerance. @default 1e-5 */
  rtol?: number;
  /** Absolute tolerance. @default 1e-8 */
  atol?: number;
  /** Label prefix for error messages. */
  objLabel?: string;
}

/**
 * Assert that two Index objects are equal, raising {@link AssertionError} on failure.
 *
 * Mirrors `pandas.testing.assert_index_equal`.
 *
 * @example
 * ```ts
 * import { Index, assertIndexEqual } from "tsb";
 *
 * const a = new Index([1, 2, 3]);
 * const b = new Index([1, 2, 3]);
 * assertIndexEqual(a, b); // passes
 * ```
 */
export function assertIndexEqual(
  left: Index<Label>,
  right: Index<Label>,
  options?: AssertIndexEqualOptions,
): void {
  const checkNames = options?.checkNames ?? true;
  const checkExact = options?.checkExact ?? false;
  const rtol = options?.rtol ?? DEFAULT_RTOL;
  const atol = options?.atol ?? DEFAULT_ATOL;
  const label = options?.objLabel ?? "Index";
  checkIndexEqual(left, right, label, checkNames, checkExact, rtol, atol);
}
