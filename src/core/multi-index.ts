/**
 * MultiIndex — a multi-level hierarchical index.
 *
 * Mirrors `pandas.MultiIndex`: stores axis labels as a sequence of
 * tuples, internally represented as parallel arrays of integer codes
 * into per-level label arrays.
 *
 * @example
 * ```ts
 * const mi = MultiIndex.fromArrays([["a", "a", "b", "b"], [1, 2, 1, 2]], ["letter", "number"]);
 * mi.size;              // 4
 * mi.nlevels;           // 2
 * mi.at(0);             // ["a", 1]
 * mi.getLevelValues(0); // Index(["a", "a", "b", "b"])
 * mi.getLoc(["a", 1]);  // 0
 * ```
 */

import type { Label } from "../types.ts";
import { Index } from "./base-index.ts";

// ─── types ───────────────────────────────────────────────────────────────────

/** A single multi-level key — an ordered tuple of labels. */
export type MultiIndexTuple = readonly Label[];

/** Options accepted by the MultiIndex low-level constructor. */
export interface MultiIndexOptions {
  /** One `Index<Label>` per level — the distinct values at that level. */
  readonly levels: readonly (readonly Label[])[];
  /** One code array per level — each entry maps to a position in `levels[i]`. */
  readonly codes: readonly (readonly number[])[];
  /** Optional name for each level. */
  readonly names?: readonly (string | null)[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build sorted unique values from an array, preserving null/number/string/boolean order. */
function buildLevelValues(arr: readonly Label[]): Label[] {
  const seen = new Set<Label>();
  const out: Label[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  out.sort((a, b) => {
    if (a === b) {
      return 0;
    }
    if (a === null) {
      return 1;
    }
    if (b === null) {
      return -1;
    }
    return a < b ? -1 : 1;
  });
  return out;
}

/** Build code array: map each value in `arr` to its position in `uniq`. */
function buildCodes(arr: readonly Label[], uniq: readonly Label[]): readonly number[] {
  const map = new Map<Label, number>();
  for (let i = 0; i < uniq.length; i++) {
    map.set(uniq[i] ?? null, i);
  }
  return arr.map((v) => map.get(v ?? null) ?? -1);
}

/** Compare two label values for ordering. */
function cmpLabel(a: Label, b: Label): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a < b ? -1 : 1;
}

/** Compare two tuples lexicographically. */
function cmpTuple(a: MultiIndexTuple, b: MultiIndexTuple): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const c = cmpLabel(a[i] ?? null, b[i] ?? null);
    if (c !== 0) {
      return c;
    }
  }
  return a.length - b.length;
}

/** Cartesian product of arrays. */
function cartesianProduct(arrays: readonly (readonly Label[])[]): Label[][] {
  if (arrays.length === 0) {
    return [[]];
  }
  const first = arrays[0];
  const rest = arrays.slice(1);
  if (first === undefined) {
    return [[]];
  }
  const restProduct = cartesianProduct(rest);
  const result: Label[][] = [];
  for (const v of first) {
    for (const tail of restProduct) {
      result.push([v, ...tail]);
    }
  }
  return result;
}

/** Validate that all code arrays have the same length and codes are in range. */
function validateCodesAndLevels(
  levels: readonly Index<Label>[],
  codes: readonly (readonly number[])[],
): void {
  if (levels.length !== codes.length) {
    throw new Error(
      `MultiIndex: levels length (${levels.length}) must equal codes length (${codes.length})`,
    );
  }
  const len = codes[0]?.length ?? 0;
  for (let i = 1; i < codes.length; i++) {
    if ((codes[i]?.length ?? 0) !== len) {
      throw new Error("MultiIndex: all code arrays must have the same length");
    }
  }
}

// ─── MultiIndex ───────────────────────────────────────────────────────────────

/**
 * A multi-level hierarchical index.
 *
 * `MultiIndex` represents an axis label as an ordered tuple of values,
 * one per level. Internally data is stored as a list of `levels` (distinct
 * per-level `Index<Label>` objects) and parallel `codes` arrays (integer
 * references into each level).
 */
export class MultiIndex {
  private readonly _levels: readonly Index<Label>[];
  private readonly _codes: readonly (readonly number[])[];

  /** Names of each level (parallel to `levels`). */
  readonly names: readonly (string | null)[];

  // ─── construction ──────────────────────────────────────────────────────────

  constructor(
    levels: readonly Index<Label>[],
    codes: readonly (readonly number[])[],
    names?: readonly (string | null)[],
  ) {
    validateCodesAndLevels(levels, codes);
    this._levels = levels;
    this._codes = codes;
    this.names = names !== undefined ? names : levels.map(() => null);
  }

