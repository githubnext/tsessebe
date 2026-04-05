/**
 * Sparse arrays — memory-efficient storage for data with a dominant fill value.
 *
 * Mirrors `pandas.arrays.SparseArray` and `pandas.SparseDtype`.
 *
 * A SparseArray stores only the non-fill values alongside their indices.
 * The fill value (default `Number.NaN`) is implicit for all other positions.
 *
 * @example
 * ```ts
 * const sa = SparseArray.fromDense([1, NaN, NaN, 4, NaN]);
 * sa.density; // 0.4
 * sa.toDense(); // [1, NaN, NaN, 4, NaN]
 * sa.get(0); // 1
 * sa.get(1); // NaN
 * ```
 */

// ─── SparseDtype ──────────────────────────────────────────────────────────────

/** Scalar types that can serve as fill values. */
export type SparseFillValue = number | string | boolean | null;

/** Describes the dtype of a SparseArray. */
export class SparseDtype {
  /** The underlying sub-dtype (e.g. `"float64"`, `"int64"`, `"bool"`). */
  readonly subtype: string;
  /** The fill value for unspecified positions. */
  readonly fillValue: SparseFillValue;

  constructor(subtype: string, fillValue: SparseFillValue = Number.NaN) {
    this.subtype = subtype;
    this.fillValue = fillValue;
  }

  toString(): string {
    return `Sparse[${this.subtype}, ${String(this.fillValue)}]`;
  }

  /** Standard float64 sparse dtype with NaN fill. */
  static float64(fillValue: SparseFillValue = Number.NaN): SparseDtype {
    return new SparseDtype("float64", fillValue);
  }

  /** Integer sparse dtype with 0 fill. */
  static int64(fillValue: SparseFillValue = 0): SparseDtype {
    return new SparseDtype("int64", fillValue);
  }

