/**
 * Categorical data — a fixed-vocabulary array type mirroring pandas Categorical.
 *
 * A `Categorical` stores values from a finite, known set of *categories*.
 * Internally values are encoded as integer codes (index into the categories
 * array), so repeated strings cost only a few bytes each.  Missing values are
 * stored as code `-1`.
 *
 * @example
 * ```ts
 * const c = new Categorical(["a", "b", "a", "c", null]);
 * c.codes;       // [0, 1, 0, 2, -1]
 * c.categories;  // ["a", "b", "c"]
 *
 * const ordered = new Categorical(["low", "high", "medium"], {
 *   categories: ["low", "medium", "high"],
 *   ordered: true,
 * });
 * ordered.min(); // "low"
 * ordered.max(); // "high"
 * ```
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { Dtype } from "./dtype.ts";
import { Series } from "./series.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when v is missing (null or undefined). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined;
}

/** Convert Scalar to Label (null for non-Label scalars). */
function toLabel(v: Scalar): Label {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
    return v;
  }
  return null;
}

/** Build a map from label → code position for fast lookup. */
function buildCategoryMap(categories: readonly Label[]): Map<Label, number> {
  const map = new Map<Label, number>();
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i] as Label;
    map.set(cat, i);
  }
  return map;
}

/**
 * Encode an array of values using the provided category map.
 * Returns -1 for missing values or values not in the category set.
 */
function encodeValues(
  values: readonly Scalar[],
  categoryMap: Map<Label, number>,
): readonly number[] {
  return values.map((v) => {
    if (isMissing(v)) {
      return -1;
    }
    const lbl = toLabel(v);
    const code = categoryMap.get(lbl);
    return code !== undefined ? code : -1;
  });
}

/**
 * Extract unique non-null labels in order of first appearance.
 */
function uniqueInOrder(values: readonly Scalar[]): Label[] {
  const seen = new Set<Label>();
  const result: Label[] = [];
  for (const v of values) {
    if (isMissing(v)) {
      continue;
    }
    const lbl = toLabel(v);
    if (lbl !== null && !seen.has(lbl)) {
      seen.add(lbl);
      result.push(lbl);
    }
  }
  return result;
}

// ─── CategoricalOptions ───────────────────────────────────────────────────────

/** Options for constructing a `Categorical`. */
export interface CategoricalOptions {
  /**
   * Explicit category list.  If omitted, categories are inferred from the
   * unique non-null values in the data (in order of first appearance).
   */
  readonly categories?: readonly Label[];
  /** Whether the categories have a natural ordering. Default: false. */
  readonly ordered?: boolean;
}

// ─── FactorizeResult ──────────────────────────────────────────────────────────

/**
 * Result of `factorize()`.
 *
 * - `codes`: integer position of each value in `uniques`; -1 for missing.
 * - `uniques`: unique non-null labels in order of first appearance.
 */
export interface FactorizeResult {
  readonly codes: readonly number[];
  readonly uniques: readonly Label[];
}

// ─── Categorical ──────────────────────────────────────────────────────────────

/**
 * An immutable array of values drawn from a fixed, finite set of categories.
 *
 * Mirrors `pandas.Categorical`.  All mutations return new `Categorical`
 * instances — the original is never modified.
 */
export class Categorical {
  /** Integer codes.  -1 means missing / not in categories. */
  readonly codes: readonly number[];

  /** The ordered list of unique category labels (never contains null). */
  readonly categories: readonly Label[];

  /** Whether the categories have a meaningful sort order. */
  readonly ordered: boolean;

  // ─── construction ─────────────────────────────────────────────────────────

  constructor(values: readonly Scalar[], options: CategoricalOptions = {}) {
    const rawCats = options.categories;
    const ordered = options.ordered ?? false;

    let resolvedCats: readonly Label[];
    if (rawCats !== undefined) {
      resolvedCats = rawCats;
    } else {
      resolvedCats = uniqueInOrder(values);
    }

    const catMap = buildCategoryMap(resolvedCats);
    const codes = encodeValues(values, catMap);

    this.codes = codes;
    this.categories = resolvedCats;
    this.ordered = ordered;
  }

