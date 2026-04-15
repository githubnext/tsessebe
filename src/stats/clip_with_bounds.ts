/**
 * clip_with_bounds — element-wise clip with per-element or per-column/row bounds.
 *
 * Extends the scalar-only {@link clip} / {@link dataFrameClip} from `elem_ops`
 * to support Series- and array-based bounds.  Mirrors:
 *
 * - `pandas.Series.clip(lower, upper)` where lower/upper may be a Series
 * - `pandas.DataFrame.clip(lower, upper, axis=0)` where lower/upper may be
 *   a Series (applied along the specified axis) or a DataFrame (element-wise)
 *
 * All functions are **pure** — inputs are never mutated.
 * Missing values (null / NaN) propagate unchanged through every operation.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** A scalar numeric bound, a positional array, or a Series aligned by label. */
export type BoundArg =
  | number
  | null
  | undefined
  | readonly (number | null)[]
  | Series<Scalar>
  | DataFrame;

/** Options for {@link clipSeriesWithBounds}. */
export interface SeriesClipBoundsOptions {
  /**
   * Lower bound.  Values below this are replaced with the bound value.
   * May be a scalar, a positional array, or a Series aligned by label.
   * `null` / `undefined` = no lower bound.
   */
  readonly lower?: BoundArg;
  /**
   * Upper bound.  Values above this are replaced with the bound value.
   * May be a scalar, a positional array, or a Series aligned by label.
   * `null` / `undefined` = no upper bound.
   */
  readonly upper?: BoundArg;
}

/** Options for {@link clipDataFrameWithBounds}. */
export interface DataFrameClipBoundsOptions extends SeriesClipBoundsOptions {
  /**
   * Axis along which a Series bound is broadcast:
   * - `0` / `"index"` (default): Series is indexed on **row labels** — each row
   *   in the DataFrame is clipped to the bound at the matching row label.
   * - `1` / `"columns"`: Series is indexed on **column names** — each column
   *   in the DataFrame is clipped to the corresponding scalar bound.
   *
   * When `lower` / `upper` is a `DataFrame`, `axis` is ignored and clipping is
   * done element-wise (position-wise, column by column).
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `v` is a finite number (not null / undefined / NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Resolve a `BoundArg` to a parallel numeric array of length `n`.
 * - Scalar → every position gets that value (or `null` for no bound).
 * - `readonly array` → used positionally; must have length `n`.
 * - `Series` → aligned by label against `refIndex`; positions without a
 *   matching label receive `null` (no bound at that position).
 */
function resolveBound(
  bound: BoundArg,
  n: number,
  refIndex: { at(i: number): Label; size: number },
): (number | null)[] {
  if (bound === null || bound === undefined) {
    return new Array<null>(n).fill(null);
  }
  if (typeof bound === "number") {
    return new Array<number>(n).fill(bound);
  }
  if (Array.isArray(bound)) {
    const arr = bound as readonly (number | null)[];
    if (arr.length !== n) {
      throw new RangeError(`Bound array length ${arr.length} does not match Series length ${n}`);
    }
    return arr.map((v) => (typeof v === "number" && !Number.isNaN(v) ? v : null));
  }

  // Series — align by label
  const s = bound as Series<Scalar>;
  const labelMap = new Map<string, number>();
  for (let j = 0; j < s.index.size; j++) {
    labelMap.set(String(s.index.at(j)), j);
  }
  const result: (number | null)[] = new Array<null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const label = String(refIndex.at(i));
    const j = labelMap.get(label);
    if (j !== undefined) {
      const v = s.values[j] as Scalar;
      result[i] = isFiniteNum(v) ? v : null;
    }
  }
  return result;
}

/** Clip a single value against a lo/hi pair (null = no bound). */
function clipValue(v: Scalar, lo: number | null, hi: number | null): Scalar {
  if (!isFiniteNum(v)) {
    return v;
  }
  let out: number = v;
  if (lo !== null && out < lo) {
    out = lo;
  }
  if (hi !== null && out > hi) {
    out = hi;
  }
  return out;
}

