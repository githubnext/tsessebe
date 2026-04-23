/**
 * transform_agg — Series.transform / DataFrame.transform
 *
 * Mirrors the following pandas methods:
 * - `Series.transform(func)` — apply a function (or list/dict of functions)
 *   to a Series, returning a result with the **same index**.
 * - `DataFrame.transform(func)` — apply a function (or list/dict) column-wise,
 *   returning a result with the **same shape** (same index and same columns).
 *
 * `transform` differs from `apply` in that the function must return a
 * Series (or scalar broadcast) of the **same length** as the input.  Attempting
 * to reduce (return a scalar when multiple functions are combined) works only
 * when the result is broadcast-able.
 *
 * Supported `func` forms:
 * - A single function `(s: Series) => Series | Scalar`
 * - A string naming a built-in aggregation: `"sum"`, `"mean"`, `"min"`,
 *   `"max"`, `"std"`, `"var"`, `"median"`, `"count"`, `"first"`, `"last"`,
 *   `"prod"`, `"any"`, `"all"`, `"nunique"`, `"cumsum"`, `"cumprod"`,
 *   `"cummin"`, `"cummax"`
 * - An array of functions / strings → returns a DataFrame (column per func)
 * - A Record mapping output-column names to functions/strings
 *   → returns a DataFrame with those column names
 *
 * All functions are **pure** — inputs are never mutated.
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** A built-in aggregation/transform name accepted by `seriesTransform`. */
export type TransformFuncName =
  | "sum"
  | "mean"
  | "min"
  | "max"
  | "std"
  | "var"
  | "median"
  | "count"
  | "first"
  | "last"
  | "prod"
  | "any"
  | "all"
  | "nunique"
  | "cumsum"
  | "cumprod"
  | "cummin"
  | "cummax";

/** A single transform function or built-in name. */
export type TransformFunc = ((s: Series<Scalar>) => Series<Scalar> | Scalar) | TransformFuncName;

/** Options for {@link dataFrameTransform}. */
export interface DataFrameTransformOptions {
  /**
   * Axis along which to apply the transform.
   * - `0` / `"index"` (default): apply per **column**.
   * - `1` / `"columns"`: apply per **row**.
   */
  readonly axis?: 0 | 1 | "index" | "columns";
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar value is missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Coerce a Scalar to a number, returning NaN for missing/non-numeric values. */
function toNum(v: Scalar): number {
  if (isMissing(v)) {
    return Number.NaN;
  }
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "boolean") {
    return v ? 1 : 0;
  }
  const n = Number(v);
  return Number.isNaN(n) ? Number.NaN : n;
}

/**
 * Resolve a built-in transform name to a function that accepts a Series and
 * returns either a same-length Series (for cumulative ops) or a scalar
 * (for aggregation ops, which will be broadcast to the full length).
 */
