/**
 * read_orc — ORC file reader stub.
 *
 * ORC (Optimized Row Columnar) is a column-oriented format widely used in
 * Hadoop/Hive ecosystems. Full decoding requires a native or WASM decoder.
 * This stub accepts an injectable decoder, making it easy to swap in a
 * real implementation when one is available.
 *
 * When `globalThis.__orcDecoder` is set to a compatible object
 * (`{ decode(buf: Uint8Array): unknown[] }`), reads are forwarded to it.
 * Otherwise the function throws a descriptive `TypeError`.
 *
 * @example
 * ```ts
 * import { readOrc } from "tsb";
 * const df = await readOrc(new Uint8Array(buffer));
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";

// ─── decoder interface ────────────────────────────────────────────────────────

/** Minimal interface an ORC decoder must expose. */
export interface OrcDecoder {
  /**
   * Decode a raw ORC byte buffer into an array of plain-object records.
   * Each record maps column name → value (string, number, boolean, or null).
   */
  decode(buf: Uint8Array): unknown[];
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `readOrc`. */
export interface ReadOrcOptions {
  /** Columns to include. If omitted, all columns are read. */
  columns?: readonly string[];
  /** Maximum number of rows to return (from the start). Omit for all rows. */
  nrows?: number;
  /**
   * Stripe indices to include. ORC files are split into stripes (row groups).
   * If omitted, all stripes are read. Only meaningful with a full decoder.
   */
  stripes?: readonly number[];
  /**
   * Explicit decoder to use instead of `globalThis.__orcDecoder`.
   * Useful for testing and environments that can inject a decoder directly.
   */
  decoder?: OrcDecoder;
}

// ─── implementation ───────────────────────────────────────────────────────────

type GlobalThisWithDecoder = typeof globalThis & {
  __orcDecoder?: OrcDecoder;
};

/**
 * Read an ORC file and return a DataFrame.
 *
 * **Status**: stub — full ORC decoding requires a WASM or native decoder.
 *
 * Provide a decoder via `options.decoder` or by setting
 * `globalThis.__orcDecoder` before calling this function.
 *
 * @param source  - `Uint8Array` of raw ORC bytes, or a URL string
 *                  (requires a `fetch`-compatible runtime).
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded records.
 * @throws {TypeError} if no decoder is available.
 *
 * @example
 * ```ts
 * // With an injected decoder
 * globalThis.__orcDecoder = myDecoder;
 * const df = await readOrc("data/table.orc");
 * ```
 */
export async function readOrc(
  source: Uint8Array | string,
  options: ReadOrcOptions = {},
): Promise<DataFrame> {
  // Resolve bytes
  let bytes: Uint8Array;
  if (typeof source === "string") {
    const resp = await fetch(source);
    if (!resp.ok) {
      throw new TypeError(`readOrc: HTTP ${resp.status} fetching '${source}'`);
    }
    bytes = new Uint8Array(await resp.arrayBuffer());
  } else {
    bytes = source;
  }

  // Locate decoder
  const decoder: OrcDecoder | undefined =
    options.decoder ?? (globalThis as GlobalThisWithDecoder).__orcDecoder;

  if (decoder === undefined) {
    throw new TypeError(
      "readOrc: no ORC decoder available.\n" +
        "Set globalThis.__orcDecoder to an object with a decode(Uint8Array): unknown[] method,\n" +
        "or pass options.decoder directly.",
    );
  }

  // Decode
  let records = decoder.decode(bytes) as Record<string, unknown>[];

  // Apply nrows limit
  if (options.nrows !== undefined) {
    records = records.slice(0, options.nrows);
  }

  if (records.length === 0) {
    return DataFrame.fromColumns({});
  }

  // Collect columns
  const allCols = Object.keys(records[0] ?? {});
  const cols =
    options.columns !== undefined ? options.columns.filter((c) => allCols.includes(c)) : allCols;

  const colData: Record<string, unknown[]> = {};
  for (const col of cols) {
    colData[col] = records.map((r) => r[col] ?? null);
  }

  return DataFrame.fromColumns(colData as Record<string, import("../types.ts").Scalar[]>);
}
