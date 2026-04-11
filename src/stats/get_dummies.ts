/**
 * get_dummies — one-hot encoding of categorical variables.
 *
 * Mirrors `pandas.get_dummies` and `pandas.from_dummies`:
 *   - `getDummies(series)` → DataFrame of 0/1 indicator columns
 *   - `getDummies(dataframe)` → DataFrame with categorical columns expanded
 *   - `fromDummies(df)` → Series of category labels (reverse operation)
 *
 * @example
 * ```ts
 * import { getDummies, Series } from "tsb";
 * const s = new Series({ data: ["a", "b", "a", "c"], name: "color" });
 * const dummies = getDummies(s);
 * // DataFrame { color_a: [1,0,1,0], color_b: [0,1,0,0], color_c: [0,0,0,1] }
 * ```
 */

import { Dtype } from "../core/index.ts";
import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── option types ─────────────────────────────────────────────────────────────

/** Options for {@link getDummies}. */
export interface GetDummiesOptions {
  /**
   * String to append before each dummy column name.
   * - For Series input: a single string (default: the series name or "").
   * - For DataFrame input: a single string applied to all encoded columns,
   *   an array aligned with `columns`, or a record mapping column→prefix.
   */
  readonly prefix?: string | readonly string[] | Readonly<Record<string, string>> | null;
  /** Separator between prefix and value label (default `"_"`). */
  readonly prefixSep?: string;
  /** If `true`, include an extra `<prefix>_nan` column for missing values (default `false`). */
  readonly dummyNa?: boolean;
  /**
   * For DataFrame input: which columns to one-hot encode.
   * Defaults to all object/string/category/boolean columns.
   */
  readonly columns?: readonly string[];
  /**
   * Drop the first level dummy for each variable to avoid multicollinearity
   * (default `false`).
   */
  readonly dropFirst?: boolean;
  /** Dtype of the indicator columns (default `Dtype.uint8`). */
  readonly dtype?: Dtype;
}

