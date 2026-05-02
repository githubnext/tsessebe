/**
 * Grouper — a specification object for groupby operations.
 *
 * Mirrors `pandas.Grouper` — a convenience class that encapsulates grouping
 * parameters so they can be passed as a reusable spec to `groupby()`.
 *
 * @example
 * ```ts
 * import { Grouper, DataFrame } from "tsb";
 *
 * const df = DataFrame.fromColumns({
 *   date: ["2021-01", "2021-01", "2021-02"],
 *   val: [1, 2, 3],
 * });
 *
 * // Group by the "date" column
 * const g = new Grouper({ key: "date" });
 * df.groupby(g).sum();
 * ```
 */

import type { Label } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options accepted by the {@link Grouper} constructor. */
export interface GrouperOptions {
  /**
   * The column name (or index level name) to group by.
   * Mirrors the `key` parameter of `pd.Grouper`.
   */
  key?: string;

  /**
   * Frequency string for time-based resampling (e.g. `"1D"`, `"ME"`, `"QS"`).
   * When set, the Grouper represents a resampling operation on the `key` column.
   * Mirrors the `freq` parameter of `pd.Grouper`.
   */
  freq?: string;

  /**
   * The axis along which the grouper operates (0 = rows, 1 = columns).
   * Defaults to `0`. Mirrors `pd.Grouper(axis=...)`.
   * @deprecated pandas ≥ 2.0 removed the axis parameter.
   */
  axis?: 0 | 1;

  /**
   * Sort the group keys.
   * Defaults to `false`. Mirrors `pd.Grouper(sort=...)`.
   */
  sort?: boolean;

  /**
   * Drop NA group keys when `True`.
   * Defaults to `true`. Mirrors `pd.Grouper(dropna=...)`.
   */
  dropna?: boolean;

  /**
   * The index level (by name or integer position) to group on.
   * Mirrors `pd.Grouper(level=...)`.
   */
  level?: Label | number;

  /**
   * Closed side of the interval for time-based grouping.
   * One of `"left"` or `"right"`. Mirrors `pd.Grouper(closed=...)`.
   */
  closed?: "left" | "right";

  /**
   * Which end of the interval the label corresponds to.
   * One of `"left"` or `"right"`. Mirrors `pd.Grouper(label=...)`.
   */
  label?: "left" | "right";
}

// ─── Grouper ──────────────────────────────────────────────────────────────────

/**
 * A specification object that encapsulates groupby parameters.
 *
 * Mirrors `pandas.Grouper`. Pass an instance to `groupby()` instead of a raw
 * column name when you want to reuse grouping specs or use advanced options
 * such as `freq`, `level`, `sort`, or `dropna`.
 *
 * @example
 * ```ts
 * // Group by a column with explicit sort
 * const g = new Grouper({ key: "dept", sort: true });
 * df.groupby(g).mean();
 *
 * // Group by index level
 * const gl = new Grouper({ level: 0 });
 * df.groupby(gl).sum();
 * ```
 */
export class Grouper {
  /** Column / index level name. */
  readonly key: string | undefined;

  /** Frequency string for time-based grouping. */
  readonly freq: string | undefined;

  /** Axis (0 = rows, 1 = columns). */
  readonly axis: 0 | 1;

  /** Whether to sort group keys. */
  readonly sort: boolean;

  /** Whether to drop NA group keys. */
  readonly dropna: boolean;

  /** Index level to group on. */
  readonly level: Label | number | undefined;

  /** Closed side for interval-based grouping. */
  readonly closed: "left" | "right" | undefined;

  /** Label side for interval-based grouping. */
  readonly label: "left" | "right" | undefined;

  constructor(options: GrouperOptions = {}) {
    this.key = options.key;
    this.freq = options.freq;
    this.axis = options.axis ?? 0;
    this.sort = options.sort ?? false;
    this.dropna = options.dropna ?? true;
    this.level = options.level;
    this.closed = options.closed;
    this.label = options.label;
  }

  /**
   * Returns `true` if this Grouper represents a frequency-based (time) grouping.
   */
  isFreqGrouper(): boolean {
    return this.freq !== undefined;
  }

  /**
   * Returns `true` if this Grouper groups by an index level.
   */
  isLevelGrouper(): boolean {
    return this.level !== undefined;
  }

  /**
   * Returns `true` if this Grouper groups by a column key.
   */
  isKeyGrouper(): boolean {
    return this.key !== undefined && this.freq === undefined && this.level === undefined;
  }

  /**
   * Returns a human-readable string for debugging.
   */
  toString(): string {
    const parts: string[] = [];
    if (this.key !== undefined) parts.push(`key="${this.key}"`);
    if (this.freq !== undefined) parts.push(`freq="${this.freq}"`);
    if (this.level !== undefined) parts.push(`level=${String(this.level)}`);
    if (this.sort) parts.push("sort=true");
    if (!this.dropna) parts.push("dropna=false");
    return `Grouper(${parts.join(", ")})`;
  }
}

/**
 * Returns `true` when `value` is a {@link Grouper} instance.
 *
 * @example
 * ```ts
 * isGrouper(new Grouper({ key: "col" })); // true
 * isGrouper("col");                        // false
 * ```
 */
export function isGrouper(value: unknown): value is Grouper {
  return value instanceof Grouper;
}
