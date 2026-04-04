/**
 * read_json — Parse JSON text into a DataFrame.
 *
 * Mirrors a subset of `pandas.read_json`.
 *
 * Supported orientations:
 * - `"records"` — array of row objects `[{col: val, ...}, ...]`
 * - `"columns"` — `{col: {idx: val, ...}, ...}`
 * - `"values"`  — 2-D array of values (row-major); requires `columns` option
 * - `"index"`   — `{idx: {col: val, ...}, ...}`
 * - `"split"`   — `{index: [...], columns: [...], data: [[...], ...]}`
 */

import { DataFrame } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── options ─────────────────────────────────────────────────────────────────

/** Supported JSON orientations. */
export type JsonOrient = "records" | "columns" | "values" | "index" | "split";

/** Options for {@link readJson}. */
export interface ReadJsonOptions {
  /**
   * Orientation of the JSON data (default: `"records"`).
   * - `"records"` — `[{col: val}, ...]`
   * - `"columns"` — `{col: {idx: val, ...}, ...}`
   * - `"values"`  — `[[v, v, ...], ...]` (row-major 2-D array)
   * - `"index"`   — `{idx: {col: val, ...}, ...}`
   * - `"split"`   — `{index, columns, data}`
   */
  readonly orient?: JsonOrient;
  /**
   * Column names when `orient="values"`.
   */
  readonly columns?: readonly string[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toScalar(v: unknown): Scalar {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
    return v;
  }
  return String(v);
}

// ─── orientations ────────────────────────────────────────────────────────────

function fromRecordsOriented(parsed: unknown): DataFrame {
  if (!Array.isArray(parsed)) {
    throw new TypeError("read_json orient='records': expected a JSON array");
  }
  const records = parsed.map((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError("read_json orient='records': each element must be a JSON object");
    }
    const out: Record<string, Scalar> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = toScalar(v);
    }
    return out;
  });
  return DataFrame.fromRecords(records);
}