  /** Build a `Categorical` directly from pre-validated codes + categories. */
  private static fromCodes(
    codes: readonly number[],
    categories: readonly Label[],
    ordered: boolean,
  ): Categorical {
    const cat = Object.create(Categorical.prototype) as Categorical;
    (cat as { codes: readonly number[] }).codes = codes;
    (cat as { categories: readonly Label[] }).categories = categories;
    (cat as { ordered: boolean }).ordered = ordered;
    return cat;
  }

  // ─── basic properties ─────────────────────────────────────────────────────

  /** Number of elements (including missing). */
  get length(): number {
    return this.codes.length;
  }

  /** Number of distinct categories. */
  get nCategories(): number {
    return this.categories.length;
  }

  /** Dtype descriptor — always `Dtype.category`. */
  get dtype(): Dtype {
    return Dtype.category;
  }

  // ─── element access ───────────────────────────────────────────────────────

  /**
   * Value at position `i`, or `null` for missing.
   */
  at(i: number): Label {
    const code = this.codes[i];
    if (code === undefined || code === -1) {
      return null;
    }
    const cat = this.categories[code];
    return cat !== undefined ? cat : null;
  }

  // ─── conversion ───────────────────────────────────────────────────────────

  /**
   * Decode back to an array of values (null for missing).
   */
  toArray(): Label[] {
    return this.codes.map((code) => {
      if (code === -1) {
        return null;
      }
      const cat = this.categories[code];
      return cat !== undefined ? cat : null;
    });
  }

  /**
   * Convert to a `Series` with `dtype = Dtype.category`.
   *
   * @param name — optional series name.
   */
  toSeries(name?: string): Series<Scalar> {
    return new Series<Scalar>({
      data: this.toArray(),
      dtype: Dtype.category,
      ...(name !== undefined ? { name } : {}),
    });
  }

  // ─── mutation helpers (return new instances) ──────────────────────────────

  /**
   * Return a new Categorical with the categories renamed.
   *
   * `newCategories` must have the same length as the current category list.
   * Each category at position `i` is renamed to `newCategories[i]`.
   */
  renameCategories(newCategories: readonly Label[]): Categorical {
    if (newCategories.length !== this.categories.length) {
      throw new Error(
        `renameCategories: expected ${this.categories.length} names, got ${newCategories.length}`,
      );
    }
    return Categorical.fromCodes(this.codes, newCategories, this.ordered);
  }

  /**
   * Return a new Categorical with categories reordered.
   *
   * `newOrder` must be a permutation of the current categories.
   */
  reorderCategories(newOrder: readonly Label[], ordered?: boolean): Categorical {
    const currentSet = new Set<Label>(this.categories);
    for (const cat of newOrder) {
      if (!currentSet.has(cat)) {
        throw new Error(`reorderCategories: unknown category "${String(cat)}"`);
      }
    }
    if (newOrder.length !== this.categories.length) {
      throw new Error(
        `reorderCategories: expected ${this.categories.length} categories, got ${newOrder.length}`,
      );
    }
    const newCatMap = buildCategoryMap(newOrder);
    const newCodes = this.codes.map((code) => {
      if (code === -1) {
        return -1;
      }
      const oldCat = this.categories[code];
      if (oldCat === undefined) {
        return -1;
      }
      const newCode = newCatMap.get(oldCat);
      return newCode !== undefined ? newCode : -1;
    });
    return Categorical.fromCodes(newCodes, newOrder, ordered ?? this.ordered);
  }

  /**
   * Return a new Categorical with additional categories appended.
   *
   * The new categories must not already exist.
   */
  addCategories(newCategories: readonly Label[]): Categorical {
    const existing = new Set<Label>(this.categories);
    for (const cat of newCategories) {
      if (existing.has(cat)) {
        throw new Error(`addCategories: category "${String(cat)}" already exists`);
      }
    }
    const combined = [...this.categories, ...newCategories];
    return Categorical.fromCodes(this.codes, combined, this.ordered);
  }

