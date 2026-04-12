/**
 * categorical_ops — standalone categorical utility functions.
 *
 * Mirrors pandas' `pd.Categorical`, `pd.Categorical.from_codes`, and related
 * top-level helpers that operate on categorical data without requiring a method
 * call on an existing `CategoricalAccessor`.
 *
 * All functions return a `CatSeriesLike` (or plain data) and are **pure** —
 * inputs are never mutated.
 *
 * ### Included functions
 *
 * | Function | Pandas equivalent |
 * |----------|-------------------|
 * | `catFromCodes` | `pd.Categorical.from_codes` |
 * | `catUnionCategories` | `a.cat.set_categories(union(...))` pattern |
 * | `catIntersectCategories` | `a.cat.set_categories(intersect(...))` |
 * | `catDiffCategories` | `a.cat.remove_categories(b_cats)` pattern |
 * | `catEqualCategories` | compare `.cat.categories` sets |
 * | `catSortByFreq` | `a.cat.reorder_categories(sorted_by_freq)` |
 * | `catToOrdinal` | `pd.Categorical(values, categories=order, ordered=True)` |
 * | `catFreqTable` | `a.value_counts(sort=False)` on categorical |
 * | `catCrossTab` | reduced `pd.crosstab` for two categorical Series |
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { CatSeriesLike } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public option types ───────────────────────────────────────────────────────

/** Options for {@link catFromCodes}. */
export interface CatFromCodesOptions {
  /** Whether the resulting categorical is ordered. Default `false`. */
  ordered?: boolean;
  /** Series name for the result. */
  name?: string | null;
}

/** Options for {@link catSortByFreq}. */
export interface CatSortByFreqOptions {
  /** If `true`, least frequent categories come first. Default `false` (most frequent first). */
  ascending?: boolean;
}

/** Options for {@link catCrossTab}. */
export interface CatCrossTabOptions {
  /** If `true`, include a row and column of totals. Default `false`. */
  margins?: boolean;
  /** Label used for the margins row/column. Default `"All"`. */
  marginsName?: string;
  /** If `true`, normalize counts (divide by total). Default `false`. */
  normalize?: boolean;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Return true when value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Build a sorted unique key list preserving encounter order (for cats). */
function uniqueKeys(cats: readonly Scalar[]): Scalar[] {
  const seen = new Set<string>();
  const result: Scalar[] = [];
  for (const c of cats) {
    const k = String(c);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(c);
    }
  }
  return result;
}

// ─── catFromCodes ─────────────────────────────────────────────────────────────

/**
 * Construct a categorical `Series` from integer codes and a categories array.
 *
 * Mirrors `pandas.Categorical.from_codes(codes, categories, ordered=False)`.
 *
 * - Codes are **0-based** indices into `categories`.
 * - A code of `-1` maps to `null` (missing value), matching pandas `NaN`.
 * - Any code outside `[-1, categories.length)` throws a `RangeError`.
 *
 * @param codes     Integer codes (one per element).
 * @param categories Array of category labels; the order defines ordinal rank.
 * @param opts      Optional settings (ordered, name).
 * @returns A `CatSeriesLike` with the specified categories.
 *
 * @example
 * ```ts
 * const s = catFromCodes([0, 2, 1, -1, 0], ["a", "b", "c"]);
 * s.cat.categories.values; // ["a", "b", "c"]
 * s.toArray();             // ["a", "c", "b", null, "a"]
 * ```
 */
export function catFromCodes(
  codes: readonly number[],
  categories: readonly Scalar[],
  opts: CatFromCodesOptions = {},
): CatSeriesLike {
  const { ordered = false, name = null } = opts;
  const cats = uniqueKeys(categories);
  const values: Scalar[] = codes.map((code) => {
    if (code === -1) return null;
    if (code < -1 || code >= cats.length) {
      throw new RangeError(
        `catFromCodes: code ${code} is out of range [0, ${cats.length - 1}]`,
      );
    }
    return cats[code] as Scalar;
  });
  const base = new Series({ data: values, name });
  return base.cat.setCategories(cats, ordered);
}

// ─── catUnionCategories ────────────────────────────────────────────────────────