function resolveBuiltin(name: TransformFuncName): (s: Series<Scalar>) => Series<Scalar> | Scalar {
  switch (name) {
    case "sum":
      return (s) => {
        let total = 0;
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            total += n;
          }
        }
        return total as Scalar;
      };
    case "mean":
      return (s) => {
        let total = 0;
        let cnt = 0;
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            total += n;
            cnt++;
          }
        }
        return (cnt === 0 ? Number.NaN : total / cnt) as Scalar;
      };
    case "min":
      return (s) => {
        let m = Number.POSITIVE_INFINITY;
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n) && n < m) {
            m = n;
          }
        }
        return (m === Number.POSITIVE_INFINITY ? Number.NaN : m) as Scalar;
      };
    case "max":
      return (s) => {
        let m = Number.NEGATIVE_INFINITY;
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n) && n > m) {
            m = n;
          }
        }
        return (m === Number.NEGATIVE_INFINITY ? Number.NaN : m) as Scalar;
      };
    case "std":
      return (s) => {
        const nums: number[] = [];
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            nums.push(n);
          }
        }
        if (nums.length < 2) {
          return Number.NaN as Scalar;
        }
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (nums.length - 1);
        return Math.sqrt(variance) as Scalar;
      };
    case "var":
      return (s) => {
        const nums: number[] = [];
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            nums.push(n);
          }
        }
        if (nums.length < 2) {
          return Number.NaN as Scalar;
        }
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        return (nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (nums.length - 1)) as Scalar;
      };
    case "median":
      return (s) => {
        const nums: number[] = [];
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            nums.push(n);
          }
        }
        if (nums.length === 0) {
          return Number.NaN as Scalar;
        }
        nums.sort((a, b) => a - b);
        const mid = Math.floor(nums.length / 2);
        return (
          nums.length % 2 === 0
            ? ((nums[mid - 1] as number) + (nums[mid] as number)) / 2
            : (nums[mid] as number)
        ) as Scalar;
      };
    case "count":
      return (s) => {
        let cnt = 0;
        for (const v of s.values) {
          if (!isMissing(v as Scalar)) {
            cnt++;
          }
        }
        return cnt as Scalar;
      };
    case "first":
      return (s) => {
        for (const v of s.values) {
          if (!isMissing(v as Scalar)) {
            return v as Scalar;
          }
        }
        return null as Scalar;
      };
    case "last":
      return (s) => {
        let last: Scalar = null;
        for (const v of s.values) {
          if (!isMissing(v as Scalar)) {
            last = v as Scalar;
          }
        }
        return last;
      };
    case "prod":
      return (s) => {
        let prod = 1;
        for (const v of s.values) {
          const n = toNum(v as Scalar);
          if (!Number.isNaN(n)) {
            prod *= n;
          }
        }
        return prod as Scalar;
      };
    case "any":
      return (s) => {
        for (const v of s.values) {
          if (!isMissing(v as Scalar) && Boolean(v)) {
            return true as Scalar;
          }
        }
        return false as Scalar;
      };
    case "all":
      return (s) => {
        for (const v of s.values) {
          if (isMissing(v as Scalar) || !v) {
            return false as Scalar;
          }
        }
        return true as Scalar;
      };
    case "nunique":
      return (s) => {
        const seen = new Set<string>();
        for (const v of s.values) {
          if (!isMissing(v as Scalar)) {
            seen.add(String(v));
          }
        }
        return seen.size as Scalar;
      };
    case "cumsum":
      return (s) => {
        const out: Scalar[] = [];
        let running = 0;
        for (const v of s.values) {
          if (isMissing(v as Scalar)) {
            out.push(v as Scalar);
            continue;
          }
          running += toNum(v as Scalar);
          out.push(running as Scalar);
        }
        return new Series<Scalar>({ data: out, index: s.index, name: s.name });
      };
    case "cumprod":
      return (s) => {
        const out: Scalar[] = [];
        let running = 1;
        for (const v of s.values) {
          if (isMissing(v as Scalar)) {
            out.push(v as Scalar);
            continue;
          }
          running *= toNum(v as Scalar);
          out.push(running as Scalar);
        }
        return new Series<Scalar>({ data: out, index: s.index, name: s.name });
      };
    case "cummin":
      return (s) => {
        const out: Scalar[] = [];
        let running = Number.POSITIVE_INFINITY;
        for (const v of s.values) {
          if (isMissing(v as Scalar)) {
            out.push(v as Scalar);
            continue;
          }
          const n = toNum(v as Scalar);
          if (n < running) {
            running = n;
          }
          out.push(running as Scalar);
        }
        return new Series<Scalar>({ data: out, index: s.index, name: s.name });
      };
    case "cummax":
      return (s) => {
        const out: Scalar[] = [];
        let running = Number.NEGATIVE_INFINITY;
        for (const v of s.values) {
          if (isMissing(v as Scalar)) {
            out.push(v as Scalar);
            continue;
          }
          const n = toNum(v as Scalar);
          if (n > running) {
            running = n;
          }
          out.push(running as Scalar);
        }
        return new Series<Scalar>({ data: out, index: s.index, name: s.name });
      };
  }
}

/**
 * Resolve a `TransformFunc` to a callable.
 */
function resolveFunc(fn: TransformFunc): (s: Series<Scalar>) => Series<Scalar> | Scalar {
  if (typeof fn === "string") {
    return resolveBuiltin(fn);
  }
  return fn;
}

/**
 * Apply a single transform function to a Series, returning a Series of the
 * same length (broadcasts scalars to fill the entire length).
 */