  /**
   * Return a new Categorical with specified categories removed.
   *
   * Elements that were in the removed categories become missing (-1).
   */
  removeCategories(toRemove: readonly Label[]): Categorical {
    const removeSet = new Set<Label>(toRemove);
    const newCategories = this.categories.filter((c) => !removeSet.has(c));
    const newCatMap = buildCategoryMap(newCategories);
    const newCodes = this.codes.map((code) => {
      if (code === -1) {
        return -1;
      }
      const cat = this.categories[code];
      if (cat === undefined || removeSet.has(cat)) {
        return -1;
      }
      const newCode = newCatMap.get(cat);
      return newCode !== undefined ? newCode : -1;
    });
    return Categorical.fromCodes(newCodes, newCategories, this.ordered);
  }

  /**
   * Return a new Categorical with only categories that actually appear in
   * the data (removes zero-count categories).
   */
  removeUnusedCategories(): Categorical {
    const used = new Set<number>(this.codes.filter((c) => c !== -1));
    const newCategories = this.categories.filter((_, i) => used.has(i));
    const newCatMap = buildCategoryMap(newCategories);
    const newCodes = this.codes.map((code) => {
      if (code === -1) {
        return -1;
      }
      const cat = this.categories[code];
      if (cat === undefined) {
        return -1;
      }
      const newCode = newCatMap.get(cat);
      return newCode !== undefined ? newCode : -1;
    });
    return Categorical.fromCodes(newCodes, newCategories, this.ordered);
  }

  /**
   * Return a new Categorical with completely replaced categories.
   *
   * If `rename` is true, the new categories are a one-to-one rename of the
   * existing categories (same length required).  If false (default), elements
   * not present in `newCategories` become missing.
   */
  setCategories(
    newCategories: readonly Label[],
    options: { ordered?: boolean; rename?: boolean } = {},
  ): Categorical {
    const rename = options.rename ?? false;
    const ordered = options.ordered ?? this.ordered;
    if (rename) {
      return this.renameCategories(newCategories).reorderCategories(
        this.reorderCategories(newCategories, ordered).categories,
        ordered,
      );
    }
    const catMap = buildCategoryMap(newCategories);
    const newCodes = this.codes.map((code) => {
      if (code === -1) {
        return -1;
      }
      const cat = this.categories[code];
      if (cat === undefined) {
        return -1;
      }
      const newCode = catMap.get(cat);
      return newCode !== undefined ? newCode : -1;
    });
    return Categorical.fromCodes(newCodes, newCategories, ordered);
  }

  /** Return an ordered copy with the same categories. */
  asOrdered(): Categorical {
    return Categorical.fromCodes(this.codes, this.categories, true);
  }

  /** Return an unordered copy with the same categories. */
  asUnordered(): Categorical {
    return Categorical.fromCodes(this.codes, this.categories, false);
  }

  // ─── ordering ops (only valid when ordered=true) ──────────────────────────

  /**
   * Minimum value.  Only valid for ordered categoricals.
   * Returns `null` if all values are missing or the categorical is empty.
   */
  min(): Label {
    if (!this.ordered) {
      throw new Error("min() is not supported for unordered categoricals");
    }
    let minCode = -1;
    for (const code of this.codes) {
      if (code === -1) {
        continue;
      }
      if (minCode === -1 || code < minCode) {
        minCode = code;
      }
    }
    if (minCode === -1) {
      return null;
    }
    const cat = this.categories[minCode];
    return cat !== undefined ? cat : null;
  }

  /**
   * Maximum value.  Only valid for ordered categoricals.
   * Returns `null` if all values are missing or the categorical is empty.
   */
  max(): Label {
    if (!this.ordered) {
      throw new Error("max() is not supported for unordered categoricals");
    }
    let maxCode = -1;
    for (const code of this.codes) {
      if (code === -1) {
        continue;
      }
      if (maxCode === -1 || code > maxCode) {
        maxCode = code;
      }
    }
    if (maxCode === -1) {
      return null;
    }
    const cat = this.categories[maxCode];
    return cat !== undefined ? cat : null;
  }

  // ─── statistics ───────────────────────────────────────────────────────────

