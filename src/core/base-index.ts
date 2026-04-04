/**
 * Generic Index<T> — the immutable, labeled axis for Series and DataFrame.
 *
 * Mirrors pandas.Index: stores an ordered sequence of labels,
 * supports set operations, duplicate detection, look-up by label, and more.
 */

import type { Label } from "../types.ts";

/** Options accepted by the Index constructor. */
export interface IndexOptions<T extends Label> {
  readonly data: readonly T[];
  readonly name?: string | null;
}

/**
 * An immutable, ordered sequence of labels.
 *
 * `Index<T>` is the TypeScript equivalent of `pandas.Index`.
 * It underpins both `Series` (as the row axis) and `DataFrame`
 * (as the row axis *and* column axis).
 */
export class Index<T extends Label = Label> {
  /** Internal storage — never exposed mutably. */
  protected readonly _values: readonly T[];

  /** Optional human-readable label for this axis. */
  readonly name: string | null;

  // ─── construction ───────────────────────────────────────────────

  constructor(data: readonly T[], name?: string | null) {
    this._values = Object.freeze([...data]);
    this.name = name ?? null;
  }

  /**
   * Factory that accepts the `IndexOptions` bag.
   * Useful when forwarding options from higher-level constructors.
   */
  static from<T extends Label>(opts: IndexOptions<T>): Index<T> {
    return new Index(opts.data, opts.name);
  }

  // ─── properties ─────────────────────────────────────────────────

  /** Number of elements. */
  get size(): number {
    return this._values.length;
  }

  /** Shape tuple (always 1-D). */
  get shape(): [number] {
    return [this._values.length];
  }

  /** Number of dimensions (always 1). */
  get ndim(): 1 {
    return 1;
  }

  /** True when the index has zero elements. */
  get empty(): boolean {
    return this._values.length === 0;
  }

  /** Snapshot of the underlying values as a plain array. */
  get values(): readonly T[] {
    return this._values;
  }

  /** True when every label appears exactly once. */
  get isUnique(): boolean {
    return new Set(this._values).size === this._values.length;
  }

  /** True when any label appears more than once. */
  get hasDuplicates(): boolean {
    return !this.isUnique;
  }

  /** True when values are weakly ascending. */
  get isMonotonicIncreasing(): boolean {
    for (let i = 1; i < this._values.length; i++) {
      const prev = this._values[i - 1];
      const curr = this._values[i];
      if (prev === undefined || curr === undefined || prev === null || curr === null) {
        return false;
      }
      if (prev > curr) {
        return false;
      }
    }
    return true;
  }

  /** True when values are weakly descending. */
  get isMonotonicDecreasing(): boolean {
    for (let i = 1; i < this._values.length; i++) {
      const prev = this._values[i - 1];
      const curr = this._values[i];
      if (prev === undefined || curr === undefined || prev === null || curr === null) {
        return false;
      }
      if (prev < curr) {
        return false;
      }
    }
    return true;
  }

  // ─── element access ─────────────────────────────────────────────

