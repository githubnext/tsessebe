/**
 * arrow — Apache Arrow IPC interchange.
 *
 * Apache Arrow defines a language-independent columnar memory format and
 * an IPC (inter-process communication) file/stream format. This module
 * provides `fromArrow` and `toArrow` using injectable encoders/decoders,
 * so that a WASM Arrow library (e.g. `apache-arrow`) can be swapped in
 * without coupling the core library to external dependencies.
 *
 * Provide adapters via:
 * - `options.decoder` / `globalThis.__arrowTableDecoder` for reading
 * - `options.encoder` / `globalThis.__arrowTableEncoder` for writing
 *
 * @example
 * ```ts
 * import { fromArrow, toArrow } from "tsb";
 * // inject adapters
 * globalThis.__arrowTableDecoder = { decode: (buf) => myArrow.tableFromIPC(buf).toArray() };
 * const df = await fromArrow(buffer);
 * const out = toArrow(df);
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import { DataFrame } from "./frame.ts";

// ─── decoder interface ────────────────────────────────────────────────────────

/**
 * Minimal interface an Arrow IPC decoder must expose.
 * Accepts a raw IPC stream/file buffer and returns an array of records.
 */
export interface ArrowTableDecoder {
  /**
   * Decode an Arrow IPC buffer into an array of plain-object records.
   * Each record maps column name → value.
   */
  decode(buf: Uint8Array): unknown[];
}

// ─── encoder interface ────────────────────────────────────────────────────────

/**
 * Minimal interface an Arrow IPC encoder must expose.
 * Accepts an array of records and returns a raw IPC file buffer.
 */
export interface ArrowTableEncoder {
  /**
   * Encode an array of plain-object records into an Arrow IPC file buffer.
   */
  encode(records: readonly Readonly<Record<string, unknown>>[]): Uint8Array;
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `fromArrow`. */
export interface FromArrowOptions {
  /** Columns to include. If omitted, all columns are returned. */
  columns?: readonly string[];
  /** Maximum number of rows to return (from the start). Omit for all rows. */
  nrows?: number;
  /** Explicit decoder (overrides `globalThis.__arrowTableDecoder`). */
  decoder?: ArrowTableDecoder;
}

/** Options for `toArrow`. */
export interface ToArrowOptions {
  /** Columns to include. If omitted, all columns are serialised. */
  columns?: readonly string[];
  /** Explicit encoder (overrides `globalThis.__arrowTableEncoder`). */
  encoder?: ArrowTableEncoder;
}

// ─── globalThis extensions ───────────────────────────────────────────────────

type GTWithDecoder = typeof globalThis & {
  __arrowTableDecoder?: ArrowTableDecoder;
};

type GTWithEncoder = typeof globalThis & {
  __arrowTableEncoder?: ArrowTableEncoder;
};

// ─── from Arrow ───────────────────────────────────────────────────────────────

/**
 * Read an Apache Arrow IPC file/stream buffer and return a DataFrame.
 *
 * **Status**: stub — requires an injectable `ArrowTableDecoder`.
 *
 * @param source  - `Uint8Array` of raw Arrow IPC bytes, or a URL string.
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded Arrow table.
 * @throws {TypeError} if no decoder is available.
 *
 * @example
 * ```ts
 * globalThis.__arrowTableDecoder = myDecoder;
 * const df = await fromArrow(ipcBytes);
 * ```
 */
export async function fromArrow(
  source: Uint8Array | string,
  options: FromArrowOptions = {},
): Promise<DataFrame> {
  const bytes = await resolveBytes(source, "fromArrow");
  const decoder = options.decoder ?? (globalThis as GTWithDecoder).__arrowTableDecoder;

  if (decoder === undefined) {
    throw new TypeError(
      "fromArrow: no Arrow decoder available.\n" +
        "Set globalThis.__arrowTableDecoder or pass options.decoder.",
    );
  }

  let records = decoder.decode(bytes) as Record<string, unknown>[];

  const rowLimit = options.nrows;
  if (rowLimit !== undefined) {
    records = records.slice(0, rowLimit);
  }

  if (records.length === 0) {
    return DataFrame.fromColumns({});
  }

  const allCols = Object.keys(records[0] ?? {});
  const cols =
    options.columns !== undefined ? options.columns.filter((c) => allCols.includes(c)) : allCols;

  return buildFromRecords(records, cols);
}

// ─── to Arrow ─────────────────────────────────────────────────────────────────

/**
 * Serialise a DataFrame to an Apache Arrow IPC file buffer.
 *
 * **Status**: stub — requires an injectable `ArrowTableEncoder`.
 *
 * @param df      - Source DataFrame.
 * @param options - Optional serialisation options.
 * @returns A `Uint8Array` containing the Arrow IPC file bytes.
 * @throws {TypeError} if no encoder is available.
 *
 * @example
 * ```ts
 * globalThis.__arrowTableEncoder = myEncoder;
 * const buf = toArrow(df);
 * ```
 */
export function toArrow(df: DataFrame, options: ToArrowOptions = {}): Uint8Array {
  const encoder = options.encoder ?? (globalThis as GTWithEncoder).__arrowTableEncoder;

  if (encoder === undefined) {
    throw new TypeError(
      "toArrow: no Arrow encoder available.\n" +
        "Set globalThis.__arrowTableEncoder or pass options.encoder.",
    );
  }

  const colFilter = options.columns;
  const cols =
    colFilter !== undefined
      ? df.columns.values.map(String).filter((c) => colFilter.includes(c))
      : df.columns.values.map(String);

  const records = buildRecords(df, cols);
  return encoder.encode(records);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Fetch bytes from a URL or return the raw buffer. */
async function resolveBytes(source: Uint8Array | string, caller: string): Promise<Uint8Array> {
  if (typeof source !== "string") {
    return source;
  }
  const resp = await fetch(source);
  if (!resp.ok) {
    throw new TypeError(`${caller}: HTTP ${resp.status} fetching '${source}'`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

/** Build a DataFrame from decoded records and a column list. */
function buildFromRecords(records: Record<string, unknown>[], cols: readonly string[]): DataFrame {
  const colData: Record<string, Scalar[]> = {};
  for (const col of cols) {
    colData[col] = records.map((r) => {
      const v = r[col];
      if (v === null || v === undefined) {
        return null;
      }
      if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
        return v;
      }
      return String(v);
    });
  }
  return DataFrame.fromColumns(colData);
}

/** Build a records array from a DataFrame for encoding. */
function buildRecords(
  df: DataFrame,
  cols: readonly string[],
): readonly Readonly<Record<string, unknown>>[] {
  const n = df.shape[0];
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const row: Record<string, unknown> = {};
    for (const col of cols) {
      row[col] = df.col(col)?.values[i] ?? null;
    }
    out.push(row);
  }
  return out;
}
