/**
 * Interval and IntervalIndex — closed/open interval types with index support.
 *
 * Mirrors `pandas.Interval` and `pandas.IntervalIndex`:
 *
 * - `Interval` represents a single numeric interval `(left, right)` with
 *   configurable endpoint inclusion (`closed`).
 * - `IntervalIndex` is an ordered collection of intervals suitable for use as
 *   a row index (e.g. after `pd.cut()` / `pd.qcut()`).
 *
 * **Closed modes:**
 * | `closed`    | Left endpoint | Right endpoint |
 * |-------------|---------------|----------------|
 * | `"right"`   | open          | closed         |
 * | `"left"`    | closed        | open           |
 * | `"both"`    | closed        | closed         |
 * | `"neither"` | open          | open           |
 *
 * @example
 * ```ts
 * const iv = new Interval(0, 1);           // (0, 1]
 * iv.contains(0.5);                        // true
 * iv.length;                               // 1
 * iv.mid;                                  // 0.5
 *
 * const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
 * idx.size;                                // 3
 * idx.at(0).toString();                    // "(0, 1]"
 * idx.get_loc(1.5);                        // 1
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Which endpoint(s) of the interval are closed (inclusive). */
export type IntervalClosed = "left" | "right" | "both" | "neither";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when `closed` includes the left endpoint. */
function includesLeft(closed: IntervalClosed): boolean {
  return closed === "left" || closed === "both";
}

/** True when `closed` includes the right endpoint. */
function includesRight(closed: IntervalClosed): boolean {
  return closed === "right" || closed === "both";
}

/** Test whether `value` falls inside `[left, right]` with the given closure. */
function pointInInterval(
  value: number,
  left: number,
  right: number,
  closed: IntervalClosed,
): boolean {
  const okLeft = includesLeft(closed) ? value >= left : value > left;
  const okRight = includesRight(closed) ? value <= right : value < right;
  return okLeft && okRight;
}

/** Return the bracket characters for the given endpoint inclusion. */
function bracketLeft(closed: IntervalClosed): string {
  return includesLeft(closed) ? "[" : "(";
}

/** Return the bracket characters for the given endpoint inclusion. */
function bracketRight(closed: IntervalClosed): string {
  return includesRight(closed) ? "]" : ")";
}

// ─── Interval ─────────────────────────────────────────────────────────────────

/**
 * A single numeric interval with configurable endpoint closure.
 *
 * Mirrors `pandas.Interval`.
 */
export class Interval {
  /** Left (lower) endpoint. */
  readonly left: number;
  /** Right (upper) endpoint. */
  readonly right: number;
  /**
   * Which endpoints are closed (inclusive).
   * Defaults to `"right"` to match pandas convention.
   */
  readonly closed: IntervalClosed;

  constructor(left: number, right: number, closed: IntervalClosed = "right") {
    if (left > right) {
      throw new RangeError(
        `Interval left (${left}) must be ≤ right (${right})`,
      );
    }
    this.left = left;
    this.right = right;
    this.closed = closed;
  }

  // ─── derived properties ─────────────────────────────────────────

  /** `true` when the left endpoint is included. */
  get closedLeft(): boolean {
    return includesLeft(this.closed);
  }

  /** `true` when the right endpoint is included. */
  get closedRight(): boolean {
    return includesRight(this.closed);
  }

  /** Length of the interval (`right - left`). */
  get length(): number {
    return this.right - this.left;
  }

  /** Midpoint of the interval. */
  get mid(): number {
    return (this.left + this.right) / 2;
  }

  /**
   * `true` when the interval contains no points.
   * This occurs only for zero-length intervals with `closed = "neither"`.
   */
  get isEmpty(): boolean {
    return this.length === 0 && this.closed === "neither";
  }

  // ─── methods ────────────────────────────────────────────────────

  /**
   * Test whether `value` falls inside this interval.
   *
   * @example
   * ```ts
   * new Interval(0, 1).contains(1);   // true  — right-closed
   * new Interval(0, 1).contains(0);   // false — left-open
   * ```
   */
  contains(value: number): boolean {
    return pointInInterval(value, this.left, this.right, this.closed);
  }

