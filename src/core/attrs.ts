/**
 * attrs — user-defined metadata dictionary for Series and DataFrame.
 *
 * Mirrors `pandas.DataFrame.attrs` / `pandas.Series.attrs`: an arbitrary
 * key→value dictionary that travels with a data object and lets callers
 * annotate it with provenance, units, descriptions, or any other metadata.
 *
 * Because the tsb Series and DataFrame classes are immutable by design, this
 * module maintains a **WeakMap registry** that maps each object to its attrs
 * record.  The registry entries are garbage-collected automatically when the
 * object itself is collected — there is no memory leak.
 *
 * ### Public surface
 *
 * ```ts
 * import { getAttrs, setAttrs, updateAttrs, copyAttrs, withAttrs, clearAttrs,
 *           hasAttrs } from "tsb";
 *
 * const df = DataFrame.fromColumns({ x: [1, 2, 3] });
 *
 * // Annotate
 * setAttrs(df, { source: "sensor_A", unit: "metres" });
 * getAttrs(df);  // { source: "sensor_A", unit: "metres" }
 *
 * // Merge additional keys
 * updateAttrs(df, { version: 2 });
 * getAttrs(df);  // { source: "sensor_A", unit: "metres", version: 2 }
 *
 * // Fluent helper — sets attrs and returns the same object
 * const annotated = withAttrs(df, { source: "sensor_B" });
 * annotated === df; // true — same reference
 *
 * // Propagate to a derived object
 * const df2 = DataFrame.fromColumns({ y: [4, 5, 6] });
 * copyAttrs(df, df2);
 * getAttrs(df2);  // { source: "sensor_A", unit: "metres", version: 2 }
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/**
 * The attrs dictionary type.  Keys are strings; values may be any JSON-safe
 * primitive or nested structure.  Mirrors the `dict` type of `pandas.attrs`.
 */
export type Attrs = Record<string, unknown>;

// ─── registry ─────────────────────────────────────────────────────────────────

