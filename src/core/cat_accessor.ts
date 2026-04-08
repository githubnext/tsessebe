/**
 * CategoricalAccessor — the `Series.cat` accessor, mirroring `pandas.Categorical`.
 *
 * Exposes categorical operations on a Series: managing categories, ordering,
 * encoding, and renaming.
 *
 * Access via `series.cat` on any Series (values treated as category labels).
 *
 * @example
 * ```ts
 * const s = new Series({ data: ["b", "a", "c", "a", "b"] });
 * s.cat.categories;           // Index { 0: "a", 1: "b", 2: "c" }
 * s.cat.codes.toArray();      // [1, 0, 2, 0, 1]
 * s.cat.addCategories(["d"]).cat.categories.values; // ["a","b","c","d"]
 * ```
 *
 * @module
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";

// ─── forward-declared Series type (avoids circular import) ────────────────────

/**
 * Minimal interface for the Series type needed by CategoricalAccessor.
 * The real `Series<T>` class satisfies this interface.
 */
export interface CatSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;
  /** Create a new Series with the given data, preserving index and name. */
  withValues(data: readonly Scalar[], name?: string | null): CatSeriesLike;
  /** Return the values as a plain array. */
  toArray(): readonly Scalar[];
  /** The cat accessor (for chaining after mutation methods). */
  readonly cat: CategoricalAccessor;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a sorted, deduplicated array of non-missing category labels. */