/**
 * Return a new `CatSeriesLike` with the same values as `a` but whose categories
 * are the **union** of `a`'s and `b`'s categories.
 *
 * Categories from `b` that are not already in `a` are appended (in the order
 * they appear in `b`). The ordering flag is taken from `a`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["x", "y"] }).cat.setCategories(["x", "y"]);
 * const b = new Series({ data: ["y", "z"] }).cat.setCategories(["y", "z"]);
 * catUnionCategories(a, b).cat.categories.values; // ["x", "y", "z"]
 * ```
 */
export function catUnionCategories(a: CatSeriesLike, b: CatSeriesLike): CatSeriesLike {
  const aCats = a.cat.categories.values as Scalar[];
  const bCats = b.cat.categories.values as Scalar[];
  const seen = new Set(aCats.map(String));
  const merged = [...aCats];
  for (const c of bCats) {
    if (!seen.has(String(c))) {
      seen.add(String(c));
      merged.push(c);
    }
  }
  return a.cat.setCategories(merged, a.cat.ordered);
}

// ─── catIntersectCategories ───────────────────────────────────────────────────

/**
 * Return a new `CatSeriesLike` with values from `a` whose categories are the
 * **intersection** of `a`'s and `b`'s categories.
 *
 * Values whose category is not in the intersection are set to `null`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["x", "y", "z"] }).cat.setCategories(["x", "y", "z"]);
 * const b = new Series({ data: ["y", "z"] }).cat.setCategories(["y", "z"]);
 * const r = catIntersectCategories(a, b);
 * r.cat.categories.values; // ["y", "z"]
 * r.toArray();             // [null, "y", "z"]
 * ```
 */
export function catIntersectCategories(a: CatSeriesLike, b: CatSeriesLike): CatSeriesLike {
  const bSet = new Set((b.cat.categories.values as Scalar[]).map(String));
  const intersected = (a.cat.categories.values as Scalar[]).filter((c) =>
    bSet.has(String(c)),
  );
  return a.cat.setCategories(intersected, a.cat.ordered);
}

// ─── catDiffCategories ────────────────────────────────────────────────────────

/**
 * Return a new `CatSeriesLike` with values from `a` whose categories are the
 * **set difference** `a.categories − b.categories`.
 *
 * Values whose category is present in `b` are set to `null`.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["x", "y", "z"] }).cat.setCategories(["x", "y", "z"]);
 * const b = new Series({ data: ["z"] }).cat.setCategories(["z"]);
 * const r = catDiffCategories(a, b);
 * r.cat.categories.values; // ["x", "y"]
 * r.toArray();             // ["x", "y", null]
 * ```
 */
export function catDiffCategories(a: CatSeriesLike, b: CatSeriesLike): CatSeriesLike {
  const bSet = new Set((b.cat.categories.values as Scalar[]).map(String));
  const remaining = (a.cat.categories.values as Scalar[]).filter(
    (c) => !bSet.has(String(c)),
  );
  return a.cat.setCategories(remaining, a.cat.ordered);
}

// ─── catEqualCategories ───────────────────────────────────────────────────────

/**
 * Return `true` when `a` and `b` have exactly the same set of categories,
 * ignoring order.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["x"] }).cat.setCategories(["x", "y"]);
 * const b = new Series({ data: ["y"] }).cat.setCategories(["y", "x"]);
 * catEqualCategories(a, b); // true
 * ```
 */
export function catEqualCategories(a: CatSeriesLike, b: CatSeriesLike): boolean {
  const aSet = new Set((a.cat.categories.values as Scalar[]).map(String));
  const bSet = new Set((b.cat.categories.values as Scalar[]).map(String));
  if (aSet.size !== bSet.size) return false;
  for (const c of aSet) {
    if (!bSet.has(c)) return false;
  }
  return true;
}

// ─── catSortByFreq ────────────────────────────────────────────────────────────

/**
 * Reorder the categories of a categorical Series by their **frequency** in the
 * data (most frequent first by default).
 *
 * Mirrors `series.cat.reorder_categories(series.value_counts().index)`.
 *
 * @param series   The source categorical Series.
 * @param opts     `{ ascending: false }` — set `true` for rarest-first.
 * @returns A new `CatSeriesLike` with categories sorted by frequency.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["b", "a", "b", "c", "b", "a"] })
 *   .cat.setCategories(["a", "b", "c"]);
 * catSortByFreq(s).cat.categories.values; // ["b", "a", "c"]
 * ```
 */