  // ─── static factories ──────────────────────────────────────────────────────

  /**
   * Construct a `MultiIndex` from parallel arrays of labels.
   *
   * @example
   * ```ts
   * MultiIndex.fromArrays([["a", "a", "b"], [1, 2, 1]], ["x", "y"])
   * ```
   */
  static fromArrays(
    arrays: readonly (readonly Label[])[],
    names?: readonly (string | null)[],
  ): MultiIndex {
    const levels: Index<Label>[] = [];
    const codes: (readonly number[])[] = [];
    for (const arr of arrays) {
      const uniq = buildLevelValues(arr);
      levels.push(new Index<Label>(uniq));
      codes.push(buildCodes(arr, uniq));
    }
    return new MultiIndex(levels, codes, names);
  }

  /**
   * Construct a `MultiIndex` from an array of tuples.
   *
   * @example
   * ```ts
   * MultiIndex.fromTuples([["a", 1], ["a", 2], ["b", 1]], ["x", "y"])
   * ```
   */
  static fromTuples(
    tuples: readonly MultiIndexTuple[],
    names?: readonly (string | null)[],
  ): MultiIndex {
    if (tuples.length === 0) {
      return new MultiIndex([], [], names);
    }
    const nlevels = tuples[0]?.length ?? 0;
    const arrays: Label[][] = Array.from({ length: nlevels }, () => []);
    for (const tuple of tuples) {
      for (let i = 0; i < nlevels; i++) {
        const level = arrays[i];
        if (level !== undefined) {
          level.push(tuple[i] ?? null);
        }
      }
    }
    return MultiIndex.fromArrays(arrays, names);
  }

  /**
   * Construct a `MultiIndex` from the Cartesian product of iterables.
   *
   * @example
   * ```ts
   * MultiIndex.fromProduct([["a", "b"], [1, 2]], ["x", "y"])
   * // → [["a",1], ["a",2], ["b",1], ["b",2]]
   * ```
   */
  static fromProduct(
    iterables: readonly (readonly Label[])[],
    names?: readonly (string | null)[],
  ): MultiIndex {
    const tuples = cartesianProduct(iterables);
    return MultiIndex.fromTuples(tuples, names);
  }

  // ─── properties ────────────────────────────────────────────────────────────

  /** Total number of entries (length of the index). */
  get size(): number {
    return this._codes[0]?.length ?? 0;
  }

  /** Number of levels. */
  get nlevels(): number {
    return this._levels.length;
  }

  /** Per-level `Index<Label>` objects (distinct values at each level). */
  get levels(): readonly Index<Label>[] {
    return this._levels;
  }

  /** Per-level code arrays (integer positions into the corresponding level). */
  get codes(): readonly (readonly number[])[] {
    return this._codes;
  }

  /** Shape tuple: `[size, nlevels]`. */
  get shape(): [number, number] {
    return [this.size, this.nlevels];
  }

  /** Number of dimensions (always 2 for MultiIndex). */
  get ndim(): 2 {
    return 2;
  }

  /** True when every tuple appears exactly once. */
  get isUnique(): boolean {
    const seen = new Set<string>();
    for (let i = 0; i < this.size; i++) {
      const key = tupleKey(this._tupleAt(i));
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }
    return true;
  }

  /** True when tuples are weakly ascending (lexicographic order). */
  get isMonotonicIncreasing(): boolean {
    for (let i = 1; i < this.size; i++) {
      if (cmpTuple(this._tupleAt(i - 1), this._tupleAt(i)) > 0) {
        return false;
      }
    }
    return true;
  }

  /** True when tuples are weakly descending (lexicographic order). */
  get isMonotonicDecreasing(): boolean {
    for (let i = 1; i < this.size; i++) {
      if (cmpTuple(this._tupleAt(i - 1), this._tupleAt(i)) < 0) {
        return false;
      }
    }
    return true;
  }

  // ─── internal helpers ──────────────────────────────────────────────────────

  private _tupleAt(i: number): MultiIndexTuple {
    const result: Label[] = [];
    for (let lvl = 0; lvl < this._levels.length; lvl++) {
      const level = this._levels[lvl];
      const codeArr = this._codes[lvl];
      const code = codeArr !== undefined ? (codeArr[i] ?? -1) : -1;
      if (level !== undefined && code >= 0) {
        result.push(level.at(code));
      } else {
        result.push(null);
      }
    }
    return result;
  }

  // ─── element access ────────────────────────────────────────────────────────

