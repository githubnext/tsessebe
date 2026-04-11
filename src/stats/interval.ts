/**
 * Interval — pandas-compatible interval type and IntervalIndex.
 *
 * Mirrors `pandas.Interval` and `pandas.IntervalIndex`:
 * - `Interval` — a single bounded interval `(left, right]`, `[left, right)`,
 *   `[left, right]`, or `(left, right)`.
 * - `IntervalIndex` — an ordered array of `Interval` objects used as an axis label.
 * - `intervalRange()` — construct a sequence of equal-length intervals (like
 *   `pd.interval_range`).
 *
 * @example
 * ```ts
 * const iv = new Interval(0, 5);                // (0, 5]
 * iv.contains(3);                               // true
 * iv.overlaps(new Interval(4, 10));             // true
 *
 * const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
 * // IntervalIndex([(0, 1], (1, 2], (2, 3]])
 *
 * const rng = intervalRange(0, 1, { periods: 4 });
 * // [(0.0, 0.25], (0.25, 0.5], (0.5, 0.75], (0.75, 1.0]]
 * ```
 *
 * @module
 */

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Specifies which endpoint(s) of an interval are closed (inclusive).
 *
 * - `"right"` (default) — `(left, right]`
 * - `"left"` — `[left, right)`
 * - `"both"` — `[left, right]`
 * - `"neither"` — `(left, right)`
 */
export type ClosedType = "left" | "right" | "both" | "neither";

/** Options for {@link IntervalIndex.fromBreaks} and {@link intervalRange}. */
export interface IntervalOptions {
  /** Which endpoints are closed. Default `"right"`. */
  readonly closed?: ClosedType;
  /** Human-readable name for the index axis. */
  readonly name?: string | null;
}

/** Options for {@link intervalRange}. */
export interface IntervalRangeOptions extends IntervalOptions {
  /**
   * Number of intervals to generate.
   * Exactly one of `periods` or `freq` must be provided.
   */
  readonly periods?: number;
  /**
   * Step size between interval edges.
   * Exactly one of `periods` or `freq` must be provided.
   */
  readonly freq?: number;
}

// ─── Interval ─────────────────────────────────────────────────────────────────

/**
 * An immutable bounded interval.
 *
 * Mirrors `pandas.Interval`.  Endpoints are numbers.
 */
export class Interval {
  /** Left (lower) endpoint. */
  readonly left: number;

  /** Right (upper) endpoint. */
  readonly right: number;

  /** Which endpoints are closed (inclusive). */
  readonly closed: ClosedType;

  constructor(left: number, right: number, closed: ClosedType = "right") {
    if (left > right) {
      throw new RangeError(`Interval: left (${left}) must be ≤ right (${right})`);
    }
    this.left = left;
    this.right = right;
    this.closed = closed;
  }

  // ─── derived properties ─────────────────────────────────────────

  /** Length of the interval (`right − left`). */
  get length(): number {
    return this.right - this.left;
  }

  /** Mid-point of the interval. */
  get mid(): number {
    return (this.left + this.right) / 2;
  }

  /** True when left endpoint is closed. */
  get closedLeft(): boolean {
    return this.closed === "left" || this.closed === "both";
  }

  /** True when right endpoint is closed. */
  get closedRight(): boolean {
    return this.closed === "right" || this.closed === "both";
  }

  /** True when neither endpoint is closed. */
  get isOpen(): boolean {
    return this.closed === "neither";
  }

  /** True when both endpoints are closed. */
  get isClosed(): boolean {
    return this.closed === "both";
  }

  // ─── membership ─────────────────────────────────────────────────

  /**
   * Return `true` if `value` falls within this interval.
   *
   * @example
   * ```ts
   * new Interval(0, 5).contains(5);   // true  (right-closed)
   * new Interval(0, 5).contains(0);   // false (right-closed, 0 excluded)
   * new Interval(0, 5, "both").contains(0); // true
   * ```
   */
  contains(value: number): boolean {
    const leftOk = this.closedLeft ? value >= this.left : value > this.left;
    const rightOk = this.closedRight ? value <= this.right : value < this.right;
    return leftOk && rightOk;
  }