  /**
   * Count occurrences of each category (including zeros for absent categories).
   * Returns a `Series` with category labels as the index.
   */
  valueCounts(): Series<number> {
    const counts = new Array<number>(this.categories.length).fill(0);
    for (const code of this.codes) {
      if (code !== -1) {
        const c = counts[code];
        counts[code] = (c ?? 0) + 1;
      }
    }
    return new Series<number>({
      data: counts,
      index: new Index<Label>(this.categories),
      dtype: Dtype.int64,
      name: "count",
    });
  }

  /**
   * Summary statistics: count, unique, top (most frequent), freq.
   * Returns a `Series<Scalar>` with a string index.
   */
  describe(): Series<Scalar> {
    const n = this.codes.filter((c) => c !== -1).length;
    const unique = this.categories.length;

    // find mode
    const counts = new Array<number>(this.categories.length).fill(0);
    for (const code of this.codes) {
      if (code !== -1) {
        const c = counts[code];
        counts[code] = (c ?? 0) + 1;
      }
    }

    let topCode = -1;
    let topFreq = 0;
    for (let i = 0; i < counts.length; i++) {
      const cnt = counts[i] ?? 0;
      if (cnt > topFreq) {
        topFreq = cnt;
        topCode = i;
      }
    }

    const top: Scalar = topCode === -1 ? null : (this.categories[topCode] ?? null);

    return new Series<Scalar>({
      data: [n, unique, top, topFreq],
      index: new Index<Label>(["count", "unique", "top", "freq"]),
      dtype: Dtype.object,
    });
  }

  // ─── comparison ──────────────────────────────────────────────────────────

  /**
   * Element-wise equality — returns a boolean array the same length as `this`.
   * Null/missing values produce `false`.
   */
  equals(other: Categorical): boolean[] {
    if (this.codes.length !== other.codes.length) {
      throw new Error("equals: length mismatch");
    }
    return this.codes.map((code, i) => {
      const otherCode = other.codes[i];
      if (code === -1 || otherCode === -1) {
        return false;
      }
      const a = this.categories[code];
      const b = other.categories[otherCode ?? -1];
      return a !== undefined && b !== undefined && a === b;
    });
  }

  // ─── display ─────────────────────────────────────────────────────────────

  toString(): string {
    const vals = this.toArray()
      .map((v) => (v === null ? "NaN" : String(v)))
      .join(", ");
    const cats = this.categories.map(String).join(", ");
    const ord = this.ordered ? ", ordered" : "";
    return `[${vals}]\nCategories (${this.nCategories}, object${ord}): [${cats}]`;
  }

  // ─── iteration ────────────────────────────────────────────────────────────

  *[Symbol.iterator](): Generator<Label> {
    for (let i = 0; i < this.codes.length; i++) {
      yield this.at(i);
    }
  }
}

// ─── CategoricalAccessor ──────────────────────────────────────────────────────

/**
 * Accessor for categorical operations on a `Series`.
 *
 * Obtain via `series.cat`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["a", "b", "a", "c"], dtype: Dtype.category });
 * s.cat.categories;    // ["a", "b", "c"]
 * s.cat.codes.values;  // [0, 1, 0, 2]
 * s.cat.asOrdered().cat.ordered; // true
 * ```
 */
export class CategoricalAccessor {
  private readonly _series: Series<Scalar>;
  private readonly _cat: Categorical;

  constructor(series: Series<Scalar>) {
    this._series = series;
    this._cat = new Categorical(series.values);
  }

  /** The underlying `Categorical` object. */
  get categorical(): Categorical {
    return this._cat;
  }

  /** The ordered list of unique category labels. */
  get categories(): readonly Label[] {
    return this._cat.categories;
  }

  /** Whether the categorical is ordered. */
  get ordered(): boolean {
    return this._cat.ordered;
  }

  /**
   * Integer codes as a `Series<number>`.
   * -1 represents missing / not-in-categories.
   */
  get codes(): Series<number> {
    return new Series<number>({
      data: [...this._cat.codes],
      index: this._series.index,
      dtype: Dtype.int32,
      name: this._series.name,
    });
  }

  /** Count occurrences of each category. */
  valueCounts(): Series<number> {
    return this._cat.valueCounts();
  }

  /** Rename categories in place (returns a new Series). */
  renameCategories(newCategories: readonly Label[]): Series<Scalar> {
    return this._cat.renameCategories(newCategories).toSeries(this._series.name ?? undefined);
  }