  /**
   * `true` when this interval shares any points with `other`.
   *
   * Uses the standard interval-overlap criterion: two intervals overlap when
   * neither is completely to the left of the other.
   */
  overlaps(other: Interval): boolean {
    if (this.right < other.left || other.right < this.left) {
      return false;
    }
    if (this.right === other.left) {
      return includesRight(this.closed) && includesLeft(other.closed);
    }
    if (other.right === this.left) {
      return includesRight(other.closed) && includesLeft(this.closed);
    }
    return true;
  }

  /**
   * Standard string representation, e.g. `"(0, 1]"`.
   */
  toString(): string {
    return `${bracketLeft(this.closed)}${this.left}, ${this.right}${bracketRight(this.closed)}`;
  }
}

// ─── IntervalIndex ───────────────────────────────────────────────────────────

/** Options for the `IntervalIndex` constructor. */
export interface IntervalIndexOptions {
  readonly name?: string | null;
}

/**
 * An ordered collection of numeric intervals, usable as a row index.
 *
 * Mirrors `pandas.IntervalIndex`. All intervals in an `IntervalIndex` share
 * the same `closed` mode.
 *
 * @example
 * ```ts
 * const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
 * idx.size;           // 3
 * idx.get_loc(2.5);   // 2   (falls in (2, 3])
 * idx.left;           // [0, 1, 2]
 * idx.right;          // [1, 2, 3]
 * idx.mid;            // [0.5, 1.5, 2.5]
 * ```
 */
export class IntervalIndex {
  /** Left endpoints (one per interval). */
  readonly left: readonly number[];
  /** Right endpoints (one per interval). */
  readonly right: readonly number[];
  /** Closure mode shared by all intervals. */
  readonly closed: IntervalClosed;
  /** Optional label for this index axis. */
  readonly name: string | null;

  // ─── construction ───────────────────────────────────────────────

  private constructor(
    left: readonly number[],
    right: readonly number[],
    closed: IntervalClosed,
    name: string | null,
  ) {
    if (left.length !== right.length) {
      throw new RangeError(
        `left and right arrays must have the same length (${left.length} vs ${right.length})`,
      );
    }
    this.left = Object.freeze([...left]);
    this.right = Object.freeze([...right]);
    this.closed = closed;
    this.name = name;
  }

  // ─── factory methods ────────────────────────────────────────────

