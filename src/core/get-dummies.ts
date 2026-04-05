/**
 * Dummy variable encoding — `get_dummies` and `from_dummies`.
 *
 * Mirrors:
 *   - `pandas.get_dummies` — one-hot encode a DataFrame
 *   - `pandas.from_dummies` — reverse of get_dummies
 */

import type { Label, Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";
import type { Series } from "./series.ts";

// ─── get_dummies ──────────────────────────────────────────────────────────────

/** Options for {@link getDummies}. */
export interface GetDummiesOptions {
  /** Columns to encode. If omitted, encode all string/object columns. */
  columns?: string[];
  /** Prefix to prepend to each dummy column. Default: column name. */
  prefix?: string | Record<string, string>;
  /** Separator between prefix and category. Default `"_"`. */
  prefix_sep?: string;
  /** Drop the first category (k-1 encoding). Default `false`. */
  drop_first?: boolean;
  /** Dtype for dummy columns. Default `number` (1/0). */
  dtype?: "number" | "boolean";
}

/** Determine which columns to encode. */
function selectColumns(df: DataFrame, columns?: string[]): string[] {
  const allCols = df.columns.toArray();
  if (columns !== undefined && columns.length > 0) {
    return columns.filter((c) => allCols.includes(c));
  }
  return allCols.filter((c) => {
    const s = df.col(c) as Series<Scalar>;
    return s.values.some((v) => typeof v === "string");
  });
}

/** Get prefix for a column. */
function getPrefix(col: string, prefix?: string | Record<string, string>): string {
  if (prefix === undefined) {
    return col;
  }
  if (typeof prefix === "string") {
    return prefix;
  }
  return prefix[col] ?? col;
}

/** Encode a single Series column to dummy columns. */
function encodeDummiesColumn(
  s: Series<Scalar>,
  col: string,
  opts: GetDummiesOptions,
): Record<string, Scalar[]> {
  const prefixSep = opts.prefix_sep ?? "_";
  const dropFirst = opts.drop_first ?? false;
  const dtype = opts.dtype ?? "number";
  const pre = getPrefix(col, opts.prefix);

  const categories = [...new Set(s.values.filter((v) => v !== null && v !== undefined))].sort(
    (a, b) => String(a).localeCompare(String(b)),
  );
  if (dropFirst && categories.length > 0) {
    categories.shift();
  }

  const result: Record<string, Scalar[]> = {};
  for (const cat of categories) {
    const colName = `${pre}${prefixSep}${String(cat)}`;
    result[colName] = s.values.map((v) => {
      const match = v === cat;
      return dtype === "boolean" ? match : match ? 1 : 0;
    });
  }
  return result;
}

/**
 * One-hot encode categorical columns in a DataFrame.
 *
 * @example
 * ```ts
 * const df = new DataFrame({ data: { color: ["red", "blue", "red"] } });
 * getDummies(df); // color_blue, color_red columns
 * ```
 */
export function getDummies(df: DataFrame, opts: GetDummiesOptions = {}): DataFrame {
  const encCols = new Set(selectColumns(df, opts.columns));
  const data: Record<string, Scalar[]> = {};

  for (const col of df.columns) {
    if (encCols.has(col)) {
      const dummies = encodeDummiesColumn(df.col(col) as Series<Scalar>, col, opts);
      for (const [k, v] of Object.entries(dummies)) {
        data[k] = v;
      }
    } else {
      data[col] = (df.col(col) as Series<Scalar>).values as Scalar[];
    }
  }

  return DataFrame.fromColumns(data, { index: df.index });
}

// ─── from_dummies ─────────────────────────────────────────────────────────────

/** Options for {@link fromDummies}. */
export interface FromDummiesOptions {
  /** Separator used to split prefix from category. Default `"_"`. */
  sep?: string;
  /** Default category for rows with no 1 in any dummy column. Default `null`. */
  default_category?: Scalar;
}

/** Group dummy columns by their prefix. */
function groupByPrefix(
  df: DataFrame,
  sep: string,
): Map<string, Array<{ col: string; cat: Label }>> {
  const groups = new Map<string, Array<{ col: string; cat: Label }>>();
  for (const col of df.columns) {
    const sepIdx = col.indexOf(sep);
    if (sepIdx === -1) {
      continue;
    }
    const prefix = col.slice(0, sepIdx);
    const cat = col.slice(sepIdx + sep.length) as Label;
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)?.push({ col, cat });
  }
  return groups;
}

/**
 * Reverse a one-hot encoded DataFrame back to categorical columns.
 *
 * @example
 * ```ts
 * const dummies = getDummies(df);
 * fromDummies(dummies, { sep: "_" }); // recovers original columns
 * ```
 */
export function fromDummies(df: DataFrame, opts: FromDummiesOptions = {}): DataFrame {
  const sep = opts.sep ?? "_";
  const defaultCat = opts.default_category ?? null;
  const groups = groupByPrefix(df, sep);

  const data: Record<string, Scalar[]> = {};
  const nRows = df.shape[0];

  for (const [prefix, entries] of groups) {
    const colArr: Scalar[] = new Array<Scalar>(nRows).fill(defaultCat);
    for (const { col, cat } of entries) {
      const vals = (df.col(col) as Series<Scalar>).values;
      for (let i = 0; i < nRows; i++) {
        const v = vals[i];
        if (v === 1 || v === true) {
          colArr[i] = cat;
        }
      }
    }
    data[prefix] = colArr;
  }

  return DataFrame.fromColumns(data, { index: df.index });
}