  /** Reorder categories (returns a new Series). */
  reorderCategories(newOrder: readonly Label[], ordered?: boolean): Series<Scalar> {
    return this._cat.reorderCategories(newOrder, ordered).toSeries(this._series.name ?? undefined);
  }

  /** Add new categories (returns a new Series). */
  addCategories(newCategories: readonly Label[]): Series<Scalar> {
    return this._cat.addCategories(newCategories).toSeries(this._series.name ?? undefined);
  }

  /** Remove categories (returns a new Series). */
  removeCategories(toRemove: readonly Label[]): Series<Scalar> {
    return this._cat.removeCategories(toRemove).toSeries(this._series.name ?? undefined);
  }

  /** Remove unused categories (returns a new Series). */
  removeUnusedCategories(): Series<Scalar> {
    return this._cat.removeUnusedCategories().toSeries(this._series.name ?? undefined);
  }

  /** Set categories (returns a new Series). */
  setCategories(
    newCategories: readonly Label[],
    options: { ordered?: boolean; rename?: boolean } = {},
  ): Series<Scalar> {
    return this._cat.setCategories(newCategories, options).toSeries(this._series.name ?? undefined);
  }

  /** Return a new ordered Series. */
  asOrdered(): Series<Scalar> {
    return this._cat.asOrdered().toSeries(this._series.name ?? undefined);
  }

  /** Return a new unordered Series. */
  asUnordered(): Series<Scalar> {
    return this._cat.asUnordered().toSeries(this._series.name ?? undefined);
  }
}

// ─── factorize ────────────────────────────────────────────────────────────────

/**
 * Encode an array of values as integer codes into an array of unique labels.
 *
 * Mirrors `pandas.factorize()`.  Missing values (null / undefined / NaN)
 * are assigned code `-1` and do not appear in `uniques`.
 *
 * @example
 * ```ts
 * const { codes, uniques } = factorize(["a", "b", "a", null, "c"]);
 * codes;   // [0, 1, 0, -1, 2]
 * uniques; // ["a", "b", "c"]
 * ```
 */
export function factorize(values: readonly Scalar[] | Series<Scalar>): FactorizeResult {
  const arr: readonly Scalar[] = values instanceof Series ? values.values : values;

  const uniques: Label[] = [];
  const seenMap = new Map<Label, number>();

  const codes = arr.map((v) => {
    if (isMissing(v)) {
      return -1;
    }
    const lbl = toLabel(v);
    if (lbl === null) {
      return -1;
    }
    const existing = seenMap.get(lbl);
    if (existing !== undefined) {
      return existing;
    }
    const code = uniques.length;
    uniques.push(lbl);
    seenMap.set(lbl, code);
    return code;
  });

  return { codes, uniques };
}

// ─── CategoricalIndex ─────────────────────────────────────────────────────────

/**
 * A `CategoricalDtype` carries category information alongside the base dtype.
 *
 * It is a light-weight descriptor used in `Series` and `DataFrame` dtype
 * metadata to convey that a column is categorical, what its categories are,
 * and whether it is ordered.
 */
export class CategoricalDtype {
  /** The unique category labels for this dtype. */
  readonly categories: readonly Label[];
  /** Whether the categories are ordered. */
  readonly ordered: boolean;

  constructor(categories: readonly Label[] = [], ordered = false) {
    this.categories = categories;
    this.ordered = ordered;
  }

  /** Base dtype — always `Dtype.category`. */
  get dtype(): Dtype {
    return Dtype.category;
  }

  /** Printable representation. */
  toString(): string {
    const ord = this.ordered ? ", ordered=True" : "";
    return `CategoricalDtype(categories=${JSON.stringify(this.categories)}${ord})`;
  }

  /** Two CategoricalDtype instances are equal if categories and ordered match. */
  equals(other: CategoricalDtype): boolean {
    if (this.ordered !== other.ordered) {
      return false;
    }
    if (this.categories.length !== other.categories.length) {
      return false;
    }
    for (let i = 0; i < this.categories.length; i++) {
      if (this.categories[i] !== other.categories[i]) {
        return false;
      }
    }
    return true;
  }
}
