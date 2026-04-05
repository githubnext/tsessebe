/**
 * Assign and filter operations for DataFrame.
 *
 * Mirrors:
 *   - `pandas.DataFrame.assign` — add/replace columns using callables or values
 *   - `pandas.DataFrame.filter` — filter rows/columns by label or regex
 */

import type { Label, Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── assign ───────────────────────────────────────────────────────────────────

/** Column spec: either an array of values, a Series, or a function. */
export type AssignSpec =
  | readonly Scalar[]
  | Series<Scalar>
  | ((df: DataFrame) => readonly Scalar[] | Series<Scalar>);

/** Map of column name to column spec. */
export type AssignSpecs = Record<string, AssignSpec>;

/** Resolve an AssignSpec to a values array. */
function resolveSpec(spec: AssignSpec, df: DataFrame): readonly Scalar[] {
  if (typeof spec === "function") {
    const result = spec(df);
    if (result instanceof Series) {
      return result.values as readonly Scalar[];
    }
    return result;
  }
  if (spec instanceof Series) {
    return spec.values as readonly Scalar[];
  }
  return spec;
}

/**
 * Add or replace columns in a DataFrame.
 * Callable column specs receive the **current** DataFrame (with previously
 * assigned columns) and return an array or Series.
 *
 * @example
 * ```ts
 * assignDataFrame(df, {
 *   doubled: (d) => d.col("x").values.map((v) => (v as number) * 2),
 *   constant: [1, 1, 1],
 * });
 * ```
 */
export function assignDataFrame(df: DataFrame, specs: AssignSpecs): DataFrame {
  // Collect original data
  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    data[col] = (df.col(col) as Series<Scalar>).values as Scalar[];
  }

  // Apply specs in insertion order; each sees the updated df so far
  let current = df;
  for (const [colName, spec] of Object.entries(specs)) {
    const vals = resolveSpec(spec, current);
    data[colName] = [...vals];
    // Rebuild DataFrame with the new column for subsequent callables
    current = DataFrame.fromColumns({ ...data }, { index: df.index });
  }

  return DataFrame.fromColumns(data, { index: df.index });
}

// ─── filter ───────────────────────────────────────────────────────────────────

/** Options for {@link filterDataFrame}. */
export interface FilterOptions {
  /** Filter items (exact column/row labels). */
  items?: readonly Label[];
  /** Filter by regex pattern (matched against column/row labels as strings). */
  regex?: string | RegExp;
  /** Axis to filter on: `0` = row-index, `1` = columns. Default `1`. */
  axis?: 0 | 1;
}

/**
 * Filter rows or columns by label or regex.
 *
 * @example
 * ```ts
 * filterDataFrame(df, { items: ["a", "b"] }); // keep columns a and b
 * filterDataFrame(df, { regex: /^x/, axis: 1 }); // keep columns starting with x
 * ```
 */
export function filterDataFrame(df: DataFrame, opts: FilterOptions): DataFrame {
  const axis = opts.axis ?? 1;
  const re =
    opts.regex !== undefined
      ? opts.regex instanceof RegExp
        ? opts.regex
        : new RegExp(opts.regex)
      : null;

  if (axis === 1) {
    return filterColumns(df, opts.items, re);
  }
  return filterRows(df, opts.items, re);
}

/** Filter columns by items or regex. */
function filterColumns(
  df: DataFrame,
  items: readonly Label[] | undefined,
  re: RegExp | null,
): DataFrame {
  const keep = df.columns.toArray().filter((col) => {
    if (items !== undefined) {
      return items.includes(col as Label);
    }
    if (re !== null) {
      return re.test(String(col));
    }
    return true;
  });

  const data: Record<string, Scalar[]> = {};
  for (const col of keep) {
    data[col] = (df.col(col) as Series<Scalar>).values as Scalar[];
  }
  return DataFrame.fromColumns(data, { index: df.index });
}

/** Filter rows by items or regex (matches against index labels). */
function filterRows(
  df: DataFrame,
  items: readonly Label[] | undefined,
  re: RegExp | null,
): DataFrame {
  const idxArr = df.index.toArray();
  const keepIdx: number[] = [];
  for (let i = 0; i < idxArr.length; i++) {
    const lbl = idxArr[i];
    if (items !== undefined) {
      if (items.includes(lbl as Label)) {
        keepIdx.push(i);
      }
    } else if (re !== null) {
      if (re.test(String(lbl))) {
        keepIdx.push(i);
      }
    } else {
      keepIdx.push(i);
    }
  }

  const data: Record<string, Scalar[]> = {};
  for (const col of df.columns) {
    const vals = (df.col(col) as Series<Scalar>).values;
    data[col] = keepIdx.map((i) => vals[i] ?? null);
  }
  const newIdx = df.index.take(keepIdx);
  return DataFrame.fromColumns(data, { index: newIdx });
}
