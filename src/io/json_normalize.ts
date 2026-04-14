/**
 * jsonNormalize — flatten nested JSON to a flat DataFrame.
 *
 * Mirrors `pandas.json_normalize()`:
 * - `jsonNormalize(data, options?)` — normalize semi-structured JSON data into
 *   a flat table.
 *
 * Key capabilities:
 * - Flattens nested dicts using a configurable separator (default `"."`).
 * - `recordPath` — path (or array of paths) to nested arrays of records.
 * - `meta` — top-level (or path) fields to pull into every output row.
 * - `metaPrefix` — prefix for meta columns (default: none).
 * - `recordPrefix` — prefix for record-level columns (default: none).
 * - `errors` — `"raise"` (default) or `"ignore"` for missing meta keys.
 * - `maxLevel` — maximum depth to flatten nested dicts (undefined = unlimited).
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── JSON value types (no `any`) ──────────────────────────────────────────────

/** A JSON primitive (leaf value). */
type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value. */
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/** A JSON object (dict). */
interface JsonObject {
  [key: string]: JsonValue;
}

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * A single path segment or a multi-step path for `recordPath` / `meta` fields.
 *
 * - `string` — a single key name
 * - `string[]` — a sequence of keys to traverse (e.g. `["a", "b"]` → `data.a.b`)
 */
export type JsonPath = string | readonly string[];

/** Options for {@link jsonNormalize}. */
export interface JsonNormalizeOptions {
  /**
   * Path in each record to the list of child records to normalize.
   * May be a string key, an array of keys (nested path), or an array of
   * such paths to normalize multiple levels.
   * Default: undefined (normalize each top-level record as-is).
   */
  readonly recordPath?: JsonPath | readonly JsonPath[];
  /**
   * Fields from the outer record to include as columns in every output row.
   * Each entry may be a string key or an array of keys for a nested path.
   * Default: undefined.
   */
  readonly meta?: readonly JsonPath[];
  /**
   * Prefix to prepend to meta columns.  Default: `""`.
   */
  readonly metaPrefix?: string;
  /**
   * Prefix to prepend to record columns.  Default: `""`.
   */
  readonly recordPrefix?: string;
  /**
   * Separator used to join nested key names into a flat column name.
   * Default: `"."`.
   */
  readonly sep?: string;
  /**
   * `"raise"` — throw an error when a `meta` key is missing.
   * `"ignore"` — use `null` for missing meta keys.
   * Default: `"raise"`.
   */
  readonly errors?: "raise" | "ignore";
  /**
   * Maximum nesting depth to flatten.  Dicts deeper than this become
   * sub-objects (JSON strings) rather than being expanded.
   * Default: unlimited (`undefined`).
   */
  readonly maxLevel?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a {@link JsonPath} to a string key or array of string keys. */
function toPathArray(p: JsonPath): readonly string[] {
  return typeof p === "string" ? [p] : p;
}

/** Traverse a nested object along `path`, returning the value or `undefined`. */
function getPath(obj: JsonObject, path: readonly string[]): JsonValue | undefined {
  let cur: JsonValue = obj;
  for (const key of path) {
    if (typeof cur !== "object" || cur === null || Array.isArray(cur)) {
      return undefined;
    }
    cur = (cur as JsonObject)[key] as JsonValue;
    if (cur === undefined) {
      return undefined;
    }
  }
  return cur;
}

/**
 * Flatten a single JSON object to a `Record<string, Scalar>`, joining nested
 * key paths with `sep` up to `maxLevel` depth.
 */
function flattenObject(
  obj: JsonObject,
  sep: string,
  maxLevel: number | undefined,
  prefix: string,
  depth: number,
): Record<string, Scalar> {
  const result: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix === "" ? k : `${prefix}${depth === 0 ? "" : sep}${k}`;
    const atMax = maxLevel !== undefined && depth >= maxLevel;
    if (!atMax && typeof v === "object" && v !== null && !Array.isArray(v)) {
      const nested = flattenObject(v as JsonObject, sep, maxLevel, fullKey, depth + 1);
      for (const [nk, nv] of Object.entries(nested)) {
        result[nk] = nv;
      }
    } else if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      // Arrays at this level become JSON strings
      result[fullKey] = JSON.stringify(v);
    } else {
      result[fullKey] = v as Scalar;
    }
  }
  return result;
}

