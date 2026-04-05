/**
 * Flags — per-object metadata flags for Series and DataFrames.
 *
 * Mirrors `pandas.core.flags.Flags`: a lightweight container attached to
 * Series/DataFrame objects that stores boolean metadata flags affecting
 * validation behaviour.
 *
 * The only flag currently supported is `allows_duplicate_labels`, which
 * controls whether duplicate index/column labels are permitted.  When set to
 * `false`, any operation that would produce or expose duplicate labels raises
 * a `DuplicateLabelError`.
 *
 * @example
 * ```ts
 * import { Flags, DuplicateLabelError } from "tsb";
 *
 * const flags = new Flags({ allows_duplicate_labels: true });
 * flags.allows_duplicate_labels;      // true
 * flags.set({ allows_duplicate_labels: false });
 * flags.allows_duplicate_labels;      // false
 *
 * // validate labels
 * Flags.checkLabels(["a", "b", "c"], flags);   // ok
 * Flags.checkLabels(["a", "b", "a"], flags);   // throws DuplicateLabelError
 * ```
 */

import type { Label } from "../types.ts";

// ─── error ────────────────────────────────────────────────────────────────────

/**
 * Thrown when duplicate index or column labels are encountered and
 * `Flags.allows_duplicate_labels` is `false`.
 */
export class DuplicateLabelError extends Error {
  constructor(labels: readonly Label[]) {
    const dupes = findDuplicates(labels);
    super(`Duplicate labels found: ${dupes.map(String).join(", ")}`);
    // biome-ignore lint/nursery/noSecrets: class name string, not a secret
    this.name = "DuplicateLabelError";
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return the labels that appear more than once, in first-occurrence order. */
function findDuplicates(labels: readonly Label[]): Label[] {
  const seen = new Set<Label>();
  const dupes: Label[] = [];
  for (const lbl of labels) {
    if (seen.has(lbl)) {
      if (!dupes.includes(lbl)) {
        dupes.push(lbl);
      }
    } else {
      seen.add(lbl);
    }
  }
  return dupes;
}

/** True when the label array contains at least one duplicate. */
function hasDuplicates(labels: readonly Label[]): boolean {
  const seen = new Set<Label>();
  for (const lbl of labels) {
    if (seen.has(lbl)) {
      return true;
    }
    seen.add(lbl);
  }
  return false;
}

// ─── FlagsOptions ─────────────────────────────────────────────────────────────

/** Options accepted by the `Flags` constructor. */
export interface FlagsOptions {
  /** Whether duplicate index/column labels are permitted. Default `true`. */
  readonly allows_duplicate_labels?: boolean;
}

// ─── Flags ────────────────────────────────────────────────────────────────────

/**
 * Metadata flags container attached to Series and DataFrames.
 *
 * @example
 * ```ts
 * const flags = new Flags();
 * flags.allows_duplicate_labels; // true  (default)
 * flags.set({ allows_duplicate_labels: false });
 * flags.allows_duplicate_labels; // false
 * ```
 */
export class Flags {
  private _allowsDuplicateLabels: boolean;

  constructor(options?: FlagsOptions) {
    this._allowsDuplicateLabels = options?.allows_duplicate_labels ?? true;
  }

  /** Whether duplicate index/column labels are allowed. */
  get allows_duplicate_labels(): boolean {
    return this._allowsDuplicateLabels;
  }

  /**
   * Update one or more flags and return `this` for chaining.
   *
   * @example
   * ```ts
   * flags.set({ allows_duplicate_labels: false });
   * ```
   */
  set(options: FlagsOptions): this {
    if (options.allows_duplicate_labels !== undefined) {
      this._allowsDuplicateLabels = options.allows_duplicate_labels;
    }
    return this;
  }

  /**
   * Return a copy of these flags.
   *
   * @example
   * ```ts
   * const copy = flags.copy();
   * ```
   */
  copy(): Flags {
    return new Flags({ allows_duplicate_labels: this._allowsDuplicateLabels });
  }

  /**
   * Returns a plain-object representation of the flags.
   *
   * @example
   * ```ts
   * flags.toObject(); // { allows_duplicate_labels: true }
   * ```
   */
  toObject(): { allows_duplicate_labels: boolean } {
    return { allows_duplicate_labels: this._allowsDuplicateLabels };
  }

  /**
   * Validate that `labels` comply with this Flags instance.
   *
   * Throws `DuplicateLabelError` when `allows_duplicate_labels` is `false`
   * and `labels` contains duplicates.
   *
   * @param labels — Row-index or column labels to validate.
   * @param flags  — The Flags instance to enforce.
   */
  static checkLabels(labels: readonly Label[], flags: Flags): void {
    if (!flags.allows_duplicate_labels && hasDuplicates(labels)) {
      throw new DuplicateLabelError(labels);
    }
  }

  /**
   * Alias for `Flags.checkLabels(labels, this)` — instance shorthand.
   *
   * @param labels — Labels to validate.
   */
  validate(labels: readonly Label[]): void {
    Flags.checkLabels(labels, this);
  }

  toString(): string {
    return `Flags(allows_duplicate_labels=${String(this._allowsDuplicateLabels)})`;
  }
}

// ─── module-level helpers ─────────────────────────────────────────────────────

/**
 * Returns `true` when labels are unique (no duplicates).
 *
 * @example
 * ```ts
 * labelsAreUnique(["a", "b", "c"]); // true
 * labelsAreUnique(["a", "b", "a"]); // false
 * ```
 */
export function labelsAreUnique(labels: readonly Label[]): boolean {
  return !hasDuplicates(labels);
}

/**
 * Returns the duplicate labels in a label array (empty if none).
 *
 * @example
 * ```ts
 * getDuplicateLabels(["a", "b", "a", "c", "b"]); // ["a", "b"]
 * ```
 */
export function getDuplicateLabels(labels: readonly Label[]): Label[] {
  return findDuplicates(labels);
}
