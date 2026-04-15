/**
 * CategoricalIndex — an index backed by categorical data.
 *
 * Mirrors `pandas.CategoricalIndex`: an ordered sequence of labels drawn from
 * a fixed, finite set of *categories*.  Internally the labels are stored as
 * integer codes (indices into the categories array), so equality tests and
 * membership checks are O(1).
 *
 * - `categories` — the ordered set of valid labels
 * - `ordered`    — whether the categories form an ordered type (i.e. supports
 *                  `<`/`>` comparisons between categories)
 * - `codes`      — integer positions into `categories`; `-1` for missing (NA)
 *
 * @example
 * ```ts
 * const ci = CategoricalIndex.fromArray(["b", "a", "c", "a"]);
 * ci.size;                     // 4
 * ci.categories.toArray();     // ["a", "b", "c"]
 * ci.codes;                    // [1, 0, 2, 0]
 * ci.at(0);                    // "b"
 * ci.getLoc("a");              // 1  (first occurrence)
 * ci.addCategories(["d"]).categories.toArray(); // ["a","b","c","d"]
 * ```
 *
 * @module
 */

import type { Label } from "../types.ts";
import { Index } from "./base-index.ts";

// ─── option types ────────────────────────────────────────────────────────────

/** Options accepted by {@link CategoricalIndex.fromArray}. */
export interface CategoricalIndexOptions {
  /** Explicit set of categories. If omitted the unique values in `data` are used. */
  readonly categories?: readonly Label[];
  /** Whether the categories have a meaningful order. Defaults to `false`. */
  readonly ordered?: boolean;
  /** Optional name for the index. */
  readonly name?: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a deduplicated, sorted list of category labels from raw values. */
function inferCategories(values: readonly Label[]): Label[] {
  const seen = new Set<string>();
  const cats: Label[] = [];
  for (const v of values) {
    const key = String(v);
    if (!seen.has(key)) {
      seen.add(key);
      cats.push(v);
    }
  }
  return cats.sort((a, b) => {
    const sa = String(a);
    const sb = String(b);
    if (sa < sb) {
      return -1;
    }
    if (sa > sb) {
      return 1;
    }
    return 0;
  });
}

/** Build a category-to-code map for O(1) look-up. */
function buildCategoryMap(categories: readonly Label[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < categories.length; i++) {
    map.set(String(categories[i]), i);
  }
  return map;
}

/** Encode an array of raw labels into integer codes. */
function encodeValues(values: readonly Label[], catMap: Map<string, number>): number[] {
  return values.map((v) => {
    if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
      return -1;
    }
    return catMap.get(String(v)) ?? -1;
  });
}

// ─── CategoricalIndex ─────────────────────────────────────────────────────────

/**
 * An immutable index whose values are constrained to a fixed set of categories.
 *
 * Mirrors `pandas.CategoricalIndex`.
 */
export class CategoricalIndex {
  /** The ordered set of valid labels. */
  private readonly _categories: readonly Label[];

  /** One integer code per index position; `-1` means NA/missing. */
  private readonly _codes: readonly number[];

  /** Category → code look-up (derived from `_categories`). */
  private readonly _catMap: Map<string, number>;

  /** Whether the category set has a meaningful ordering. */
  readonly ordered: boolean;

  /** Optional human-readable name for this index. */
  readonly name: string | null;

  // ─── construction ──────────────────────────────────────────────────────────

  private constructor(
    categories: readonly Label[],
    codes: readonly number[],
    ordered: boolean,
    name: string | null,
  ) {
    this._categories = Object.freeze([...categories]);
    this._codes = Object.freeze([...codes]);
    this._catMap = buildCategoryMap(categories);
    this.ordered = ordered;
    this.name = name;
  }

  /**
   * Build a `CategoricalIndex` from an array of raw label values.
   *
   * @param data    The sequence of labels.
   * @param options Optional configuration (categories, ordered, name).
   */
  static fromArray(
    data: readonly Label[],
    options: CategoricalIndexOptions = {},
  ): CategoricalIndex {
    const cats = options.categories != null ? [...options.categories] : inferCategories(data);
    const catMap = buildCategoryMap(cats);
    const codes = encodeValues(data, catMap);
    return new CategoricalIndex(cats, codes, options.ordered ?? false, options.name ?? null);
  }

  /**
   * Build a `CategoricalIndex` directly from an existing category list and
   * a pre-computed codes array.
   *
   * @param categories Ordered list of valid labels.
   * @param codes      Integer indices into `categories`; `-1` for NA.
   * @param options    Optional configuration (ordered, name).
   */
  static fromCodes(
    categories: readonly Label[],
    codes: readonly number[],
    options: Omit<CategoricalIndexOptions, "categories"> = {},
  ): CategoricalIndex {
    const nCats = categories.length;
    for (const c of codes) {
      if (c !== -1 && (c < 0 || c >= nCats)) {
        throw new RangeError(`Code ${c} is out of range for ${nCats} categories`);
      }
    }
    return new CategoricalIndex(categories, codes, options.ordered ?? false, options.name ?? null);
  }

