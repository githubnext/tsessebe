/**
 * readJson / toJson — JSON I/O for DataFrame.
 *
 * Mirrors `pandas.read_json()` and `pandas.DataFrame.to_json()`:
 * - `readJson(text, options?)` — parse a JSON string into a DataFrame
 * - `toJson(df, options?)` — serialize a DataFrame to a JSON string
 *
 * Supported orient values:
 * - `"records"` — array of row objects: `[{col: val, ...}, ...]`
 * - `"split"` — `{"columns": [...], "index": [...], "data": [[...], ...]}`
 * - `"index"` — object keyed by index label: `{"idx": {col: val, ...}, ...}`
 * - `"columns"` — object keyed by column: `{"col": {idx: val, ...}, ...}`
 * - `"values"` — 2-D array (no index/column labels): `[[val, ...], ...]`
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { DtypeName, Label, Scalar } from "../types.ts";

// ─── JSON value types (no `any`) ─────────────────────────────────────────────

/** A JSON primitive (leaf value). */
type JsonPrimitive = string | number | boolean | null;

/** Any valid JSON value. */
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/** A JSON object. */
interface JsonObject {
  [key: string]: JsonValue;
}

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Orientation of the JSON representation.
 *
 * Mirrors pandas' `orient` parameter for `read_json` / `to_json`.
 */
export type JsonOrient = "records" | "split" | "index" | "columns" | "values";

/** Options for {@link readJson}. */
export interface ReadJsonOptions {
  /**
   * Format of the JSON string.  When omitted the function auto-detects from
   * the root structure:
   * - Array → `"records"` or `"values"`
   * - Object with `"columns"` + `"data"` → `"split"`
   * - Other object → `"index"` or `"columns"` heuristic
   */
  readonly orient?: JsonOrient;
  /**
   * Override dtype for specific columns (column name → dtype name).
   * Applied after parsing; the column values are re-cast.
   */
  readonly dtype?: Readonly<Record<string, DtypeName>>;
}

/** Options for {@link toJson}. */
export interface ToJsonOptions {
  /**
   * Format of the output JSON.  Default: `"records"`.
   */
  readonly orient?: JsonOrient;
  /**
   * JSON indentation (spaces).  `0` → compact.  Default: `0`.
   */
  readonly indent?: number;
}

// ─── helpers — JSON type guards ───────────────────────────────────────────────

function isJsonObject(v: JsonValue): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isJsonArray(v: JsonValue): v is JsonValue[] {
  return Array.isArray(v);
}

/** Safe property access on a JsonObject (resolves noPropertyAccessFromIndexSignature). */
function getProp(obj: JsonObject, key: string): JsonValue {
  return obj[key] ?? null;
}

// ─── helpers — scalar conversion ──────────────────────────────────────────────

/** Convert a parsed JSON value to a {@link Scalar} suitable for Series data. */
function toScalar(v: JsonValue): Scalar {
  if (v === null) {
    return null;
  }
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  // Nested objects/arrays → stringify (matches pandas object dtype behaviour)
  return JSON.stringify(v);
}

/** Convert a parsed JSON value to a {@link Label} for use as an index entry. */
function toLabel(v: JsonValue): Label {
  if (v === null) {
    return null;
  }
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return v;
  }
  return String(v);
}

// ─── helpers — Series building ────────────────────────────────────────────────

/** Build a Series from an array of JSON values, applying an optional dtype override. */
function buildSeries(
  name: string,
  data: readonly JsonValue[],
  index: Index<Label>,
  dtypeOverride: DtypeName | undefined,
): Series<Scalar> {
  const scalars: Scalar[] = data.map(toScalar);
  if (dtypeOverride !== undefined) {
    return new Series({ data: scalars, name, index, dtype: Dtype.from(dtypeOverride) });
  }
  return new Series({ data: scalars, name, index });
}

// ─── helpers — orient detection ───────────────────────────────────────────────

/** Auto-detect the orient of a parsed JSON value. */
function detectOrient(root: JsonValue): JsonOrient {
  if (isJsonArray(root)) {
    const first = root[0];
    if (first === undefined || isJsonObject(first)) {
      return "records";
    }
    return "values";
  }
  if (isJsonObject(root)) {
    if ("columns" in root && "data" in root) {
      return "split";
    }
    // Check if first value is an object → "index" orient, else "columns"
    const firstVal = Object.values(root)[0];
    if (firstVal !== undefined && isJsonObject(firstVal)) {
      return "index";
    }
    return "columns";
  }
  return "records";
}

// ─── orient parsers ───────────────────────────────────────────────────────────