  // ─── comparison / set operations ────────────────────────────────

  /**
   * Return `true` if this interval overlaps with `other`.
   *
   * Two intervals overlap when they share any interior point.
   * Touching at a single endpoint is considered overlapping when that endpoint
   * is closed in both intervals.
   */
  overlaps(other: Interval): boolean {
    if (this.left > other.right || other.left > this.right) {
      return false;
    }
    if (this.left === other.right) {
      return this.closedLeft && other.closedRight;
    }
    if (other.left === this.right) {
      return other.closedLeft && this.closedRight;
    }
    return true;
  }

  /**
   * Return `true` if this interval is equal to `other`
   * (same endpoints and same `closed` type).
   */
  equals(other: Interval): boolean {
    return this.left === other.left && this.right === other.right && this.closed === other.closed;
  }

  // ─── display ────────────────────────────────────────────────────

  /** Render as a pandas-style string, e.g. `(0.0, 1.5]`. */
  toString(): string {
    const l = this.closedLeft ? "[" : "(";
    const r = this.closedRight ? "]" : ")";
    return `${l}${this.left}, ${this.right}${r}`;
  }
}

// ─── IntervalIndex ────────────────────────────────────────────────────────────

/**
 * An immutable index of `Interval` objects.
 *
 * Mirrors `pandas.IntervalIndex`.
 */
export class IntervalIndex {
  private readonly _intervals: readonly Interval[];

  /** Human-readable axis name. */
  readonly name: string | null;

  constructor(intervals: readonly Interval[], name: string | null = null) {
    this._intervals = Object.freeze([...intervals]);
    this.name = name;
  }

  // ─── factories ──────────────────────────────────────────────────

