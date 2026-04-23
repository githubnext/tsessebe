/**
 * update — in-place update of a Series or DataFrame using non-NA values
 * from another object.
 *
 * Mirrors `pandas.DataFrame.update` and `pandas.Series.update`.
 *
 * - {@link seriesUpdate}    — update a Series from another Series
 * - {@link dataFrameUpdate} — update a DataFrame from another DataFrame
 *
 * @example
 * ```ts
 * import { Series, seriesUpdate } from "tsb";
 *
 * const s = new Series({ data: [1, null, 3], index: [0, 1, 2] });
 * const other = new Series({ data: [null, 20, 30], index: [0, 1, 2] });
 * seriesUpdate(s, other).values; // [1, 20, 30]
 * ```
 *
 * @module
 */

import { DataFrame, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link dataFrameUpdate}. */
export interface UpdateOptions {
  /**
   * When `true` (default), matching values from `other` overwrite existing
   * non-NA values in `self`.  When `false`, only positions that are NA in
   * `self` are updated.
   */
  readonly overwrite?: boolean;

  /**
   * - `"ignore"` (default): silently skip overlapping non-NA values when
   *   `overwrite` is `false`.
   * - `"raise"`: throw a `RangeError` when `other` has a non-NA value at a
   *   position where `self` also has a non-NA value and `overwrite` is `false`.
   */
  readonly errors?: "ignore" | "raise";
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Return `true` when `v` is a missing value (null, undefined, NaN). */
function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) {
    return true;
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return true;
  }
  return false;
}

// ─── seriesUpdate ─────────────────────────────────────────────────────────────

/**
 * Return a new Series whose values are updated from `other` using label
 * alignment.
 *
 * For each label in `self`:
 * - If `other` has a non-NA value at that label, use it (unless
 *   `overwrite=false` and `self` is already non-NA — in which case `errors`
 *   controls whether to raise or ignore).
 * - Otherwise keep the existing value from `self`.
 *
 * Labels present in `other` but not in `self` are ignored.
 *
 * @param self    - Source Series.
 * @param other   - Series to update from.
 * @param options - See {@link UpdateOptions}.
 * @returns New Series with updated values.
 *
 * @example
 * ```ts
 * import { Series, seriesUpdate } from "tsb";
 *
 * const s = new Series({ data: [1, null, 3], index: ["a", "b", "c"] });
 * const o = new Series({ data: [10, 20, null], index: ["a", "b", "c"] });
 * seriesUpdate(s, o).values; // [10, 20, 3]
 * ```
 */
export function seriesUpdate(
  self: Series<Scalar>,
  other: Series<Scalar>,
  options: UpdateOptions = {},
): Series<Scalar> {
  const overwrite = options.overwrite ?? true;
  const errors = options.errors ?? "ignore";

  // Build a label → value map from other
  const otherMap = new Map<Label, Scalar>();
  for (let i = 0; i < other.size; i++) {
    otherMap.set(other.index.at(i), other.values[i] as Scalar);
  }

  const newData: Scalar[] = [];
  for (let i = 0; i < self.size; i++) {
    const label = self.index.at(i);
    const selfVal = self.values[i] as Scalar;

    if (otherMap.has(label)) {
      const otherVal = otherMap.get(label) as Scalar;
      if (isMissing(otherVal)) {
        newData.push(selfVal);
      } else if (overwrite || isMissing(selfVal)) {
        newData.push(otherVal);
      } else {
        if (errors === "raise") {
          throw new RangeError(
            `update: non-NA value overlap at label "${String(label)}" and overwrite=false`,
          );
        }
        newData.push(selfVal);
      }
    } else {
      newData.push(selfVal);
    }
  }

  return new Series<Scalar>({
    data: newData,
    index: self.index,
    dtype: self.dtype,
    name: self.name,
  });
}

// ─── dataFrameUpdate ──────────────────────────────────────────────────────────

/**
 * Return a new DataFrame whose values are updated from `other` using label
 * alignment on both row index and column names.
 *
 * For each column present in both `self` and `other`, non-NA values in `other`
 * overwrite the corresponding cells in `self` (subject to `overwrite` and
 * `errors` options).  Columns in `other` that are absent from `self` are
 * ignored.
 *
 * @param self    - Source DataFrame.
 * @param other   - DataFrame to update from.
 * @param options - See {@link UpdateOptions}.
 * @returns New DataFrame with updated values.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameUpdate } from "tsb";
 *
 * const df = DataFrame.fromColumns(
 *   { a: [1, null, 3], b: [10, 20, 30] },
 *   { index: [0, 1, 2] },
 * );
 * const other = DataFrame.fromColumns(
 *   { a: [null, 99, null], b: [null, null, 300] },
 *   { index: [0, 1, 2] },
 * );
 * const result = dataFrameUpdate(df, other);
 * // a: [1, 99, 3], b: [10, 20, 300]
 * ```
 */
export function dataFrameUpdate(
  self: DataFrame,
  other: DataFrame,
  options: UpdateOptions = {},
): DataFrame {
  const colNames = self.columns.values as readonly string[];
  const otherColNames = new Set(other.columns.values as readonly string[]);

  const cols = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    if (otherColNames.has(name)) {
      const selfCol = self.col(name);
      const otherCol = other.col(name);
      const updated = seriesUpdate(selfCol, otherCol, options);
      cols.set(name, updated);
    } else {
      const col = self.col(name);
      cols.set(
        name,
        new Series<Scalar>({ data: col.values as Scalar[], index: self.index, dtype: col.dtype }),
      );
    }
  }

  return new DataFrame(cols, self.index);
}