/** Parse `"records"` orient: `[{col: val, ...}, ...]`. */
function parseRecords(root: JsonValue, dtypes: Readonly<Record<string, DtypeName>>): DataFrame {
  if (!isJsonArray(root)) {
    throw new TypeError(`readJson("records"): expected array, got ${typeof root}`);
  }
  if (root.length === 0) {
    return new DataFrame(new Map(), new RangeIndex(0) as unknown as Index<Label>);
  }
  // Collect all column names in insertion order from all rows
  const colSet = new Set<string>();
  for (const row of root) {
    if (isJsonObject(row)) {
      for (const k of Object.keys(row)) {
        colSet.add(k);
      }
    }
  }
  const colNames = [...colSet];
  const rowIndex: Index<Label> = new RangeIndex(root.length) as unknown as Index<Label>;
  const colMap = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const colData: JsonValue[] = root.map((row) => {
      if (isJsonObject(row)) {
        return (row[col] as JsonValue | undefined) ?? null;
      }
      return null;
    });
    colMap.set(col, buildSeries(col, colData, rowIndex, dtypes[col]));
  }
  return new DataFrame(colMap, rowIndex);
}

/** Parse `"split"` orient: `{"columns": [...], "index": [...], "data": [[...],...]}`. */
function parseSplit(root: JsonValue, dtypes: Readonly<Record<string, DtypeName>>): DataFrame {
  if (!isJsonObject(root)) {
    throw new TypeError(`readJson("split"): expected object, got ${typeof root}`);
  }
  const rawCols = getProp(root, "columns");
  const rawIdx = getProp(root, "index");
  const rawData = getProp(root, "data");
  if (!(isJsonArray(rawCols) && isJsonArray(rawData))) {
    throw new TypeError('readJson("split"): missing "columns" or "data"');
  }
  const colNames = rawCols.map((v) => String(toLabel(v)));
  const nRows = rawData.length;
  const rowIndex: Index<Label> =
    rawIdx !== null && isJsonArray(rawIdx)
      ? new Index<Label>(rawIdx.map(toLabel))
      : (new RangeIndex(nRows) as unknown as Index<Label>);
  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < colNames.length; c++) {
    const colName = colNames[c] as string;
    const colData: JsonValue[] = rawData.map((row): JsonValue => {
      if (isJsonArray(row)) {
        return (row[c] as JsonValue | undefined) ?? null;
      }
      return null;
    });
    colMap.set(colName, buildSeries(colName, colData, rowIndex, dtypes[colName]));
  }
  return new DataFrame(colMap, rowIndex);
}

/** Parse `"index"` orient: `{"idx": {col: val, ...}, ...}`. */
function parseIndex(root: JsonValue, dtypes: Readonly<Record<string, DtypeName>>): DataFrame {
  if (!isJsonObject(root)) {
    throw new TypeError(`readJson("index"): expected object, got ${typeof root}`);
  }
  const indexLabels: Label[] = Object.keys(root).map((k) => {
    const n = Number(k);
    return Number.isNaN(n) ? k : n;
  });
  const nRows = indexLabels.length;
  if (nRows === 0) {
    return new DataFrame(new Map(), new RangeIndex(0) as unknown as Index<Label>);
  }
  // Collect columns from first row
  const firstRow: JsonValue = Object.values(root)[0] ?? null;
  const colNames: string[] = isJsonObject(firstRow) ? Object.keys(firstRow) : [];
  const rowIndex = new Index<Label>(indexLabels);
  const colMap = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const colData: JsonValue[] = Object.values(root).map((row): JsonValue => {
      const r: JsonValue = row ?? null;
      if (isJsonObject(r)) {
        return (r[col] as JsonValue | undefined) ?? null;
      }
      return null;
    });
    colMap.set(col, buildSeries(col, colData, rowIndex, dtypes[col]));
  }
  return new DataFrame(colMap, rowIndex);
}

/** Parse `"columns"` orient: `{"col": {"idx": val, ...}, ...}`. */
function parseColumns(root: JsonValue, dtypes: Readonly<Record<string, DtypeName>>): DataFrame {
  if (!isJsonObject(root)) {
    throw new TypeError(`readJson("columns"): expected object, got ${typeof root}`);
  }
  const colNames = Object.keys(root);
  if (colNames.length === 0) {
    return new DataFrame(new Map(), new RangeIndex(0) as unknown as Index<Label>);
  }
  // Collect all index labels from all columns
  const idxSet = new Set<string>();
  for (const col of colNames) {
    const colObj: JsonValue = (root[col] as JsonValue | undefined) ?? null;
    if (isJsonObject(colObj)) {
      for (const k of Object.keys(colObj)) {
        idxSet.add(k);
      }
    }
  }
  const rawKeys = [...idxSet];
  const indexLabels: Label[] = rawKeys.map((k) => {
    const n = Number(k);
    return Number.isNaN(n) ? k : n;
  });
  const rowIndex = new Index<Label>(indexLabels);
  const colMap = new Map<string, Series<Scalar>>();
  for (const col of colNames) {
    const colObj: JsonValue = (root[col] as JsonValue | undefined) ?? null;
    const colData: JsonValue[] = rawKeys.map((k): JsonValue => {
      if (isJsonObject(colObj)) {
        return (colObj[k] as JsonValue | undefined) ?? null;
      }
      return null;
    });
    colMap.set(col, buildSeries(col, colData, rowIndex, dtypes[col]));
  }
  return new DataFrame(colMap, rowIndex);
}

