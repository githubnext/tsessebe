/**
 * read_feather — Apache Arrow Feather / IPC file reader stub.
 *
 * Feather v2 is the Apache Arrow IPC file format. Full decoding requires
 * the Arrow C++ library or a WASM port (e.g. `arrow-js` / `apache-arrow`).
 * This stub delegates to an injectable decoder, mirroring the pattern used
 * by `readParquet`.
 *
 * When `globalThis.__arrowDecoder` is set to a compatible object
 * (`{ decode(buf: Uint8Array): unknown[] }`), reads are forwarded to it.
 * Otherwise a descriptive `TypeError` is thrown.
 *
 * @example
 * ```ts
 * import { readFeather } from "tsb";
 * const df = await readFeather(new Uint8Array(buffer));
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── decoder interface ────────────────────────────────────────────────────────

/** Minimal interface an Arrow/Feather decoder must expose. */
export interface ArrowDecoder {
  /**
   * Decode a raw Arrow IPC / Feather byte buffer into an array of records.
   * Each record maps column name → value (string, number, boolean, or null).
   */
  decode(buf: Uint8Array): unknown[];
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `readFeather`. */
export interface ReadFeatherOptions {
  /** Columns to include. If omitted, all columns are returned. */
  columns?: readonly string[];
  /** Maximum rows to return (from the start). */
  nrows?: number;
  /**
   * Explicit decoder to use instead of `globalThis.__arrowDecoder`.
   * Useful for testing without a real WASM decoder.
   */
  decoder?: ArrowDecoder;
}

// ─── implementation ───────────────────────────────────────────────────────────

type GlobalThisWithDecoders = typeof globalThis & {
  __arrowDecoder?: ArrowDecoder;
  __arrowEncoder?: ArrowEncoder;
};

/**
 * Read an Arrow Feather (IPC) file and return a DataFrame.
 *
 * **Status**: stub — full Arrow decoding requires a WASM or native decoder.
 *
 * Provide a decoder via `options.decoder` or by setting
 * `globalThis.__arrowDecoder` before calling this function.
 *
 * @param source  - `Uint8Array` of raw Arrow IPC bytes, or a URL string.
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded records.
 * @throws {TypeError} if no decoder is available.
 *
 * @example
 * ```ts
 * // Inject a real Apache Arrow decoder
 * import * as arrow from "apache-arrow";
 * globalThis.__arrowDecoder = {
 *   decode: (buf) => {
 *     const table = arrow.tableFromIPC(buf);
 *     return [...table].map(row => Object.fromEntries(
 *       table.schema.fields.map((f, i) => [f.name, row[i]])
 *     ));
 *   }
 * };
 * const df = await readFeather("data/table.feather");
 * ```
 */
export async function readFeather(
  source: Uint8Array | string,
  options: ReadFeatherOptions = {},
): Promise<DataFrame> {
  // Resolve bytes
  let bytes: Uint8Array;
  if (typeof source === "string") {
    const resp = await fetch(source);
    if (!resp.ok) {
      throw new TypeError(`readFeather: HTTP ${resp.status} fetching '${source}'`);
    }
    bytes = new Uint8Array(await resp.arrayBuffer());
  } else {
    bytes = source;
  }

  // Locate decoder
  const decoder: ArrowDecoder | undefined =
    options.decoder ?? (globalThis as GlobalThisWithDecoders).__arrowDecoder;

  if (decoder === undefined) {
    throw new TypeError(
      "readFeather: no Arrow decoder available.\n" +
        "Set globalThis.__arrowDecoder to an object with a decode(Uint8Array): unknown[] method,\n" +
        "or pass options.decoder directly.",
    );
  }

  // Decode
  let records = decoder.decode(bytes) as Record<string, unknown>[];

  // Apply nrows
  if (options.nrows !== undefined) {
    records = records.slice(0, options.nrows);
  }

  if (records.length === 0) {
    return DataFrame.fromColumns({});
  }

  const allCols = Object.keys(records[0] ?? {});
  const cols =
    options.columns !== undefined ? options.columns.filter((c) => allCols.includes(c)) : allCols;

  const colData: Record<string, Scalar[]> = {};
  for (const col of cols) {
    colData[col] = records.map((r) => (r[col] ?? null) as Scalar);
  }

  return DataFrame.fromColumns(colData);
}

// ─── toFeather ────────────────────────────────────────────────────────────────

/** Minimal interface an Arrow encoder must expose. */
export interface ArrowEncoder {
  /** Encode an array of records into a raw Arrow IPC byte buffer. */
  encode(records: Record<string, unknown>[]): Uint8Array;
}

/** Options for `toFeather`. */
export interface ToFeatherOptions {
  /**
   * Explicit encoder to use instead of `globalThis.__arrowEncoder`.
   */
  encoder?: ArrowEncoder;
}

/**
 * Write a DataFrame to Arrow Feather (IPC) format.
 *
 * **Status**: stub — requires a WASM or native Arrow encoder.
 *
 * @param df      - DataFrame to encode.
 * @param options - Optional settings including an explicit encoder.
 * @returns `Uint8Array` of Arrow IPC bytes.
 * @throws {TypeError} if no encoder is available.
 *
 * @example
 * ```ts
 * const bytes = toFeather(df, { encoder: myEncoder });
 * ```
 */
export function toFeather(df: DataFrame, options: ToFeatherOptions = {}): Uint8Array {
  const encoder: ArrowEncoder | undefined =
    options.encoder ?? (globalThis as GlobalThisWithDecoders).__arrowEncoder;

  if (encoder === undefined) {
    throw new TypeError(
      "toFeather: no Arrow encoder available.\n" +
        "Set globalThis.__arrowEncoder to an object with an encode(records): Uint8Array method,\n" +
        "or pass options.encoder directly.",
    );
  }

  const cols = df.columns.values;
  const nRows = df.index.size;
  const records: Record<string, unknown>[] = [];

  for (let i = 0; i < nRows; i++) {
    const row: Record<string, unknown> = {};
    for (const col of cols) {
      row[col] = df.col(col).values[i] ?? null;
    }
    records.push(row);
  }

  return encoder.encode(records);
}
