/**
 * get_dummies — convert categorical variables into dummy/indicator variables.
 *
 * Mirrors:
 * - `pandas.get_dummies(data, prefix, prefix_sep, dummy_na, columns, drop_first)`
 *
 * Each unique value in the input becomes its own binary column (0 or 1).
 * Missing values (null / undefined / NaN) are encoded as **0** in every dummy
 * column by default.  Set `dummyNa: true` to add an explicit `NaN` column.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link getDummies}. */
export interface GetDummiesOptions {
  /**
   * String to prepend to each generated column name.
   * Separated from the value by `prefixSep` (default `"_"`).
   * If `null` or `undefined`, no prefix is used (column name is the raw value).
   */
  readonly prefix?: string | null;
  /**
   * Separator between the prefix and the category value.
   * Default: `"_"`.
   */
  readonly prefixSep?: string;
  /**
   * If `true`, add a column for missing values (null / NaN).
   * The column is named `{prefix}{sep}NaN` (or just `"NaN"` if no prefix).
   * Default: `false`.
   */
  readonly dummyNa?: boolean;
  /**
   * If `true`, drop the first category column to avoid multicollinearity
   * (dummy variable trap).  Useful before fitting linear models.
   * Default: `false`.
   */
  readonly dropFirst?: boolean;
}

/** Additional options when operating on a DataFrame. */
export interface DataFrameGetDummiesOptions extends GetDummiesOptions {
  /**
   * Column names to encode.  If omitted, all columns whose values include
   * at least one string element are encoded.
   */
  readonly columns?: readonly string[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return `true` when a value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Build a column name from a category value, an optional prefix, and a
 * separator.  The null/NaN sentinel is rendered as the string `"NaN"`.
 */
function makeColName(value: Scalar | null, prefix: string | null | undefined, sep: string): string {
  const str = value === null ? "NaN" : String(value);
  return prefix != null && prefix !== "" ? `${prefix}${sep}${str}` : str;
}

/**
 * Collect unique non-missing categories from `vals`, preserving first-seen
 * order (matches pandas behaviour for object / string dtypes).
 */
function collectCategories(vals: readonly Scalar[]): Scalar[] {
  const seen = new Set<Scalar>();
  const cats: Scalar[] = [];
  for (const v of vals) {
    if (!(isMissing(v) || seen.has(v))) {
      seen.add(v);
      cats.push(v);
    }
  }
  return cats;
}

// ─── getDummies ───────────────────────────────────────────────────────────────

/**
 * Convert a `Series` into a `DataFrame` of 0/1 indicator columns.
 *
 * Each unique (non-missing) value in `series` becomes a column.  Missing
 * values are encoded as **0** in every column.
 *
 * Mirrors `pandas.get_dummies(series)`.
 *
 * @example
 * ```ts
 * import { Series, getDummies } from "tsb";
 * const s = new Series({ data: ["a", "b", "a", "c"] });
 * const df = getDummies(s);
 * df.columns.values;      // ["a", "b", "c"]
 * df.col("a").values;     // [1, 0, 1, 0]
 * ```
 */
export function getDummies(series: Series<Scalar>, options: GetDummiesOptions = {}): DataFrame {
  const { prefix = null, prefixSep = "_", dummyNa = false, dropFirst = false } = options;
  const vals = series.values;
  const n = vals.length;
  const idx = series.index;

  // Collect categories, optionally dropping first
  const allCats = collectCategories(vals);
  const cats = dropFirst && allCats.length > 0 ? allCats.slice(1) : allCats;

  const colMap = new Map<string, Series<Scalar>>();

  // Build one binary column per category
  for (const cat of cats) {
    const name = makeColName(cat, prefix, prefixSep);
    const data: Scalar[] = new Array<Scalar>(n);
    for (let i = 0; i < n; i++) {
      data[i] = vals[i] === cat ? 1 : 0;
    }
    colMap.set(name, new Series<Scalar>({ data, index: idx, name }));
  }

  // Optional NaN column
  if (dummyNa) {
    const naName = makeColName(null, prefix, prefixSep);
    const data: Scalar[] = new Array<Scalar>(n);
    for (let i = 0; i < n; i++) {
      data[i] = isMissing(vals[i] as Scalar) ? 1 : 0;
    }
    colMap.set(naName, new Series<Scalar>({ data, index: idx, name: naName }));
  }

  return new DataFrame(colMap, idx);
}

// ─── dataFrameGetDummies ──────────────────────────────────────────────────────

/**
 * Convert categorical/string columns of a `DataFrame` into dummy indicators.
 *
 * Columns **not** selected for encoding are kept as-is.  Selected columns are
 * **replaced** by their dummy expansion (order: original columns in order,
 * each expanded in place).
 *
 * If `options.columns` is omitted, every column that contains at least one
 * string value is encoded automatically.
 *
 * Mirrors `pandas.get_dummies(dataframe)`.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameGetDummies } from "tsb";
 * const df = DataFrame.fromColumns({ color: ["red","blue","red"], n: [1,2,3] });
 * const result = dataFrameGetDummies(df);
 * result.columns.values;          // ["color_red", "color_blue", "n"]
 * result.col("color_red").values; // [1, 0, 1]
 * result.col("n").values;         // [1, 2, 3]
 * ```
 */
export function dataFrameGetDummies(
  df: DataFrame,
  options: DataFrameGetDummiesOptions = {},
): DataFrame {
  const {
    columns: targetCols,
    prefix: basePrefix,
    prefixSep = "_",
    dummyNa = false,
    dropFirst = false,
  } = options;

  const allCols = df.columns.values as readonly string[];

  // Determine which columns to encode
  const encodeSet = new Set<string>(
    targetCols != null
      ? targetCols
      : allCols.filter((c) => {
          const col = df.col(c);
          return col.values.some((v) => typeof v === "string");
        }),
  );

  const colMap = new Map<string, Series<Scalar>>();

  for (const c of allCols) {
    if (encodeSet.has(c)) {
      // Expand to dummies, prefixing with the column name unless overridden
      const colPrefix = basePrefix !== undefined ? basePrefix : c;
      const dummies = getDummies(df.col(c), {
        prefix: colPrefix,
        prefixSep,
        dummyNa,
        dropFirst,
      });
      for (const dc of dummies.columns.values as string[]) {
        colMap.set(dc, dummies.col(dc));
      }
    } else {
      // Preserve non-encoded columns unchanged
      colMap.set(c, df.col(c));
    }
  }

  return new DataFrame(colMap, df.index);
}
