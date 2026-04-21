/**
 * toJsonDenormalize — convert a flat DataFrame back to nested JSON records.
 *
 * This is the inverse operation of `jsonNormalize`: given a flat DataFrame
 * whose column names use a separator (e.g. `"."`) to encode nesting depth,
 * reconstruct an array of nested JSON objects.
 *
 * For example, a DataFrame with columns `["name", "address.city", "address.zip"]`
 * produces records like `{ name: "Alice", address: { city: "NY", zip: "10001" } }`.
 *
 * Additional utilities:
 *
 * - `toJsonDenormalize` — main function; mirrors inverting `pandas.json_normalize`
 * - `toJsonRecords`     — simple orient="records" serialisation (no nesting)
 * - `toJsonSplit`       — orient="split" (columns + data + index)
 * - `toJsonIndex`       — orient="index" (keyed by index label)
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── JSON value types (no `any`) ──────────────────────────────────────────────

/** A JSON primitive (leaf value). */
type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value. */
type JsonValue = JsonPrimitive | JsonValue[] | JsonRecord;

/** A JSON object (dict). */
interface JsonRecord {
  [key: string]: JsonValue;
}

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link toJsonDenormalize}. */
export interface JsonDenormalizeOptions {
  /**
   * Separator used in column names to encode nesting depth.
   * Must match the separator used when `jsonNormalize` was called.
   * @default "."
   */
  readonly sep?: string;

  /**
   * When `true`, omit keys whose value is `null`.
   * @default false
   */
  readonly dropNull?: boolean;
}

/** Options for {@link toJsonSplit}. */
export interface JsonSplitOptions {
  /**
   * When `true`, include the DataFrame index in the output.
   * @default true
   */
  readonly includeIndex?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a Scalar to a JSON-compatible value. */
function scalarToJson(v: Scalar): JsonPrimitive {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    if (Number.isNaN(v) || !Number.isFinite(v)) return null;
    return v;
  }
  if (typeof v === "boolean") return v;
  return String(v);
}

/**
 * Set a value in a nested object using a dot-separated path.
 * Intermediate objects are created as needed.
 */
function setNested(obj: JsonRecord, keys: readonly string[], value: JsonPrimitive): void {
  let current: JsonRecord = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i] as string;
    if (!(k in current) || typeof current[k] !== "object" || current[k] === null || Array.isArray(current[k])) {
      current[k] = {};
    }
    current = current[k] as JsonRecord;
  }
  const lastKey = keys[keys.length - 1] as string;
  current[lastKey] = value;
}

// ─── toJsonDenormalize ────────────────────────────────────────────────────────

/**
 * Convert a flat DataFrame to an array of nested JSON objects.
 *
 * Reverses the flattening performed by `jsonNormalize`: column names
 * containing the separator (default `"."`) are split into nested keys.
 *
 * @param df      - Input DataFrame.
 * @param options - Configuration options.
 * @returns An array of nested `JsonRecord` objects, one per row.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   name:           ["Alice", "Bob"],
 *   "address.city": ["NY",    "LA"],
 *   "address.zip":  ["10001", "90001"],
 * });
 * toJsonDenormalize(df);
 * // [
 * //   { name: "Alice", address: { city: "NY",    zip: "10001" } },
 * //   { name: "Bob",   address: { city: "LA",    zip: "90001" } },
 * // ]
 * ```
 */
export function toJsonDenormalize(
  df: DataFrame,
  options: JsonDenormalizeOptions = {},
): JsonRecord[] {
  const sep = options.sep ?? ".";
  const dropNull = options.dropNull ?? false;

  const columns = df.columns.values;
  // Pre-split all column names into key paths.
  const paths: string[][] = columns.map((col) => col.split(sep));

  const nRows = df.index.size;
  const result: JsonRecord[] = [];

  for (let r = 0; r < nRows; r++) {
    const record: JsonRecord = {};

    for (let c = 0; c < columns.length; c++) {
      const colName = columns[c] as string;
      const col = df.col(colName);
      const raw = col.values[r] as Scalar;
      const value = scalarToJson(raw);

      if (dropNull && value === null) continue;

      const keys = paths[c] as string[];
      setNested(record, keys, value);
    }

    result.push(record);
  }

  return result;
}

// ─── toJsonRecords ────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame as an array of flat record objects.
 *
 * This is equivalent to `df.to_json(orient="records")` in pandas.
 * Column names are NOT split on any separator — the output is always flat.
 *
 * @param df - Input DataFrame.
 * @returns An array of `JsonRecord` objects, one per row.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 * toJsonRecords(df);
 * // [{ a: 1, b: "x" }, { a: 2, b: "y" }]
 * ```
 */
export function toJsonRecords(df: DataFrame): JsonRecord[] {
  const columns = df.columns.values;
  const nRows = df.index.size;
  const result: JsonRecord[] = [];

  for (let r = 0; r < nRows; r++) {
    const record: JsonRecord = {};
    for (const col of columns) {
      const series = df.col(col);
      record[col] = scalarToJson(series.values[r] as Scalar);
    }
    result.push(record);
  }

  return result;
}

// ─── toJsonSplit ──────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame in "split" orientation.
 *
 * Mirrors `df.to_json(orient="split")` in pandas.
 *
 * @param df      - Input DataFrame.
 * @param options - Configuration options.
 * @returns An object with `{ columns, index?, data }` keys.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 * toJsonSplit(df);
 * // {
 * //   columns: ["a", "b"],
 * //   index:   [0, 1],
 * //   data:    [[1, "x"], [2, "y"]],
 * // }
 * ```
 */
export interface JsonSplitResult {
  columns: string[];
  index?: JsonPrimitive[];
  data: JsonPrimitive[][];
}

export function toJsonSplit(df: DataFrame, options: JsonSplitOptions = {}): JsonSplitResult {
  const includeIndex = options.includeIndex ?? true;
  const columns = df.columns.values;
  const nRows = df.index.size;

  const data: JsonPrimitive[][] = [];
  for (let r = 0; r < nRows; r++) {
    const row: JsonPrimitive[] = [];
    for (const col of columns) {
      const series = df.col(col);
      row.push(scalarToJson(series.values[r] as Scalar));
    }
    data.push(row);
  }

  const result: JsonSplitResult = { columns: [...columns], data };
  if (includeIndex) {
    result.index = df.index.toArray().map(scalarToJson);
  }
  return result;
}

// ─── toJsonIndex ──────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame in "index" orientation.
 *
 * Mirrors `df.to_json(orient="index")` in pandas.
 * Rows are keyed by their index label (converted to string).
 *
 * @param df - Input DataFrame.
 * @returns An object mapping index label → flat record.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 * toJsonIndex(df);
 * // { "0": { a: 1, b: "x" }, "1": { a: 2, b: "y" } }
 * ```
 */
export function toJsonIndex(df: DataFrame): JsonRecord {
  const columns = df.columns.values;
  const indexLabels = df.index.toArray();
  const nRows = indexLabels.length;
  const result: JsonRecord = {};

  for (let r = 0; r < nRows; r++) {
    const label = String(indexLabels[r]);
    const record: JsonRecord = {};
    for (const col of columns) {
      const series = df.col(col);
      record[col] = scalarToJson(series.values[r] as Scalar);
    }
    result[label] = record;
  }

  return result;
}
