/**
 * indexers — custom window indexers for rolling computations.
 *
 * Mirrors `pandas.api.indexers`:
 * - {@link BaseIndexer} — abstract base class; subclass and override `getWindowBounds`.
 * - {@link FixedForwardWindowIndexer} — forward-looking window of fixed size.
 * - {@link VariableOffsetWindowIndexer} — window driven by a per-row offset array.
 *
 * A window indexer produces a pair of parallel arrays `[start, end]` where each
 * element `[start[i], end[i])` is the half-open interval of positions included
 * in the window centred on row `i`.  This follows pandas' internal convention
 * exactly, making it straightforward to port custom rolling logic.
 *
 * @example
 * ```ts
 * import { FixedForwardWindowIndexer } from "tsb";
 *
 * const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
 * const [start, end] = idx.getWindowBounds(5);
 * // start = [0, 1, 2, 3, 4]
 * // end   = [3, 4, 5, 5, 5]
 * ```
 *
 * @module
 */

// ─── public types ─────────────────────────────────────────────────────────────

/** Options passed to {@link BaseIndexer.getWindowBounds}. */
export interface WindowBoundsOptions {
  /** Total number of rows in the series. */
  readonly numValues: number;
  /**
   * Minimum number of valid observations required for the result to be
   * non-null.  Informational — the indexer itself does not filter, but
   * consumers (e.g. Rolling) use it to decide whether to emit null.
   */
  readonly minPeriods?: number;
  /**
   * Centre the window label.  How this is interpreted is up to the subclass;
   * `FixedForwardWindowIndexer` ignores this flag (it is always forward-looking).
   */
  readonly center?: boolean;
}

/** The return type of {@link BaseIndexer.getWindowBounds}: `[startArray, endArray]`. */
export type WindowBounds = [Int32Array, Int32Array];

// ═════════════════════════════════════════════════════════════════════════════
// BaseIndexer
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Abstract base class for custom window indexers.
 *
 * Subclass this and implement {@link getWindowBounds} to define an arbitrary
 * window shape.  The returned arrays must satisfy:
 *
 * - `start[i] >= 0`
 * - `end[i] <= numValues`
 * - `start[i] <= end[i]` (empty windows are allowed)
 *
 * Mirrors `pandas.api.indexers.BaseIndexer`.
 */
export abstract class BaseIndexer {
  /** Fixed window size, if applicable.  May be `null` for variable-size indexers. */
  readonly windowSize: number | null;

  constructor(options?: { windowSize?: number | null }) {
    this.windowSize = options?.windowSize ?? null;
  }

  /**
   * Compute the `[start, end)` bounds for every row.
   *
   * @param numValues - Number of rows in the series.
   * @param options   - Additional hints (minPeriods, center).
   * @returns Pair of `Int32Array` with length `numValues`.
   */
  abstract getWindowBounds(numValues: number, options?: WindowBoundsOptions): WindowBounds;
}

// ═════════════════════════════════════════════════════════════════════════════
// FixedForwardWindowIndexer
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A window indexer that looks **forward** from the current position.
 *
 * For row `i` the window covers `[i, i + windowSize)`, clamped to
 * `[0, numValues)`.  This is the opposite of the default trailing window
 * used by `Rolling`.
 *
 * Mirrors `pandas.api.indexers.FixedForwardWindowIndexer`.
 *
 * @example
 * ```ts
 * import { FixedForwardWindowIndexer } from "tsb";
 *
 * const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
 * const [start, end] = idx.getWindowBounds(5);
 * // i=0: [0, 3), i=1: [1, 4), i=2: [2, 5), i=3: [3, 5), i=4: [4, 5)
 * ```
 */
export class FixedForwardWindowIndexer extends BaseIndexer {
  /**
   * @param options.windowSize - Number of rows in each forward window (≥ 1).
   */
  constructor(options: { windowSize: number }) {
    if (!Number.isInteger(options.windowSize) || options.windowSize < 1) {
      throw new RangeError(
        `FixedForwardWindowIndexer: windowSize must be a positive integer, got ${options.windowSize}`,
      );
    }
    super({ windowSize: options.windowSize });
  }

