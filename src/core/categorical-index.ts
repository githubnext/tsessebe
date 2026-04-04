/**
 * CategoricalIndex — an Index backed by a Categorical array.
 *
 * Mirrors `pandas.CategoricalIndex`: stores values from a finite, known set
 * of *categories*, using integer codes internally for memory efficiency.
 * Supports ordered and unordered categories, and exposes the full pandas
 * category-management API (`setCategories`, `addCategories`, etc.).
 *
 * @example
 * ```ts
 * const ci = new CategoricalIndex(["a", "b", "a", "c"]);
 * ci.categories;  // ["a", "b", "c"]
 * ci.codes;       // [0, 1, 0, 2]
 * ci.ordered;     // false
 *
 * const ordered = new CategoricalIndex(["low", "high", "medium"], {
 *   categories: ["low", "medium", "high"],
 *   ordered: true,
 * });
 * ordered.min(); // "low"
 * ```
 */

import type { Label } from "../types.ts";
import { Index } from "./base-index.ts";
import { Categorical } from "./categorical.ts";
import type { CategoricalOptions } from "./categorical.ts";
import { Dtype } from "./dtype.ts";

// ─── CategoricalIndex ─────────────────────────────────────────────────────────

/** Options accepted by `CategoricalIndex` constructor. */
export type CategoricalIndexOptions = CategoricalOptions & {
  /** Optional name for the index axis. */
  readonly name?: string | null;
};

/**
 * An index backed by a `Categorical` array.
 *
 * All values must come from the fixed category vocabulary; values outside the
 * vocabulary are stored as `null` (code = -1).  The class wraps `Index<Label>`
 * and delegates heavy lifting to the `Categorical` helper.
 */
export class CategoricalIndex extends Index<Label> {
  /** The underlying Categorical data. */
  private readonly _categorical: Categorical;

  // ─── construction ──────────────────────────────────────────────

  constructor(data: readonly (Label | null)[], options: CategoricalIndexOptions = {}) {
    const { name, ...catOptions } = options;
    const cat = new Categorical(data, catOptions);
    super(cat.toArray(), name);
    this._categorical = cat;
  }

  /**
   * Build a `CategoricalIndex` directly from a `Categorical` instance.
   */
  static fromCategorical(cat: Categorical, name?: string | null): CategoricalIndex {
    const ci = new CategoricalIndex(cat.toArray(), {
      categories: [...cat.categories],
      ordered: cat.ordered,
      name: name ?? null,
    });
    return ci;
  }

  // ─── categorical properties ────────────────────────────────────

  /** The ordered list of unique category labels. */
  get categories(): readonly Label[] {
    return this._categorical.categories;
  }

  /** Integer codes (index into `categories`; -1 for missing). */
  get codes(): readonly number[] {
    return this._categorical.codes;
  }

  /** True when the categories have a meaningful sort order. */
  get ordered(): boolean {
    return this._categorical.ordered;
  }

  /** Always `Dtype.category`. */
  get dtype(): Dtype {
    return Dtype.category;
  }

  // ─── overridden Index properties ───────────────────────────────

  /** True when values are monotonically increasing (uses category order when ordered). */
  override get isMonotonicIncreasing(): boolean {
    if (this.ordered) {
      return isMonotonicOrdered(this._categorical, true);
    }
    return super.isMonotonicIncreasing;
  }

  /** True when values are monotonically decreasing (uses category order when ordered). */
  override get isMonotonicDecreasing(): boolean {
    if (this.ordered) {
      return isMonotonicOrdered(this._categorical, false);
    }
    return super.isMonotonicDecreasing;
  }

  // ─── category management ───────────────────────────────────────