  /**
   * Return the tuple at positional index `i`.
   *
   * Negative indices are supported (e.g. `at(-1)` returns the last entry).
   */
  at(i: number): MultiIndexTuple {
    const len = this.size;
    const idx = i < 0 ? len + i : i;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Index ${i} is out of bounds for MultiIndex of size ${len}`);
    }
    return this._tupleAt(idx);
  }

  /** All tuples as a readonly array. */
  get values(): readonly MultiIndexTuple[] {
    return Array.from({ length: this.size }, (_, i) => this._tupleAt(i));
  }

  // ─── level access ──────────────────────────────────────────────────────────

  /**
   * Return a flat `Index<Label>` of values at the given level.
   *
   * Mirrors `pandas.MultiIndex.get_level_values(level)`.
   */
  getLevelValues(level: number | string): Index<Label> {
    const lvl = this._resolveLevel(level);
    const levelIndex = this._levels[lvl];
    const codeArr = this._codes[lvl];
    if (levelIndex === undefined || codeArr === undefined) {
      throw new Error(`Level ${String(level)} does not exist`);
    }
    const vals: Label[] = codeArr.map((c) => {
      if (c < 0) {
        return null;
      }
      const v = levelIndex.values[c];
      return v !== undefined ? v : null;
    });
    return new Index<Label>(vals, this.names[lvl] ?? null);
  }

  // ─── lookup ────────────────────────────────────────────────────────────────

  /**
   * Return the position(s) of the given tuple key.
   *
   * - Single match → `number`
   * - Multiple matches → `readonly number[]`
   * - No match → throws `KeyError`
   *
   * Partial keys (shorter than `nlevels`) match all entries where the
   * first `key.length` levels match.
   */
  getLoc(key: MultiIndexTuple): number | readonly number[] {
    const positions = this._matchPositions(key);
    if (positions.length === 0) {
      throw new Error(`KeyError: ${tupleKey(key)}`);
    }
    if (positions.length === 1) {
      return positions[0] as number;
    }
    return positions;
  }

  /**
   * True when the given tuple key exists in this index.
   *
   * Partial keys are supported (see `getLoc`).
   */
  contains(key: MultiIndexTuple): boolean {
    return this._matchPositions(key).length > 0;
  }

  private _matchPositions(key: MultiIndexTuple): number[] {
    const depth = Math.min(key.length, this.nlevels);
    const targetCodes = buildTargetCodes(this._levels, key, depth);
    if (targetCodes === null) {
      return [];
    }
    return filterByTargetCodes(this._codes, this.size, targetCodes, depth);
  }

  // ─── manipulation ──────────────────────────────────────────────────────────

  /**
   * Drop one or more levels.
   *
   * - Dropping all but one level returns a flat `Index<Label>`.
   * - Otherwise returns a new `MultiIndex`.
   */
  droplevel(level: number | string | readonly (number | string)[]): Index<Label> | MultiIndex {
    const drops = new Set<number>(
      Array.isArray(level)
        ? (level as readonly (number | string)[]).map((l) => this._resolveLevel(l))
        : [this._resolveLevel(level as number | string)],
    );
    const remaining = this._levels.map((_, i) => i).filter((i) => !drops.has(i));
    if (remaining.length === 0) {
      throw new Error("Cannot drop all levels from a MultiIndex");
    }
    if (remaining.length === 1) {
      return this.getLevelValues(remaining[0] as number);
    }
    const newLevels = remaining.map((i) => this._levels[i] as Index<Label>);
    const newCodes = remaining.map((i) => this._codes[i] as readonly number[]);
    const newNames = remaining.map((i) => this.names[i] ?? null);
    return new MultiIndex(newLevels, newCodes, newNames);
  }

  /**
   * Swap two levels.
   *
   * @param i - First level (default: -2, i.e., the penultimate level).
   * @param j - Second level (default: -1, i.e., the last level).
   */
  swaplevel(i: number | string = -2, j: number | string = -1): MultiIndex {
    const a = this._resolveLevel(i);
    const b = this._resolveLevel(j);
    const newLevels = [...this._levels] as Index<Label>[];
    const newCodes = [...this._codes] as (readonly number[])[];
    const newNames = [...this.names] as (string | null)[];
    const tmpLevel = newLevels[a] as Index<Label>;
    newLevels[a] = newLevels[b] as Index<Label>;
    newLevels[b] = tmpLevel;
    const tmpCodes = newCodes[a] as readonly number[];
    newCodes[a] = newCodes[b] as readonly number[];
    newCodes[b] = tmpCodes;
    const tmpName = newNames[a] ?? null;
    newNames[a] = newNames[b] ?? null;
    newNames[b] = tmpName;
    return new MultiIndex(newLevels, newCodes, newNames);
  }

  /**
   * Return a new `MultiIndex` with updated level names.
   */
  setNames(names: readonly (string | null)[]): MultiIndex {
    if (names.length !== this.nlevels) {
      throw new Error(`setNames: expected ${this.nlevels} names, got ${names.length}`);
    }
    return new MultiIndex(this._levels, this._codes, names);
  }

  /**
   * Return a new `MultiIndex` with updated level values.
   *
   * @param levelValues - New distinct label array for the specified level.
   * @param level       - Which level to replace.
   */
  setLevels(levelValues: readonly Label[], level: number | string): MultiIndex {
    const lvl = this._resolveLevel(level);
    const newLevels = [...this._levels] as Index<Label>[];
    newLevels[lvl] = new Index<Label>(levelValues, this.names[lvl] ?? null);
    return new MultiIndex(newLevels, this._codes, this.names);
  }

  /**
   * Return a new `MultiIndex` with updated codes for the specified level.
   *
   * @param newCodes - Replacement code array (same length as current).
   * @param level    - Which level to replace.
   */
  setCodes(newCodes: readonly number[], level: number | string): MultiIndex {
    const lvl = this._resolveLevel(level);
    const allCodes = [...this._codes] as (readonly number[])[];
    allCodes[lvl] = newCodes;
    return new MultiIndex(this._levels, allCodes, this.names);
  }

  // ─── sorting ───────────────────────────────────────────────────────────────

  /**
   * Return a new `MultiIndex` with entries sorted lexicographically.
   *
   * @param ascending - Per-level sort direction, or a single boolean for all levels.
   */
  sortValues(ascending: boolean | readonly boolean[] = true): MultiIndex {
    const dirs =
      typeof ascending === "boolean"
        ? Array.from({ length: this.nlevels }, () => ascending)
        : [...ascending];
    const indices = Array.from({ length: this.size }, (_, i) => i);
    const comparator = makeSortComparator(this._levels, this._codes, dirs);
    indices.sort(comparator);
    return this._reindex(indices);
  }

  private _reindex(indices: readonly number[]): MultiIndex {
    const newCodes: (readonly number[])[] = this._codes.map((codeArr) =>
      indices.map((i) => codeArr[i] ?? -1),
    );
    return new MultiIndex(this._levels, newCodes, this.names);
  }

  // ─── set operations ────────────────────────────────────────────────────────

  /**
   * Concatenate two `MultiIndex` objects (must have the same number of levels).
   */
  append(other: MultiIndex): MultiIndex {
    if (other.nlevels !== this.nlevels) {
      throw new Error(
        `append: cannot append MultiIndex with ${other.nlevels} levels to one with ${this.nlevels} levels`,
      );
    }
    const allTuples = [...this.values, ...other.values];
    return MultiIndex.fromTuples(allTuples, this.names);
  }

  /**
   * True when `other` has identical levels, codes, and names.
   */
  equals(other: MultiIndex): boolean {
    if (this.size !== other.size || this.nlevels !== other.nlevels) {
      return false;
    }
    for (let i = 0; i < this.size; i++) {
      const t1 = this._tupleAt(i);
      const t2 = other._tupleAt(i);
      if (tupleKey(t1) !== tupleKey(t2)) {
        return false;
      }
    }
    return true;
  }

  // ─── conversion ────────────────────────────────────────────────────────────

  /** Return all tuples as a plain mutable array. */
  toArray(): MultiIndexTuple[] {
    return Array.from({ length: this.size }, (_, i) => this._tupleAt(i));
  }

  /** Alias for `toArray()`. */
  toList(): MultiIndexTuple[] {
    return this.toArray();
  }

  /**
   * Convert the `MultiIndex` to a plain object mapping level name → label array.
   *
   * This is a lightweight alternative to `toFrame` that avoids circular imports.
   * Use `DataFrame.fromColumns(mi.toRecord())` to build a DataFrame.
   */
  toRecord(): Record<string, Label[]> {
    const result: Record<string, Label[]> = {};
    for (let lvl = 0; lvl < this.nlevels; lvl++) {
      const name = this.names[lvl] ?? String(lvl);
      result[name] = this.getLevelValues(lvl).toArray();
    }
    return result;
  }

  // ─── misc ──────────────────────────────────────────────────────────────────

  /** Count of unique tuples. */
  nunique(): number {
    const seen = new Set<string>();
    for (let i = 0; i < this.size; i++) {
      seen.add(tupleKey(this._tupleAt(i)));
    }
    return seen.size;
  }

  /** Remove duplicate entries (keep first occurrence). */
  dropDuplicates(): MultiIndex {
    const seen = new Set<string>();
    const indices: number[] = [];
    for (let i = 0; i < this.size; i++) {
      const k = tupleKey(this._tupleAt(i));
      if (!seen.has(k)) {
        seen.add(k);
        indices.push(i);
      }
    }
    return this._reindex(indices);
  }

  /** Pretty-print representation. */
  toString(): string {
    const tuples = this.toArray().map((t) => `(${t.map(String).join(", ")})`);
    const namesStr = this.names.some((n) => n !== null)
      ? `, names=[${this.names.map((n) => (n === null ? "None" : `'${n}'`)).join(", ")}]`
      : "";
    return `MultiIndex([${tuples.join(", ")}]${namesStr})`;
  }

  /** Allow `for…of` iteration over tuples. */
  *[Symbol.iterator](): Generator<MultiIndexTuple> {
    for (let i = 0; i < this.size; i++) {
      yield this._tupleAt(i);
    }
  }

  // ─── private utilities ────────────────────────────────────────────────────

  private _resolveLevel(level: number | string): number {
    if (typeof level === "number") {
      const n = this.nlevels;
      const idx = level < 0 ? n + level : level;
      if (idx < 0 || idx >= n) {
        throw new RangeError(`Level ${level} is out of range for MultiIndex with ${n} levels`);
      }
      return idx;
    }
    const i = this.names.indexOf(level);
    if (i === -1) {
      throw new Error(`Level name '${level}' not found in ${JSON.stringify(this.names)}`);
    }
    return i;
  }
}

// ─── module-level helpers ────────────────────────────────────────────────────

/** Stable string key for a tuple (used for equality checks and deduplication). */
function tupleKey(tuple: MultiIndexTuple): string {
  return tuple.map((v) => (v === null ? "__NULL__" : `${typeof v}:${String(v)}`)).join("\x00");
}

/** Build target code array for a key against levels. Returns null if key not found. */
function buildTargetCodes(
  levels: readonly Index<Label>[],
  key: MultiIndexTuple,
  depth: number,
): number[] | null {
  const targetCodes: number[] = [];
  for (let lvl = 0; lvl < depth; lvl++) {
    const levelIdx = levels[lvl];
    if (levelIdx === undefined) {
      return null;
    }
    const m = new Map<Label, number>();
    for (let j = 0; j < levelIdx.size; j++) {
      m.set(levelIdx.values[j] ?? null, j);
    }
    const wantCode = m.get(key[lvl] ?? null);
    if (wantCode === undefined) {
      return null;
    }
    targetCodes.push(wantCode);
  }
  return targetCodes;
}

/** Filter row positions where all levels match the target codes. */
function filterByTargetCodes(
  codes: readonly (readonly number[])[],
  size: number,
  targetCodes: readonly number[],
  depth: number,
): number[] {
  const positions: number[] = [];
  outer: for (let i = 0; i < size; i++) {
    for (let lvl = 0; lvl < depth; lvl++) {
      const codeArr = codes[lvl];
      const want = targetCodes[lvl];
      if (codeArr === undefined || want === undefined || codeArr[i] !== want) {
        continue outer;
      }
    }
    positions.push(i);
  }
  return positions;
}

/** Compare two rows at a single level. Returns null if inconclusive. */
function compareAtLevel(
  codes: readonly (readonly number[])[],
  levels: readonly Index<Label>[],
  dirs: readonly boolean[],
  lvl: number,
  a: number,
  b: number,
): number | null {
  const codeArr = codes[lvl];
  const levelIdx = levels[lvl];
  if (codeArr === undefined || levelIdx === undefined) {
    return null;
  }
  const ca = codeArr[a] ?? -1;
  const cb = codeArr[b] ?? -1;
  const va = ca >= 0 ? (levelIdx.values[ca] ?? null) : null;
  const vb = cb >= 0 ? (levelIdx.values[cb] ?? null) : null;
  const c = cmpLabel(va, vb);
  if (c !== 0) {
    return (dirs[lvl] ?? true) ? c : -c;
  }
  return null;
}

/** Build a comparator function for sorting multi-index rows. */
function makeSortComparator(
  levels: readonly Index<Label>[],
  codes: readonly (readonly number[])[],
  dirs: readonly boolean[],
): (a: number, b: number) => number {
  return (a: number, b: number): number => {
    for (let lvl = 0; lvl < levels.length; lvl++) {
      const c = compareAtLevel(codes, levels, dirs, lvl, a, b);
      if (c !== null) {
        return c;
      }
    }
    return 0;
  };
}