  /**
   * Build an `IntervalIndex` from an array of break points.
   *
   * `breaks` must have at least 2 elements.  The resulting index contains
   * `breaks.length − 1` intervals.
   *
   * @example
   * ```ts
   * IntervalIndex.fromBreaks([0, 1, 2, 3]);
   * // IntervalIndex([(0, 1], (1, 2], (2, 3]])
   * ```
   */
  static fromBreaks(breaks: readonly number[], options?: IntervalOptions): IntervalIndex {
    if (breaks.length < 2) {
      throw new RangeError("fromBreaks: at least 2 break points are required");
    }
    const closed = options?.closed ?? "right";
    const name = options?.name ?? null;
    const intervals: Interval[] = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      intervals.push(new Interval(breaks[i] as number, breaks[i + 1] as number, closed));
    }
    return new IntervalIndex(intervals, name);
  }

  /**
   * Build an `IntervalIndex` from explicit arrays of left and right endpoints.
   *
   * Both arrays must have the same length.
   */
  static fromArrays(
    left: readonly number[],
    right: readonly number[],
    options?: IntervalOptions,
  ): IntervalIndex {
    if (left.length !== right.length) {
      throw new RangeError("fromArrays: left and right arrays must have the same length");
    }
    const closed = options?.closed ?? "right";
    const name = options?.name ?? null;
    const intervals: Interval[] = left.map((l, i) => new Interval(l, right[i] as number, closed));
    return new IntervalIndex(intervals, name);
  }

  /**
   * Build an `IntervalIndex` from an array of `Interval` objects.
   */
  static fromIntervals(intervals: readonly Interval[], name?: string | null): IntervalIndex {
    return new IntervalIndex(intervals, name ?? null);
  }

  // ─── properties ─────────────────────────────────────────────────

  /** Number of intervals. */
  get size(): number {
    return this._intervals.length;
  }

  /** All intervals in order. */
  get values(): readonly Interval[] {
    return this._intervals;
  }

  /** Left endpoints. */
  get left(): readonly number[] {
    return this._intervals.map((iv) => iv.left);
  }

  /** Right endpoints. */
  get right(): readonly number[] {
    return this._intervals.map((iv) => iv.right);
  }

  /** Mid-points. */
  get mid(): readonly number[] {
    return this._intervals.map((iv) => iv.mid);
  }

  /** Lengths (`right − left`) of each interval. */
  get length(): readonly number[] {
    return this._intervals.map((iv) => iv.length);
  }

  /** Which endpoints are closed (taken from the first interval; homogeneous index assumed). */
  get closed(): ClosedType {
    return this._intervals[0]?.closed ?? "right";
  }

  /** True when all intervals are non-overlapping and sorted. */
  get isMonotonic(): boolean {
    for (let i = 1; i < this._intervals.length; i++) {
      const prev = this._intervals[i - 1] as Interval;
      const curr = this._intervals[i] as Interval;
      if (prev.right > curr.left) {
        return false;
      }
    }
    return true;
  }

  // ─── lookup ─────────────────────────────────────────────────────

  /**
   * Return the interval at position `i` (0-based).
   */
  get(i: number): Interval {
    const iv = this._intervals[i];
    if (iv === undefined) {
      throw new RangeError(`Index ${i} out of range [0, ${this.size})`);
    }
    return iv;
  }

  /**
   * Return the 0-based position of the first interval that {@link Interval.contains}
   * `value`, or `-1` if none.
   */
  indexOf(value: number): number {
    for (let i = 0; i < this._intervals.length; i++) {
      if ((this._intervals[i] as Interval).contains(value)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Return all intervals that overlap with `other`.
   */
  overlapping(other: Interval): IntervalIndex {
    return new IntervalIndex(
      this._intervals.filter((iv) => iv.overlaps(other)),
      this.name,
    );
  }

  // ─── set operations ─────────────────────────────────────────────

  /**
   * Append another `IntervalIndex` to this one.
   */
  append(other: IntervalIndex): IntervalIndex {
    return new IntervalIndex([...this._intervals, ...other._intervals], this.name);
  }

  // ─── display ────────────────────────────────────────────────────

  /** Render as a pandas-style string. */
  toString(): string {
    const inner = this._intervals.map((iv) => iv.toString()).join(", ");
    return `IntervalIndex([${inner}], closed='${this.closed}')`;
  }
}

// ─── intervalRange ────────────────────────────────────────────────────────────

/**
 * Return an `IntervalIndex` of equal-length intervals.
 *
 * Mirrors `pandas.interval_range`.  Exactly one of `options.periods` or
 * `options.freq` must be specified.
 *
 * @param start  Left edge of the first interval.
 * @param end    Right edge of the last interval.
 * @param options `periods` (number of intervals) or `freq` (interval length).
 *
 * @example
 * ```ts
 * intervalRange(0, 1, { periods: 4 });
 * // IntervalIndex([(0.0, 0.25], (0.25, 0.5], (0.5, 0.75], (0.75, 1.0]])
 *
 * intervalRange(0, 10, { freq: 2.5 });
 * // IntervalIndex([(0.0, 2.5], (2.5, 5.0], (5.0, 7.5], (7.5, 10.0]])
 * ```
 */
export function intervalRange(
  start: number,
  end: number,
  options: IntervalRangeOptions,
): IntervalIndex {
  if (end <= start) {
    throw new RangeError(`intervalRange: end (${end}) must be > start (${start})`);
  }
  const closed = options.closed ?? "right";
  const name = options.name ?? null;

  let breaks: number[];

  if (options.periods !== undefined && options.freq !== undefined) {
    throw new RangeError("intervalRange: specify exactly one of periods or freq");
  }
  if (options.periods !== undefined) {
    const n = options.periods;
    if (!Number.isInteger(n) || n < 1) {
      throw new RangeError("intervalRange: periods must be a positive integer");
    }
    const step = (end - start) / n;
    breaks = Array.from({ length: n + 1 }, (_, i) => start + i * step);
    breaks[n] = end;
  } else if (options.freq !== undefined) {
    const freq = options.freq;
    if (freq <= 0) {
      throw new RangeError("intervalRange: freq must be > 0");
    }
    breaks = [];
    let cur = start;
    while (cur < end - freq * 1e-10) {
      breaks.push(cur);
      cur += freq;
    }
    breaks.push(end);
  } else {
    throw new RangeError("intervalRange: one of periods or freq must be specified");
  }

  return IntervalIndex.fromBreaks(breaks, { closed, name });
}
