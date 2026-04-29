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
import { EWM } from "../window/ewm.ts";
import type { EwmOptions } from "../window/ewm.ts";
import { Expanding } from "../window/expanding.ts";
import type { ExpandingOptions } from "../window/expanding.ts";
import { Rolling } from "../window/rolling.ts";
import type { RollingOptions } from "../window/rolling.ts";
import { Index } from "./base-index.ts";
import { CategoricalAccessor } from "./cat_accessor.ts";
import type { CatSeriesLike } from "./cat_accessor.ts";
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

/** True when a scalar is a finite number (not null/undefined/NaN). */
function isFiniteNum(v: Scalar): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/**
 * Align `a` and `b` on shared index labels, keep only paired finite numbers.
 * Returns two equal-length numeric arrays.
 */
function collectCorrPairs(a: Series<Scalar>, b: Series<Scalar>): [number[], number[]] {
  const bMap = new Map<string, number>();
  for (let j = 0; j < b.index.size; j++) {
    bMap.set(String(b.index.at(j)), j);
  }
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < a.index.size; i++) {
    const label = String(a.index.at(i));
    const j = bMap.get(label);
    if (j === undefined) {
      continue;
    }
    const av = a.values[i] as Scalar;
    const bv = b.values[j] as Scalar;
    if (!(isFiniteNum(av) && isFiniteNum(bv))) {
      continue;
    }
    xs.push(av);
    ys.push(bv);
  }
  return [xs, ys];
}

/**
 * Pearson correlation from two pre-aligned equal-length numeric arrays.
 * Returns `NaN` when `n < minPeriods` or either variance is zero.
 */
function pearsonCorrFromArrays(
  xs: readonly number[],
  ys: readonly number[],
  minPeriods: number,
): number {
  const n = xs.length;
  if (n < minPeriods) {
    return Number.NaN;
  }
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i] as number;
    my += ys[i] as number;
  }
  mx /= n;
  my /= n;
  let num = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    num += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const denom = Math.sqrt(varX * varY);
  return denom === 0 ? Number.NaN : num / denom;
}

// ─── LSD radix sort buffers (module-level, grown lazily) ─────────────────────

