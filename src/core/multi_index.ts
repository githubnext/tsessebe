/**
 * MultiIndex — a hierarchical (multi-level) index for pandas-compatible
 * multi-level labelling of rows and columns.
 *
 * Mirrors `pandas.MultiIndex`: stores an ordered sequence of label-tuples
 * represented internally as a list of levels (`Index<Label>`) and a matching
 * list of integer code arrays that point into those levels.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromTuples([["a", 1], ["a", 2], ["b", 1]]);
 * mi.nlevels;          // 2
 * mi.size;             // 3
 * mi.at(0);            // ["a", 1]
 * mi.getLoc(["a", 1]); // 0
 * ```
 */

import type { Label } from "../types.ts";
import { Index } from "./base-index.ts";

// ─── option types ────────────────────────────────────────────────────────────

/** Options shared by the `MultiIndex` factory methods. */
export interface MultiIndexOptions {
  /** Optional name for each level. */
  readonly names?: readonly (string | null)[];
}

// ─── internal helpers ────────────────────────────────────────────────────────

/**
 * Build levels + codes for one axis from an array of label arrays.
 * Each inner array must have the same length; that length becomes `size`.
 */
function buildLevelsAndCodes(arrays: readonly (readonly Label[])[]): {
  levels: Index<Label>[];
  codes: number[][];
} {
  const levels: Index<Label>[] = [];
  const codes: number[][] = [];

  for (const arr of arrays) {
    const seen = new Map<Label, number>();
    const levelVals: Label[] = [];
    const lvlCodes: number[] = [];
    for (const v of arr) {
      if (!seen.has(v)) {
        seen.set(v, levelVals.length);
        levelVals.push(v);
      }
      lvlCodes.push(seen.get(v) as number);
    }
    levels.push(new Index<Label>(levelVals));
    codes.push(lvlCodes);
  }
  return { levels, codes };
}

/** Fill one level's output array for the Cartesian product. */
function fillProductLevel(
  lvlOut: Label[],
  arr: readonly Label[],
  outer: number,
  repeat: number,
): void {
  for (let o = 0; o < outer; o++) {
    for (const v of arr) {
      for (let r = 0; r < repeat; r++) {
        lvlOut.push(v);
      }
    }
  }
}

/** Expand the Cartesian product of the given iterables into per-level arrays. */
function cartesianProduct(iterables: readonly (readonly Label[])[]): Label[][] {
  if (iterables.length === 0) {
    return [];
  }
  const result: Label[][] = Array.from({ length: iterables.length }, () => []);
  // Compute cumulative total sizes from the right (without spread)
  const totals: number[] = new Array<number>(iterables.length).fill(1);
  let block = 1;
  for (let i = iterables.length - 1; i >= 0; i--) {
    block *= (iterables[i] ?? []).length;
    totals[i] = block;
  }
  const total = block;

  for (let i = 0; i < iterables.length; i++) {
    const arr = iterables[i] ?? [];
    const levelTotal = totals[i] ?? 1;
    fillProductLevel(result[i] ?? [], arr, total / levelTotal, levelTotal / arr.length);
  }
  return result;
}

/** Encode a tuple as a single string key for de-dup checks. */
function tupleKey(tuple: readonly Label[]): string {
  return JSON.stringify(tuple);
}

