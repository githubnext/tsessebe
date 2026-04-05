/**
 * NAType — the pandas-compatible `pd.NA` missing-value singleton.
 *
 * `NA` is tsb's equivalent of `pandas.NA`: a scalar sentinel distinct from
 * `null`, `undefined`, and `NaN` that propagates through arithmetic and
 * logical operations according to the three-valued-logic rules pandas uses.
 *
 * @example
 * ```ts
 * import { NA, isNA } from "tsb";
 *
 * NA + 1;          // NA
 * NA === NA;       // true (identity)
 * NA == null;      // false (NA is not null)
 * isNA(NA);        // true
 * isNA(null);      // false
 * isNA(undefined); // false
 * String(NA);      // "<NA>"
 * ```
 */

// ─── NAType ───────────────────────────────────────────────────────────────────

/**
 * The type of the `NA` singleton.  Use `isNA(v)` to guard values.
 */
export class NAType {
  /** @internal — use the exported `NA` singleton instead. */
  private static _instance: NAType | null = null;

  private constructor() {}

  /** Returns the singleton instance. */
  static getInstance(): NAType {
    if (NAType._instance === null) {
      NAType._instance = new NAType();
    }
    return NAType._instance;
  }

  /** Human-readable representation mirroring `pandas.NA`. */
  toString(): string {
    return "<NA>";
  }

  /** Used by JSON.stringify — NA serialises as `null` (closest JSON equivalent). */
  toJSON(): null {
    return null;
  }

  // ─── arithmetic propagation ──────────────────────────────────────────────

  /** Addition — always returns NA. */
  add(_other: unknown): NAType {
    return this;
  }

  /** Subtraction — always returns NA. */
  sub(_other: unknown): NAType {
    return this;
  }

  /** Multiplication — always returns NA. */
  mul(_other: unknown): NAType {
    return this;
  }

  /** Division — always returns NA. */
  div(_other: unknown): NAType {
    return this;
  }

  /** Remainder — always returns NA. */
  mod(_other: unknown): NAType {
    return this;
  }

  /** Exponentiation — always returns NA. */
  pow(_other: unknown): NAType {
    return this;
  }

  // ─── logical three-valued logic ──────────────────────────────────────────

  /**
   * Logical AND using Kleene three-valued logic.
   *
   * - `NA & false` → `false`   (false dominates)
   * - `NA & true`  → `NA`
   * - `NA & NA`    → `NA`
   */
  and(other: boolean | NAType): boolean | NAType {
    if (other === false) {
      return false;
    }
    return this;
  }

  /**
   * Logical OR using Kleene three-valued logic.
   *
   * - `NA | true`  → `true`   (true dominates)
   * - `NA | false` → `NA`
   * - `NA | NA`    → `NA`
   */
  or(other: boolean | NAType): boolean | NAType {
    if (other === true) {
      return true;
    }
    return this;
  }

  /**
   * Logical NOT — returns NA (truth value unknown).
   */
  not(): NAType {
    return this;
  }
}

// ─── singleton export ─────────────────────────────────────────────────────────

/**
 * The `NA` singleton — tsb's equivalent of `pandas.NA`.
 *
 * This value represents a truly missing entry whose dtype is unknown,
 * unlike `NaN` (floating-point) or `None` (object).
 *
 * @example
 * ```ts
 * import { NA } from "tsb";
 * NA.toString(); // "<NA>"
 * ```
 */
export const NA: NAType = NAType.getInstance();

// ─── type guard ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if `value` is the `NA` singleton.
 *
 * @example
 * ```ts
 * isNA(NA);        // true
 * isNA(null);      // false
 * isNA(undefined); // false
 * isNA(Number.NaN);// false
 * ```
 */
export function isNA(value: unknown): value is NAType {
  return value === NA;
}

/**
 * Converts a value to NA if it satisfies the given predicate, otherwise
 * returns the value unchanged.
 *
 * @example
 * ```ts
 * naIf(-999, (v) => v === -999); // NA
 * naIf(42,   (v) => v === -999); // 42
 * ```
 */
export function naIf<T>(value: T, predicate: (v: T) => boolean): T | NAType {
  return predicate(value) ? NA : value;
}

/**
 * Returns `fallback` if `value` is NA, otherwise returns `value` unchanged.
 *
 * @example
 * ```ts
 * naOr(NA, 0);   // 0
 * naOr(42, 0);   // 42
 * ```
 */
export function naOr<T>(value: T | NAType, fallback: T): T {
  return isNA(value) ? fallback : (value as T);
}