export function catSortByFreq(
  series: CatSeriesLike,
  opts: CatSortByFreqOptions = {},
): CatSeriesLike {
  const { ascending = false } = opts;
  const cats = series.cat.categories.values as Scalar[];
  const freq = new Map<string, number>();
  for (const c of cats) freq.set(String(c), 0);
  for (const v of series.values) {
    if (!isMissing(v)) {
      const k = String(v);
      const prev = freq.get(k);
      if (prev !== undefined) freq.set(k, prev + 1);
    }
  }
  const sorted = [...cats].sort((a, b) => {
    const fa = freq.get(String(a)) ?? 0;
    const fb = freq.get(String(b)) ?? 0;
    return ascending ? fa - fb : fb - fa;
  });
  return series.cat.reorderCategories(sorted);
}

// ─── catToOrdinal ─────────────────────────────────────────────────────────────

/**
 * Create an **ordered** categorical Series from `series` using `order` to
 * define both the category set and their rank.
 *
 * Mirrors `pd.Categorical(series, categories=order, ordered=True)`.
 *
 * Values not present in `order` are set to `null`. The number of categories
 * in the result equals `order.length`.
 *
 * @param series  Source Series (any values).
 * @param order   Ordered list of category labels (low to high).
 * @returns A new `CatSeriesLike` with `.cat.ordered === true`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["med", "low", "high", "med"] });
 * const ord = catToOrdinal(s, ["low", "med", "high"]);
 * ord.cat.ordered;              // true
 * ord.cat.categories.values;   // ["low", "med", "high"]
 * ```
 */
export function catToOrdinal(series: CatSeriesLike, order: readonly Scalar[]): CatSeriesLike {
  return series.cat.setCategories(order, true);
}

// ─── catFreqTable ─────────────────────────────────────────────────────────────

/**
 * Return the frequency of each category as a plain `Record<string, number>`.
 *
 * All defined categories are present in the result, even those with zero
 * occurrences, matching `series.cat.value_counts()` semantics.
 *
 * Missing values are excluded from the count.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["b", "a", "b", null] })
 *   .cat.setCategories(["a", "b", "c"]);
 * catFreqTable(s); // { a: 1, b: 2, c: 0 }
 * ```
 */
export function catFreqTable(series: CatSeriesLike): Record<string, number> {
  const cats = series.cat.categories.values as Scalar[];
  const freq: Record<string, number> = {};
  for (const c of cats) freq[String(c)] = 0;
  for (const v of series.values) {
    if (!isMissing(v)) {
      const k = String(v);
      if (Object.prototype.hasOwnProperty.call(freq, k)) {
        (freq[k] as number) += 1;
      }
    }
  }
  return freq;
}

// ─── catCrossTab ──────────────────────────────────────────────────────────────

/**
 * Compute a cross-tabulation of two categorical Series.
 *
 * Mirrors a simplified `pd.crosstab(a, b)` for categorical inputs:
 * rows = `a`'s categories, columns = `b`'s categories, cells = co-occurrence
 * counts.  Only aligned positions (same integer index) are tallied; missing
 * values in either Series skip the row.
 *
 * @param a         First categorical Series (determines rows).
 * @param b         Second categorical Series (determines columns).
 * @param opts      `{ margins, marginsName, normalize }`.
 * @returns A `DataFrame` of count (or proportion) values.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["x", "x", "y", "y"] }).cat.setCategories(["x", "y"]);
 * const b = new Series({ data: ["p", "q", "p", "q"] }).cat.setCategories(["p", "q"]);
 * const ct = catCrossTab(a, b);
 * // DataFrame:
 * //     p  q
 * // x   1  1
 * // y   1  1
 * ```
 */