  /** Return a new `CategoricalIndex` with categories renamed element-wise. */
  renameCategories(newCategories: readonly Label[]): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.renameCategories(newCategories),
      this.name,
    );
  }

  /** Return a new `CategoricalIndex` with categories reordered. */
  reorderCategories(newOrder: readonly Label[], ordered?: boolean): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.reorderCategories(newOrder, ordered),
      this.name,
    );
  }

  /** Return a new `CategoricalIndex` with extra categories appended. */
  addCategories(newCategories: readonly Label[]): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.addCategories(newCategories),
      this.name,
    );
  }

  /** Return a new `CategoricalIndex` with the specified categories removed. */
  removeCategories(toRemove: readonly Label[]): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.removeCategories(toRemove),
      this.name,
    );
  }

  /** Return a new `CategoricalIndex` with only the categories that appear in the data. */
  removeUnusedCategories(): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.removeUnusedCategories(),
      this.name,
    );
  }

  /**
   * Return a new `CategoricalIndex` with `categories` set to `newCategories`.
   *
   * Values no longer in the new vocabulary become `null`.
   */
  setCategories(newCategories: readonly Label[], options: CategoricalOptions = {}): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical.setCategories(newCategories, options),
      this.name,
    );
  }

  /** Return a new `CategoricalIndex` with `ordered = true`. */
  asOrdered(): CategoricalIndex {
    return CategoricalIndex.fromCategorical(this._categorical.asOrdered(), this.name);
  }

  /** Return a new `CategoricalIndex` with `ordered = false`. */
  asUnordered(): CategoricalIndex {
    return CategoricalIndex.fromCategorical(this._categorical.asUnordered(), this.name);
  }

  // ─── overridden manipulation ───────────────────────────────────

  /** Return a shallow copy, preserving the categorical. */
  override copy(name?: string | null): CategoricalIndex {
    return CategoricalIndex.fromCategorical(
      this._categorical,
      name === undefined ? this.name : name,
    );
  }

  /** Return a new `CategoricalIndex` with a different name. */
  override rename(name: string | null): CategoricalIndex {
    return CategoricalIndex.fromCategorical(this._categorical, name);
  }

  /** Sort values using category order when `ordered`, lexicographic otherwise. */
  override sortValues(ascending = true): CategoricalIndex {
    if (this.ordered) {
      return sortByCategoryOrder(this, ascending);
    }
    const base = super.sortValues(ascending);
    return new CategoricalIndex(base.values, {
      categories: [...this.categories],
      ordered: false,
      name: this.name,
    });
  }

  // ─── pretty-print ──────────────────────────────────────────────

  override toString(): string {
    const vals = this._values.map((v) => (v === null ? "null" : String(v))).join(", ");
    const cats = this.categories.map(String).join(", ");
    const ordStr = this.ordered ? ", ordered=true" : "";
    const nameStr = this.name !== null ? `, name='${this.name}'` : "";
    return `CategoricalIndex([${vals}], categories=[${cats}]${ordStr}${nameStr})`;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Check monotonicity using category position as the ordering key. */
function isMonotonicOrdered(cat: Categorical, ascending: boolean): boolean {
  const codes = cat.codes;
  for (let i = 1; i < codes.length; i++) {
    const prev = codes[i - 1];
    const curr = codes[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    if (prev === -1 || curr === -1) {
      return false;
    }
    if (ascending ? prev > curr : prev < curr) {
      return false;
    }
  }
  return true;
}

/** Sort a CategoricalIndex using category-position order. */
function sortByCategoryOrder(ci: CategoricalIndex, ascending: boolean): CategoricalIndex {
  const codes = ci.codes;
  const indices = Array.from({ length: codes.length }, (_, i) => i);
  indices.sort((a, b) => {
    const ca = codes[a] ?? -1;
    const cb = codes[b] ?? -1;
    if (ca === cb) {
      return 0;
    }
    if (ca === -1) {
      return 1;
    }
    if (cb === -1) {
      return -1;
    }
    return ascending ? ca - cb : cb - ca;
  });
  const sortedData = indices.map((i) => {
    const code = codes[i] ?? -1;
    if (code === -1) {
      return null;
    }
    const cat = ci.categories[code];
    return cat !== undefined ? cat : null;
  });
  return new CategoricalIndex(sortedData, {
    categories: [...ci.categories],
    ordered: ci.ordered,
    name: ci.name,
  });
}