function applyOneSeries(
  s: Series<Scalar>,
  fn: (s: Series<Scalar>) => Series<Scalar> | Scalar,
  name?: string,
): Series<Scalar> {
  const result = fn(s);
  if (result instanceof Series) {
    // Ensure same length
    if (result.values.length !== s.values.length) {
      throw new Error(
        `transform: function returned Series of length ${result.values.length} ` +
          `but input had length ${s.values.length}`,
      );
    }
    // Re-attach original index if not set
    return new Series<Scalar>({
      data: result.values as Scalar[],
      index: s.index,
      name: name ?? result.name ?? s.name,
    });
  }
  // Scalar: broadcast
  const broadcast: Scalar[] = new Array<Scalar>(s.values.length).fill(result as Scalar);
  return new Series<Scalar>({ data: broadcast, index: s.index, name: name ?? s.name });
}

// ─── seriesTransform ──────────────────────────────────────────────────────────

/**
 * Apply one or more functions to a Series, returning a result with the **same
 * index** as the input.
 *
 * Mirrors `pandas.Series.transform(func)`.
 *
 * - **Single function / name** → returns a `Series` with the same index.
 * - **Array of functions / names** → returns a `DataFrame` with one column
 *   per function (column names = function string names or index 0, 1, …).
 * - **Record** mapping output-column names to functions / names → returns a
 *   `DataFrame` with those column names.
 *
 * Aggregating functions (e.g. `"sum"`, `"mean"`) return a scalar that is
 * **broadcast** to fill the entire output length — matching pandas behaviour
 * when calling `Series.transform("sum")`.
 *
 * @example
 * ```ts
 * import { Series, seriesTransform } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3] });
 *
 * // single function
 * seriesTransform(s, (x) => x).values; // [1, 2, 3]
 *
 * // built-in cumulative
 * seriesTransform(s, "cumsum").values; // [1, 3, 6]
 *
 * // broadcast aggregate
 * seriesTransform(s, "sum").values; // [6, 6, 6]
 *
 * // multiple functions → DataFrame
 * const df = seriesTransform(s, ["sum", "mean"]) as DataFrame;
 * df.col("sum").values;  // [6, 6, 6]
 * df.col("mean").values; // [2, 2, 2]
 * ```
 */
export function seriesTransform(
  s: Series<Scalar>,
  func: TransformFunc | readonly TransformFunc[] | Record<string, TransformFunc>,
): Series<Scalar> | DataFrame {
  // Array form → DataFrame with one column per function
  if (Array.isArray(func)) {
    const fns = func as readonly TransformFunc[];
    const colMap = new Map<string, Series<Scalar>>();
    for (let i = 0; i < fns.length; i++) {
      const f = fns[i] as TransformFunc;
      const colName = typeof f === "string" ? f : String(i);
      const fn = resolveFunc(f);
      colMap.set(colName, applyOneSeries(s, fn, colName));
    }
    return new DataFrame(colMap, s.index);
  }

  // Record form → DataFrame with named columns
  if (typeof func === "object" && func !== null && !(func instanceof Function)) {
    const rec = func as Record<string, TransformFunc>;
    const colMap = new Map<string, Series<Scalar>>();
    for (const [colName, f] of Object.entries(rec)) {
      const fn = resolveFunc(f);
      colMap.set(colName, applyOneSeries(s, fn, colName));
    }
    return new DataFrame(colMap, s.index);
  }

  // Single function or name → Series
  const fn = resolveFunc(func as TransformFunc);
  return applyOneSeries(s, fn);
}

// ─── dataFrameTransform ────────────────────────────────────────────────────────

