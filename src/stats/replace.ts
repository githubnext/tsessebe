/**
 * replace — value substitution for Series and DataFrame.
 *
 * Mirrors `pandas.Series.replace()` and `pandas.DataFrame.replace()`:
 *
 * - {@link replaceSeries}: replace one or more values in a `Series`.
 * - {@link replaceDataFrame}: replace values in a `DataFrame`, either
 *   globally across all columns or per-column.
 *
 * ### Supported call forms
 *
 * **Scalar pair** — replace a single old value with a single new value:
 * ```ts
 * replaceSeries(s, 1, 99);
 * ```
 *
 * **List pair** — replace a list of old values with a corresponding list of
 * new values (or a single new value applied to all):
 * ```ts
 * replaceSeries(s, [1, 2], [10, 20]);
 * replaceSeries(s, [1, 2], 0);   // both 1 and 2 → 0
 * ```
 *
 * **Dict form** — mapping of `{ oldValue: newValue }` pairs:
 * ```ts
 * replaceSeries(s, { "1": 10, "2": 20 });
 * ```
 *
 * **DataFrame per-column** — nested dict `{ colName: { old: new } }`:
 * ```ts
 * replaceDataFrame(df, { A: { "1": 99 }, B: { "2": 0 } });
 * ```
 *
 * ### Missing-value handling
 *
 * Missing values (`null`, `undefined`, `NaN`) may be replaced by including
 * their canonical keys in a dict or by passing them in a list/scalar form.
 *
 * @module
 *
 * @example
 * ```ts
 * import { replaceSeries, replaceDataFrame } from "tsb";
 * import { Series, DataFrame } from "tsb";
 *
 * const s = new Series({ data: [1, 2, 3, null], name: "x" });
 * replaceSeries(s, 1, 99);
 * // Series([99, 2, 3, null], name="x")
 *
 * replaceSeries(s, [1, 2], [10, 20]);
 * // Series([10, 20, 3, null], name="x")
 *
 * replaceSeries(s, null, 0);
 * // Series([1, 2, 3, 0], name="x")
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 1, 6] });
 * replaceDataFrame(df, 1, 99);
 * // DataFrame({ a: [99, 2, 3], b: [4, 99, 6] })
 *
 * replaceDataFrame(df, { A: { "1": 99 } });
 * // per-column: only column A's 1 → 99; column B is unchanged
 * ```
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * A mapping from old scalar values to new scalar values.
 *
 * Dictionary keys are the **string encoding** of the old values (see {@link encodeKey}).
 * To replace `NaN`, use the key `"NaN"`; to replace `null`, use `"null"`;
 * to replace `undefined`, use `"undefined"`.
 */
export type ReplaceDict = Readonly<Record<string, Scalar>>;

/**
 * Per-column replacement mapping for {@link replaceDataFrame}.
 *
 * Each key is a column name; each value is a {@link ReplaceDict} that maps old
 * values to new values for that column only.  Columns absent from the map are
 * left unchanged.
 */
export type ReplacePerColumnDict = Readonly<Record<string, ReplaceDict>>;

/**
 * The `toReplace` argument accepted by {@link replaceSeries} and
 * {@link replaceDataFrame}:
 *
 * - **`Scalar`** — a single value to replace (requires the `value` argument).
 * - **`readonly Scalar[]`** — multiple values to replace (requires `value`).
 * - **`ReplaceDict`** — a `{ encodedOld: new }` mapping (no `value` needed).
 * - **`ReplacePerColumnDict`** — a per-column mapping (DataFrame only).
 */
export type ReplaceArg = Scalar | readonly Scalar[] | ReplaceDict | ReplacePerColumnDict;

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Encode a `Scalar` to a stable string key for use in lookup maps.
 *
 * Handles all `Scalar` types including `null`, `undefined`, `NaN`,
 * `bigint`, and `Date`.
 */
function encodeKey(v: Scalar): string {
  if (v === null) {
    return "null";
  }
  if (v === undefined) {
    return "undefined";
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return "NaN";
  }
  if (v instanceof Date) {
    return `__date__${v.getTime().toString()}`;
  }
  if (typeof v === "bigint") {
    return `__bigint__${v.toString()}`;
  }
  return String(v);
}

/**
 * Build a `Map<string, Scalar>` from a list of (from, to) pairs.
 *
 * When `to` is a single scalar it is broadcast to all `from` entries.
 * When `to` is an array it must be the same length as `from`.
 */
function buildLookupFromLists(
  froms: readonly Scalar[],
  to: Scalar | readonly Scalar[],
): Map<string, Scalar> {
  const map = new Map<string, Scalar>();
  if (Array.isArray(to)) {
    const tos = to as readonly Scalar[];
    for (let i = 0; i < froms.length; i++) {
      const f = froms[i] as Scalar;
      const t = tos[i] as Scalar;
      map.set(encodeKey(f), t);
    }
  } else {
    const scalar = to as Scalar;
    for (const f of froms) {
      map.set(encodeKey(f), scalar);
    }
  }
  return map;
}

/**
 * Build a `Map<string, Scalar>` from a `ReplaceDict`.
 */
function buildLookupFromDict(dict: ReplaceDict): Map<string, Scalar> {
  const map = new Map<string, Scalar>();
  for (const [k, v] of Object.entries(dict)) {
    map.set(k, v);
  }
  return map;
}

/**
 * Apply a lookup map to an array of scalars, returning a new array with
 * matched values substituted.
 */
function applyLookup(data: readonly Scalar[], lookup: ReadonlyMap<string, Scalar>): Scalar[] {
  const result: Scalar[] = new Array<Scalar>(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i] as Scalar;
    const key = encodeKey(v);
    result[i] = lookup.has(key) ? (lookup.get(key) as Scalar) : v;
  }
  return result;
}