export function catCrossTab(
  a: CatSeriesLike,
  b: CatSeriesLike,
  opts: CatCrossTabOptions = {},
): DataFrame {
  const { margins = false, marginsName = "All", normalize = false } = opts;

  const rowCats = a.cat.categories.values as Label[];
  const colCats = b.cat.categories.values as Label[];

  // Build count matrix: rowCats × colCats
  const counts = new Map<string, Map<string, number>>();
  for (const r of rowCats) {
    const row = new Map<string, number>();
    for (const c of colCats) row.set(String(c), 0);
    counts.set(String(r), row);
  }

  const aVals = a.values;
  const bVals = b.values;
  const n = Math.min(aVals.length, bVals.length);
  for (let i = 0; i < n; i++) {
    const av = aVals[i];
    const bv = bVals[i];
    if (isMissing(av) || isMissing(bv)) continue;
    const row = counts.get(String(av));
    if (row === undefined) continue;
    const prev = row.get(String(bv));
    if (prev !== undefined) row.set(String(bv), prev + 1);
  }

  // Compute total for normalization
  let total = 0;
  if (normalize) {
    for (const row of counts.values()) {
      for (const v of row.values()) total += v;
    }
  }

  // Build data columns: each colCat is a column, each rowCat is a row value
  const data: Record<string, Scalar[]> = {};
  for (const c of colCats) {
    const col: Scalar[] = [];
    for (const r of rowCats) {
      const v = counts.get(String(r))?.get(String(c)) ?? 0;
      col.push(normalize && total > 0 ? v / total : v);
    }
    data[String(c)] = col;
  }

  // Add margin column (row totals)
  if (margins) {
    const rowTotals: Scalar[] = rowCats.map((r) => {
      let sum = 0;
      const row = counts.get(String(r));
      if (row) for (const v of row.values()) sum += v;
      return normalize && total > 0 ? sum / total : sum;
    });
    data[marginsName] = rowTotals;
  }

  // Build DataFrame with row index = rowCats
  const rowLabels: Label[] = [...rowCats];

  // Add margin row (column totals)
  if (margins) {
    const allCols = [...colCats.map(String), marginsName];
    let marginRowTotal = 0;
    for (const c of colCats) {
      let colSum = 0;
      for (const r of rowCats) {
        colSum += counts.get(String(r))?.get(String(c)) ?? 0;
      }
      const val = normalize && total > 0 ? colSum / total : colSum;
      (data[String(c)] as Scalar[]).push(val);
      marginRowTotal += normalize && total > 0 ? colSum / total : colSum;
    }
    if (margins) {
      (data[marginsName] as Scalar[]).push(
        normalize && total > 0 ? marginRowTotal : marginRowTotal,
      );
    }
    rowLabels.push(marginsName as Label);
    // Ensure all column arrays have the same length
    for (const col of allCols) {
      const arr = data[col];
      if (arr === undefined) data[col] = rowLabels.map(() => 0);
    }
  }

  return DataFrame.fromColumns(data, { index: rowLabels });
}

// ─── catRecode ────────────────────────────────────────────────────────────────

/**
 * Rename categories of a categorical Series using a string→string map.
 *
 * Mirrors `series.cat.rename_categories(mapping)` but as a standalone function
 * that also accepts a transform function.
 *
 * @param series   The source categorical.
 * @param mapping  Either a `Record<string, string>` (rename specified keys) or
 *                 a `(label: string) => string` transform applied to every category.
 * @returns A new `CatSeriesLike` with renamed categories.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["a", "b"] }).cat.setCategories(["a", "b", "c"]);
 * catRecode(s, { a: "A", b: "B" }).cat.categories.values; // ["A", "B", "c"]
 * catRecode(s, (x) => x.toUpperCase()).cat.categories.values; // ["A", "B", "C"]
 * ```
 */
export function catRecode(
  series: CatSeriesLike,
  mapping: Record<string, string> | ((label: string) => string),
): CatSeriesLike {
  if (typeof mapping === "function") {
    return series.cat.renameCategories(
      (series.cat.categories.values as Scalar[]).map((c) => mapping(String(c))),
    );
  }
  const cats = series.cat.categories.values as Scalar[];
  const newCats = cats.map((c): Scalar => {
    const k = String(c);
    return Object.prototype.hasOwnProperty.call(mapping, k)
      ? (mapping[k] as string)
      : c;
  });
  return series.cat.renameCategories(newCats);
}