/** Return true when two tuples are element-wise equal. */
function tuplesEqual(a: readonly Label[], b: readonly Label[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/** Validate that all code arrays have the same length. */
function validateLengths(codes: readonly (readonly number[])[]): number {
  if (codes.length === 0) {
    return 0;
  }
  const len = codes[0]?.length ?? 0;
  for (const c of codes) {
    if (c.length !== len) {
      throw new Error("MultiIndex: all code arrays must have the same length");
    }
  }
  return len;
}

/** Decode a single positional index into a label tuple. */
function decodeTuple(
  i: number,
  levels: readonly Index<Label>[],
  codes: readonly (readonly number[])[],
): readonly Label[] {
  return levels.map((lvl, d) => {
    const code = codes[d]?.[i];
    return code === undefined || code < 0 ? null : (lvl.values[code] ?? null);
  });
}

// ─── MultiIndex class ────────────────────────────────────────────────────────

/**
 * An immutable hierarchical index consisting of multiple levels.
 *
 * Internally represented as:
 * - `levels`: one `Index<Label>` per level, holding unique values.
 * - `codes`: one integer array per level; each element points into the
 *   corresponding level's values (`-1` means null/missing).
 */
export class MultiIndex {
  /** Per-level arrays of unique values. */
  readonly levels: readonly Index<Label>[];

  /** Per-level integer code arrays (same length as `size`). */
  readonly codes: readonly (readonly number[])[];

  /** Optional human-readable name for each level. */
  readonly names: readonly (string | null)[];

  // ─── construction ───────────────────────────────────────────────

  private constructor(
    levels: readonly Index<Label>[],
    codes: readonly (readonly number[])[],
    names?: readonly (string | null)[],
  ) {
    if (levels.length !== codes.length) {
      throw new Error("MultiIndex: levels and codes must have the same length");
    }
    validateLengths(codes);
    this.levels = levels;
    this.codes = codes;
    this.names = names ?? levels.map(() => null);
  }

  // ─── factories ──────────────────────────────────────────────────

  /**
   * Build a `MultiIndex` from an array of label-tuples.
   *
   * ```ts
   * MultiIndex.fromTuples([["a", 1], ["a", 2], ["b", 1]]);
   * ```
   */
  static fromTuples(tuples: readonly (readonly Label[])[], opts?: MultiIndexOptions): MultiIndex {
    if (tuples.length === 0) {
      return new MultiIndex([], [], opts?.names ?? []);
    }
    const nlevels = tuples[0]?.length ?? 0;
    const arrays: Label[][] = Array.from({ length: nlevels }, () => []);
    for (const t of tuples) {
      for (let d = 0; d < nlevels; d++) {
        (arrays[d] ?? []).push(t[d] ?? null);
      }
    }
    const { levels, codes } = buildLevelsAndCodes(arrays);
    return new MultiIndex(levels, codes, opts?.names);
  }

  /**
   * Build a `MultiIndex` from per-level arrays of labels.
   *
   * ```ts
   * MultiIndex.fromArrays([["a", "a", "b"], [1, 2, 1]]);
   * ```
   */
  static fromArrays(arrays: readonly (readonly Label[])[], opts?: MultiIndexOptions): MultiIndex {
    const { levels, codes } = buildLevelsAndCodes(arrays);
    return new MultiIndex(levels, codes, opts?.names);
  }

  /**
   * Build a `MultiIndex` from the Cartesian product of the given iterables.
   *
   * ```ts
   * MultiIndex.fromProduct([["a", "b"], [1, 2]]);
   * // => [("a",1), ("a",2), ("b",1), ("b",2)]
   * ```
   */
  static fromProduct(
    iterables: readonly (readonly Label[])[],
    opts?: MultiIndexOptions,
  ): MultiIndex {
    const arrays = cartesianProduct(iterables);
    const { levels, codes } = buildLevelsAndCodes(arrays);
    return new MultiIndex(levels, codes, opts?.names);
  }

  // ─── properties ─────────────────────────────────────────────────

  /** Number of levels. */
  get nlevels(): number {
    return this.levels.length;
  }

  /** Number of entries (tuples). */
  get size(): number {
    return this.codes[0]?.length ?? 0;
  }

  /** Shape tuple (always 1-D). */
  get shape(): [number] {
    return [this.size];
  }

  /** Number of dimensions (always 1). */
  get ndim(): 1 {
    return 1;
  }

  /** True when there are zero entries. */
  get empty(): boolean {
    return this.size === 0;
  }

  /** True when every tuple appears exactly once. */
  get isUnique(): boolean {
    const seen = new Set<string>();
    for (let i = 0; i < this.size; i++) {
      const key = tupleKey(this.toTuple(i));
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }
    return true;
  }

  // ─── element access ─────────────────────────────────────────────

  /** Return the tuple at positional index `i`. */
  at(i: number): readonly Label[] {
    const len = this.size;
    const idx = i < 0 ? len + i : i;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`MultiIndex: position ${i} out of bounds for size ${len}`);
    }
    return this.toTuple(idx);
  }

  /** Decode position `i` into a label tuple. */
  private toTuple(i: number): readonly Label[] {
    return decodeTuple(i, this.levels, this.codes);
  }

  /** Return the full sequence of tuples as an array. */
  toArray(): (readonly Label[])[] {
    return Array.from({ length: this.size }, (_, i) => this.toTuple(i));
  }

  /** Alias for `toArray()`. */
  toList(): (readonly Label[])[] {
    return this.toArray();
  }

  // ─── look-up ────────────────────────────────────────────────────

  /**
   * Return the integer position(s) of `key` (a label-tuple).
   *
   * - Returns a single `number` when the tuple appears exactly once.
   * - Returns an array of `number` when the tuple appears more than once.
   * - Throws `Error` when the tuple is not found.
   */
  getLoc(key: readonly Label[]): number | readonly number[] {
    const positions = this.findPositions(key);
    if (positions.length === 0) {
      throw new Error(`KeyError: ${JSON.stringify(key)}`);
    }
    if (positions.length === 1) {
      return positions[0] as number;
    }
    return positions;
  }

  /** True when `key` exists in this index. */
  contains(key: readonly Label[]): boolean {
    return this.findPositions(key).length > 0;
  }

  private findPositions(key: readonly Label[]): number[] {
    const positions: number[] = [];
    for (let i = 0; i < this.size; i++) {
      if (tuplesEqual(this.toTuple(i), key)) {
        positions.push(i);
      }
    }
    return positions;
  }

  /**
   * Boolean mask: `true` at each position whose tuple is in `items`.
   */
  isin(items: readonly (readonly Label[])[]): readonly boolean[] {
    const keySet = new Set(items.map(tupleKey));
    return Array.from({ length: this.size }, (_, i) => keySet.has(tupleKey(this.toTuple(i))));
  }

  // ─── level operations ────────────────────────────────────────────

  /**
   * Return a new `MultiIndex` with the specified level(s) dropped.
   * If only one level remains, returns a plain `Index<Label>` instead.
   *
   * @param level - Level number(s) to drop (0-based).
   */
  droplevel(level: number | readonly number[]): MultiIndex | Index<Label> {
    const toDrop = new Set(typeof level === "number" ? [level] : level);
    const keepIdx: number[] = [];
    for (let i = 0; i < this.nlevels; i++) {
      if (!toDrop.has(i)) {
        keepIdx.push(i);
      }
    }
    if (keepIdx.length === 0) {
      throw new Error("MultiIndex: cannot drop all levels");
    }
    if (keepIdx.length === 1) {
      return this.extractSingleLevel(keepIdx[0] as number);
    }
    const newLevels = keepIdx.map((i) => this.levels[i] as Index<Label>);
    const newCodes = keepIdx.map((i) => this.codes[i] as readonly number[]);
    const newNames = keepIdx.map((i) => this.names[i] ?? null);
    return new MultiIndex(newLevels, newCodes, newNames);
  }

  /** Extract a single level as a plain `Index<Label>`. */
  private extractSingleLevel(level: number): Index<Label> {
    const lvl = this.levels[level];
    if (lvl === undefined) {
      throw new RangeError(`MultiIndex: level ${level} out of range`);
    }
    const labels: Label[] = (this.codes[level] ?? []).map((c) =>
      c < 0 ? null : (lvl.values[c] ?? null),
    );
    return new Index<Label>(labels, this.names[level] ?? null);
  }

  /**
   * Return a new `MultiIndex` with levels `i` and `j` exchanged.
   */
  swaplevel(i = -2, j = -1): MultiIndex {
    const n = this.nlevels;
    const ii = i < 0 ? n + i : i;
    const jj = j < 0 ? n + j : j;
    return this.reorderLevels(
      Array.from({ length: n }, (_, k) => {
        if (k === ii) {
          return jj;
        }
        if (k === jj) {
          return ii;
        }
        return k;
      }),
    );
  }

  /**
   * Return a new `MultiIndex` with levels reordered according to `order`.
   *
   * `order` must be a permutation of `[0, 1, ..., nlevels-1]`.
   */
  reorderLevels(order: readonly number[]): MultiIndex {
    if (order.length !== this.nlevels) {
      throw new Error("MultiIndex: order length must equal nlevels");
    }
    const newLevels = order.map((i) => this.levels[i] as Index<Label>);
    const newCodes = order.map((i) => this.codes[i] as readonly number[]);
    const newNames = order.map((i) => this.names[i] ?? null);
    return new MultiIndex(newLevels, newCodes, newNames);
  }

  /**
   * Return a new `MultiIndex` with the given level names set.
   */
  setNames(names: readonly (string | null)[]): MultiIndex {
    if (names.length !== this.nlevels) {
      throw new Error("MultiIndex: names length must equal nlevels");
    }
    return new MultiIndex(this.levels, this.codes, names);
  }

  // ─── missing values ─────────────────────────────────────────────

  /**
   * Boolean mask: `true` at positions where *any* level value is `null`.
   */
  isna(): readonly boolean[] {
    return Array.from({ length: this.size }, (_, i) => this.toTuple(i).some((v) => v === null));
  }

  /**
   * Boolean mask: `true` at positions where *no* level value is `null`.
   */
  notna(): readonly boolean[] {
    return this.isna().map((v) => !v);
  }

  /** Return a new `MultiIndex` with all rows that have any `null` removed. */
  dropna(): MultiIndex {
    const mask = this.notna();
    return this.filterByMask(mask);
  }

  private filterByMask(mask: readonly boolean[]): MultiIndex {
    const keepPos: number[] = [];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        keepPos.push(i);
      }
    }
    const newCodes = this.codes.map((c) => keepPos.map((i) => c[i] ?? -1));
    return new MultiIndex(this.levels, newCodes, this.names);
  }

  // ─── duplicate handling ─────────────────────────────────────────

  /** True when any tuple appears more than once. */
  get hasDuplicates(): boolean {
    return !this.isUnique;
  }

  /**
   * Boolean mask flagging duplicate tuples.
   *
   * @param keep `"first"` marks later occurrences; `"last"` marks earlier ones;
   *             `false` marks all occurrences of any duplicate.
   */
  duplicated(keep: "first" | "last" | false = "first"): readonly boolean[] {
    const keys = Array.from({ length: this.size }, (_, i) => tupleKey(this.toTuple(i)));
    if (keep === "first") {
      return this.dupKeepFirst(keys);
    }
    if (keep === "last") {
      return this.dupKeepLast(keys);
    }
    return this.dupKeepNone(keys);
  }

  private dupKeepFirst(keys: string[]): readonly boolean[] {
    const seen = new Set<string>();
    return keys.map((k) => {
      if (seen.has(k)) {
        return true;
      }
      seen.add(k);
      return false;
    });
  }

  private dupKeepLast(keys: string[]): readonly boolean[] {
    const seen = new Set<string>();
    const result = new Array<boolean>(keys.length).fill(false);
    for (let i = keys.length - 1; i >= 0; i--) {
      const k = keys[i] ?? "";
      if (seen.has(k)) {
        result[i] = true;
      } else {
        seen.add(k);
      }
    }
    return result;
  }

  private dupKeepNone(keys: string[]): readonly boolean[] {
    const counts = new Map<string, number>();
    for (const k of keys) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return keys.map((k) => (counts.get(k) ?? 0) > 1);
  }

  /** Return a new `MultiIndex` with duplicate tuples removed. */
  dropDuplicates(keep: "first" | "last" = "first"): MultiIndex {
    const mask = this.duplicated(keep).map((d) => !d);
    return this.filterByMask(mask);
  }

  // ─── set operations ─────────────────────────────────────────────

  /** Return the union of this and `other`. */
  union(other: MultiIndex): MultiIndex {
    const seen = new Set<string>();
    const tuples: (readonly Label[])[] = [];
    for (let i = 0; i < this.size; i++) {
      const t = this.toTuple(i);
      const k = tupleKey(t);
      if (!seen.has(k)) {
        seen.add(k);
        tuples.push(t);
      }
    }
    for (let i = 0; i < other.size; i++) {
      const t = other.toTuple(i);
      const k = tupleKey(t);
      if (!seen.has(k)) {
        seen.add(k);
        tuples.push(t);
      }
    }
    return MultiIndex.fromTuples(tuples, { names: this.names });
  }

  /** Return elements common to both indices. */
  intersection(other: MultiIndex): MultiIndex {
    const otherSet = new Set<string>(
      Array.from({ length: other.size }, (_, i) => tupleKey(other.toTuple(i))),
    );
    const seen = new Set<string>();
    const tuples: (readonly Label[])[] = [];
    for (let i = 0; i < this.size; i++) {
      const t = this.toTuple(i);
      const k = tupleKey(t);
      if (otherSet.has(k) && !seen.has(k)) {
        seen.add(k);
        tuples.push(t);
      }
    }
    return MultiIndex.fromTuples(tuples, { names: this.names });
  }

  /** Return elements in `this` but not in `other`. */
  difference(other: MultiIndex): MultiIndex {
    const otherSet = new Set<string>(
      Array.from({ length: other.size }, (_, i) => tupleKey(other.toTuple(i))),
    );
    const seen = new Set<string>();
    const tuples: (readonly Label[])[] = [];
    for (let i = 0; i < this.size; i++) {
      const t = this.toTuple(i);
      const k = tupleKey(t);
      if (otherSet.has(k) || seen.has(k)) {
        continue;
      }
      seen.add(k);
      tuples.push(t);
    }
    return MultiIndex.fromTuples(tuples, { names: this.names });
  }

  // ─── sorting ────────────────────────────────────────────────────

  /** Return a new `MultiIndex` sorted lexicographically. */
  sortValues(ascending = true): MultiIndex {
    const order = Array.from({ length: this.size }, (_, i) => i);
    order.sort((a, b) => compareTuples(this.toTuple(a), this.toTuple(b), ascending));
    const newCodes = this.codes.map((c) => order.map((i) => c[i] ?? -1));
    return new MultiIndex(this.levels, newCodes, this.names);
  }

  // ─── comparison ─────────────────────────────────────────────────

  /** True when sizes and all tuples match element-wise. */
  equals(other: MultiIndex): boolean {
    if (this.size !== other.size || this.nlevels !== other.nlevels) {
      return false;
    }
    for (let i = 0; i < this.size; i++) {
      if (!tuplesEqual(this.toTuple(i), other.toTuple(i))) {
        return false;
      }
    }
    return true;
  }

  // ─── iteration / misc ──────────────────────────────────────────

  /** Allow `for…of` iteration over tuples. */
  *[Symbol.iterator](): Generator<readonly Label[]> {
    for (let i = 0; i < this.size; i++) {
      yield this.toTuple(i);
    }
  }

  /** Return a human-readable representation. */
  toString(): string {
    const tuples = this.toArray()
      .slice(0, 8)
      .map((t) => `(${t.map(String).join(", ")})`)
      .join(", ");
    const ellipsis = this.size > 8 ? ", ..." : "";
    const namesStr = this.names.some((n) => n !== null)
      ? `, names=${JSON.stringify(this.names)}`
      : "";
    return `MultiIndex([${tuples}${ellipsis}]${namesStr})`;
  }
}

// ─── tuple comparison helpers ────────────────────────────────────────────────

/** Compare two non-null scalar labels; return -1 / 0 / 1. */
function compareScalars(av: number | string | boolean, bv: number | string | boolean): number {
  if (av === bv) {
    return 0;
  }
  return av < bv ? -1 : 1;
}

/** Compare one position within two tuples; `null` sorts last. */
function comparePosition(av: Label, bv: Label, ascending: boolean): number {
  if (av === bv) {
    return 0;
  }
  if (av === null) {
    return ascending ? 1 : -1;
  }
  if (bv === null) {
    return ascending ? -1 : 1;
  }
  const cmp = compareScalars(av, bv);
  return ascending ? cmp : -cmp;
}

function compareTuples(a: readonly Label[], b: readonly Label[], ascending: boolean): number {
  for (let d = 0; d < a.length; d++) {
    const r = comparePosition(a[d] ?? null, b[d] ?? null, ascending);
    if (r !== 0) {
      return r;
    }
  }
  return 0;
}