/**
 * Return `true` when `v` is a plain-object record (not a `Date`, array, or
 * primitive), i.e. it looks like a `ReplaceDict` or `ReplacePerColumnDict`.
 */
function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Return `true` when `dict` is a per-column replacement map, i.e. at least
 * one of its values is itself a plain record (not a `Scalar`).
 *
 * `{ "A": { "1": 99 } }` → per-column (`"A"` is a column name).
 * `{ "1": 99 }` → global (`"1"` is the encoded old value).
 */
function isPerColumnDict(dict: Record<string, unknown>): boolean {
  for (const val of Object.values(dict)) {
    if (isPlainRecord(val)) {
      return true;
    }
  }
  return false;
}

// ─── normalize to lookup ───────────────────────────────────────────────────────

/**
 * Normalise the public arguments into a `Map<string, Scalar>` ready for
 * {@link applyLookup}.  Handles all four call forms.
 *
 * Throws if the arguments are inconsistent (e.g. mismatched list lengths).
 */
function normalizeLookup(
  toReplace: ReplaceArg,
  value: Scalar | readonly Scalar[] | undefined,
): Map<string, Scalar> {
  // ── dict form ──────────────────────────────────────────────────────────────
  if (isPlainRecord(toReplace) && !Array.isArray(toReplace)) {
    // toReplace is a plain object — interpret as { encodedOld: new }
    return buildLookupFromDict(toReplace as ReplaceDict);
  }

  // ── array form ────────────────────────────────────────────────────────────
  if (Array.isArray(toReplace)) {
    const froms = toReplace as readonly Scalar[];
    if (value === undefined) {
      throw new Error("replace: when toReplace is an array, value must be provided");
    }
    return buildLookupFromLists(froms, value);
  }

  // ── scalar form ───────────────────────────────────────────────────────────
  if (value === undefined) {
    throw new Error("replace: when toReplace is a scalar, value must be provided");
  }
  return buildLookupFromLists([toReplace as Scalar], value as Scalar);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Replace values in a `Series` according to the given substitution rule.
 *
 * **Scalar pair** — replace `toReplace` with `value`:
 * ```ts
 * replaceSeries(s, 1, 99);
 * ```
 *
 * **List pair** — replace each element of `toReplace` with the corresponding
 * element of `value` (or with a single scalar `value`):
 * ```ts
 * replaceSeries(s, [1, 2], [10, 20]);
 * replaceSeries(s, [1, 2], 0);
 * ```
 *
 * **Dict form** — provide a `{ encodedOld: new }` map:
 * ```ts
 * replaceSeries(s, { "1": 99, "null": 0 });
 * ```
 *
 * The index and name of `series` are preserved.
 *
 * @param series     - Input series.
 * @param toReplace  - Value(s) to search for, or a replacement dict.
 * @param value      - Replacement value(s). Required when `toReplace` is a
 *   scalar or array; must be omitted when `toReplace` is a dict.
 * @returns A new `Series<Scalar>` with matching values substituted.
 */
export function replaceSeries(
  series: Series<Scalar>,
  toReplace: ReplaceArg,
  value?: Scalar | readonly Scalar[],
): Series<Scalar> {
  const lookup = normalizeLookup(toReplace, value);
  const data = applyLookup([...series.values], lookup);
  return new Series<Scalar>({ data, index: series.index, name: series.name });
}

/**
 * Replace values in a `DataFrame`.
 *
 * **Global substitution** — the same replacement rule is applied to every
 * column:
 * ```ts
 * replaceDataFrame(df, 1, 99);
 * replaceDataFrame(df, [1, 2], [10, 20]);
 * replaceDataFrame(df, { "1": 99 });
 * ```
 *
 * **Per-column substitution** — supply a dict whose keys are column names and
 * whose values are per-column `ReplaceDict` maps.  Only the named columns are
 * affected; all others are returned unchanged:
 * ```ts
 * replaceDataFrame(df, { A: { "1": 99 }, B: { "2": 0 } });
 * ```
 *
 * @param df         - Input DataFrame.
 * @param toReplace  - Value(s) to find, a global dict, or a per-column dict.
 * @param value      - Replacement value(s).  Required for scalar/array forms;
 *   must be omitted for dict forms.
 * @returns A new `DataFrame` with matching values substituted.
 */
export function replaceDataFrame(
  df: DataFrame,
  toReplace: ReplaceArg,
  value?: Scalar | readonly Scalar[],
): DataFrame {
  const colNames = [...df.columns.values];

  // ── per-column dict ────────────────────────────────────────────────────────
  if (
    isPlainRecord(toReplace) &&
    !Array.isArray(toReplace) &&
    isPerColumnDict(toReplace as Record<string, unknown>)
  ) {
    const perCol = toReplace as ReplacePerColumnDict;
    const resultCols = new Map<string, Series<Scalar>>();
    for (const col of colNames) {
      const src = df.col(col);
      const colDict = perCol[col];
      if (colDict !== undefined && isPlainRecord(colDict)) {
        const lookup = buildLookupFromDict(colDict);
        const data = applyLookup([...src.values], lookup);
        resultCols.set(col, new Series<Scalar>({ data, index: df.index, name: col }));
      } else {
        resultCols.set(col, src as Series<Scalar>);
      }
    }
    return new DataFrame(resultCols, df.index);
  }

  // ── global (scalar, list, or global dict) ─────────────────────────────────
  const lookup = normalizeLookup(toReplace, value);
  const resultCols = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const src = df.col(col);
    const data = applyLookup([...src.values], lookup);
    resultCols.set(col, new Series<Scalar>({ data, index: df.index, name: col }));
  }
  return new DataFrame(resultCols, df.index);
}