  getWindowBounds(numValues: number, _options?: WindowBoundsOptions): WindowBounds {
    const w = this.windowSize as number;
    const start = new Int32Array(numValues);
    const end = new Int32Array(numValues);
    for (let i = 0; i < numValues; i++) {
      start[i] = i;
      end[i] = Math.min(i + w, numValues);
    }
    return [start, end];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// VariableOffsetWindowIndexer
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A window indexer driven by a per-row offset array.
 *
 * For row `i` the window covers `[i - offset[i], i + 1)` (trailing) or
 * `[i, i + offset[i] + 1)` (forward), depending on the `forward` flag.
 *
 * Each element of `offsets` must be a non-negative integer; the window is
 * clamped to the valid range `[0, numValues)`.
 *
 * Mirrors the spirit of `pandas.api.indexers.VariableOffsetWindowIndexer`,
 * adapted for a purely positional (non-datetime) context.
 *
 * @example
 * ```ts
 * import { VariableOffsetWindowIndexer } from "tsb";
 *
 * // Trailing window of variable depth
 * const idx = new VariableOffsetWindowIndexer({ offsets: [0, 1, 2, 1, 0] });
 * const [start, end] = idx.getWindowBounds(5);
 * // i=0: [0,1), i=1: [0,2), i=2: [0,3), i=3: [2,4), i=4: [4,5)
 * ```
 */
export class VariableOffsetWindowIndexer extends BaseIndexer {
  private readonly _offsets: readonly number[];
  private readonly _forward: boolean;

  /**
   * @param options.offsets - Per-row look-back (or look-forward) depth.
   *   Length must equal the series length passed to `getWindowBounds`.
   * @param options.forward - If `true`, look forward instead of backward.
   *   Defaults to `false`.
   */
  constructor(options: { offsets: readonly number[]; forward?: boolean }) {
    super({ windowSize: null });
    for (let i = 0; i < options.offsets.length; i++) {
      const o = options.offsets[i];
      if (o === undefined || !Number.isInteger(o) || o < 0) {
        throw new RangeError(
          `VariableOffsetWindowIndexer: offsets[${i}] must be a non-negative integer, got ${o}`,
        );
      }
    }
    this._offsets = options.offsets;
    this._forward = options.forward ?? false;
  }

  getWindowBounds(numValues: number, _options?: WindowBoundsOptions): WindowBounds {
    if (this._offsets.length !== numValues) {
      throw new RangeError(
        `VariableOffsetWindowIndexer: offsets length (${this._offsets.length}) ` +
          `does not match numValues (${numValues})`,
      );
    }
    const start = new Int32Array(numValues);
    const end = new Int32Array(numValues);
    for (let i = 0; i < numValues; i++) {
      const offset = this._offsets[i] as number;
      if (this._forward) {
        start[i] = i;
        end[i] = Math.min(i + offset + 1, numValues);
      } else {
        start[i] = Math.max(0, i - offset);
        end[i] = i + 1;
      }
    }
    return [start, end];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// applyIndexer — helper consumed by Rolling and testing code
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Apply an aggregation function to each window defined by a {@link BaseIndexer}.
 *
 * Returns a numeric array of length `numValues`.  Positions whose window
 * contains fewer than `minPeriods` valid (finite, non-null) numbers produce
 * `null`.
 *
 * @example
 * ```ts
 * import { FixedForwardWindowIndexer, applyIndexer } from "tsb";
 *
 * const idx = new FixedForwardWindowIndexer({ windowSize: 2 });
 * const result = applyIndexer(idx, [1, 2, 3, 4, 5], (nums) => nums.reduce((a, b) => a + b, 0));
 * // [3, 5, 7, 9, 5]
 * ```
 */
export function applyIndexer(
  indexer: BaseIndexer,
  values: readonly (number | null | undefined)[],
  agg: (nums: readonly number[]) => number,
  minPeriods = 1,
): (number | null)[] {
  const n = values.length;
  const [start, end] = indexer.getWindowBounds(n);
  const result: (number | null)[] = Array.from({ length: n }, (): null => null);

  for (let i = 0; i < n; i++) {
    const s = start[i] as number;
    const e = end[i] as number;
    const nums: number[] = [];
    for (let j = s; j < e; j++) {
      const v = values[j];
      if (v !== null && v !== undefined && typeof v === "number" && !Number.isNaN(v)) {
        nums.push(v);
      }
    }
    result[i] = nums.length >= minPeriods ? agg(nums) : null;
  }

  return result;
}