/**
 * Normalize data along a single `recordPath`, extracting meta fields from
 * the outer record.
 */
function normalizeWithPath(
  records: readonly JsonObject[],
  recordPath: readonly string[],
  meta: readonly (readonly string[])[],
  metaPrefix: string,
  recordPrefix: string,
  sep: string,
  errors: "raise" | "ignore",
  maxLevel: number | undefined,
): Record<string, Scalar>[] {
  const rows: Record<string, Scalar>[] = [];
  for (const record of records) {
    // Extract nested records
    const nested = getPath(record, recordPath);
    if (nested === undefined || nested === null) {
      continue;
    }
    if (!Array.isArray(nested)) {
      throw new TypeError(
        `jsonNormalize: recordPath "${recordPath.join(sep)}" did not point to an array`,
      );
    }
    const childRecords = nested as JsonValue[];

    // Extract meta values from this parent record
    const metaValues: Record<string, Scalar> = {};
    for (const metaPath of meta) {
      const colName = metaPrefix + (metaPath.length === 1 ? metaPath[0] : metaPath.join(sep));
      const val = getPath(record, metaPath);
      if (val === undefined) {
        if (errors === "raise") {
          throw new Error(`jsonNormalize: meta key "${metaPath.join(".")}" not found in record`);
        }
        metaValues[colName] = null;
      } else if (typeof val === "object") {
        // Nested object / array → stringify
        metaValues[colName] = JSON.stringify(val);
      } else {
        metaValues[colName] = val as Scalar;
      }
    }

    // Flatten each child record and merge meta
    for (const child of childRecords) {
      let childFlat: Record<string, Scalar>;
      if (typeof child === "object" && child !== null && !Array.isArray(child)) {
        childFlat = flattenObject(child as JsonObject, sep, maxLevel, recordPrefix, 0);
      } else {
        childFlat = { [recordPrefix === "" ? "value" : recordPrefix]: child as Scalar };
      }
      rows.push({ ...childFlat, ...metaValues });
    }
  }
  return rows;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalize semi-structured JSON data into a flat DataFrame.
 *
 * @param data - A JSON object, an array of JSON objects, or a JSON string.
 * @param options - Normalization options.
 * @returns A flat {@link DataFrame}.
 *
 * @example
 * ```ts
 * import { jsonNormalize } from "tsb";
 *
 * const data = [
 *   { id: 1, info: { name: "Alice", age: 30 } },
 *   { id: 2, info: { name: "Bob",   age: 25 } },
 * ];
 * const df = jsonNormalize(data);
 * // columns: ["id", "info.name", "info.age"]
 * ```
 */
export function jsonNormalize(
  data: JsonObject | readonly JsonObject[] | string,
  options: JsonNormalizeOptions = {},
): DataFrame {
  const {
    recordPath,
    meta = [],
    metaPrefix = "",
    recordPrefix = "",
    sep = ".",
    errors = "raise",
    maxLevel,
  } = options;

  // ── Parse input ────────────────────────────────────────────────────────────
  let records: readonly JsonObject[];
  if (typeof data === "string") {
    const parsed: unknown = JSON.parse(data);
    if (Array.isArray(parsed)) {
      records = parsed as JsonObject[];
    } else if (typeof parsed === "object" && parsed !== null) {
      records = [parsed as JsonObject];
    } else {
      throw new TypeError("jsonNormalize: JSON string must be an object or array");
    }
  } else if (Array.isArray(data)) {
    records = data as readonly JsonObject[];
  } else {
    records = [data as JsonObject];
  }

  // ── Normalise meta paths ───────────────────────────────────────────────────
  const metaPaths: readonly (readonly string[])[] = meta.map(toPathArray);

  // ── Normalise recordPath ───────────────────────────────────────────────────
  let rows: Record<string, Scalar>[];

  if (recordPath === undefined) {
    // No recordPath — flatten each top-level record
    rows = [];
    for (const record of records) {
      const flat = flattenObject(record, sep, maxLevel, recordPrefix, 0);
      // Remap keys with recordPrefix already applied in flattenObject
      const row: Record<string, Scalar> = {};
      for (const [k, v] of Object.entries(flat)) {
        row[k] = v;
      }
      // Attach meta (from same record)
      for (const metaPath of metaPaths) {
        const colName = metaPrefix + (metaPath.length === 1 ? metaPath[0] : metaPath.join(sep));
        const val = getPath(record, metaPath);
        if (val === undefined) {
          if (errors === "raise") {
            throw new Error(`jsonNormalize: meta key "${metaPath.join(".")}" not found in record`);
          }
          row[colName] = null;
        } else if (typeof val === "object") {
          row[colName] = JSON.stringify(val);
        } else {
          row[colName] = val as Scalar;
        }
      }
      rows.push(row);
    }
  } else {
    // recordPath provided
    // Normalise to array of (single) paths
    const pathList: readonly (readonly string[])[] = (() => {
      if (Array.isArray(recordPath) && recordPath.length > 0 && Array.isArray(recordPath[0])) {
        // Array of paths
        return (recordPath as readonly JsonPath[]).map(toPathArray);
      }
      return [toPathArray(recordPath as JsonPath)];
    })();

    // Chain paths: for multiple recordPaths, each subsequent path is applied
    // to the records produced by the previous one.  This matches pandas
    // behaviour where you can supply a list of levels to drill into.
    let currentRecords: readonly JsonObject[] = records;
    for (let i = 0; i < pathList.length; i++) {
      const path = pathList[i];
      if (path === undefined) {
        continue;
      }
      const isFinal = i === pathList.length - 1;
      if (isFinal) {
        rows = normalizeWithPath(
          currentRecords,
          path,
          metaPaths,
          metaPrefix,
          recordPrefix,
          sep,
          errors,
          maxLevel,
        );
      } else {
        // Drill into intermediate path to get next level records
        const nextRecords: JsonObject[] = [];
        for (const rec of currentRecords) {
          const nested = getPath(rec, path);
          if (Array.isArray(nested)) {
            for (const child of nested) {
              if (typeof child === "object" && child !== null && !Array.isArray(child)) {
                nextRecords.push(child as JsonObject);
              }
            }
          }
        }
        currentRecords = nextRecords;
      }
    }
    rows ??= [];
  }

  // ── Build column sets and DataFrame ───────────────────────────────────────
  if (rows.length === 0) {
    return DataFrame.fromColumns({});
  }

  // Union of all column names (preserve first-seen insertion order)
  const colOrder: string[] = [];
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!colSet.has(k)) {
        colSet.add(k);
        colOrder.push(k);
      }
    }
  }

  const colData: Record<string, Scalar[]> = {};
  for (const col of colOrder) {
    colData[col] = rows.map((r) => (col in r ? r[col] : null) as Scalar);
  }

  // Build Series columns and infer dtypes
  const seriesMap = new Map<string, Series<Scalar>>();
  for (const [col, vals] of Object.entries(colData)) {
    let dtype: Dtype;
    if (vals.every((v) => v === null || typeof v === "number")) {
      dtype = vals.some((v) => v !== null && !Number.isInteger(v)) ? Dtype.float64 : Dtype.int64;
    } else if (vals.every((v) => v === null || typeof v === "boolean")) {
      dtype = Dtype.bool;
    } else {
      dtype = Dtype.object;
    }
    seriesMap.set(col, new Series({ data: vals, name: col, dtype }));
  }

  return new DataFrame(seriesMap, new RangeIndex(rows.length));
}
