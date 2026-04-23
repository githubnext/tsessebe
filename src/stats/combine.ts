/**
 * combine — element-wise combination of two Series or two DataFrames
 * using a caller-supplied binary function.
 *
 * Mirrors `pandas.Series.combine()` / `pandas.DataFrame.combine()`.
 *
 * - {@link combineSeries}   — combine two Series element-wise
 * - {@link combineDataFrame} — combine two DataFrames column-by-column
 *
 * ### Semantics
 *
 * For `combineSeries(self, other, func, fillValue?)`:
 * - The result index is the **union** of `self.index` and `other.index`.
 * - For each index label, the value is `func(a, b)` where `a` is from `self`
 *   and `b` is from `other`.
 * - When only one side has a value for a label, `fillValue` (default `null`)
 *   is used for the missing side.
 *
 * For `combineDataFrame(self, other, func, fillValue?, overwrite?)`:
 * - The result columns are the **union** of the two sets.
 * - For each column that exists in **both**, the result is `combineSeries(a, b, func, fillValue)`.
 * - For columns only in `self`: when `overwrite` is `true` (default), the
 *   result is `func(v, fillValue)` for each element; when `false`, the column
 *   from `self` is kept as-is.
 * - For columns only in `other`: same rule from `other`'s perspective.
 *
 * @example
 * ```ts
 * import { Series, combineSeries } from "tsb";
 *
 * const a = new Series({ data: [1, 2, 3], index: [0, 1, 2] });
 * const b = new Series({ data: [10, 20, 30], index: [0, 1, 2] });
 * combineSeries(a, b, (x, y) => Math.max(x as number, y as number)).values;
 * // [10, 20, 30]
 * ```
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link combineDataFrame}. */
export interface CombineDataFrameOptions {
  /**
   * Scalar used as a placeholder for missing values when only one side has a
   * given index label or column.  Default `null`.
   */
  readonly fillValue?: Scalar;

  /**
   * When `true` (default) columns that exist in only one DataFrame are still
   * processed by `func` (using `fillValue` for the missing side).  When
   * `false`, those columns are passed through unchanged from whichever
   * DataFrame contains them.
   */
  readonly overwrite?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a label → [positions] map for an Index. */
function buildLabelMap(idx: Index<Label>): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < idx.size; i++) {
    const key = String(idx.at(i));
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
}