/**
 * Apply one or more functions to each column (or row) of a DataFrame,
 * returning a result with the **same shape** as the input.
 *
 * Mirrors `pandas.DataFrame.transform(func, axis=0)`.
 *
 * - **Single function / name** → returns a `DataFrame` with the same columns
 *   and index (each column is transformed independently).
 * - **Array of functions / names** → returns a `DataFrame` with a
 *   MultiIndex-like column structure (pairs of `(original_col, func_name)`).
 *   In this implementation we flatten to `"col|func"` names.
 * - **Record** mapping column names to a function / name → applies each
 *   function only to the matched column; unmatched columns are passed through
 *   unchanged.
 *
 * With `axis=1` / `"columns"`: each **row** is passed as a Series and the
 * function is applied row-wise.  Only single functions are supported in
 * row-wise mode.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameTransform } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
 *
 * // double every cell
 * const doubled = dataFrameTransform(df, (s) =>
 *   new Series({ data: s.values.map((v) => (v as number) * 2), index: s.index })
 * );
 * doubled.col("a").values; // [2, 4, 6]
 *
 * // cumulative sum per column
 * dataFrameTransform(df, "cumsum").col("b").values; // [4, 9, 15]
 * ```
 */
export function dataFrameTransform(
  df: DataFrame,
  func: TransformFunc | readonly TransformFunc[] | Record<string, TransformFunc>,
  options: DataFrameTransformOptions = {},
): DataFrame {
  const axis = options.axis ?? 0;

  // ── row-wise (axis=1) ──────────────────────────────────────────────────────
  if (axis === 1 || axis === "columns") {
    // Only single func supported row-wise
    const f = resolveFunc(
      typeof func === "string" || typeof func === "function"
        ? (func as TransformFunc)
        : (() => {
            throw new Error("dataFrameTransform: axis=1 supports only a single function");
          })(),
    );
    const nRows = df.index.size;
    const colNames = df.columns.values;
    const colIdx = new Index<Label>(colNames as readonly Label[]);

    // For each row, build a Series of (colValues), apply fn, collect results
    const outCols: Record<string, Scalar[]> = {};
    for (const c of colNames) {
      outCols[c as string] = new Array<Scalar>(nRows);
    }

    for (let ri = 0; ri < nRows; ri++) {
      const rowData: Scalar[] = colNames.map((c) => df.col(c as string).values[ri] as Scalar);
      const rowSeries = new Series<Scalar>({ data: rowData, index: colIdx });
      const transformed = applyOneSeries(rowSeries, f);
      for (let ci = 0; ci < colNames.length; ci++) {
        const cn = colNames[ci] as string;
        (outCols[cn] as Scalar[])[ri] = transformed.values[ci] as Scalar;
      }
    }

    const colMap = new Map<string, Series<Scalar>>();
    for (const c of colNames) {
      colMap.set(
        c as string,
        new Series<Scalar>({
          data: outCols[c as string] as Scalar[],
          index: df.index,
          name: c as string,
        }),
      );
    }
    return new DataFrame(colMap, df.index);
  }

  // ── column-wise (axis=0) ───────────────────────────────────────────────────

  // Array form: produce flattened columns "col|funcname"
  if (Array.isArray(func)) {
    const fns = func as readonly TransformFunc[];
    const colMap = new Map<string, Series<Scalar>>();
    for (const colName of df.columns.values) {
      const col = df.col(colName as string);
      for (let fi = 0; fi < fns.length; fi++) {
        const f = fns[fi] as TransformFunc;
        const suffix = typeof f === "string" ? f : String(fi);
        const outName = `${colName}|${suffix}`;
        const fn = resolveFunc(f);
        colMap.set(outName, applyOneSeries(col, fn, outName));
      }
    }
    return new DataFrame(colMap, df.index);
  }

  // Record form: apply per-column functions; pass through unmatched columns
  if (typeof func === "object" && func !== null && !(func instanceof Function)) {
    const rec = func as Record<string, TransformFunc>;
    const colMap = new Map<string, Series<Scalar>>();
    for (const colName of df.columns.values) {
      const col = df.col(colName as string);
      const f = rec[colName as string];
      if (f !== undefined) {
        const fn = resolveFunc(f);
        colMap.set(colName as string, applyOneSeries(col, fn, colName as string));
      } else {
        colMap.set(colName as string, col);
      }
    }
    return new DataFrame(colMap, df.index);
  }

  // Single function: apply to each column
  const fn = resolveFunc(func as TransformFunc);
  const colMap = new Map<string, Series<Scalar>>();
  for (const colName of df.columns.values) {
    const col = df.col(colName as string);
    colMap.set(colName as string, applyOneSeries(col, fn, colName as string));
  }
  return new DataFrame(colMap, df.index);
}
