/**
 * combine_first — update a Series/DataFrame with non-null values from another.
 *
 * Mirrors `pandas.Series.combine_first()` / `DataFrame.combine_first()`:
 *
 * - {@link combineFirstSeries} — fill missing values in `self` from `other`, taking the union of indices.
 * - {@link combineFirstDataFrame} — fill missing cells in `self` from `other`, taking the union of row and column indices.
 *
 * ### Semantics
 *
 * The result has the **union** of the two index sets.  For each label present
 * in the result index, the value is:
 *
 * 1. The value from `self` if it is not missing (not `null`, `undefined`, or `NaN`).
 * 2. Otherwise, the value from `other` if it has one.
 * 3. Otherwise `null`.
 *
 * `self` values always take priority; `other` only fills gaps.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a missing value (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build a lookup map from label → array of positional indices for a given Index.
 * Supports duplicate labels by storing all positions.
 */
function buildLabelMap(idx: Index<Label>): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < idx.size; i++) {
    const key = String(idx.at(i));
    const arr = map.get(key);
    if (arr !== undefined) {
      arr.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * Result of combining two Series via {@link combineFirstSeries}.
 *
 * The result has `dtype = "object"` because the union can contain values from
 * either Series regardless of their original dtype.
 */

/**
 * Update calling Series with non-null values from `other`.
 *
 * The result index is the union of `self.index` and `other.index`.  For each
 * label, `self`'s value is used unless it is missing, in which case `other`'s
 * value fills the gap.
 *
 * @example
 * ```ts
 * const a = new Series({ data: [1, null, 3], index: ["x", "y", "z"] });
 * const b = new Series({ data: [10, 20, 40], index: ["x", "y", "w"] });
 * combineFirstSeries(a, b);
 * // Series { x:1, y:20, z:3, w:40 }
 * ```
 */
export function combineFirstSeries(
  self: Series<Scalar>,
  other: Series<Scalar>,
): Series<Scalar> {
  const selfIdx = self.index as Index<Label>;
  const otherIdx = other.index as Index<Label>;
  const unionIdx = selfIdx.union(otherIdx);

  const selfMap = buildLabelMap(selfIdx);
  const otherMap = buildLabelMap(otherIdx);

  const data: Scalar[] = [];

  for (let i = 0; i < unionIdx.size; i++) {
    const key = String(unionIdx.at(i));

    const selfPositions = selfMap.get(key);
    const selfVal = selfPositions !== undefined ? (self.values[selfPositions[0] ?? 0] as Scalar) : undefined;

    if (!isMissing(selfVal)) {
      data.push(selfVal as Scalar);
    } else {
      const otherPositions = otherMap.get(key);
      if (otherPositions !== undefined) {
        data.push(other.values[otherPositions[0] ?? 0] as Scalar);
      } else {
        data.push(null);
      }
    }
  }

  return new Series<Scalar>({
    data,
    index: unionIdx,
    name: self.name,
  });
}

// ─── DataFrame ────────────────────────────────────────────────────────────────

/**
 * Update calling DataFrame with non-null values from `other`.
 *
 * The result has the **union** of both row indices and both column sets.
 * For each (row, column) cell, `self`'s value is used unless it is missing,
 * in which case `other`'s value fills the gap.
 *
 * @example
 * ```ts
 * const a = DataFrame.fromColumns({ x: [1, null], y: [3, 4] }, { index: ["r0", "r1"] });
 * const b = DataFrame.fromColumns({ x: [10, 20], z: [30, 40] }, { index: ["r0", "r2"] });
 * combineFirstDataFrame(a, b);
 * // DataFrame with rows r0,r1,r2 and cols x,y,z
 * ```
 */
export function combineFirstDataFrame(self: DataFrame, other: DataFrame): DataFrame {
  const selfRowIdx = self.index as Index<Label>;
  const otherRowIdx = other.index as Index<Label>;
  const unionRowIdx = selfRowIdx.union(otherRowIdx);

  // Column union: self columns first, then other-only columns
  const selfCols = new Set<string>(self.columns.values as string[]);
  const unionCols: string[] = [...(self.columns.values as string[])];
  for (const c of other.columns.values as string[]) {
    if (!selfCols.has(c)) {
      unionCols.push(c);
    }
  }

  const selfRowMap = buildLabelMap(selfRowIdx);
  const otherRowMap = buildLabelMap(otherRowIdx);

  const resultColMap = new Map<string, Series<Scalar>>();

  for (const colName of unionCols) {
    const selfHasCol = self.has(colName);
    const otherHasCol = other.has(colName);

    const data: Scalar[] = [];

    for (let i = 0; i < unionRowIdx.size; i++) {
      const rowKey = String(unionRowIdx.at(i));

      let resolved: Scalar = null;

      if (selfHasCol) {
        const selfRowPos = selfRowMap.get(rowKey);
        if (selfRowPos !== undefined) {
          const pos = selfRowPos[0] ?? 0;
          const v = self.col(colName).values[pos] as Scalar;
          if (!isMissing(v)) {
            resolved = v;
          }
        }
      }

      if (isMissing(resolved) && otherHasCol) {
        const otherRowPos = otherRowMap.get(rowKey);
        if (otherRowPos !== undefined) {
          const pos = otherRowPos[0] ?? 0;
          resolved = other.col(colName).values[pos] as Scalar;
        }
      }

      data.push(resolved);
    }

    resultColMap.set(
      colName,
      new Series<Scalar>({ data, index: unionRowIdx }),
    );
  }

  return new DataFrame(resultColMap, unionRowIdx);
}
