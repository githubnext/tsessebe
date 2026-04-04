/**
 * Interval and IntervalIndex — range types mirroring pandas `Interval` and `IntervalIndex`.
 *
 * An `Interval` represents a range [left, right] with configurable closed-ness
 * (left, right, both, neither). An `IntervalIndex` is an ordered collection of
 * `Interval` values usable as a pandas-style axis label.
 *
 * `intervalRange()` generates evenly-spaced intervals, mirroring `pd.interval_range`.
 *
 * @example
 * ```ts
 * const iv = new Interval(0, 1, "right"); // (0, 1]
 * iv.contains(0.5); // true
 * iv.mid;           // 0.5
 * iv.length;        // 1
 * iv.toString();    // "(0, 1]"
 *
 * const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
 * idx.size;           // 3
 * idx.contains(1.5);  // [false, true, false]
 * idx.mid;            // [0.5, 1.5, 2.5]
 *
 * const rng = intervalRange(0, 4, { periods: 4 });
 * rng.size; // 4
 * ```
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Controls which endpoints are included in an interval. */
export type IntervalClosed = "left" | "right" | "both" | "neither";

/** Options for `intervalRange()`. */
export interface IntervalRangeOptions {
  /** Number of intervals to generate. Either `periods` or `freq` is required. */
  readonly periods?: number;
  /** Step size between interval break points. Either `periods` or `freq` is required. */
  readonly freq?: number;
  /** Which side(s) of intervals are closed. Defaults to "right". */
  readonly closed?: IntervalClosed;
}

// ─── open/close bracket helpers ───────────────────────────────────────────────

/** Returns the opening bracket character for `closed`. */
function openBracket(closed: IntervalClosed): string {
  return closed === "left" || closed === "both" ? "[" : "(";
}

/** Returns the closing bracket character for `closed`. */
function closeBracket(closed: IntervalClosed): string {
  return closed === "right" || closed === "both" ? "]" : ")";
}

// ─── endpoint containment helpers ─────────────────────────────────────────────

/** Is the left endpoint included given `closed`? */
function leftIncluded(closed: IntervalClosed): boolean {
  return closed === "left" || closed === "both";
}

/** Is the right endpoint included given `closed`? */
function rightIncluded(closed: IntervalClosed): boolean {
  return closed === "right" || closed === "both";
}

// ─── containment check ────────────────────────────────────────────────────────

/** Returns true if `value` is inside (left, right) respecting `closed`. */
function pointInInterval(
  left: number,
  right: number,
  closed: IntervalClosed,
  value: number,
): boolean {
  const leftOk = leftIncluded(closed) ? value >= left : value > left;
  const rightOk = rightIncluded(closed) ? value <= right : value < right;
  return leftOk && rightOk;
}

// ─── overlap check ────────────────────────────────────────────────────────────

/** Returns true when two intervals share at least one point. */
function intervalsOverlap(
  aLeft: number,
  aRight: number,
  aClosed: IntervalClosed,
  bLeft: number,
  bRight: number,
  bClosed: IntervalClosed,
): boolean {
  // They are disjoint when one ends before the other begins.
  // At the touching point, check if both intervals include the endpoint.
  if (aRight < bLeft || bRight < aLeft) {
    return false;
  }
  if (aRight === bLeft) {
    return rightIncluded(aClosed) && leftIncluded(bClosed);
  }
  if (bRight === aLeft) {
    return rightIncluded(bClosed) && leftIncluded(aClosed);
  }
  return true;
}

// ─── Interval ─────────────────────────────────────────────────────────────────

/**
 * A single bounded interval.
 *
 * Mirrors `pandas.Interval`.
 */
export class Interval {
  /** Left endpoint. */
  readonly left: number;
  /** Right endpoint. */
  readonly right: number;
  /** Which endpoint(s) are closed (included). */
  readonly closed: IntervalClosed;

  constructor(left: number, right: number, closed: IntervalClosed = "right") {
    if (left > right) {
      throw new RangeError(`Interval left (${left}) must be <= right (${right})`);
    }
    this.left = left;
    this.right = right;
    this.closed = closed;
  }

  /** Midpoint of the interval. */
  get mid(): number {
    return (this.left + this.right) / 2;
  }

  /** Length of the interval (right - left). */
  get length(): number {
    return this.right - this.left;
  }

  /** True when both endpoints are excluded. */
  get isOpen(): boolean {
    return this.closed === "neither";
  }

  /** True when both endpoints are included. */
  get isClosed(): boolean {
    return this.closed === "both";
  }