function fromColumnsOriented(parsed: unknown): DataFrame {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("read_json orient='columns': expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  const colNames = Object.keys(obj);
  if (colNames.length === 0) {
    return DataFrame.fromRecords([]);
  }

  // Collect all unique row labels in insertion order
  const allIdxLabels: Label[] = [];
  const seenLabels = new Set<string>();
  for (const colName of colNames) {
    const colObj = obj[colName];
    if (colObj !== null && typeof colObj === "object" && !Array.isArray(colObj)) {
      for (const idxKey of Object.keys(colObj as Record<string, unknown>)) {
        if (!seenLabels.has(idxKey)) {
          seenLabels.add(idxKey);
          // try to coerce numeric keys
          const n = Number(idxKey);
          allIdxLabels.push(Number.isNaN(n) ? idxKey : n);
        }
      }
    }
  }

  const colData: Record<string, readonly Scalar[]> = {};
  for (const colName of colNames) {
    const colObj = obj[colName];
    const arr: Scalar[] = allIdxLabels.map((lbl) => {
      if (colObj === null || typeof colObj !== "object" || Array.isArray(colObj)) {
        return null;
      }
      const key = String(lbl);
      const val = (colObj as Record<string, unknown>)[key];
      return val !== undefined ? toScalar(val) : null;
    });
    colData[colName] = arr;
  }

  return DataFrame.fromColumns(colData, { index: allIdxLabels });
}

function fromValuesOriented(parsed: unknown, columns?: readonly string[]): DataFrame {
  if (!Array.isArray(parsed)) {
    throw new TypeError("read_json orient='values': expected a JSON array of arrays");
  }
  const nRows = parsed.length;
  if (nRows === 0) {
    return DataFrame.fromRecords([]);
  }
  const firstRow = parsed[0];
  const nCols = Array.isArray(firstRow) ? (firstRow as unknown[]).length : 0;
  const colNames =
    columns !== undefined && columns.length > 0
      ? [...columns]
      : Array.from({ length: nCols }, (_, i) => String(i));

  const colArrays: Scalar[][] = Array.from({ length: colNames.length }, () => []);
  for (const row of parsed) {
    if (!Array.isArray(row)) {
      throw new TypeError("read_json orient='values': each element must be an array");
    }
    for (let ci = 0; ci < colNames.length; ci++) {
      const arr = colArrays[ci];
      if (arr !== undefined) {
        arr.push(toScalar((row as unknown[])[ci]));
      }
    }
  }

  const colData: Record<string, readonly Scalar[]> = {};
  for (let ci = 0; ci < colNames.length; ci++) {
    const name = colNames[ci];
    const arr = colArrays[ci];
    if (name !== undefined && arr !== undefined) {
      colData[name] = arr;
    }
  }
  return DataFrame.fromColumns(colData);
}

function fromIndexOriented(parsed: unknown): DataFrame {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("read_json orient='index': expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  const idxKeys = Object.keys(obj);
  if (idxKeys.length === 0) {
    return DataFrame.fromRecords([]);
  }

  // Discover columns from first entry
  const firstKey = idxKeys[0];
  const firstEntry = firstKey !== undefined ? obj[firstKey] : undefined;
  const colNames: string[] =
    firstEntry !== null && typeof firstEntry === "object" && !Array.isArray(firstEntry)
      ? Object.keys(firstEntry as Record<string, unknown>)
      : [];

  const colData: Record<string, Scalar[]> = {};
  for (const c of colNames) {
    colData[c] = [];
  }
  const rowLabels: Label[] = [];
  for (const idxKey of idxKeys) {
    const n = Number(idxKey);
    rowLabels.push(Number.isNaN(n) ? idxKey : n);
    const rowObj = obj[idxKey];
    for (const c of colNames) {
      const arr = colData[c];
      if (arr !== undefined) {
        const val =
          rowObj !== null && typeof rowObj === "object" && !Array.isArray(rowObj)
            ? (rowObj as Record<string, unknown>)[c]
            : undefined;
        arr.push(val !== undefined ? toScalar(val) : null);
      }
    }
  }

  const colRecord: Record<string, readonly Scalar[]> = {};
  for (const c of colNames) {
    const arr = colData[c];
    if (arr !== undefined) {
      colRecord[c] = arr;
    }
  }
  return DataFrame.fromColumns(colRecord, { index: rowLabels });
}

interface SplitFormat {
  index: unknown[];
  columns: string[];
  data: unknown[][];
}

function fromSplitOriented(parsed: unknown): DataFrame {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("read_json orient='split': expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  const columns = obj["columns"];
  const data = obj["data"];
  const index = obj["index"];

  if (!Array.isArray(columns) || !Array.isArray(data)) {
    throw new TypeError(
      "read_json orient='split': expected { index, columns: string[], data: [][] }",
    );
  }

  const split: SplitFormat = {
    index: Array.isArray(index) ? (index as unknown[]) : [],
    columns: (columns as unknown[]).map(String),
    data: data as unknown[][],
  };

  const rowLabels: Label[] =
    split.index.length > 0
      ? split.index.map((v) => {
          const n = Number(v);
          return Number.isNaN(n) ? String(v) : n;
        })
      : [];

  const colArrays: Scalar[][] = split.columns.map(() => []);
  for (const row of split.data) {
    for (let ci = 0; ci < split.columns.length; ci++) {
      const arr = colArrays[ci];
      if (arr !== undefined) {
        arr.push(toScalar((row as unknown[])[ci]));
      }
    }
  }

  const colRecord: Record<string, readonly Scalar[]> = {};
  for (let ci = 0; ci < split.columns.length; ci++) {
    const name = split.columns[ci];
    const arr = colArrays[ci];
    if (name !== undefined && arr !== undefined) {
      colRecord[name] = arr;
    }
  }

  const indexOption = rowLabels.length > 0 ? rowLabels : undefined;
  return DataFrame.fromColumns(colRecord, indexOption !== undefined ? { index: indexOption } : undefined);
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Parse a JSON string into a {@link DataFrame}.
 *
 * @example
 * ```ts
 * const df = readJson('[{"a":1,"b":2},{"a":3,"b":4}]');
 * df.shape; // [2, 2]
 * ```
 */
export function readJson(text: string, options?: ReadJsonOptions): DataFrame {
  const orient: JsonOrient = options?.orient ?? "records";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new SyntaxError(`read_json: invalid JSON — ${String(err)}`);
  }

  switch (orient) {
    case "records":
      return fromRecordsOriented(parsed);
    case "columns":
      return fromColumnsOriented(parsed);
    case "values":
      return fromValuesOriented(parsed, options?.columns);
    case "index":
      return fromIndexOriented(parsed);
    case "split":
      return fromSplitOriented(parsed);
    default: {
      const _: never = orient;
      throw new TypeError(`read_json: unknown orient '${String(_)}'`);
    }
  }
}