function buildCategories(values: readonly Scalar[]): Scalar[] {
  const seen = new Set<string>();
  const cats: Scalar[] = [];
  for (const v of values) {
    if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
      continue;
    }
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

/** Build a category-to-code map. */
function buildCodeMap(categories: readonly Scalar[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < categories.length; i++) {
    m.set(String(categories[i]), i);
  }
  return m;
}

/**
 * Lightweight CatSeriesLike that avoids circular-importing the real Series.
 * Used only by CategoricalAccessor.valueCounts to emit a result whose length
 * differs from the original series.
 */
class PlainSeries implements CatSeriesLike {
  readonly values: readonly Scalar[];
  readonly index: Index<Label>;
  readonly name: string | null;

  constructor(values: readonly Scalar[], index: Index<Label>, name: string | null) {
    this.values = values;
    this.index = index;
    this.name = name;
  }

  get cat(): CategoricalAccessor {
    return new CategoricalAccessor(this);
  }

  withValues(data: readonly Scalar[], name?: string | null): CatSeriesLike {
    return new PlainSeries(data, this.index, name === undefined ? this.name : name);
  }

  toArray(): readonly Scalar[] {
    return [...this.values];
  }
}

// ─── CategoricalAccessor ─────────────────────────────────────────────────────

/**
 * Categorical accessor for a {@link CatSeriesLike} (typically a `Series`).
 *
 * Provides pandas-compatible `.cat` operations:
 *
 * - **Read-only**: `categories`, `codes`, `ordered`, `nCategories`
 * - **Mutation** (returns new Series): `addCategories`, `removeCategories`,
 *   `removeUnusedCategories`, `renameCategories`, `setCategories`,
 *   `reorderCategories`, `asOrdered`, `asUnordered`
 *
 * Obtain via `series.cat`:
 * ```ts
 * const s = new Series({ data: ["b", "a", "c", "a"] });
 * s.cat.codes.toArray(); // [1, 0, 2, 0]
 * ```
 */
export class CategoricalAccessor {
  private readonly _series: CatSeriesLike;
  private readonly _cats: readonly Scalar[];
  private readonly _ordered: boolean;

  /**
   * @param series  - Source Series.
   * @param cats    - Explicit categories; inferred from unique values when omitted.
   * @param ordered - Whether the category ordering is meaningful (default false).
   */
  constructor(series: CatSeriesLike, cats?: readonly Scalar[], ordered = false) {
    this._series = series;
    this._cats = cats ?? buildCategories(series.values);
    this._ordered = ordered;
  }

  // ─── read-only properties ────────────────────────────────────────────────

  /**
   * An Index of the unique categories in sorted order.
   *
   * ```ts
   * s.cat.categories.values; // ["a", "b", "c"]
   * ```
   */
  get categories(): Index<Label> {
    return new Index<Label>(this._cats as Label[]);
  }

  /** Number of unique categories. */
  get nCategories(): number {
    return this._cats.length;
  }

  /** Whether the categorical order is meaningful. */
  get ordered(): boolean {
    return this._ordered;
  }

  /**
   * Integer codes for each value (position in `categories`; `-1` for missing).
   *
   * ```ts
   * s.cat.codes.toArray(); // [1, 0, 2, 0, 1]
   * ```
   */
  get codes(): CatSeriesLike {
    const codeMap = buildCodeMap(this._cats);
    const coded: Scalar[] = this._series.values.map((v): Scalar => {
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return -1;
      }
      const code = codeMap.get(String(v));
      return code !== undefined ? code : -1;
    });
    return this._series.withValues(
      coded,
      this._series.name !== null ? `${this._series.name}_codes` : "codes",
    );
  }

  // ─── mutation methods (all return a new Series) ────────────────────────

  /**
   * Add new categories without changing existing values.
   *
   * @throws {Error} if any new category already exists.
   */
  addCategories(newCats: readonly Scalar[]): CatSeriesLike {
    const existing = new Set(this._cats.map(String));
    for (const c of newCats) {
      if (existing.has(String(c))) {
        throw new Error(`Category already exists: ${String(c)}`);
      }
    }
    const merged = [...this._cats, ...newCats];
    return this._withCats(merged, this._ordered);
  }

  /**
   * Remove the given categories; values matching removed categories become null.
   *
   * @throws {Error} if any category to remove does not exist.
   */
  removeCategories(removeCats: readonly Scalar[]): CatSeriesLike {
    const removeSet = new Set(removeCats.map(String));
    for (const c of removeCats) {
      if (!this._cats.some((x) => String(x) === String(c))) {
        throw new Error(`Category not found: ${String(c)}`);
      }
    }
    const remaining = this._cats.filter((c) => !removeSet.has(String(c)));
    const newValues = this._series.values.map((v): Scalar => {
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return null;
      }
      return removeSet.has(String(v)) ? null : v;
    });
    return this._withCatsAndValues(remaining, newValues, this._ordered);
  }

  /** Remove categories that don't appear in the data. */
  removeUnusedCategories(): CatSeriesLike {
    const used = new Set(
      this._series.values.filter((v) => v !== null && v !== undefined).map(String),
    );
    const remaining = this._cats.filter((c) => used.has(String(c)));
    return this._withCats(remaining, this._ordered);
  }

  /**
   * Rename categories without changing values.
   *
   * @param mapping - Object mapping old names to new names, or an array of
   *   replacement names (must have same length as `categories`).
   */
  renameCategories(mapping: Record<string, Scalar> | readonly Scalar[]): CatSeriesLike {
    let newCats: Scalar[];
    if (Array.isArray(mapping)) {
      if (mapping.length !== this._cats.length) {
        throw new Error(
          `renameCategories array length (${mapping.length}) must equal category count (${this._cats.length})`,
        );
      }
      newCats = [...mapping];
    } else {
      newCats = this._cats.map((c) => {
        const key = String(c);
        const v: unknown = (mapping as unknown as Record<string, unknown>)[key];
        return Object.prototype.hasOwnProperty.call(mapping, key) && v !== undefined
          ? (v as Scalar)
          : c;
      });
    }
    const oldToNew = new Map<string, Scalar>();
    for (let i = 0; i < this._cats.length; i++) {
      oldToNew.set(String(this._cats[i]), newCats[i] as Scalar);
    }
    const newValues = this._series.values.map((v): Scalar => {
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return null;
      }
      const mapped = oldToNew.get(String(v));
      return mapped !== undefined ? mapped : v;
    });
    return this._withCatsAndValues(newCats, newValues, this._ordered);
  }

  /**
   * Set the categories to an explicit list, possibly reordering.
   * Values not in the new list become null.
   */
  setCategories(newCats: readonly Scalar[], ordered?: boolean): CatSeriesLike {
    const catSet = new Set(newCats.map(String));
    const newValues = this._series.values.map((v): Scalar => {
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return null;
      }
      return catSet.has(String(v)) ? v : null;
    });
    return this._withCatsAndValues([...newCats], newValues, ordered ?? this._ordered);
  }

  /**
   * Reorder categories to the given list (must contain the same categories).
   *
   * @throws {Error} if the new ordering doesn't match the existing set.
   */
  reorderCategories(newOrder: readonly Scalar[], ordered?: boolean): CatSeriesLike {
    const existing = new Set(this._cats.map(String));
    const given = new Set(newOrder.map(String));
    if (existing.size !== given.size || [...existing].some((c) => !given.has(c))) {
      throw new Error("reorderCategories: new order must contain exactly the same categories");
    }
    return this._withCats([...newOrder], ordered ?? this._ordered);
  }

  /** Return a new Series whose `.cat` treats categories as ordered. */
  asOrdered(): CatSeriesLike {
    return this._withCats(this._cats, true);
  }

  /** Return a new Series whose `.cat` treats categories as unordered. */
  asUnordered(): CatSeriesLike {
    return this._withCats(this._cats, false);
  }

  // ─── value_counts helper ─────────────────────────────────────────────────

  /**
   * Count occurrences of each category (including zero counts for unused ones).
   *
   * Returns a new Series where index is the categories and values are counts.
   */
  valueCounts(): CatSeriesLike {
    const counts = new Map<string, number>();
    for (const c of this._cats) {
      counts.set(String(c), 0);
    }
    for (const v of this._series.values) {
      if (v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v))) {
        const key = String(v);
        const prev = counts.get(key);
        if (prev !== undefined) {
          counts.set(key, prev + 1);
        }
      }
    }
    const catLabels: Label[] = this._cats.map((c) => c as Label);
    const countVals: Scalar[] = this._cats.map((c) => counts.get(String(c)) ?? 0);
    const idx = new Index<Label>(catLabels);
    const inner = new PlainSeries(countVals, idx, "count");
    return new CatHolder(inner, this._cats, this._ordered);
  }

  // ─── private helpers ──────────────────────────────────────────────────────

  /** Return a new Series with the same values but updated categories/ordered. */
  private _withCats(cats: readonly Scalar[], ordered: boolean): CatSeriesLike {
    return this._withCatsAndValues(cats, this._series.values, ordered);
  }

  /**
   * Return a new Series with updated values AND categories.
   * The CategoricalAccessor is rebuilt by the Series when `.cat` is accessed.
   */
  private _withCatsAndValues(
    cats: readonly Scalar[],
    values: readonly Scalar[],
    ordered: boolean,
  ): CatSeriesLike {
    const base = this._series.withValues(values);
    // Attach category metadata via a wrapped accessor on the result.
    // We store the metadata by creating a CatHolder on the returned series.
    return new CatHolder(base, cats, ordered);
  }
}

// ─── CatHolder ────────────────────────────────────────────────────────────────

/**
 * Internal wrapper that attaches explicit category metadata to a CatSeriesLike.
 *
 * This allows `addCategories` / `removeCategories` / etc. to persist the
 * updated category list through chained calls.
 */
class CatHolder implements CatSeriesLike {
  private readonly _inner: CatSeriesLike;
  private readonly _accessor: CategoricalAccessor;

  constructor(inner: CatSeriesLike, cats: readonly Scalar[], ordered: boolean) {
    this._inner = inner;
    this._accessor = new CategoricalAccessor(this, cats, ordered);
  }

  get values(): readonly Scalar[] {
    return this._inner.values;
  }

  get index(): Index<Label> {
    return this._inner.index;
  }

  get name(): string | null {
    return this._inner.name;
  }

  get cat(): CategoricalAccessor {
    return this._accessor;
  }

  withValues(data: readonly Scalar[], name?: string | null): CatSeriesLike {
    return this._inner.withValues(data, name);
  }

  toArray(): readonly Scalar[] {
    return this._inner.toArray();
  }
}