  /** True if `value` is contained within this interval. */
  contains(value: number): boolean {
    return pointInInterval(this.left, this.right, this.closed, value);
  }

  /** True if this interval shares at least one point with `other`. */
  overlaps(other: Interval): boolean {
    return intervalsOverlap(
      this.left,
      this.right,
      this.closed,
      other.left,
      other.right,
      other.closed,
    );
  }

  /** Pandas-style string representation, e.g. "(0, 1]". */
  toString(): string {
    return `${openBracket(this.closed)}${this.left}, ${this.right}${closeBracket(this.closed)}`;
  }

  /** Two intervals are equal when left, right, and closed all match. */
  equals(other: Interval): boolean {
    return this.left === other.left && this.right === other.right && this.closed === other.closed;
  }
}

// ─── IntervalIndex helpers ────────────────────────────────────────────────────

/** Extract left endpoints from an Interval array. */
function extractLeft(intervals: readonly Interval[]): number[] {
  return intervals.map((iv) => iv.left);
}

/** Extract right endpoints from an Interval array. */
function extractRight(intervals: readonly Interval[]): number[] {
  return intervals.map((iv) => iv.right);
}

/** Extract mid values from an Interval array. */
function extractMid(intervals: readonly Interval[]): number[] {
  return intervals.map((iv) => iv.mid);
}

/** Extract lengths from an Interval array. */
function extractLength(intervals: readonly Interval[]): number[] {
  return intervals.map((iv) => iv.length);
}

/** Build Interval array from parallel left/right arrays. */
function buildIntervals(
  lefts: readonly number[],
  rights: readonly number[],
  closed: IntervalClosed,
): Interval[] {
  return lefts.map((l, i) => new Interval(l, rights[i] ?? l, closed));
}

/** Compute containment mask for one scalar against all intervals. */
function maskContains(intervals: readonly Interval[], value: number): boolean[] {
  return intervals.map((iv) => iv.contains(value));
}

/** Compute overlap mask for one interval against all intervals. */
function maskOverlaps(intervals: readonly Interval[], other: Interval): boolean[] {
  return intervals.map((iv) => iv.overlaps(other));
}

// ─── IntervalIndex ────────────────────────────────────────────────────────────

/**
 * An index of `Interval` objects.
 *
 * Mirrors `pandas.IntervalIndex`.
 *
 * @example
 * ```ts
 * const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
 * idx.size;           // 3
 * idx.left;           // [0, 1, 2]
 * idx.right;          // [1, 2, 3]
 * idx.mid;            // [0.5, 1.5, 2.5]
 * idx.contains(1.5);  // [false, true, false]
 * idx.get(0).toString(); // "(0, 1]"
 * ```
 */
export class IntervalIndex {
  private readonly _intervals: readonly Interval[];

  /** Which side(s) of every interval are closed. */
  readonly closed: IntervalClosed;

  constructor(intervals: readonly Interval[], closed: IntervalClosed = "right") {
    this._intervals = intervals;
    this.closed = closed;
  }

  // ─── factory methods ────────────────────────────────────────────────────────

