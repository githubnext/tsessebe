/**
 * Testing utilities — mirrors `pandas.testing`.
 *
 * Provides `assertSeriesEqual`, `assertDataFrameEqual`, and `assertIndexEqual`
 * for use in unit-tests and data-pipeline validation.
 *
 * @example
 * ```ts
 * import { assertSeriesEqual } from "tsb";
 *
 * const s1 = Series.fromArray([1, 2, 3]);
 * const s2 = Series.fromArray([1, 2, 3]);
 * assertSeriesEqual(s1, s2); // passes silently
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import type { Index } from "./base-index.ts";
import type { DataFrame } from "./frame.ts";
import type { Series } from "./series.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for numeric tolerance when comparing. */
export interface CheckOptions {
  /** Absolute tolerance for float comparisons (default 1e-8). */
  atol?: number;
  /** Relative tolerance for float comparisons (default 1e-5). */
  rtol?: number;
  /** Whether to check the name attribute on Series (default true). */
  checkNames?: boolean;
  /** Whether to check the dtype attribute (default true). */
  checkDtype?: boolean;
  /** Whether to check the index labels (default true). */
  checkIndex?: boolean;
  /** Whether to check the exact column order for DataFrames (default true). */
  checkLike?: boolean;
}

// ─── assertIndexEqual ─────────────────────────────────────────────────────────

/**
 * Assert that two Index objects are equal.
 * Throws a descriptive error if they differ.
 */
export function assertIndexEqual<T extends Label>(
  left: Index<T>,
  right: Index<T>,
  opts: CheckOptions = {},
): void {
  const { checkNames = true } = opts;
  if (left.size !== right.size) {
    throw new AssertionError(
      `Index length mismatch: left has ${left.size}, right has ${right.size}`,
    );
  }
  for (let i = 0; i < left.size; i++) {
    const lv = left.values[i];
    const rv = right.values[i];
    if (!scalarEqual(lv as Scalar, rv as Scalar, opts)) {
      throw new AssertionError(
        `Index mismatch at position ${i}: left=${String(lv)}, right=${String(rv)}`,
      );
    }
  }
  if (checkNames && left.name !== right.name) {
    throw new AssertionError(
      `Index name mismatch: left="${String(left.name)}", right="${String(right.name)}"`,
    );
  }
}

// ─── assertSeriesEqual ────────────────────────────────────────────────────────

/**
 * Assert that two Series are equal element-wise.
 * Throws a descriptive error if they differ.
 *
 * @example
 * ```ts
 * assertSeriesEqual(Series.fromArray([1.0, 2.0]), Series.fromArray([1.0, 2.0]));
 * ```
 */
export function assertSeriesEqual(left: Series, right: Series, opts: CheckOptions = {}): void {
  const { checkNames = true, checkDtype = true, checkIndex = true } = opts;

  if (left.length !== right.length) {
    throw new AssertionError(`Series length mismatch: left=${left.length}, right=${right.length}`);
  }

  if (checkDtype && left.dtype.kind !== right.dtype.kind) {
    throw new AssertionError(
      `Series dtype mismatch: left=${left.dtype.kind}, right=${right.dtype.kind}`,
    );
  }

  if (checkNames && left.name !== right.name) {
    throw new AssertionError(
      `Series name mismatch: left="${String(left.name)}", right="${String(right.name)}"`,
    );
  }

  if (checkIndex) {
    assertIndexEqual(left.index as Index<Label>, right.index as Index<Label>, opts);
  }

  for (let i = 0; i < left.length; i++) {
    const lv = left.iloc(i);
    const rv = right.iloc(i);
    if (!scalarEqual(lv, rv, opts)) {
      throw new AssertionError(
        `Series mismatch at position ${i} (index=${String(left.index.values[i])}): ` +
          `left=${String(lv)}, right=${String(rv)}`,
      );
    }
  }
}

// ─── assertDataFrameEqual ─────────────────────────────────────────────────────

/**
 * Assert that two DataFrames are equal element-wise.
 * Throws a descriptive error if they differ.
 *
 * @example
 * ```ts
 * const df1 = DataFrame.fromRecords([{ a: 1, b: 2 }]);
 * const df2 = DataFrame.fromRecords([{ a: 1, b: 2 }]);
 * assertDataFrameEqual(df1, df2);
 * ```
 */
export function assertDataFrameEqual(
  left: DataFrame,
  right: DataFrame,
  opts: CheckOptions = {},
): void {
  const { checkLike = true } = opts;

  if (left.shape[0] !== right.shape[0] || left.shape[1] !== right.shape[1]) {
    throw new AssertionError(
      `DataFrame shape mismatch: left=${JSON.stringify(left.shape)}, right=${JSON.stringify(right.shape)}`,
    );
  }

  const leftCols = left.columns.values.map(String);
  const rightCols = right.columns.values.map(String);

  if (checkLike) {
    // Columns must appear in same order
    if (!arrayEqual(leftCols, rightCols)) {
      throw new AssertionError(
        `DataFrame columns mismatch: left=[${leftCols.join(",")}], right=[${rightCols.join(",")}]`,
      );
    }
    for (const col of leftCols) {
      assertSeriesEqual(left.col(col), right.col(col), opts);
    }
  } else {
    // Sort columns before comparing
    const ls = [...leftCols].sort();
    const rs = [...rightCols].sort();
    if (!arrayEqual(ls, rs)) {
      throw new AssertionError(
        `DataFrame columns mismatch: left=[${ls.join(",")}], right=[${rs.join(",")}]`,
      );
    }
    for (const col of ls) {
      assertSeriesEqual(left.col(col), right.col(col), { ...opts, checkNames: false });
    }
  }
}

// ─── AssertionError ───────────────────────────────────────────────────────────

/** Error thrown when an assertion fails. */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isMissingScalar(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

function scalarEqual(a: Scalar, b: Scalar, opts: CheckOptions): boolean {
  const { atol = 1e-8, rtol = 1e-5 } = opts;
  if (isMissingScalar(a) && isMissingScalar(b)) {
    return true;
  }
  if (isMissingScalar(a) || isMissingScalar(b)) {
    return false;
  }
  if (typeof a === "number" && typeof b === "number") {
    if (!(Number.isFinite(a) || Number.isFinite(b))) {
      return a === b;
    }
    const diff = Math.abs(a - b);
    return diff <= atol + rtol * Math.max(Math.abs(a), Math.abs(b));
  }
  return a === b;
}

function arrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
