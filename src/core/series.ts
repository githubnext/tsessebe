/**
 * Series — a one-dimensional labeled array with dtype awareness.
 *
 * Mirrors `pandas.Series`: an ordered sequence of values indexed by an
 * `Index<Label>`.  Every Series carries a `Dtype` descriptor and supports
 * element access, arithmetic, statistical aggregation, boolean masking, and
 * missing-value handling.
 */

import { SeriesGroupBy } from "../groupby/index.ts";
import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DatetimeAccessor } from "./datetime_accessor.ts";
import type { DatetimeSeriesLike } from "./datetime_accessor.ts";
import { Dtype } from "./dtype.ts";
import { RangeIndex } from "./range-index.ts";
import { StringAccessor } from "./string_accessor.ts";
import type { StringSeriesLike } from "./string_accessor.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a default RangeIndex of length `n`. */
function defaultIndex(n: number): Index<Label> {
  return new RangeIndex(n) as unknown as Index<Label>;
}

/** True when the value should be treated as missing (null, undefined, or NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Compare two scalar values with null/NaN handling for sorting. */
function compareScalars(
  a: Scalar,
  b: Scalar,
  ascending: boolean,
  naPosition: "first" | "last",
): number {
  const aNull = isMissing(a);
  const bNull = isMissing(b);
  if (aNull && bNull) {
    return 0;
  }
  if (aNull) {
    return naPosition === "first" ? -1 : 1;
  }
  if (bNull) {
    return naPosition === "first" ? 1 : -1;
  }
  if (a === b) {
    return 0;
  }
  const cmp = (a as number | string | boolean) < (b as number | string | boolean) ? -1 : 1;
  return ascending ? cmp : -cmp;
}

// ─── SeriesOptions ────────────────────────────────────────────────────────────

/** Constructor options accepted by `Series`. */
export interface SeriesOptions<T extends Scalar = Scalar> {
  readonly data: readonly T[];
  readonly index?: Index<Label> | readonly Label[];
  readonly dtype?: Dtype;
  readonly name?: string | null;
}

// ─── Series ───────────────────────────────────────────────────────────────────

/**
 * A one-dimensional labeled array.
 *
 * `Series` is the TypeScript equivalent of `pandas.Series`.
 * Values are stored in an immutable array; labels are stored in an `Index`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], name: "x" });
 * s.sum();   // 6
 * s.mean();  // 2
 * s.at(0);   // 1
 * ```
 */
export class Series<T extends Scalar = Scalar> {
  private readonly _values: readonly T[];
  readonly index: Index<Label>;
  readonly dtype: Dtype;
  readonly name: string | null;

  // ─── construction ─────────────────────────────────────────────────────────

  constructor(options: SeriesOptions<T>) {
    const { data, index, dtype, name } = options;
    this._values = Object.freeze([...data]);
    this.dtype = dtype ?? Dtype.inferFrom(data as readonly Scalar[]);
    this.name = name ?? null;

    if (index === undefined) {
      this.index = defaultIndex(data.length);
    } else if (index instanceof Index) {
      if (index.size !== data.length) {
        throw new RangeError(
          `Index length ${index.size} does not match data length ${data.length}`,
        );
      }
      this.index = index;
    } else {
      // readonly Label[]
      if (index.length !== data.length) {
        throw new RangeError(
          `Index length ${index.length} does not match data length ${data.length}`,
        );
      }
      this.index = new Index<Label>(index);
    }
  }

  /**
   * Create a Series from a plain object mapping label → value.
   */
  static fromObject<T extends Scalar>(
    obj: Readonly<Record<string, T>>,
    name?: string | null,
  ): Series<T> {
    const keys = Object.keys(obj);
    const vals = keys.map((k) => obj[k] as T);
    return new Series<T>({
      data: vals,
      index: keys,
      ...(name !== undefined ? { name } : {}),
    });
  }

  // ─── properties ───────────────────────────────────────────────────────────

  get size(): number {
    return this._values.length;
  }

  get length(): number {
    return this._values.length;
  }

  get shape(): [number] {
    return [this._values.length];
  }

  get ndim(): 1 {
    return 1;
  }

  get empty(): boolean {
    return this._values.length === 0;
  }

  /** Snapshot of the underlying values as a plain array. */
  get values(): readonly T[] {
    return this._values;
  }

  // ─── element access ───────────────────────────────────────────────────────