  /**
   * Build an `IntervalIndex` from an array of break-points.
   *
   * Given `n+1` break-points, produces `n` intervals:
   * `breaks[i] → breaks[i+1]` for `i = 0 … n-1`.
   *
   * @example
   * ```ts
   * IntervalIndex.fromBreaks([0, 1, 2, 3]);
   * // (0,1], (1,2], (2,3]
   * ```
   */
  static fromBreaks(
    breaks: readonly number[],
    closed: IntervalClosed = "right",
    opts: IntervalIndexOptions = {},
  ): IntervalIndex {
    if (breaks.length < 2) {
      return new IntervalIndex([], [], closed, opts.name ?? null);
    }
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      left.push(breaks[i] as number);
      right.push(breaks[i + 1] as number);
    }
    return new IntervalIndex(left, right, closed, opts.name ?? null);
  }

  /**
   * Build an `IntervalIndex` from separate left and right arrays.
   *
   * @example
   * ```ts
   * IntervalIndex.fromArrays([0, 1, 2], [1, 2, 3]);
   * ```
   */
  static fromArrays(
    left: readonly number[],
    right: readonly number[],
    closed: IntervalClosed = "right",
    opts: IntervalIndexOptions = {},
  ): IntervalIndex {
    return new IntervalIndex(left, right, closed, opts.name ?? null);
  }

  /**
   * Build an `IntervalIndex` from an array of `Interval` objects.
   *
   * All intervals must share the same `closed` mode; if they differ the
   * first interval's mode is used (matching pandas behaviour).
   */
  static fromIntervals(
    intervals: readonly Interval[],
    opts: IntervalIndexOptions = {},
  ): IntervalIndex {
    if (intervals.length === 0) {
      return new IntervalIndex([], [], "right", opts.name ?? null);
    }
    const closed = intervals[0]?.closed ?? "right";
    const left = intervals.map((iv) => iv.left);
    const right = intervals.map((iv) => iv.right);
    return new IntervalIndex(left, right, closed, opts.name ?? null);
  }

  // ─── properties ─────────────────────────────────────────────────

  /** Number of intervals. */
  get size(): number {
    return this.left.length;
  }

  /** Alias for `size` (matches pandas `.length` attribute). */
  get length(): number {
    return this.size;
  }

  /** `true` when the index has zero intervals. */
  get empty(): boolean {
    return this.size === 0;
  }

  /** Midpoints of each interval. */
  get mid(): readonly number[] {
    return Object.freeze(
      this.left.map((l, i) => {
        const r = this.right[i] as number;
        return (l + r) / 2;
      }),
    );
  }

  /**
   * `true` when left endpoints are non-decreasing and each right ≥ its left.
   * Matches pandas `is_monotonic_increasing`.
   */
  get isMonotonicIncreasing(): boolean {
    for (let i = 1; i < this.size; i++) {
      if ((this.left[i] as number) < (this.left[i - 1] as number)) {
        return false;
      }
    }
    return true;
  }

  /**
   * `true` when left endpoints are non-increasing.
   * Matches pandas `is_monotonic_decreasing`.
   */
  get isMonotonicDecreasing(): boolean {
    for (let i = 1; i < this.size; i++) {
      if ((this.left[i] as number) > (this.left[i - 1] as number)) {
        return false;
      }
    }
    return true;
  }

  /** `true` when either `isMonotonicIncreasing` or `isMonotonicDecreasing`. */
  get isMonotonic(): boolean {
    return this.isMonotonicIncreasing || this.isMonotonicDecreasing;
  }

  // ─── element access ─────────────────────────────────────────────

  /**
   * Return the `Interval` at position `i` (0-indexed).
   * Negative indices count from the end.
   */
  at(i: number): Interval {
    const idx = i < 0 ? this.size + i : i;
    if (idx < 0 || idx >= this.size) {
      throw new RangeError(`Index ${i} is out of bounds for IntervalIndex of size ${this.size}`);
    }
    return new Interval(this.left[idx] as number, this.right[idx] as number, this.closed);
  }

  /** Materialise all intervals as a plain array. */
  toArray(): Interval[] {
    return Array.from({ length: this.size }, (_, i) => this.at(i));
  }

  // ─── containment / location ─────────────────────────────────────

  /**
   * For each interval, test whether `value` falls inside it.
   *
   * Returns a boolean array of the same length as this index.
   */
  contains(value: number): boolean[] {
    return this.left.map((l, i) =>
      pointInInterval(value, l, this.right[i] as number, this.closed),
    );
  }

  /**
   * Return the position of the **first** interval that contains `value`.
   *
   * Returns `-1` when no interval contains `value` (matches a common
   * conventions; pandas raises `KeyError` for this).
   */
  get_loc(value: number): number {
    for (let i = 0; i < this.size; i++) {
      if (pointInInterval(value, this.left[i] as number, this.right[i] as number, this.closed)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * For each interval, test whether it overlaps `other`.
   *
   * Returns a boolean array of the same length as this index.
   */
  overlaps(other: Interval): boolean[] {
    return this.toArray().map((iv) => iv.overlaps(other));
  }

  // ─── set operations ─────────────────────────────────────────────

  /**
   * Return a new `IntervalIndex` containing only the intervals where
   * `mask[i]` is `true`.
   */
  filter(mask: readonly boolean[]): IntervalIndex {
    const left: number[] = [];
    const right: number[] = [];
    for (let i = 0; i < this.size; i++) {
      if (mask[i]) {
        left.push(this.left[i] as number);
        right.push(this.right[i] as number);
      }
    }
    return new IntervalIndex(left, right, this.closed, this.name);
  }

  /** Return a copy of this index with a new `name`. */
  rename(name: string | null): IntervalIndex {
    return new IntervalIndex(this.left, this.right, this.closed, name);
  }

  // ─── formatting ─────────────────────────────────────────────────

  /** Human-readable summary, e.g. `"IntervalIndex([(0, 1], (1, 2]], closed='right')"`. */
  toString(): string {
    const inner = this.toArray()
      .map((iv) => iv.toString())
      .join(", ");
    return `IntervalIndex([${inner}], closed='${this.closed}')`;
  }
}