// ─── Series clip with bounds ──────────────────────────────────────────────────

/**
 * Clip a Series with per-element lower / upper bounds.
 *
 * Bounds may be a scalar, a positional `(number|null)[]`, or a `Series<Scalar>`
 * that is aligned against the input Series by **index label** (not position).
 * Labels present in the bound Series but not in the input are ignored; labels
 * in the input with no matching bound label are left unclipped on that side.
 *
 * Non-numeric values (null, NaN, strings, …) are passed through unchanged.
 * Mirrors `pandas.Series.clip(lower, upper)` with Series bounds.
 *
 * @example
 * ```ts
 * import { Series, clipSeriesWithBounds } from "tsb";
 *
 * const s = new Series({ data: [1, 5, 10, 15], name: "x" });
 * const lo = new Series({ data: [2, 2, 2, 2] });
 * const hi = new Series({ data: [6, 6, 6, 6] });
 * clipSeriesWithBounds(s, { lower: lo, upper: hi }).values;
 * // [2, 5, 6, 6]
 * ```
 */
export function clipSeriesWithBounds(
  series: Series<Scalar>,
  options: SeriesClipBoundsOptions = {},
): Series<Scalar> {
  const n = series.values.length;
  const loBounds = resolveBound(options.lower, n, series.index);
  const hiBounds = resolveBound(options.upper, n, series.index);

  const data: Scalar[] = new Array<Scalar>(n);
  for (let i = 0; i < n; i++) {
    data[i] = clipValue(
      series.values[i] as Scalar,
      loBounds[i] as number | null,
      hiBounds[i] as number | null,
    );
  }

  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

// ─── DataFrame clip with bounds ───────────────────────────────────────────────

/**
 * Clip every numeric cell of a DataFrame with flexible lower / upper bounds.
 *
 * ### Bound types
 *
 * | `lower` / `upper` | `axis` | Behaviour |
 * |---|---|---|
 * | scalar (`number \| null`) | any | Same scalar bound applied to every cell |
 * | `Series` | `0` / `"index"` (default) | Series indexed on **row labels** — each row uses its matching scalar bound |
 * | `Series` | `1` / `"columns"` | Series indexed on **column names** — each column uses its matching scalar bound |
 * | `DataFrame` | ignored | Element-wise clipping — each cell uses its matching cell in the bound DataFrame |
 * | positional `number[]` | `0` / `"index"` | Positional per-row bounds |
 * | positional `number[]` | `1` / `"columns"` | Positional per-column bounds |
 *
 * Missing values (null / NaN) in the data propagate unchanged.
 *
 * Mirrors `pandas.DataFrame.clip(lower, upper, axis=0)` with Series/DataFrame bounds.
 *
 * @example
 * ```ts
 * import { DataFrame, Series, clipDataFrameWithBounds } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 5, 10], b: [2, 6, 12] });
 *
 * // Per-column bounds (axis=1)
 * const lo = new Series({ data: [0, 3], index: new Index(["a", "b"]) });
 * const hi = new Series({ data: [8, 9], index: new Index(["a", "b"]) });
 * clipDataFrameWithBounds(df, { lower: lo, upper: hi, axis: 1 });
 * // col "a": [1, 5, 8]   col "b": [3, 6, 9]
 *
 * // Element-wise bounds with a DataFrame
 * const loDF = DataFrame.fromColumns({ a: [0, 0, 0], b: [3, 3, 3] });
 * clipDataFrameWithBounds(df, { lower: loDF });
 * // col "a": [1, 5, 10]  col "b": [3, 6, 12]
 * ```
 */
export function clipDataFrameWithBounds(
  df: DataFrame,
  options: DataFrameClipBoundsOptions = {},
): DataFrame {
  const { lower, upper, axis = 0 } = options;
  const nRows = df.index.size;
  const colNames = df.columns.values;
  const nCols = colNames.length;

  // Element-wise DataFrame bounds
  if (lower instanceof DataFrame || upper instanceof DataFrame) {
    return _clipDFElementWise(df, lower, upper);
  }

  const axisIsColumns = axis === 1 || axis === "columns";

  if (axisIsColumns) {
    // axis=1: each column gets its own scalar bound resolved from the Series/array
    const resolveColumnBounds = (bound: BoundArg | undefined): (number | null)[] => {
      const aligned = resolveBound(bound, nCols, df.columns);
      if (bound instanceof Series && aligned.every((v) => v === null) && bound.size === nCols) {
        return bound.values.map((v) => (isFiniteNum(v) ? v : null));
      }
      return aligned;
    };
    const loBounds = resolveColumnBounds(lower);
    const hiBounds = resolveColumnBounds(upper);

    const colMap = new Map<string, Series<Scalar>>();
    for (let ci = 0; ci < nCols; ci++) {
      const name = colNames[ci] as string;
      const col = df.col(name);
      const lo = loBounds[ci] as number | null;
      const hi = hiBounds[ci] as number | null;
      const data: Scalar[] = col.values.map((v) => clipValue(v as Scalar, lo, hi));
      colMap.set(name, new Series<Scalar>({ data, index: df.index, name }));
    }
    return new DataFrame(colMap, df.index);
  }

  // axis=0 (default): each row gets its own scalar bound resolved from the Series/array
  const loBounds = resolveBound(lower, nRows, df.index);
  const hiBounds = resolveBound(upper, nRows, df.index);

  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name as string);
    const data: Scalar[] = col.values.map((v, ri) =>
      clipValue(v as Scalar, loBounds[ri] as number | null, hiBounds[ri] as number | null),
    );
    colMap.set(name as string, new Series<Scalar>({ data, index: df.index, name: name as string }));
  }
  return new DataFrame(colMap, df.index);
}