/** Parse `"values"` orient: `[[val, ...], ...]`. */
function parseValues(root: JsonValue): DataFrame {
  if (!isJsonArray(root)) {
    throw new TypeError(`readJson("values"): expected array, got ${typeof root}`);
  }
  if (root.length === 0) {
    return new DataFrame(new Map(), new RangeIndex(0) as unknown as Index<Label>);
  }
  const firstRow: JsonValue = (root[0] as JsonValue | undefined) ?? null;
  const nCols = isJsonArray(firstRow) ? firstRow.length : 0;
  const rowIndex: Index<Label> = new RangeIndex(root.length) as unknown as Index<Label>;
  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < nCols; c++) {
    const colName = String(c);
    const colData: JsonValue[] = root.map((row): JsonValue => {
      if (isJsonArray(row)) {
        return (row[c] as JsonValue | undefined) ?? null;
      }
      return null;
    });
    colMap.set(colName, buildSeries(colName, colData, rowIndex, undefined));
  }
  return new DataFrame(colMap, rowIndex);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse a JSON string into a {@link DataFrame}.
 *
 * Mirrors `pandas.read_json()`.
 *
 * @param text    - JSON string to parse.
 * @param options - Parsing options.
 *
 * @example
 * ```ts
 * const df = readJson('[{"a":1,"b":true},{"a":2,"b":false}]');
 * ```
 */
export function readJson(text: string, options: ReadJsonOptions = {}): DataFrame {
  const root = JSON.parse(text) as JsonValue;
  const dtypes = options.dtype ?? {};
  const orient = options.orient ?? detectOrient(root);
  switch (orient) {
    case "records":
      return parseRecords(root, dtypes);
    case "split":
      return parseSplit(root, dtypes);
    case "index":
      return parseIndex(root, dtypes);
    case "columns":
      return parseColumns(root, dtypes);
    case "values":
      return parseValues(root);
    default:
      return parseRecords(root, dtypes);
  }
}

// ─── serializers ──────────────────────────────────────────────────────────────

/** Serialize a {@link Scalar} to a JSON-safe value. */
function scalarToJson(v: Scalar): JsonPrimitive {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return null;
  }
  return v as JsonPrimitive;
}

/** Emit `"records"` orient. */
function emitRecords(df: DataFrame): JsonValue[] {
  const records = df.toRecords();
  return records.map((rec): JsonObject => {
    const obj: JsonObject = {};
    for (const [k, v] of Object.entries(rec)) {
      obj[k] = scalarToJson(v);
    }
    return obj;
  });
}

/** Emit `"split"` orient. */
function emitSplit(df: DataFrame): JsonObject {
  const columns: JsonValue[] = [...df.columns.values].map((c) => c as JsonPrimitive);
  const index: JsonValue[] = [...df.index.values].map((v) => v as JsonPrimitive);
  const data: JsonValue[] = df.toArray().map((row): JsonValue[] => row.map(scalarToJson));
  return { columns, index, data };
}

/** Emit `"index"` orient. */
function emitIndex(df: DataFrame): JsonObject {
  const result: JsonObject = {};
  const colNames = [...df.columns.values];
  let i = 0;
  for (const [idxLabel] of df.iterrows()) {
    const key = String(idxLabel);
    const row = df.toArray()[i];
    if (row !== undefined) {
      const rowObj: JsonObject = {};
      for (let c = 0; c < colNames.length; c++) {
        const col = colNames[c];
        if (col !== undefined) {
          rowObj[col] = scalarToJson((row[c] as Scalar | undefined) ?? null);
        }
      }
      result[key] = rowObj;
    }
    i++;
  }
  return result;
}

/** Emit `"columns"` orient. */
function emitColumnsOrient(df: DataFrame): JsonObject {
  const result: JsonObject = {};
  const indexVals = [...df.index.values];
  for (const col of df.columns.values) {
    const series = df.col(col);
    const colObj: JsonObject = {};
    for (let r = 0; r < indexVals.length; r++) {
      const key = String(indexVals[r]);
      colObj[key] = scalarToJson((series.values[r] as Scalar | undefined) ?? null);
    }
    result[col] = colObj;
  }
  return result;
}

/** Emit `"values"` orient. */
function emitValues(df: DataFrame): JsonValue[] {
  return df.toArray().map((row): JsonValue[] => row.map(scalarToJson));
}

/**
 * Serialize a {@link DataFrame} to a JSON string.
 *
 * Mirrors `pandas.DataFrame.to_json()`.
 *
 * @param df      - DataFrame to serialize.
 * @param options - Serialization options.
 *
 * @example
 * ```ts
 * const json = toJson(df, { orient: "records", indent: 2 });
 * ```
 */
export function toJson(df: DataFrame, options: ToJsonOptions = {}): string {
  const orient = options.orient ?? "records";
  const indent = options.indent ?? 0;
  let root: JsonValue;
  switch (orient) {
    case "records":
      root = emitRecords(df);
      break;
    case "split":
      root = emitSplit(df);
      break;
    case "index":
      root = emitIndex(df);
      break;
    case "columns":
      root = emitColumnsOrient(df);
      break;
    case "values":
      root = emitValues(df);
      break;
    default:
      root = emitRecords(df);
      break;
  }
  return indent > 0 ? JSON.stringify(root, null, indent) : JSON.stringify(root);
}