  /**
   * Access element by **label** (mirrors pandas `Series.at[label]`).
   * Throws `KeyError` when the label is not found.
   */
  at(label: Label): T {
    const pos = this.index.getLoc(label);
    const i = typeof pos === "number" ? pos : (pos[0] as number);
    return this._values[i] as T;
  }

  /**
   * Access element by **integer position** (mirrors pandas `Series.iat[i]`).
   */
  iat(i: number): T {
    const len = this._values.length;
    const idx = i < 0 ? len + i : i;
    if (idx < 0 || idx >= len) {
      throw new RangeError(`Position ${i} is out of bounds for axis of size ${len}`);
    }
    return this._values[idx] as T;
  }

  /**
   * Label-based selection — mirrors `Series.loc[label]` or
   * `Series.loc[labels]` for an array of labels.
   */
  loc(label: Label): T;
  loc(labels: readonly Label[]): Series<T>;
  loc(labelOrLabels: Label | readonly Label[]): T | Series<T> {
    if (Array.isArray(labelOrLabels)) {
      const labels = labelOrLabels as readonly Label[];
      const positions = labels.map((lbl) => {
        const pos = this.index.getLoc(lbl);
        return typeof pos === "number" ? pos : (pos[0] as number);
      });
      const newData = positions.map((p) => this._values[p] as T);
      const newIndex = new Index<Label>(labels);
      return new Series<T>({ data: newData, index: newIndex, dtype: this.dtype, name: this.name });
    }
    return this.at(labelOrLabels as Label);
  }

  /**
   * Integer position-based selection — mirrors `Series.iloc[i]` or
   * `Series.iloc[positions]`.
   */
  iloc(position: number): T;
  iloc(positions: readonly number[]): Series<T>;
  iloc(posOrPositions: number | readonly number[]): T | Series<T> {
    if (Array.isArray(posOrPositions)) {
      const positions = posOrPositions as readonly number[];
      const newData = positions.map((p) => this.iat(p));
      const newIndex = this.index.take(positions);
      return new Series<T>({ data: newData, index: newIndex, dtype: this.dtype, name: this.name });
    }
    return this.iat(posOrPositions as number);
  }

  // ─── arithmetic ───────────────────────────────────────────────────────────

  private _scalarOp(
    other: number | Series<Scalar>,
    fn: (a: number, b: number) => number,
  ): Series<number> {
    const isScalar = !(other instanceof Series);
    if (isScalar) {
      const b = other as number;
      const newData = this._values.map((v) => {
        const a = v as unknown as number;
        return fn(a, b);
      });
      return new Series<number>({
        data: newData,
        index: this.index,
        dtype: Dtype.float64,
        name: this.name,
      });
    }
    const o = other as Series<Scalar>;
    if (o.size !== this.size) {
      throw new RangeError(
        `Cannot operate on Series of different sizes: ${this.size} vs ${o.size}`,
      );
    }
    const newData = this._values.map((v, i) => {
      const a = v as unknown as number;
      const b = o._values[i] as unknown as number;
      return fn(a, b);
    });
    return new Series<number>({
      data: newData,
      index: this.index,
      dtype: Dtype.float64,
      name: this.name,
    });
  }