  /** Boolean sparse dtype with false fill. */
  static bool(fillValue: SparseFillValue = false): SparseDtype {
    return new SparseDtype("bool", fillValue);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function isFill(value: SparseFillValue, fill: SparseFillValue): boolean {
  if (typeof fill === "number" && Number.isNaN(fill)) {
    return typeof value === "number" && Number.isNaN(value);
  }
  return value === fill;
}

// ─── SparseArray ──────────────────────────────────────────────────────────────

/**
 * Memory-efficient array that stores only non-fill-value elements.
 */
export class SparseArray {
  /** Sorted indices of non-fill positions. */
  readonly indices: readonly number[];
  /** Values at the non-fill positions (same length as indices). */
  readonly data: readonly SparseFillValue[];
  /** Total logical length of the array. */
  readonly length: number;
  /** SparseDtype descriptor. */
  readonly dtype: SparseDtype;

  private constructor(
    indices: readonly number[],
    data: readonly SparseFillValue[],
    length: number,
    dtype: SparseDtype,
  ) {
    this.indices = indices;
    this.data = data;
    this.length = length;
    this.dtype = dtype;
  }

  /**
   * Build a SparseArray from a dense array.
   * @param dense  Source array.
   * @param fillValue  Value to treat as fill (default NaN).
   */
  static fromDense(
    dense: readonly SparseFillValue[],
    fillValue: SparseFillValue = Number.NaN,
  ): SparseArray {
    const indices: number[] = [];
    const data: SparseFillValue[] = [];
    for (let i = 0; i < dense.length; i++) {
      const v = dense[i] ?? fillValue;
      if (!isFill(v, fillValue)) {
        indices.push(i);
        data.push(v);
      }
    }
    let subtype: string;
    if (typeof fillValue === "number") {
      subtype = "float64";
    } else if (typeof fillValue === "boolean") {
      subtype = "bool";
    } else {
      subtype = "object";
    }
    return new SparseArray(indices, data, dense.length, new SparseDtype(subtype, fillValue));
  }

  /**
   * Build from explicit index/data arrays.
   */
  static fromCOO(
    indices: readonly number[],
    data: readonly SparseFillValue[],
    length: number,
    dtype: SparseDtype = SparseDtype.float64(),
  ): SparseArray {
    if (indices.length !== data.length) {
      throw new Error("indices and data must have the same length");
    }
    return new SparseArray([...indices], [...data], length, dtype);
  }

  /** The fill value for this array. */
  get fillValue(): SparseFillValue {
    return this.dtype.fillValue;
  }

  /** Number of stored (non-fill) elements. */
  get nnz(): number {
    return this.indices.length;
  }

  /** Fraction of non-fill elements: nnz / length. */
  get density(): number {
    if (this.length === 0) {
      return 0;
    }
    return this.nnz / this.length;
  }

  /** Retrieve the value at logical index i. */
  get(i: number): SparseFillValue {
    if (i < 0 || i >= this.length) {
      throw new RangeError(`Index ${i} out of range [0, ${this.length})`);
    }
    const pos = binarySearch(this.indices, i);
    if (pos === -1) {
      return this.fillValue;
    }
    return this.data[pos] ?? this.fillValue;
  }

  /** Expand to a dense array. */
  toDense(): SparseFillValue[] {
    const out: SparseFillValue[] = new Array(this.length).fill(this.fillValue) as SparseFillValue[];
    for (let k = 0; k < this.indices.length; k++) {
      const idx = this.indices[k];
      if (idx !== undefined) {
        out[idx] = this.data[k] ?? this.fillValue;
      }
    }
    return out;
  }

  /**
   * Apply element-wise unary operation (only on non-fill elements).
   */
  map(fn: (v: SparseFillValue) => SparseFillValue): SparseArray {
    const newData = this.data.map(fn);
    return SparseArray.fromCOO([...this.indices], newData, this.length, this.dtype);
  }

  /** Scalar addition (shifts non-fill elements). */
  add(scalar: number): SparseArray {
    if (typeof this.fillValue !== "number") {
      throw new TypeError("add requires numeric fill value");
    }
    const newFill = this.fillValue + scalar;
    const newDtype = new SparseDtype(this.dtype.subtype, newFill);
    const newData = this.data.map((v) => (typeof v === "number" ? v + scalar : v));
    return SparseArray.fromCOO([...this.indices], newData, this.length, newDtype);
  }

  /** Return a new SparseArray with only elements satisfying predicate. Positions that fail become fill. */
  filter(pred: (v: SparseFillValue, i: number) => boolean): SparseArray {
    const ni: number[] = [];
    const nd: SparseFillValue[] = [];
    for (let k = 0; k < this.indices.length; k++) {
      const idx = this.indices[k];
      const val = this.data[k];
      if (idx !== undefined && val !== undefined && pred(val, idx)) {
        ni.push(idx);
        nd.push(val);
      }
    }
    return SparseArray.fromCOO(ni, nd, this.length, this.dtype);
  }

  /** Slice [start, end). */
  slice(start: number, end: number = this.length): SparseArray {
    if (start < 0 || end > this.length || start > end) {
      throw new RangeError(`Invalid slice [${start}, ${end})`);
    }
    const ni: number[] = [];
    const nd: SparseFillValue[] = [];
    for (let k = 0; k < this.indices.length; k++) {
      const idx = this.indices[k];
      const val = this.data[k];
      if (idx !== undefined && idx >= start && idx < end) {
        ni.push(idx - start);
        nd.push(val ?? this.fillValue);
      }
    }
    return SparseArray.fromCOO(ni, nd, end - start, this.dtype);
  }

  toString(): string {
    return `SparseArray(length=${this.length}, nnz=${this.nnz}, dtype=${this.dtype})`;
  }
}

// ─── binary search helper ─────────────────────────────────────────────────────

function binarySearch(arr: readonly number[], target: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const v = arr[mid];
    if (v === undefined) {
      break;
    }
    if (v === target) {
      return mid;
    }
    if (v < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return -1;
}