  // ─── basic properties ──────────────────────────────────────────────────────

  /** Number of elements in the index. */
  get size(): number {
    return this._codes.length;
  }

  /** Shape tuple (always 1-D). */
  get shape(): [number] {
    return [this._codes.length];
  }

  /** Number of dimensions (always 1). */
  get ndim(): 1 {
    return 1;
  }

  /**
   * The ordered set of category labels wrapped in an `Index<Label>`.
   * Matches `pandas.CategoricalIndex.categories`.
   */
  get categories(): Index<Label> {
    return new Index<Label>(this._categories);
  }

  /**
   * Integer code for each position.
   * `-1` indicates a missing (NA) value.
   */
  get codes(): readonly number[] {
    return this._codes;
  }

  /** Number of unique categories (not index size). */
  get nCategories(): number {
    return this._categories.length;
  }

  // ─── element access ────────────────────────────────────────────────────────

  /**
   * Return the label at position `i`.
   * Returns `null` for NA entries (code === -1).
   *
   * @throws {RangeError} when `i` is out of bounds.
   */
  at(i: number): Label | null {
    if (i < 0 || i >= this._codes.length) {
      throw new RangeError(`Index ${i} is out of bounds for size ${this._codes.length}`);
    }
    const code = this._codes[i] as number;
    if (code === -1) {
      return null;
    }
    return this._categories[code] as Label;
  }

  /**
   * Return the (first) position of `label` in the index.
   * Returns `-1` if not found.
   */
  getLoc(label: Label): number {
    const code = this._catMap.get(String(label));
    if (code === undefined) {
      return -1;
    }
    return this._codes.indexOf(code);
  }

  /**
   * Return *all* positions where `label` appears.
   */
  getLocsAll(label: Label): number[] {
    const code = this._catMap.get(String(label));
    if (code === undefined) {
      return [];
    }
    const locs: number[] = [];
    for (let i = 0; i < this._codes.length; i++) {
      if (this._codes[i] === code) {
        locs.push(i);
      }
    }
    return locs;
  }

  /**
   * Decode all codes into their label values.
   * NA positions (code === -1) become `null`.
   */
  toArray(): (Label | null)[] {
    return this._codes.map((c) => (c === -1 ? null : (this._categories[c] as Label)));
  }

  // ─── membership ────────────────────────────────────────────────────────────

  /** Return `true` if `label` is one of the current categories. */
  hasCategory(label: Label): boolean {
    return this._catMap.has(String(label));
  }

  /** Return `true` if `label` appears in the index (at any position). */
  contains(label: Label): boolean {
    return this.getLoc(label) !== -1;
  }

  // ─── category mutations (all return new instances) ─────────────────────────

  /**
   * Return a new `CategoricalIndex` with renamed categories.
   *
   * `newCategories` must have the same length as the current categories.
   * Each category is replaced in-place (the codes remain valid).
   */
  renameCategories(newCategories: readonly Label[]): CategoricalIndex {
    if (newCategories.length !== this._categories.length) {
      throw new RangeError(
        `renameCategories: expected ${this._categories.length} names, ` +
          `got ${newCategories.length}`,
      );
    }
    return new CategoricalIndex(newCategories, this._codes, this.ordered, this.name);
  }

  /**
   * Return a new `CategoricalIndex` with the categories reordered.
   *
   * `newOrder` must be a permutation of the current categories.
   */
  reorderCategories(newOrder: readonly Label[]): CategoricalIndex {
    if (newOrder.length !== this._categories.length) {
      throw new RangeError(
        "reorderCategories: new order must have the same length as the current categories",
      );
    }
    const newMap = buildCategoryMap(newOrder);
    for (const cat of this._categories) {
      if (!newMap.has(String(cat))) {
        throw new RangeError(
          `reorderCategories: category "${String(cat)}" is missing from the new order`,
        );
      }
    }
    const newCodes = this._codes.map((c) => {
      if (c === -1) {
        return -1;
      }
      const label = this._categories[c] as Label;
      return newMap.get(String(label)) as number;
    });
    return new CategoricalIndex(newOrder, newCodes, this.ordered, this.name);
  }

  /**
   * Return a new `CategoricalIndex` with `extra` appended to the categories.
   *
   * Values in the index that already match an existing category are unaffected.
   * The new categories are appended (not inserted in sorted order).
   */
  addCategories(extra: readonly Label[]): CategoricalIndex {
    for (const cat of extra) {
      if (this._catMap.has(String(cat))) {
        throw new RangeError(`addCategories: "${String(cat)}" is already a category`);
      }
    }
    const newCats = [...this._categories, ...extra];
    return new CategoricalIndex(newCats, this._codes, this.ordered, this.name);
  }