  /** Element-wise addition. */
  add(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a + b);
  }

  /** Element-wise subtraction. */
  sub(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a - b);
  }

  /** Element-wise multiplication. */
  mul(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a * b);
  }

  /** Element-wise division (true division, returns float). */
  div(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a / b);
  }

  /** Element-wise floor division. */
  floordiv(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => Math.floor(a / b));
  }

  /** Element-wise modulo. */
  mod(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a % b);
  }

  /** Element-wise exponentiation. */
  pow(other: number | Series<Scalar>): Series<number> {
    return this._scalarOp(other, (a, b) => a ** b);
  }

  // ─── comparison ───────────────────────────────────────────────────────────

  private _cmpOp(
    other: Scalar | Series<Scalar>,
    fn: (a: Scalar, b: Scalar) => boolean,
  ): Series<boolean> {
    const isScalar = !(other instanceof Series);
    if (isScalar) {
      const b = other as Scalar;
      const newData = this._values.map((a) => fn(a, b));
      return new Series<boolean>({
        data: newData,
        index: this.index,
        dtype: Dtype.bool,
        name: this.name,
      });
    }
    const o = other as Series<Scalar>;
    if (o.size !== this.size) {
      throw new RangeError(`Cannot compare Series of different sizes: ${this.size} vs ${o.size}`);
    }
    const newData = this._values.map((a, i) => fn(a, o._values[i] as Scalar));
    return new Series<boolean>({
      data: newData,
      index: this.index,
      dtype: Dtype.bool,
      name: this.name,
    });
  }

  eq(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => a === b);
  }

  ne(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => a !== b);
  }

  lt(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => {
      if (a === null || b === null) {
        return false;
      }
      return (a as number | string | boolean) < (b as number | string | boolean);
    });
  }

  le(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => {
      if (a === null || b === null) {
        return false;
      }
      return (a as number | string | boolean) <= (b as number | string | boolean);
    });
  }

  gt(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => {
      if (a === null || b === null) {
        return false;
      }
      return (a as number | string | boolean) > (b as number | string | boolean);
    });
  }

  ge(other: Scalar | Series<Scalar>): Series<boolean> {
    return this._cmpOp(other, (a, b) => {
      if (a === null || b === null) {
        return false;
      }
      return (a as number | string | boolean) >= (b as number | string | boolean);
    });
  }

  // ─── boolean masking ─────────────────────────────────────────────────────

  /**
   * Filter by a boolean mask Series or array.
   * Returns a new Series containing only elements where the mask is `true`.
   */
  filter(mask: Series<boolean> | readonly boolean[]): Series<T> {
    const bools = mask instanceof Series ? mask.values : mask;
    if (bools.length !== this._values.length) {
      throw new RangeError(
        `Mask length ${bools.length} does not match Series length ${this._values.length}`,
      );
    }
    const newData: T[] = [];
    const newLabels: Label[] = [];
    for (let i = 0; i < this._values.length; i++) {
      if (bools[i]) {
        newData.push(this._values[i] as T);
        newLabels.push(this.index.at(i));
      }
    }
    return new Series<T>({
      data: newData,
      index: new Index<Label>(newLabels),
      dtype: this.dtype,
      name: this.name,
    });
  }

  // ─── missing value handling ───────────────────────────────────────────────

  /** Boolean mask: `true` where the value is `null` or `undefined` or `NaN`. */
  isna(): Series<boolean> {
    return new Series<boolean>({
      data: this._values.map(
        (v) => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)),
      ),
      index: this.index,
      dtype: Dtype.bool,
      name: this.name,
    });
  }

  /** Boolean mask: `true` where the value is not missing. */
  notna(): Series<boolean> {
    const naFlags = this.isna().values;
    return new Series<boolean>({
      data: naFlags.map((f) => !f),
      index: this.index,
      dtype: Dtype.bool,
      name: this.name,
    });
  }

  /** Return a new Series with missing values removed. */
  dropna(): Series<T> {
    const mask = this.notna();
    return this.filter(mask);
  }

  /** Return a new Series with missing values replaced by `value`. */
  fillna(value: T): Series<T> {
    return new Series<T>({
      data: this._values.map((v) =>
        v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? value : v,
      ),
      index: this.index,
      dtype: this.dtype,
      name: this.name,
    });
  }

  // ─── statistical aggregation ─────────────────────────────────────────────

  /** Number of non-null values. */
  count(): number {
    return this._values.filter(
      (v) => v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
    ).length;
  }

  private _numericValues(): number[] {
    return this._values
      .filter(
        (v): v is NonNullable<T> =>
          v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
      )
      .map((v) => v as unknown as number);
  }

  /** Sum of all non-null values. Returns `NaN` for an empty Series. */
  sum(): number {
    const nums = this._numericValues();
    if (nums.length === 0) {
      return 0;
    }
    return nums.reduce((acc, v) => acc + v, 0);
  }

  /** Arithmetic mean. Returns `NaN` for an empty Series. */
  mean(): number {
    const nums = this._numericValues();
    if (nums.length === 0) {
      return Number.NaN;
    }
    return this.sum() / nums.length;
  }

  /** Minimum value. Returns `undefined` for an empty Series. */
  min(): T | undefined {
    const vals = this._values.filter(
      (v): v is NonNullable<T> =>
        v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
    );
    if (vals.length === 0) {
      return undefined;
    }
    return vals.reduce((a, b) => {
      if (a === null) {
        return b;
      }
      if (b === null) {
        return a;
      }
      return (a as number | string | boolean) <= (b as number | string | boolean) ? a : b;
    });
  }

  /** Maximum value. Returns `undefined` for an empty Series. */
  max(): T | undefined {
    const vals = this._values.filter(
      (v): v is NonNullable<T> =>
        v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
    );
    if (vals.length === 0) {
      return undefined;
    }
    return vals.reduce((a, b) => {
      if (a === null) {
        return b;
      }
      if (b === null) {
        return a;
      }
      return (a as number | string | boolean) >= (b as number | string | boolean) ? a : b;
    });
  }

  /** Population standard deviation (ddof=1, like pandas default). */
  std(ddof = 1): number {
    return Math.sqrt(this.var(ddof));
  }

  /** Sample variance (ddof=1). */
  var(ddof = 1): number {
    const nums = this._numericValues();
    const n = nums.length;
    if (n < 2) {
      return Number.NaN;
    }
    const mu = nums.reduce((acc, v) => acc + v, 0) / n;
    const ss = nums.reduce((acc, v) => acc + (v - mu) ** 2, 0);
    return ss / (n - ddof);
  }

  /** Median (middle value of sorted non-null data). */
  median(): number {
    const nums = this._numericValues().sort((a, b) => a - b);
    const n = nums.length;
    if (n === 0) {
      return Number.NaN;
    }
    const mid = Math.floor(n / 2);
    if (n % 2 === 1) {
      return nums[mid] as number;
    }
    return ((nums[mid - 1] as number) + (nums[mid] as number)) / 2;
  }

  /**
   * Compute a single quantile via linear interpolation.
   *
   * @param q - Quantile level in [0, 1] (0.5 = median, 0.25 = Q1, etc.)
   * @returns   Interpolated value, or `NaN` if the Series has no numeric data.
   *
   * @example
   * ```ts
   * const s = new Series({ data: [1, 2, 3, 4] });
   * s.quantile(0.5); // 2.5
   * s.quantile(0.25); // 1.75
   * ```
   */
  quantile(q: number): number {
    const sorted = this._numericValues().sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) {
      return Number.NaN;
    }
    const pos = q * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) {
      return sorted[lo] as number;
    }
    return (sorted[lo] as number) * (1 - (pos - lo)) + (sorted[hi] as number) * (pos - lo);
  }

  /** Number of unique non-null values. */
  nunique(): number {
    const nonNull = this._values.filter(
      (v) => v !== null && v !== undefined && !(typeof v === "number" && Number.isNaN(v)),
    );
    return new Set(nonNull).size;
  }

  /** Return sorted unique values. */
  unique(): T[] {
    const seen = new Set<T>();
    const result: T[] = [];
    for (const v of this._values) {
      if (!seen.has(v)) {
        seen.add(v);
        result.push(v);
      }
    }
    return result;
  }

  /** Return value counts as a new Series (label → count), sorted by frequency. */
  valueCounts(): Series<number> {
    const counts = new Map<T, number>();
    for (const v of this._values) {
      if (v !== null && v !== undefined) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return new Series<number>({
      data: sorted.map(([, count]) => count),
      index: new Index<Label>(sorted.map(([v]) => v as Label)),
      dtype: Dtype.int64,
      name: "count",
    });
  }

  // ─── sorting ─────────────────────────────────────────────────────────────

  /** Return a new Series sorted by values. */
  sortValues(ascending = true, naPosition: "first" | "last" = "last"): Series<T> {
    const pairs = this._values.map((v, i) => ({ v, i }));
    pairs.sort((a, b) => compareScalars(a.v, b.v, ascending, naPosition));
    return new Series<T>({
      data: pairs.map(({ v }) => v),
      index: this.index.take(pairs.map(({ i }) => i)),
      dtype: this.dtype,
      name: this.name,
    });
  }

  /** Return a new Series sorted by its index labels. */
  sortIndex(ascending = true): Series<T> {
    const perm = this.index.argsort();
    const orderedPerm = ascending ? [...perm] : [...perm].reverse();
    return new Series<T>({
      data: orderedPerm.map((p) => this._values[p] as T),
      index: this.index.take(orderedPerm),
      dtype: this.dtype,
      name: this.name,
    });
  }

  // ─── manipulation ─────────────────────────────────────────────────────────

  /** Return a shallow copy with an optional new name. */
  copy(name?: string | null): Series<T> {
    return new Series<T>({
      data: [...this._values],
      index: this.index.copy(),
      dtype: this.dtype,
      name: name === undefined ? this.name : name,
    });
  }

  /** Return a new Series with a different name. */
  rename(name: string | null): Series<T> {
    return this.copy(name);
  }

  /**
   * Return a new Series replacing the underlying values (preserving index and name).
   * Used internally by StringAccessor and other accessors.
   * @internal
   */
  withValues(data: readonly Scalar[], name?: string | null): Series<Scalar> {
    return new Series<Scalar>({
      data: [...data],
      index: this.index.copy(),
      name: name === undefined ? this.name : name,
    });
  }

  // ─── str accessor ─────────────────────────────────────────────────────────

  /**
   * Access vectorised string operations for each element.
   *
   * @example
   * ```ts
   * const s = new Series({ data: ["hello", "WORLD"] });
   * s.str.upper().toArray(); // ["HELLO", "WORLD"]
   * s.str.len().toArray();   // [5, 5]
   * ```
   */
  get str(): StringAccessor {
    return new StringAccessor(this as unknown as StringSeriesLike);
  }

  // ─── dt accessor ──────────────────────────────────────────────────────────

  /**
   * Access vectorised datetime operations for each element.
   *
   * @example
   * ```ts
   * const s = new Series({ data: [new Date("2024-03-15")] });
   * s.dt.year().toArray();  // [2024]
   * s.dt.month().toArray(); // [3]
   * s.dt.strftime("%Y-%m-%d").toArray(); // ["2024-03-15"]
   * ```
   */
  get dt(): DatetimeAccessor {
    return new DatetimeAccessor(this as unknown as DatetimeSeriesLike);
  }

  /** Return a new Series with a new Index. */
  setIndex(index: Index<Label> | readonly Label[]): Series<T> {
    return new Series<T>({
      data: [...this._values],
      index,
      dtype: this.dtype,
      name: this.name,
    });
  }

  /** Reset the index to a default RangeIndex. */
  resetIndex(): Series<T> {
    return new Series<T>({
      data: [...this._values],
      index: defaultIndex(this._values.length),
      dtype: this.dtype,
      name: this.name,
    });
  }

  /**
   * Apply a function to each value, returning a new Series.
   */
  map<U extends Scalar>(fn: (value: T, index: Label, pos: number) => U): Series<U> {
    return new Series<U>({
      data: this._values.map((v, i) => fn(v, this.index.at(i), i)),
      index: this.index,
      name: this.name,
    });
  }

  // ─── set operations ───────────────────────────────────────────────────────

  /** True when `value` exists in this Series. */
  isin(values: readonly Scalar[]): Series<boolean> {
    const set = new Set<Scalar>(values);
    return new Series<boolean>({
      data: this._values.map((v) => set.has(v)),
      index: this.index,
      dtype: Dtype.bool,
      name: this.name,
    });
  }

  // ─── conversion ───────────────────────────────────────────────────────────

  toArray(): T[] {
    return [...this._values];
  }

  toList(): T[] {
    return this.toArray();
  }

  /**
   * Convert to a plain key→value object.
   * Works best when the index is string-labeled.
   */
  toObject(): Record<string, T> {
    const result: Record<string, T> = {};
    for (let i = 0; i < this._values.length; i++) {
      result[String(this.index.at(i))] = this._values[i] as T;
    }
    return result;
  }

  // ─── iteration ────────────────────────────────────────────────────────────

  *[Symbol.iterator](): Generator<T> {
    for (const v of this._values) {
      yield v;
    }
  }

  // ─── display ──────────────────────────────────────────────────────────────

  toString(): string {
    const rows = this._values.map((v, i) => `${String(this.index.at(i))}\t${String(v)}`).join("\n");
    const footer = `Name: ${this.name ?? "(unnamed)"}, dtype: ${this.dtype.name}, Length: ${this.size}`;
    return `${rows}\n${footer}`;
  }

  // ─── groupby ──────────────────────────────────────────────────────────────

  /**
   * Group the Series by an array of key values (or another Series).
   *
   * @example
   * ```ts
   * const s = new Series({ data: [1, 2, 3, 4] });
   * s.groupby(["A", "A", "B", "B"]).sum();
   * // Series { A: 3, B: 7 }
   * ```
   */
  groupby(by: readonly Scalar[] | Series<Scalar>): SeriesGroupBy {
    return new SeriesGroupBy(this as Series<Scalar>, by);
  }
}