  /**
   * Build from an array of break points — each consecutive pair becomes one interval.
   *
   * Mirrors `pd.IntervalIndex.from_breaks`.
   */
  static fromBreaks(breaks: readonly number[], closed: IntervalClosed = "right"): IntervalIndex {
    const intervals: Interval[] = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      intervals.push(new Interval(breaks[i] ?? 0, breaks[i + 1] ?? 0, closed));
    }
    return new IntervalIndex(intervals, closed);
  }

  /**
   * Build from parallel arrays of left and right endpoints.
   *
   * Mirrors `pd.IntervalIndex.from_arrays`.
   */
  static fromArrays(
    lefts: readonly number[],
    rights: readonly number[],
    closed: IntervalClosed = "right",
  ): IntervalIndex {
    if (lefts.length !== rights.length) {
      throw new RangeError("lefts and rights arrays must have the same length");
    }
    return new IntervalIndex(buildIntervals(lefts, rights, closed), closed);
  }

  /**
   * Build from an array of `Interval` objects.
   *
   * Mirrors `pd.IntervalIndex.from_intervals`.
   */
  static fromIntervals(intervals: readonly Interval[]): IntervalIndex {
    const closed = intervals[0]?.closed ?? "right";
    return new IntervalIndex(intervals.slice(), closed);
  }

  // ─── basic properties ────────────────────────────────────────────────────────

  /** Number of intervals. */
  get size(): number {
    return this._intervals.length;
  }

  /** Array of left endpoints. */
  get left(): number[] {
    return extractLeft(this._intervals);
  }

  /** Array of right endpoints. */
  get right(): number[] {
    return extractRight(this._intervals);
  }

  /** Array of midpoints. */
  get mid(): number[] {
    return extractMid(this._intervals);
  }

  /** Array of lengths (right - left). */
  get length(): number[] {
    return extractLength(this._intervals);
  }

  /** True when all intervals are empty (size == 0). */
  get isEmpty(): boolean {
    return this._intervals.length === 0;
  }

  // ─── element access ──────────────────────────────────────────────────────────

  /** Returns the `Interval` at position `i`. Throws on out-of-range access. */
  get(i: number): Interval {
    const iv = this._intervals[i];
    if (iv === undefined) {
      throw new RangeError(`Index ${i} is out of bounds for IntervalIndex of size ${this.size}`);
    }
    return iv;
  }

  // ─── queries ─────────────────────────────────────────────────────────────────

  /**
   * Returns a boolean array indicating which intervals contain `value`.
   *
   * Mirrors `pd.IntervalIndex.contains`.
   */
  contains(value: number): boolean[] {
    return maskContains(this._intervals, value);
  }

  /**
   * Returns a boolean array indicating which intervals overlap with `other`.
   *
   * Mirrors `pd.IntervalIndex.overlaps`.
   */
  overlaps(other: Interval): boolean[] {
    return maskOverlaps(this._intervals, other);
  }

  /**
   * Returns a copy with a different `closed` parameter.
   *
   * Mirrors `pd.IntervalIndex.set_closed`.
   */
  setClosed(closed: IntervalClosed): IntervalIndex {
    const intervals = this._intervals.map((iv) => new Interval(iv.left, iv.right, closed));
    return new IntervalIndex(intervals, closed);
  }

  /** Returns a plain array of all `Interval` objects. */
  toArray(): Interval[] {
    return this._intervals.slice() as Interval[];
  }

  /** String representation — one interval per line. */
  toString(): string {
    const items = this._intervals.map((iv) => iv.toString()).join(", ");
    return `IntervalIndex([${items}], closed="${this.closed}")`;
  }

  /** Equality check — same intervals in same order. */
  equals(other: IntervalIndex): boolean {
    if (this.size !== other.size) {
      return false;
    }
    return this._intervals.every((iv, i) => iv.equals(other.get(i)));
  }

  /** Iterate over intervals. */
  [Symbol.iterator](): Iterator<Interval> {
    return this._intervals[Symbol.iterator]();
  }
}

// ─── intervalRange ────────────────────────────────────────────────────────────

/** Validate and resolve intervalRange parameters. */
function resolveRangeParams(
  start: number,
  end: number,
  options: IntervalRangeOptions,
): { breaks: number[]; closed: IntervalClosed } {
  const closed = options.closed ?? "right";
  const { periods, freq } = options;

  if (periods === undefined && freq === undefined) {
    throw new TypeError("intervalRange: one of `periods` or `freq` must be specified");
  }
  if (periods !== undefined && freq !== undefined) {
    throw new TypeError("intervalRange: specify either `periods` or `freq`, not both");
  }

  const span = end - start;
  const step = periods !== undefined ? span / periods : (freq as number);

  if (step <= 0) {
    throw new RangeError("intervalRange: step must be positive");
  }

  const count = periods !== undefined ? periods : Math.round(span / step);
  const breaks: number[] = [];
  for (let i = 0; i <= count; i++) {
    breaks.push(start + i * step);
  }
  return { breaks, closed };
}

/**
 * Generate a fixed-frequency `IntervalIndex`.
 *
 * Mirrors `pd.interval_range(start, end, periods, freq, closed)`.
 *
 * @param start - Left bound of the leftmost interval.
 * @param end   - Right bound of the rightmost interval.
 * @param options - `periods` (number of intervals), `freq` (step size), `closed` (default "right").
 *
 * @example
 * ```ts
 * const idx = intervalRange(0, 4, { periods: 4 });
 * // IntervalIndex([(0, 1], (1, 2], (2, 3], (3, 4]], closed="right")
 *
 * const idx2 = intervalRange(0, 6, { freq: 2, closed: "left" });
 * // IntervalIndex([[0, 2), [2, 4), [4, 6)], closed="left")
 * ```
 */
export function intervalRange(
  start: number,
  end: number,
  options: IntervalRangeOptions,
): IntervalIndex {
  const { breaks, closed } = resolveRangeParams(start, end, options);
  return IntervalIndex.fromBreaks(breaks, closed);
}
