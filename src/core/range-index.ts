/**
 * RangeIndex — a memory-efficient integer index backed by start/stop/step.
 *
 * Mirrors pandas.RangeIndex: stores only the range parameters,
 * expanding to actual values only when required.
 */

import { Index } from "./base-index.ts";

/**
 * A memory-efficient index representing a monotonic integer range.
 *
 * Only `start`, `stop`, and `step` are stored; individual values are
 * computed on the fly.  This is the default index type assigned to
 * Series and DataFrames when no explicit index is provided.
 *
 * @example
 * ```ts
 * const r = new RangeIndex(5);          // 0, 1, 2, 3, 4
 * const r2 = new RangeIndex(0, 10, 2);  // 0, 2, 4, 6, 8
 * ```
 */
export class RangeIndex extends Index<number> {
  readonly start: number;
  readonly stop: number;
  readonly step: number;

  // ─── construction ───────────────────────────────────────────────

  /**
   * Create a new `RangeIndex`.
   *
   * Follows the same overload convention as Python's `range()`:
   *
   * - `new RangeIndex(stop)` → `[0, 1, …, stop-1]`
   * - `new RangeIndex(start, stop)` → `[start, start+1, …, stop-1]`
   * - `new RangeIndex(start, stop, step)` → `[start, start+step, …]`
   */
  constructor(startOrStop: number, stop?: number, step?: number, name?: string | null) {
    const resolvedStart = stop === undefined ? 0 : startOrStop;
    const resolvedStop = stop === undefined ? startOrStop : stop;
    const resolvedStep = step ?? 1;

    if (resolvedStep === 0) {
      throw new RangeError("RangeIndex step must not be zero");
    }

    const values = RangeIndex.computeValues(resolvedStart, resolvedStop, resolvedStep);
    super(values, name);

    this.start = resolvedStart;
    this.stop = resolvedStop;
    this.step = resolvedStep;
  }

  // ─── internal helpers ───────────────────────────────────────────

  private static computeValues(start: number, stop: number, step: number): number[] {
    const out: number[] = [];
    if (step > 0) {
      for (let v = start; v < stop; v += step) {
        out.push(v);
      }
    } else {
      for (let v = start; v > stop; v += step) {
        out.push(v);
      }
    }
    return out;
  }

  // ─── overridden properties ──────────────────────────────────────

  /** A RangeIndex is always unique. */
  override get isUnique(): true {
    return true;
  }

  /** A RangeIndex never has duplicates. */
  override get hasDuplicates(): false {
    return false;
  }

  /** Monotonicity depends on step direction and non-emptiness. */
  override get isMonotonicIncreasing(): boolean {
    return this.size <= 1 || this.step > 0;
  }

  override get isMonotonicDecreasing(): boolean {
    return this.size <= 1 || this.step < 0;
  }

  // ─── slicing (returns RangeIndex when possible) ─────────────────

  override slice(start?: number, end?: number): RangeIndex {
    const sliced = this._values.slice(start, end);
    if (sliced.length === 0) {
      return new RangeIndex(0, 0, 1, this.name);
    }
    const first = sliced[0] as number;
    if (sliced.length === 1) {
      return new RangeIndex(
        first,
        first + (this.step > 0 ? 1 : -1),
        this.step > 0 ? 1 : -1,
        this.name,
      );
    }
    const newStep = (sliced[1] as number) - first;
    const last = sliced.at(-1) as number;
    return new RangeIndex(first, last + (newStep > 0 ? 1 : -1), newStep, this.name);
  }

  /** Return a shallow copy, optionally with a new name. */
  override copy(name?: string | null): RangeIndex {
    return new RangeIndex(this.start, this.stop, this.step, name === undefined ? this.name : name);
  }

  /** Return a new RangeIndex with a different name. */
  override rename(name: string | null): RangeIndex {
    return new RangeIndex(this.start, this.stop, this.step, name);
  }

  // ─── pretty-print ──────────────────────────────────────────────

  override toString(): string {
    const nameStr = this.name !== null ? `, name='${this.name}'` : "";
    return `RangeIndex(start=${this.start}, stop=${this.stop}, step=${this.step}${nameStr})`;
  }
}