/** Sorted union of two arrays of string-keys. */
function unionKeys(a: Iterable<string>, b: Iterable<string>): string[] {
  const set = new Set<string>(a);
  for (const k of b) {
    set.add(k);
  }
  return [...set].sort();
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * Combine two Series element-wise with a binary function.
 *
 * The result index is the union of the two indices.  When a label exists in
 * only one Series, `fillValue` (default `null`) is used for the missing side.
 *
 * @param self       - Left-hand Series.
 * @param other      - Right-hand Series.
 * @param func       - Binary function `(a, b) → Scalar`.
 * @param fillValue  - Placeholder for missing values.  Default `null`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, 2, null], index: [0, 1, 2] });
 * const b = new Series({ data: [10, null, 30], index: [0, 1, 3] });
 * combineSeries(a, b, (x, y) => (x as number) + (y as number), 0).values;
 * // [11, 2, 0, 30]  — index [0, 1, 2, 3]
 * ```
 */
export function combineSeries(
  self: Series<Scalar>,
  other: Series<Scalar>,
  func: (a: Scalar, b: Scalar) => Scalar,
  fillValue: Scalar = null,
): Series<Scalar> {
  const selfIdx = self.index as Index<Label>;
  const otherIdx = other.index as Index<Label>;

  const selfMap = buildLabelMap(selfIdx);
  const otherMap = buildLabelMap(otherIdx);

  const allKeys = unionKeys(selfMap.keys(), otherMap.keys());

  const resultData: Scalar[] = [];
  const resultIndex: Label[] = [];

  for (const key of allKeys) {
    const selfPositions = selfMap.get(key) ?? [];
    const otherPositions = otherMap.get(key) ?? [];

    // Pair them up; if one side has more, use fillValue for extras
    const maxLen = Math.max(selfPositions.length, otherPositions.length, 1);
    for (let k = 0; k < maxLen; k++) {
      const si = selfPositions[k];
      const oi = otherPositions[k];

      const aVal: Scalar = si !== undefined ? (self.values[si] ?? null) : fillValue;
      const bVal: Scalar = oi !== undefined ? (other.values[oi] ?? null) : fillValue;

      resultData.push(func(aVal, bVal));

      // Use the label from whichever side has a value at this position
      const rawLabel: Label =
        si !== undefined
          ? (selfIdx.at(si) ?? (key as Label))
          : (otherIdx.at(oi ?? 0) ?? (key as Label));
      resultIndex.push(rawLabel);
    }
  }

  return new Series<Scalar>({ data: resultData, index: resultIndex });
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Combine two DataFrames column-by-column with a binary function.
 *
 * For columns present in **both** DataFrames, each column pair is merged via
 * {@link combineSeries}.  For columns present in only **one** DataFrame, the
 * behaviour depends on `overwrite`:
 * - When `overwrite` is `true` (default), `func` is applied with `fillValue`
 *   for the missing side, producing a new column.
 * - When `overwrite` is `false`, the original column is preserved as-is.
 *
 * @param self    - Left-hand DataFrame.
 * @param other   - Right-hand DataFrame.
 * @param func    - Binary function `(a, b) → Scalar` applied element-wise.
 * @param options - {@link CombineDataFrameOptions}
 *
 * @example
 * ```ts
 * const a = DataFrame.fromColumns({ x: [1, 2], y: [10, 20] });
 * const b = DataFrame.fromColumns({ x: [100, 200], z: [1000, 2000] });
 * combineDataFrame(a, b, (p, q) => Math.min(p as number, q as number)).col("x").values;
 * // [1, 2]
 * ```
 */
export function combineDataFrame(
  self: DataFrame,
  other: DataFrame,
  func: (a: Scalar, b: Scalar) => Scalar,
  options: CombineDataFrameOptions = {},
): DataFrame {
  const fillValue: Scalar = options.fillValue ?? null;
  const overwrite: boolean = options.overwrite !== false;

  const selfCols = new Set(self.columns.values);
  const otherCols = new Set(other.columns.values);
  const allCols = unionKeys(selfCols, otherCols);

  const resultCols: Record<string, Scalar[]> = {};
  // Track the row index from the first shared column combination.
  let resultRowIndex: readonly Label[] | null = null;

  for (const col of allCols) {
    const inSelf = selfCols.has(col);
    const inOther = otherCols.has(col);

    if (inSelf && inOther) {
      const merged = combineSeries(self.col(col), other.col(col), func, fillValue);
      resultCols[col] = [...merged.values] as Scalar[];
      if (resultRowIndex === null) {
        resultRowIndex = merged.index.values as readonly Label[];
      }
    } else if (inSelf) {
      if (overwrite) {
        const selfSeries = self.col(col);
        const data = (selfSeries.values as readonly Scalar[]).map((v) =>
          func(v ?? null, fillValue),
        );
        resultCols[col] = data as Scalar[];
      } else {
        resultCols[col] = [...(self.col(col).values as readonly Scalar[])] as Scalar[];
      }
    } else {
      // inOther only
      if (overwrite) {
        const otherSeries = other.col(col);
        const data = (otherSeries.values as readonly Scalar[]).map((v) =>
          func(fillValue, v ?? null),
        );
        resultCols[col] = data as Scalar[];
      } else {
        resultCols[col] = [...(other.col(col).values as readonly Scalar[])] as Scalar[];
      }
    }
  }

  // Determine row index: from shared column combination, or from self/other directly.
  const rowIndex: readonly Label[] =
    resultRowIndex ??
    (selfCols.size > 0
      ? (self.index.values as readonly Label[])
      : (other.index.values as readonly Label[]));

  const nRows = rowIndex.length;
  // Ensure all columns match the row count (pad / truncate if needed)
  const alignedCols: Record<string, readonly Scalar[]> = {};
  for (const col of allCols) {
    const arr = resultCols[col] ?? [];
    if (arr.length === nRows) {
      alignedCols[col] = arr;
    } else {
      // Pad with null to match row count
      const padded: Scalar[] = [...arr];
      while (padded.length < nRows) {
        padded.push(null);
      }
      alignedCols[col] = padded.slice(0, nRows);
    }
  }

  return DataFrame.fromColumns(alignedCols, { index: rowIndex });
}