  /** Return the label at positional index `i`. */
  at(i: number): T {
    const len = this._values.length;
    const idx = i < 0 ? len + i : i;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Index ${i} is out of bounds for axis of size ${len}`);
    }
    return this._values[idx] as T;
  }

  /** Return a new Index from a positional slice [start, end). */
  slice(start?: number, end?: number): Index<T> {
    return new Index<T>(this._values.slice(start, end), this.name);
  }

  /**
   * Fancy-index: return a new Index by picking positions from `indices`.
   */
  take(indices: readonly number[]): Index<T> {
    const out: T[] = [];
    for (const i of indices) {
      out.push(this.at(i));
    }
    return new Index<T>(out, this.name);
  }

  // ─── look-up ────────────────────────────────────────────────────

  /**
   * Return the integer position of `key`.
   *
   * - If `key` appears exactly once, returns a single `number`.
   * - If `key` appears more than once, returns an array of positions.
   * - If `key` is absent, throws.
   */
  getLoc(key: Label): number | readonly number[] {
    const positions: number[] = [];
    for (let i = 0; i < this._values.length; i++) {
      if (this._values[i] === key) {
        positions.push(i);
      }
    }
    if (positions.length === 0) {
      throw new Error(`KeyError: ${String(key)}`);
    }
    if (positions.length === 1) {
      return positions[0] as number;
    }
    return positions;
  }

  /**
   * Compute an indexer array for `target` against this index.
   * Each position in the returned array corresponds to a label in `target`:
   *   - its position in `this`, or
   *   - `-1` if not found.
   */
  getIndexer(target: Index<Label>): readonly number[] {
    const map = new Map<Label, number>();
    for (let i = 0; i < this._values.length; i++) {
      const v = this._values[i] as T;
      if (!map.has(v)) {
        map.set(v, i);
      }
    }
    return target._values.map((v) => map.get(v) ?? -1);
  }

  /** True when `item` exists in this index. */
  contains(item: Label): boolean {
    return this._values.some((v) => v === item);
  }

  /**
   * Boolean mask: `true` at each position whose label is in `items`.
   */
  isin(items: readonly T[]): readonly boolean[] {
    const set = new Set<T>(items);
    return this._values.map((v) => set.has(v));
  }

  // ─── set operations ─────────────────────────────────────────────

  /** Return the union of this and `other`. */
  union<U extends Label>(other: Index<U>): Index<T | U> {
    const seen = new Set<T | U>();
    const out: (T | U)[] = [];
    for (const v of this._values) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    for (const v of other._values) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return new Index<T | U>(out, this.name);
  }

  /** Return elements common to both indices. */
  intersection<U extends Label>(other: Index<U>): Index<T | U> {
    const otherSet = new Set<T | U>(other._values);
    const seen = new Set<T | U>();
    const out: (T | U)[] = [];
    for (const v of this._values) {
      if (otherSet.has(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return new Index<T | U>(out, this.name);
  }

  /** Return elements in `this` but not in `other`. */
  difference<U extends Label>(other: Index<U>): Index<T> {
    const otherSet = new Set<T | U>(other._values);
    const seen = new Set<T>();
    const out: T[] = [];
    for (const v of this._values) {
      if (!(otherSet.has(v) || seen.has(v))) {
        seen.add(v);
        out.push(v);
      }
    }
    return new Index<T>(out, this.name);
  }

  /** Return elements in either index but not in both. */
  symmetricDifference<U extends Label>(other: Index<U>): Index<T | U> {
    const thisSet = new Set<T | U>(this._values);
    const otherSet = new Set<T | U>(other._values);
    const seen = new Set<T | U>();
    const out: (T | U)[] = [];
    for (const v of this._values) {
      if (!(otherSet.has(v) || seen.has(v))) {
        seen.add(v);
        out.push(v);
      }
    }
    for (const v of other._values) {
      if (!(thisSet.has(v) || seen.has(v))) {
        seen.add(v);
        out.push(v);
      }
    }
    return new Index<T | U>(out, this.name);
  }

  // ─── duplicate handling ─────────────────────────────────────────

  /**
   * Boolean mask flagging duplicate labels.
   *
   * @param keep  `"first"` keeps the first occurrence unmarked,
   *              `"last"` keeps the last occurrence unmarked,
   *              `false` marks all duplicates.
   */
  duplicated(keep: "first" | "last" | false = "first"): readonly boolean[] {
    if (keep === "first") {
      return this.duplicatedKeepFirst();
    }
    if (keep === "last") {
      return this.duplicatedKeepLast();
    }
    return this.duplicatedKeepNone();
  }

  private duplicatedKeepFirst(): readonly boolean[] {
    const seen = new Set<T>();
    return this._values.map((v) => {
      if (seen.has(v)) {
        return true;
      }
      seen.add(v);
      return false;
    });
  }

  private duplicatedKeepLast(): readonly boolean[] {
    const seen = new Set<T>();
    const result = new Array<boolean>(this._values.length).fill(false);
    for (let i = this._values.length - 1; i >= 0; i--) {
      const v = this._values[i] as T;
      if (seen.has(v)) {
        result[i] = true;
      } else {
        seen.add(v);
      }
    }
    return result;
  }

  private duplicatedKeepNone(): readonly boolean[] {
    const counts = new Map<T, number>();
    for (const v of this._values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return this._values.map((v) => (counts.get(v) ?? 0) > 1);
  }

  /** Return a new Index with duplicates removed. */
  dropDuplicates(keep: "first" | "last" = "first"): Index<T> {
    const mask = this.duplicated(keep);
    const out: T[] = [];
    for (let i = 0; i < this._values.length; i++) {
      if (!mask[i]) {
        out.push(this._values[i] as T);
      }
    }
    return new Index<T>(out, this.name);
  }

  /** Count of unique labels. */
  nunique(): number {
    return new Set(this._values).size;
  }

  // ─── manipulation ───────────────────────────────────────────────

  /** Concatenate one or more indices. */
  append<U extends Label>(other: Index<U> | readonly Index<U>[]): Index<T | U> {
    const others = Array.isArray(other) ? other : [other];
    let combined: (T | U)[] = [...this._values];
    for (const o of others) {
      combined = combined.concat([...o._values]);
    }
    return new Index<T | U>(combined, this.name);
  }

  /** Return a new Index with `item` inserted at position `loc`. */
  insert<U extends Label>(loc: number, item: U): Index<T | U> {
    const out: (T | U)[] = [...this._values];
    out.splice(loc, 0, item);
    return new Index<T | U>(out, this.name);
  }

  /** Return a new Index with position(s) removed. */
  delete(loc: number | readonly number[]): Index<T> {
    const positions = new Set(typeof loc === "number" ? [loc] : loc);
    const out: T[] = [];
    for (let i = 0; i < this._values.length; i++) {
      if (!positions.has(i)) {
        out.push(this._values[i] as T);
      }
    }
    return new Index<T>(out, this.name);
  }

  /** Return a new Index with the given labels removed. */
  drop(labels: readonly T[]): Index<T> {
    const toDrop = new Set<T>(labels);
    return new Index<T>(
      this._values.filter((v) => !toDrop.has(v)),
      this.name,
    );
  }

  /** Return a shallow copy, optionally with a new name. */
  copy(name?: string | null): Index<T> {
    return new Index<T>([...this._values], name === undefined ? this.name : name);
  }

  /** Return a new Index with a different name. */
  rename(name: string | null): Index<T> {
    return new Index<T>(this._values, name);
  }

  // ─── comparison ─────────────────────────────────────────────────

  /** True when the *values* of two indices match element-wise (ignores name). */
  equals(other: Index<Label>): boolean {
    if (this._values.length !== other._values.length) {
      return false;
    }
    for (let i = 0; i < this._values.length; i++) {
      if (this._values[i] !== other._values[i]) {
        return false;
      }
    }
    return true;
  }

  /** True when both *values* and *name* are identical. */
  identical(other: Index<Label>): boolean {
    return this.name === other.name && this.equals(other);
  }

  // ─── conversion ─────────────────────────────────────────────────

  /** Return the labels as a plain mutable array. */
  toArray(): T[] {
    return [...this._values];
  }

  /** Alias for `toArray()` — mirrors `pandas.Index.tolist()`. */
  toList(): T[] {
    return this.toArray();
  }

  // ─── aggregation ────────────────────────────────────────────────

  /** Return the minimum label (null-safe). */
  min(): T | undefined {
    if (this._values.length === 0) {
      return undefined;
    }
    let best: T = this._values[0] as T;
    for (let i = 1; i < this._values.length; i++) {
      const v = this._values[i] as T;
      if (best === null || (v !== null && v < best)) {
        best = v;
      }
    }
    return best;
  }

  /** Return the maximum label (null-safe). */
  max(): T | undefined {
    if (this._values.length === 0) {
      return undefined;
    }
    let best: T = this._values[0] as T;
    for (let i = 1; i < this._values.length; i++) {
      const v = this._values[i] as T;
      if (best === null || (v !== null && v > best)) {
        best = v;
      }
    }
    return best;
  }

  /** Return the position of the minimum label. */
  argmin(): number {
    if (this._values.length === 0) {
      throw new Error("argmin requires a non-empty Index");
    }
    let bestIdx = 0;
    let best: T = this._values[0] as T;
    for (let i = 1; i < this._values.length; i++) {
      const v = this._values[i] as T;
      if (best === null || (v !== null && v < best)) {
        best = v;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Return the position of the maximum label. */
  argmax(): number {
    if (this._values.length === 0) {
      throw new Error("argmax requires a non-empty Index");
    }
    let bestIdx = 0;
    let best: T = this._values[0] as T;
    for (let i = 1; i < this._values.length; i++) {
      const v = this._values[i] as T;
      if (best === null || (v !== null && v > best)) {
        best = v;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Return the integer permutation that would sort this index ascending. */
  argsort(): readonly number[] {
    const indices = Array.from({ length: this._values.length }, (_, i) => i);
    indices.sort((a, b) => {
      const va = this._values[a];
      const vb = this._values[b];
      if (va === vb) {
        return 0;
      }
      if (va === undefined || va === null) {
        return 1;
      }
      if (vb === undefined || vb === null) {
        return -1;
      }
      return va < vb ? -1 : 1;
    });
    return indices;
  }

  /** Return a new Index with values sorted ascending. */
  sortValues(ascending = true): Index<T> {
    const sorted = [...this._values].sort((a, b) => {
      if (a === b) {
        return 0;
      }
      if (a === null) {
        return 1;
      }
      if (b === null) {
        return -1;
      }
      const cmp = a < b ? -1 : 1;
      return ascending ? cmp : -cmp;
    });
    return new Index<T>(sorted, this.name);
  }

  // ─── missing-value helpers ──────────────────────────────────────

  /** Boolean mask: `true` where the label is `null`. */
  isna(): readonly boolean[] {
    return this._values.map((v) => v === null);
  }

  /** Boolean mask: `true` where the label is not `null`. */
  notna(): readonly boolean[] {
    return this._values.map((v) => v !== null);
  }

  /** Return a new Index with `null` labels removed. */
  dropna(): Index<T> {
    return new Index<T>(
      this._values.filter((v): v is T => v !== null),
      this.name,
    );
  }

  /** Replace `null` labels with `value`. */
  fillna<U extends Label>(value: U): Index<T | U> {
    return new Index<T | U>(
      this._values.map((v) => (v === null ? value : v)),
      this.name,
    );
  }

  // ─── iteration / misc ──────────────────────────────────────────

  /** Allow `for…of` iteration. */
  *[Symbol.iterator](): Generator<T> {
    for (const v of this._values) {
      yield v;
    }
  }

  /** Pretty-print representation. */
  toString(): string {
    const vals = this._values.map(String).join(", ");
    const nameStr = this.name !== null ? `, name='${this.name}'` : "";
    return `Index([${vals}]${nameStr})`;
  }

  /** Return a new Index by applying `fn` to each label. */
  map<U extends Label>(fn: (value: T, index: number) => U): Index<U> {
    return new Index<U>(this._values.map(fn), this.name);
  }
}