/** Options for {@link fromDummies}. */
export interface FromDummiesOptions {
  /** Separator used when splitting column names to recover the original column name (default `"_"`). */
  readonly sep?: string;
  /**
   * If `true`, rows where all dummies are 0 are mapped to `null` (missing) instead
   * of raising an error (default `false`).
   */
  readonly defaultCategory?: Scalar;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a scalar to a string label safe to embed in a column name. */
function labelStr(v: Scalar): string {
  if (v === null || v === undefined) {
    return "nan";
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  return String(v);
}

/** Determine whether a dtype should be considered categorical for auto-detection. */
function isCategoricalDtype(dtype: Dtype): boolean {
  return (
    dtype.name === "string" ||
    dtype.name === "object" ||
    dtype.name === "category" ||
    dtype.name === "bool"
  );
}

/** Build the prefix string for a given column name given the prefix option. */
function resolvePrefix(
  colName: string,
  prefixOpt: GetDummiesOptions["prefix"],
  colIndex: number,
): string {
  if (prefixOpt === null || prefixOpt === undefined) {
    return colName;
  }
  if (typeof prefixOpt === "string") {
    return prefixOpt;
  }
  if (Array.isArray(prefixOpt)) {
    return (prefixOpt as readonly string[])[colIndex] ?? colName;
  }
  const map = prefixOpt as Readonly<Record<string, string>>;
  return map[colName] ?? colName;
}

/** Encode a single array of values into dummy columns.
 *  Returns a map of `columnName → indicator array`. */
function collectLevels(values: readonly Scalar[]): string[] {
  const levelSet = new Set<string>();
  for (const v of values) {
    const isNa = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
    if (!isNa) {
      levelSet.add(labelStr(v));
    }
  }
  return [...levelSet].sort((a, b) => a.localeCompare(b));
}

/** Build a single indicator column array. */
function buildIndicatorCol(
  values: readonly Scalar[],
  level: string,
  zeroVal: Scalar,
  oneVal: Scalar,
): Scalar[] {
  const arr: Scalar[] = new Array<Scalar>(values.length).fill(zeroVal);
  for (let i = 0; i < values.length; i++) {
    if (labelStr(values[i] as Scalar) === level) {
      arr[i] = oneVal;
    }
  }
  return arr;
}

/** Build the NaN indicator column array. */
function buildNaCol(values: readonly Scalar[], zeroVal: Scalar, oneVal: Scalar): Scalar[] {
  const arr: Scalar[] = new Array<Scalar>(values.length).fill(zeroVal);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const isNa = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
    if (isNa) {
      arr[i] = oneVal;
    }
  }
  return arr;
}

function encodeSingleColumn(
  values: readonly Scalar[],
  colPrefix: string,
  sep: string,
  dummyNa: boolean,
  dropFirst: boolean,
  dtype: Dtype,
): Map<string, readonly Scalar[]> {
  let levels = collectLevels(values);
  if (dropFirst && levels.length > 0) {
    levels = levels.slice(1);
  }

  const zeroVal: Scalar = dtype.name === "bool" ? false : 0;
  const oneVal: Scalar = dtype.name === "bool" ? true : 1;
  const result = new Map<string, readonly Scalar[]>();

  for (const level of levels) {
    result.set(`${colPrefix}${sep}${level}`, buildIndicatorCol(values, level, zeroVal, oneVal));
  }

  if (dummyNa) {
    result.set(`${colPrefix}${sep}nan`, buildNaCol(values, zeroVal, oneVal));
  }

  return result;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * One-hot encode a Series into a DataFrame of binary indicator columns.
 *
 * Each unique value in the series becomes a column. Column names are
 * `{prefix}{prefixSep}{value}`, defaulting to `{seriesName}_{value}`.
 *
 * @example
 * ```ts
 * import { getDummiesSeries, Series } from "tsb";
 * const s = new Series({ data: ["cat", "dog", "cat"], name: "animal" });
 * getDummiesSeries(s);
 * // DataFrame { animal_cat: [1,0,1], animal_dog: [0,1,0] }
 * ```
 */
export function getDummiesSeries(series: Series<Scalar>, options?: GetDummiesOptions): DataFrame {
  const sep = options?.prefixSep ?? "_";
  const dummyNa = options?.dummyNa ?? false;
  const dropFirst = options?.dropFirst ?? false;
  const dtype = options?.dtype ?? Dtype.uint8;

  const defaultPrefix = series.name !== null ? series.name : "";
  let prefix = defaultPrefix;
  if (
    options?.prefix !== undefined &&
    options.prefix !== null &&
    typeof options.prefix === "string"
  ) {
    prefix = options.prefix;
  }

  const encoded = encodeSingleColumn(series.values, prefix, sep, dummyNa, dropFirst, dtype);

  const colData: Record<string, readonly Scalar[]> = {};
  for (const [k, v] of encoded) {
    colData[k] = v;
  }

  return DataFrame.fromColumns(colData, { index: series.index.values });
}

/**
 * One-hot encode categorical columns in a DataFrame.
 *
 * Non-categorical columns are kept as-is; each encoded column is replaced by
 * its set of dummy columns, inserted at the same position.
 *
 * @example
 * ```ts
 * import { getDummiesDataFrame, DataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ x: [1, 2], color: ["red", "blue"] });
 * getDummiesDataFrame(df);
 * // DataFrame { x: [1,2], color_blue: [0,1], color_red: [1,0] }
 * ```
 */
export function getDummiesDataFrame(df: DataFrame, options?: GetDummiesOptions): DataFrame {
  const sep = options?.prefixSep ?? "_";
  const dummyNa = options?.dummyNa ?? false;
  const dropFirst = options?.dropFirst ?? false;
  const dtype = options?.dtype ?? Dtype.uint8;

  // Determine which columns to encode.
  const allCols = [...df.columns.values];
  let encodeSet: Set<string>;
  if (options?.columns !== undefined) {
    encodeSet = new Set(options.columns);
  } else {
    encodeSet = new Set(allCols.filter((c) => isCategoricalDtype(df.col(c).dtype)));
  }

  let encodeIndex = 0;
  const colData: Record<string, readonly Scalar[]> = {};

  for (const colName of allCols) {
    if (encodeSet.has(colName)) {
      const colPrefix = resolvePrefix(colName, options?.prefix, encodeIndex);
      const encoded = encodeSingleColumn(
        df.col(colName).values,
        colPrefix,
        sep,
        dummyNa,
        dropFirst,
        dtype,
      );
      for (const [k, v] of encoded) {
        colData[k] = v;
      }
      encodeIndex++;
    } else {
      colData[colName] = df.col(colName).values;
    }
  }

  return DataFrame.fromColumns(colData, { index: df.index.values });
}

/**
 * One-hot encode a Series or DataFrame.
 *
 * - If `data` is a `Series`, delegates to {@link getDummiesSeries}.
 * - If `data` is a `DataFrame`, delegates to {@link getDummiesDataFrame}.
 *
 * @example
 * ```ts
 * import { getDummies, Series } from "tsb";
 * getDummies(new Series({ data: ["a","b","a"], name: "x" }));
 * // DataFrame { x_a: [1,0,1], x_b: [0,1,0] }
 * ```
 */
export function getDummies(
  data: Series<Scalar> | DataFrame,
  options?: GetDummiesOptions,
): DataFrame {
  if (data instanceof Series) {
    return getDummiesSeries(data, options);
  }
  return getDummiesDataFrame(data, options);
}

/** Split a column name into prefix and label at the last occurrence of sep. */
function splitColName(colName: string, sep: string): { prefix: string; label: string } {
  const idx = colName.lastIndexOf(sep);
  if (idx < 0) {
    return { prefix: "", label: colName };
  }
  return { prefix: colName.slice(0, idx), label: colName.slice(idx + sep.length) };
}

/** Infer the series name from the common prefix of split column names. */
function inferSeriesName(
  splitCols: ReadonlyArray<{ prefix: string; label: string }>,
): string | null {
  const firstPrefix = splitCols[0]?.prefix ?? "";
  const allSame = splitCols.every((x) => x.prefix === firstPrefix);
  return allSame && firstPrefix !== "" ? firstPrefix : null;
}

/** Find the active dummy label for a single row, or null if none active. */
function findActiveLabel(
  rowIndex: number,
  cols: readonly string[],
  splitCols: ReadonlyArray<{ prefix: string; label: string }>,
  df: DataFrame,
): { label: Scalar; count: number } {
  let found: Scalar = null;
  let count = 0;
  for (let j = 0; j < cols.length; j++) {
    const colName = cols[j];
    if (colName === undefined) {
      continue;
    }
    const v = df.col(colName).values[rowIndex];
    if (v === 1 || v === true) {
      count++;
      found = splitCols[j]?.label ?? null;
    }
  }
  return { label: found, count };
}

/**
 * Reverse a one-hot encoding — reconstruct a categorical Series from a set of
 * binary dummy columns.
 *
 * Each row must have exactly one column set to a truthy value (unless
 * `defaultCategory` is supplied, which is used for all-zero rows).
 *
 * Column names are expected to be `{prefix}{sep}{category}`. The prefix is
 * taken from the longest common prefix of all column names.
 *
 * @throws {RangeError} If a row has more than one active dummy (ambiguous encoding).
 *
 * @example
 * ```ts
 * import { fromDummies, DataFrame } from "tsb";
 * const df = DataFrame.fromColumns({ x_a: [1,0,1], x_b: [0,1,0] });
 * fromDummies(df, { sep: "_" });
 * // Series { data: ["a", "b", "a"], name: "x" }
 * ```
 */
export function fromDummies(df: DataFrame, options?: FromDummiesOptions): Series<Scalar> {
  const sep = options?.sep ?? "_";
  const cols = [...df.columns.values];
  if (cols.length === 0) {
    return new Series<Scalar>({ data: [], name: null });
  }

  const splitCols = cols.map((c) => splitColName(c, sep));
  const seriesName = inferSeriesName(splitCols);
  const nRows = df.index.size;
  const result: Scalar[] = new Array<Scalar>(nRows).fill(null);

  for (let i = 0; i < nRows; i++) {
    const { label, count } = findActiveLabel(i, cols, splitCols, df);
    if (count > 1) {
      throw new RangeError(
        `fromDummies: row ${i} has ${count} active dummy columns (expected 0 or 1).`,
      );
    }
    if (count === 0) {
      result[i] = options?.defaultCategory !== undefined ? options.defaultCategory : null;
    } else {
      result[i] = label;
    }
  }

  return new Series<Scalar>({ data: result, index: df.index.values, name: seriesName });
}