/** Ping-pong index buffers for the 8-pass LSD radix sort numeric fast path. */
let _rxA_idx: Uint32Array = new Uint32Array(0);
let _rxB_idx: Uint32Array = new Uint32Array(0);
/** Low 32 bits of each element's IEEE-754 sortable key (ping-pong). */
let _rxA_lo: Uint32Array = new Uint32Array(0);
let _rxB_lo: Uint32Array = new Uint32Array(0);
/** High 32 bits of each element's IEEE-754 sortable key (ping-pong). */
let _rxA_hi: Uint32Array = new Uint32Array(0);
let _rxB_hi: Uint32Array = new Uint32Array(0);
/** 256-bucket histogram reused every pass (never reallocated). */
const _rxCnt: Uint32Array = new Uint32Array(256);
/** Pre-partition index buffers (grow lazily, never shrink). */
let _finBuf: Uint32Array = new Uint32Array(0);
let _nanBuf: Uint32Array = new Uint32Array(0);
/** Sparse float values buffer; index = original row index (grow lazily). */
let _fvals: Float64Array = new Float64Array(0);
/** Uint32 view of _fvals.buffer; updated whenever _fvals is reallocated. */
let _fvalsU32: Uint32Array = new Uint32Array(0);

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
    } else if (isIndexLike(index)) {
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

  /**
   * Pearson correlation coefficient between this Series and `other`.
   *
   * Aligns on shared index labels and drops pairs where either value is
   * missing.  Returns `NaN` when fewer than `minPeriods` valid pairs exist or
   * when either Series has zero variance.
   *
   * @param other      - The other Series to correlate with.
   * @param minPeriods - Minimum valid observation pairs required (default 1).
   *
   * @example
   * ```ts
   * const a = new Series({ data: [1, 2, 3] });
   * const b = new Series({ data: [4, 5, 6] });
   * a.corr(b); // 1.0
   * ```
   */
  corr(other: Series<Scalar>, minPeriods = 1): number {
    const [xs, ys] = collectCorrPairs(this as Series<Scalar>, other);
    return pearsonCorrFromArrays(xs, ys, minPeriods);
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
    const n = this._values.length;
    const vals = this._values;

    // Pre-partition NaN/null/undefined from finite values in one pass.
    // fvals stores numeric values by original row index (sparse: fvals[origIdx]).
    if (_finBuf.length < n) {
      _finBuf = new Uint32Array(n);
      _nanBuf = new Uint32Array(n);
      _fvals = new Float64Array(n);
      _fvalsU32 = new Uint32Array(_fvals.buffer);
    }
    const finBuf = _finBuf;
    const nanBuf = _nanBuf;
    const fvals = _fvals;
    let finCount = 0;
    let nanCount = 0;
    let allNumeric = true;
    for (let i = 0; i < n; i++) {
      const v = vals[i];
      if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        nanBuf[nanCount] = i;
        nanCount = nanCount + 1;
      } else {
        if (typeof v === "number") {
          fvals[i] = v;
        } else {
          allNumeric = false;
        }
        finBuf[finCount] = i;
        finCount = finCount + 1;
      }
    }

    const finSlice = finBuf.subarray(0, finCount);

    if (allNumeric && finCount > 0) {
      // ── LSD radix sort: 8 passes × 8 bits over IEEE-754 transformed keys ──
      // Eliminates all JS comparator callbacks (the bottleneck at n≥10k).

      // Grow module-level ping-pong buffers if needed.
      if (_rxA_idx.length < finCount) {
        _rxA_idx = new Uint32Array(finCount);
        _rxB_idx = new Uint32Array(finCount);
        _rxA_lo = new Uint32Array(finCount);
        _rxB_lo = new Uint32Array(finCount);
        _rxA_hi = new Uint32Array(finCount);
        _rxB_hi = new Uint32Array(finCount);
      }

      // fvals is a Float64Array; reinterpret its buffer as Uint32 to read raw bits.
      // On little-endian (x86/ARM): u32[2i] = lo 32 bits, u32[2i+1] = hi 32 bits.
      const fvalsU32 = _fvalsU32;

      // Initialise ping arrays with identity indices and IEEE-754 sort keys.
      // Transform: positive floats → XOR sign bit; negative → XOR all bits.
      // This maps floats to an unsigned integer order that matches numeric order.
      for (let i = 0; i < finCount; i++) {
        const origIdx = finSlice[i]!;
        _rxA_idx[i] = origIdx;
        let lo = fvalsU32[origIdx * 2]!;
        let hi = fvalsU32[origIdx * 2 + 1]!;
        if (hi & 0x80000000) {
          lo = ~lo >>> 0;
          hi = ~hi >>> 0;
        } else {
          hi = (hi ^ 0x80000000) >>> 0;
        }
        _rxA_lo[i] = lo;
        _rxA_hi[i] = hi;
      }

      // 8-pass LSD: passes 0–3 over lo word, passes 4–7 over hi word.
      let srcIdx = _rxA_idx;
      let dstIdx = _rxB_idx;
      let srcLo = _rxA_lo;
      let dstLo = _rxB_lo;
      let srcHi = _rxA_hi;
      let dstHi = _rxB_hi;

      for (let pass = 0; pass < 8; pass++) {
        // Build histogram for this byte.
        _rxCnt.fill(0);
        const useHi = pass >= 4;
        const shift = (pass % 4) * 8;
        for (let i = 0; i < finCount; i++) {
          const word = useHi ? srcHi[i]! : srcLo[i]!;
          const bucket = (word >>> shift) & 0xff;
          const c = _rxCnt[bucket]!;
          _rxCnt[bucket] = c + 1;
        }
        // Prefix sum → scatter offsets.
        let total = 0;
        for (let b = 0; b < 256; b++) {
          const c = _rxCnt[b]!;
          _rxCnt[b] = total;
          total = total + c;
        }
        // Scatter elements into destination.
        for (let i = 0; i < finCount; i++) {
          const word = useHi ? srcHi[i]! : srcLo[i]!;
          const bucket = (word >>> shift) & 0xff;
          const p = _rxCnt[bucket]!;
          _rxCnt[bucket] = p + 1;
          dstIdx[p] = srcIdx[i]!;
          dstLo[p] = srcLo[i]!;
          dstHi[p] = srcHi[i]!;
        }
        // Swap ping-pong references.
        const ti = srcIdx;
        srcIdx = dstIdx;
        dstIdx = ti;
        const tl = srcLo;
        srcLo = dstLo;
        dstLo = tl;
        const th = srcHi;
        srcHi = dstHi;
        dstHi = th;
      }

      // After 8 passes (even number), srcIdx holds ascending sorted original indices.
      if (ascending) {
        for (let i = 0; i < finCount; i++) {
          finSlice[i] = srcIdx[i]!;
        }
      } else {
        for (let i = 0, j = finCount - 1; i < finCount; i = i + 1, j = j - 1) {
          finSlice[i] = srcIdx[j]!;
        }
      }
    } else if (!allNumeric) {
      // String / mixed dtype: fall back to comparator-based sort.
      if (ascending) {
        finSlice.sort((a, b) => {
          const av = vals[a] as number | string | boolean;
          const bv = vals[b] as number | string | boolean;
          return av < bv ? -1 : av > bv ? 1 : 0;
        });
      } else {
        finSlice.sort((a, b) => {
          const av = vals[a] as number | string | boolean;
          const bv = vals[b] as number | string | boolean;
          return av > bv ? -1 : av < bv ? 1 : 0;
        });
      }
    }
    // else: allNumeric && finCount === 0 — nothing to sort.

    // Build the output permutation and gather values in a single pass.
    const perm = new Array<number>(n);
    const outData = new Array<T>(n);
    let pos = 0;
    if (naPosition === "first") {
      for (let i = 0; i < nanCount; i++) {
        const idx = nanBuf[i]!;
        perm[pos] = idx;
        outData[pos] = vals[idx] as T;
        pos = pos + 1;
      }
      for (let i = 0; i < finCount; i++) {
        const idx = finSlice[i]!;
        perm[pos] = idx;
        outData[pos] = vals[idx] as T;
        pos = pos + 1;
      }
    } else {
      for (let i = 0; i < finCount; i++) {
        const idx = finSlice[i]!;
        perm[pos] = idx;
        outData[pos] = vals[idx] as T;
        pos = pos + 1;
      }
      for (let i = 0; i < nanCount; i++) {
        const idx = nanBuf[i]!;
        perm[pos] = idx;
        outData[pos] = vals[idx] as T;
        pos = pos + 1;
      }
    }

    return new Series<T>({
      data: outData,
      index: this.index.take(perm),
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

  // ─── cat accessor ─────────────────────────────────────────────────────────

  /**
   * Access categorical operations for each element.
   *
   * @example
   * ```ts
   * const s = new Series({ data: ["b", "a", "c", "a"] });
   * s.cat.categories.values;     // ["a", "b", "c"]
   * s.cat.codes.toArray();        // [1, 0, 2, 0]
   * s.cat.ordered;                // false
   * ```
   */
  get cat(): CategoricalAccessor {
    return new CategoricalAccessor(this as unknown as CatSeriesLike);
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

  // ─── rolling window ───────────────────────────────────────────────────────

  /**
   * Provide a rolling (sliding-window) view of the Series.
   *
   * @param window  - Size of the moving window (positive integer).
   * @param options - Optional {@link RollingOptions} (`minPeriods`, `center`).
   *
   * @example
   * ```ts
   * const s = new Series({ data: [1, 2, 3, 4, 5] });
   * s.rolling(3).mean().toArray(); // [null, null, 2, 3, 4]
   * s.rolling(2).sum().toArray();  // [null, 3, 5, 7, 9]
   * ```
   */
  rolling(window: number, options?: RollingOptions): Rolling {
    return new Rolling(this, window, options);
  }

  // ─── expanding window ─────────────────────────────────────────────────────

  /**
   * Provide an expanding (growing-window) view of the Series.
   *
   * @param options - Optional {@link ExpandingOptions} (`minPeriods`).
   *
   * @example
   * ```ts
   * const s = new Series({ data: [1, 2, 3, 4, 5] });
   * s.expanding().mean().toArray();  // [1, 1.5, 2, 2.5, 3]
   * ```
   */
  expanding(options?: ExpandingOptions): Expanding {
    return new Expanding(this, options);
  }

  // ─── ewm window ───────────────────────────────────────────────────────────

  /**
   * Provide an Exponentially Weighted Moving (EWM) view of the Series.
   *
   * @param options - {@link EwmOptions} specifying decay via `span`, `com`,
   *                  `halflife`, or `alpha`.
   *
   * @example
   * ```ts
   * const s = new Series({ data: [1, 2, 3, 4, 5] });
   * s.ewm({ span: 3 }).mean().toArray();
   * // [1, 1.666..., 2.428..., 3.266..., 4.161...]
   * ```
   */
  ewm(options: EwmOptions): EWM {
    return new EWM(this, options);
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

function isIndexLike(v: unknown): v is Index<Label> {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const rec = v as Record<string, unknown>;
  return (
    typeof rec["size"] === "number" &&
    typeof rec["at"] === "function" &&
    typeof rec["getLoc"] === "function"
  );
}
