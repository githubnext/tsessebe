/**
 * to_json — Serialize a DataFrame or Series to a JSON string.
 *
 * Mirrors a subset of `pandas.DataFrame.to_json`.
 *
 * Supported orientations:
 * - `"records"` — `[{col: val, ...}, ...]`
 * - `"columns"` — `{col: {idx: val, ...}, ...}`
 * - `"values"`  — 2-D array `[[v, ...], ...]`
 * - `"index"`   — `{idx: {col: val, ...}, ...}`
 * - `"split"`   — `{index, columns, data}`
 * - `"table"`   — GeoJSON-style table with schema
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── options ─────────────────────────────────────────────────────────────────

/** Supported JSON orientations for DataFrame serialization. */
export type ToJsonOrient = "records" | "columns" | "values" | "index" | "split" | "table";

/** Options for {@link toJson} and {@link seriesToJson}. */
export interface ToJsonOptions {
  /**
   * Orientation of the output JSON (default: `"columns"`).
   */
  readonly orient?: ToJsonOrient;
  /**
   * Number of spaces to use for indentation.  `null` or `0` → compact (default).
   */
  readonly indent?: number | null;
  /**
   * Representation of `null` / `NaN` values.
   * - `"null"` (default) — emit JSON `null`
   * - `"nan"` — emit JSON string `"NaN"`
   */
  readonly naRep?: "null" | "nan";
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function serializeScalar(v: Scalar, naRep: "null" | "nan"): unknown {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return naRep === "nan" ? "NaN" : null;
  }
  return v;
}

function labelToKey(lbl: Label): string {
  return String(lbl);
}

// ─── DataFrame orientations ──────────────────────────────────────────────────

function dfToRecords(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < df.shape[0]; i++) {
    const row: Record<string, unknown> = {};
    for (const col of colNames) {
      const series = df.get(col);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      row[col] = serializeScalar(v, naRep);
    }
    rows.push(row);
  }
  return rows;
}

function dfToColumns(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const indexValues = df.index.values;
  const out: Record<string, Record<string, unknown>> = {};
  for (const col of colNames) {
    const series = df.get(col);
    const colObj: Record<string, unknown> = {};
    for (let i = 0; i < df.shape[0]; i++) {
      const key = labelToKey(indexValues[i] ?? null);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      colObj[key] = serializeScalar(v, naRep);
    }
    out[col] = colObj;
  }
  return out;
}

function dfToValues(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const rows: unknown[][] = [];
  for (let i = 0; i < df.shape[0]; i++) {
    const row: unknown[] = [];
    for (const col of colNames) {
      const series = df.get(col);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      row.push(serializeScalar(v, naRep));
    }
    rows.push(row);
  }
  return rows;
}

function dfToIndex(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const indexValues = df.index.values;
  const out: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < df.shape[0]; i++) {
    const key = labelToKey(indexValues[i] ?? null);
    const rowObj: Record<string, unknown> = {};
    for (const col of colNames) {
      const series = df.get(col);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      rowObj[col] = serializeScalar(v, naRep);
    }
    out[key] = rowObj;
  }
  return out;
}

function dfToSplit(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const indexValues = df.index.values;
  const index: (string | number | null)[] = indexValues.map((l) => l ?? null);
  const data: unknown[][] = [];
  for (let i = 0; i < df.shape[0]; i++) {
    const row: unknown[] = [];
    for (const col of colNames) {
      const series = df.get(col);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      row.push(serializeScalar(v, naRep));
    }
    data.push(row);
  }
  return { index, columns: colNames, data };
}

function inferJsonType(values: readonly Scalar[]): string {
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v === "number") {
      return Number.isInteger(v) ? "integer" : "number";
    }
    if (typeof v === "boolean") {
      return "boolean";
    }
    return "string";
  }
  return "string";
}

function dfToTable(df: DataFrame, naRep: "null" | "nan"): unknown {
  const colNames = [...df.columns.values];
  const fields: unknown[] = [{ name: "index", type: "integer" }];
  for (const col of colNames) {
    const series = df.get(col);
    const typ =
      series !== undefined ? inferJsonType(series.values) : "string";
    fields.push({ name: col, type: typ });
  }
  const schema = { fields, primaryKey: ["index"] };
  const data = dfToRecords(df, naRep);
  return { schema, data };
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Serialize a {@link DataFrame} to a JSON string.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * toJson(df, { orient: "records" });
 * // '[{"a":1,"b":3},{"a":2,"b":4}]'
 * ```
 */
export function toJson(df: DataFrame, options?: ToJsonOptions): string {
  const orient: ToJsonOrient = options?.orient ?? "columns";
  const naRep = options?.naRep ?? "null";
  const indent = options?.indent ?? null;

  let payload: unknown;
  switch (orient) {
    case "records":
      payload = dfToRecords(df, naRep);
      break;
    case "columns":
      payload = dfToColumns(df, naRep);
      break;
    case "values":
      payload = dfToValues(df, naRep);
      break;
    case "index":
      payload = dfToIndex(df, naRep);
      break;
    case "split":
      payload = dfToSplit(df, naRep);
      break;
    case "table":
      payload = dfToTable(df, naRep);
      break;
    default: {
      const _: never = orient;
      throw new TypeError(`to_json: unknown orient '${String(_)}'`);
    }
  }

  return indent !== null && indent > 0
    ? JSON.stringify(payload, null, indent)
    : JSON.stringify(payload);
}

/**
 * Serialize a {@link Series} to a JSON string.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
 * seriesToJson(s);
 * // '{"a":1,"b":2,"c":3}'
 * ```
 */
export function seriesToJson(
  series: Series<Scalar>,
  options?: Omit<ToJsonOptions, "orient"> & { orient?: "index" | "records" | "split" | "values" },
): string {
  const orient = options?.orient ?? "index";
  const naRep = options?.naRep ?? "null";
  const indent = options?.indent ?? null;
  const indexValues = series.index.values;

  let payload: unknown;
  switch (orient) {
    case "index": {
      const out: Record<string, unknown> = {};
      for (let i = 0; i < series.size; i++) {
        const key = labelToKey(indexValues[i] ?? null);
        const v = series.values[i] ?? null;
        out[key] = serializeScalar(v, naRep);
      }
      payload = out;
      break;
    }
    case "records": {
      payload = series.values.map((v) => serializeScalar(v ?? null, naRep));
      break;
    }
    case "values": {
      payload = series.values.map((v) => serializeScalar(v ?? null, naRep));
      break;
    }
    case "split": {
      const index: (string | number | null)[] = indexValues.map((l) => l ?? null);
      const name = series.name ?? 0;
      const data = series.values.map((v) => serializeScalar(v ?? null, naRep));
      payload = { name, index, data };
      break;
    }
    default: {
      const _: never = orient;
      throw new TypeError(`series_to_json: unknown orient '${String(_)}'`);
    }
  }

  return indent !== null && indent > 0
    ? JSON.stringify(payload, null, indent)
    : JSON.stringify(payload);
}