/**
 * Element-wise clip against optional lower/upper DataFrames.
 * Each cell [row, col] is clipped to [lo[row,col], hi[row,col]] when present.
 */
function _clipDFElementWise(
  df: DataFrame,
  lower: BoundArg | DataFrame,
  upper: BoundArg | DataFrame,
): DataFrame {
  const colNames = df.columns.values;
  const colMap = new Map<string, Series<Scalar>>();

  for (const name of colNames) {
    const colName = name as string;
    const col = df.col(colName);

    const loCol: Series<Scalar> | null =
      lower instanceof DataFrame && lower.columns.values.includes(name) ? lower.col(colName) : null;
    const hiCol: Series<Scalar> | null =
      upper instanceof DataFrame && upper.columns.values.includes(name) ? upper.col(colName) : null;

    // Scalar fallback when bound is not a DataFrame
    const loScalar: number | null =
      lower instanceof DataFrame
        ? null
        : typeof lower === "number" && isFiniteNum(lower)
          ? lower
          : null;
    const hiScalar: number | null =
      upper instanceof DataFrame
        ? null
        : typeof upper === "number" && isFiniteNum(upper)
          ? upper
          : null;

    const data: Scalar[] = col.values.map((v, ri) => {
      const lo =
        loCol !== null
          ? (() => {
              const bv = loCol.values[ri] as Scalar;
              return isFiniteNum(bv) ? bv : null;
            })()
          : loScalar;
      const hi =
        hiCol !== null
          ? (() => {
              const bv = hiCol.values[ri] as Scalar;
              return isFiniteNum(bv) ? bv : null;
            })()
          : hiScalar;
      return clipValue(v as Scalar, lo, hi);
    });

    colMap.set(colName, new Series<Scalar>({ data, index: df.index, name: colName }));
  }

  return new DataFrame(colMap, df.index);
}