  /**
   * Return a new `CategoricalIndex` with the specified categories removed.
   *
   * Index entries whose label belongs to `removals` become NA (code → -1).
   */
  removeCategories(removals: readonly Label[]): CategoricalIndex {
    const removeSet = new Set(removals.map((v) => String(v)));
    const newCats = this._categories.filter((c) => !removeSet.has(String(c)));
    const newMap = buildCategoryMap(newCats);
    const newCodes = this._codes.map((c) => {
      if (c === -1) {
        return -1;
      }
      const label = this._categories[c] as Label;
      return newMap.get(String(label)) ?? -1;
    });
    return new CategoricalIndex(newCats, newCodes, this.ordered, this.name);
  }

  /**
   * Return a new `CategoricalIndex` with `categories` replaced wholesale.
   *
   * Entries that fall outside `newCategories` become NA.
   * Equivalent to `pandas.CategoricalIndex.set_categories()`.
   */
  setCategories(
    newCategories: readonly Label[],
    options: { ordered?: boolean } = {},
  ): CategoricalIndex {
    const newMap = buildCategoryMap(newCategories);
    const newCodes = this._codes.map((c) => {
      if (c === -1) {
        return -1;
      }
      const label = this._categories[c] as Label;
      return newMap.get(String(label)) ?? -1;
    });
    return new CategoricalIndex(
      newCategories,
      newCodes,
      options.ordered ?? this.ordered,
      this.name,
    );
  }

  /**
   * Return a new `CategoricalIndex` with only the categories that appear in
   * the data (unused categories are dropped).
   */
  removeUnusedCategories(): CategoricalIndex {
    const usedCodes = new Set(this._codes.filter((c) => c !== -1));
    const usedCats = this._categories.filter((_, i) => usedCodes.has(i));
    const newMap = buildCategoryMap(usedCats);
    const newCodes = this._codes.map((c) => {
      if (c === -1) {
        return -1;
      }
      const label = this._categories[c] as Label;
      return newMap.get(String(label)) ?? -1;
    });
    return new CategoricalIndex(usedCats, newCodes, this.ordered, this.name);
  }

  // ─── ordering helpers ──────────────────────────────────────────────────────

  /** Return a copy with `ordered = true`. */
  asOrdered(): CategoricalIndex {
    return new CategoricalIndex(this._categories, this._codes, true, this.name);
  }

  /** Return a copy with `ordered = false`. */
  asUnordered(): CategoricalIndex {
    return new CategoricalIndex(this._categories, this._codes, false, this.name);
  }

  // ─── set-like operations ───────────────────────────────────────────────────

  /**
   * Return a new `CategoricalIndex` that is the union of the two category sets.
   *
   * The resulting categories are the union of both sets (left ∪ right),
   * preserving left-side order and appending new categories from `other`.
   * Only the data from *this* index is retained.
   */
  unionCategories(other: CategoricalIndex): CategoricalIndex {
    const merged = [...this._categories];
    const seen = new Set(this._categories.map((c) => String(c)));
    for (const cat of other._categories) {
      if (!seen.has(String(cat))) {
        seen.add(String(cat));
        merged.push(cat);
      }
    }
    return this.setCategories(merged);
  }

  /**
   * Return a new `CategoricalIndex` whose categories are the intersection of
   * both category sets.  Entries outside the intersection become NA.
   */
  intersectCategories(other: CategoricalIndex): CategoricalIndex {
    const otherSet = new Set(other._categories.map((c) => String(c)));
    const shared = this._categories.filter((c) => otherSet.has(String(c)));
    return this.setCategories(shared);
  }

  // ─── comparison (ordered only) ─────────────────────────────────────────────

  /**
   * Compare two label values according to the category order.
   *
   * Returns a negative number when `a < b`, 0 when equal, positive when `a > b`.
   *
   * @throws {Error} when `ordered` is `false`.
   * @throws {RangeError} when either label is not a category.
   */
  compareLabels(a: Label, b: Label): number {
    if (!this.ordered) {
      throw new Error("compareLabels requires an ordered CategoricalIndex");
    }
    const ca = this._catMap.get(String(a));
    const cb = this._catMap.get(String(b));
    if (ca === undefined) {
      throw new RangeError(`"${String(a)}" is not a category`);
    }
    if (cb === undefined) {
      throw new RangeError(`"${String(b)}" is not a category`);
    }
    return ca - cb;
  }

  // ─── misc ──────────────────────────────────────────────────────────────────

  /** Return a new index with a different name. */
  rename(name: string | null): CategoricalIndex {
    return new CategoricalIndex(this._categories, this._codes, this.ordered, name);
  }

  /** Human-readable representation. */
  toString(): string {
    const preview = this.toArray()
      .slice(0, 5)
      .map((v) => (v === null ? "NA" : String(v)))
      .join(", ");
    const more = this.size > 5 ? `, ... (${this.size} total)` : "";
    return `CategoricalIndex([${preview}${more}], categories=[${this._categories.map(String).join(", ")}], ordered=${String(this.ordered)})`;
  }
}