/** Internal WeakMap from any object to its attrs record. */
const registry = new WeakMap<object, Attrs>();

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve the attrs dictionary for `obj`.
 *
 * Returns a **shallow copy** so callers cannot mutate the stored record
 * accidentally.  If no attrs have been set, returns an empty object `{}`.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3] });
 * setAttrs(s, { unit: "kg" });
 * getAttrs(s); // { unit: "kg" }
 * ```
 */
export function getAttrs(obj: object): Attrs {
  const stored = registry.get(obj);
  return stored !== undefined ? { ...stored } : {};
}

/**
 * **Overwrite** the attrs dictionary for `obj` with `attrs`.
 *
 * Any previously stored attrs are discarded.  Stores a shallow copy so
 * subsequent mutations to the passed-in object do not affect the stored value.
 *
 * @example
 * ```ts
 * setAttrs(df, { source: "sensor_A" });
 * getAttrs(df); // { source: "sensor_A" }
 * ```
 */
export function setAttrs(obj: object, attrs: Attrs): void {
  registry.set(obj, { ...attrs });
}

/**
 * **Merge** `updates` into the existing attrs for `obj`.
 *
 * Existing keys that are not present in `updates` are preserved.  Keys that
 * are present in both `updates` and the existing attrs are overwritten.
 *
 * @example
 * ```ts
 * setAttrs(df, { source: "A" });
 * updateAttrs(df, { version: 2 });
 * getAttrs(df); // { source: "A", version: 2 }
 * ```
 */
export function updateAttrs(obj: object, updates: Attrs): void {
  const existing = registry.get(obj) ?? {};
  registry.set(obj, { ...existing, ...updates });
}

/**
 * **Copy** the attrs from `source` to `target`, overwriting any existing attrs
 * on `target`.
 *
 * Useful for propagating metadata from an input to a derived result.
 *
 * @example
 * ```ts
 * setAttrs(df1, { source: "sensor_A" });
 * const df2 = df1.head(5);
 * copyAttrs(df1, df2);
 * getAttrs(df2); // { source: "sensor_A" }
 * ```
 */
export function copyAttrs(source: object, target: object): void {
  const stored = registry.get(source);
  if (stored !== undefined) {
    registry.set(target, { ...stored });
  } else {
    registry.delete(target);
  }
}

/**
 * **Fluent helper** — set attrs on `obj` and return the same object.
 *
 * This **replaces** any previously stored attrs (same semantics as
 * {@link setAttrs}).  The return type is `T` so callers do not lose the
 * concrete type of their object.
 *
 * @example
 * ```ts
 * const annotated = withAttrs(df, { source: "sensor_A", unit: "metres" });
 * annotated === df; // true — same reference
 * getAttrs(annotated); // { source: "sensor_A", unit: "metres" }
 * ```
 */
export function withAttrs<T extends object>(obj: T, attrs: Attrs): T {
  registry.set(obj, { ...attrs });
  return obj;
}

/**
 * **Remove** all attrs from `obj`.
 *
 * After calling this, {@link getAttrs} returns `{}` and {@link hasAttrs}
 * returns `false`.
 *
 * @example
 * ```ts
 * setAttrs(df, { source: "A" });
 * clearAttrs(df);
 * hasAttrs(df); // false
 * getAttrs(df); // {}
 * ```
 */
export function clearAttrs(obj: object): void {
  registry.delete(obj);
}

/**
 * Returns `true` if `obj` has any attrs set, `false` otherwise.
 *
 * @example
 * ```ts
 * hasAttrs(df); // false
 * setAttrs(df, { x: 1 });
 * hasAttrs(df); // true
 * clearAttrs(df);
 * hasAttrs(df); // false
 * ```
 */
export function hasAttrs(obj: object): boolean {
  return registry.has(obj);
}

/**
 * Retrieve a **single** attrs value by key.
 *
 * Returns `undefined` if the key does not exist (or no attrs are set).
 *
 * @example
 * ```ts
 * setAttrs(df, { unit: "kg" });
 * getAttr(df, "unit");    // "kg"
 * getAttr(df, "missing"); // undefined
 * ```
 */
export function getAttr(obj: object, key: string): unknown {
  return registry.get(obj)?.[key];
}

/**
 * Set a **single** attrs key on `obj`, preserving all other existing attrs.
 *
 * @example
 * ```ts
 * setAttr(df, "unit", "kg");
 * setAttr(df, "source", "lab");
 * getAttrs(df); // { unit: "kg", source: "lab" }
 * ```
 */
export function setAttr(obj: object, key: string, value: unknown): void {
  const existing = registry.get(obj) ?? {};
  registry.set(obj, { ...existing, [key]: value });
}

/**
 * Delete a **single** attrs key from `obj`, preserving all other keys.
 *
 * Does nothing if the key does not exist.
 *
 * @example
 * ```ts
 * setAttrs(df, { a: 1, b: 2 });
 * deleteAttr(df, "a");
 * getAttrs(df); // { b: 2 }
 * ```
 */
export function deleteAttr(obj: object, key: string): void {
  const existing = registry.get(obj);
  if (existing === undefined) return;
  const { [key]: _removed, ...rest } = existing;
  if (Object.keys(rest).length === 0) {
    registry.delete(obj);
  } else {
    registry.set(obj, rest);
  }
}

/**
 * Return the number of attrs keys stored on `obj`.
 *
 * @example
 * ```ts
 * attrsCount(df);              // 0
 * setAttrs(df, { a: 1, b: 2 });
 * attrsCount(df);              // 2
 * ```
 */
export function attrsCount(obj: object): number {
  return Object.keys(registry.get(obj) ?? {}).length;
}

/**
 * Return the list of attrs keys stored on `obj`.
 *
 * @example
 * ```ts
 * setAttrs(df, { a: 1, b: 2 });
 * attrsKeys(df); // ["a", "b"]
 * ```
 */
export function attrsKeys(obj: object): string[] {
  return Object.keys(registry.get(obj) ?? {});
}

/**
 * Merge attrs from multiple source objects into a single target object.
 *
 * Sources are applied left-to-right; later sources overwrite earlier ones on
 * key conflicts.  Overwrites any existing attrs on `target`.
 *
 * @example
 * ```ts
 * setAttrs(s1, { source: "A", unit: "kg" });
 * setAttrs(s2, { source: "B", scale: 2 });
 * mergeAttrs([s1, s2], df);
 * getAttrs(df); // { source: "B", unit: "kg", scale: 2 }
 * ```
 */
export function mergeAttrs(sources: readonly object[], target: object): void {
  const merged: Attrs = {};
  for (const src of sources) {
    const stored = registry.get(src);
    if (stored !== undefined) {
      Object.assign(merged, stored);
    }
  }
  if (Object.keys(merged).length > 0) {
    registry.set(target, merged);
  }
}
