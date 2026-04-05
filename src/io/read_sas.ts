/**
 * read_sas — SAS file reader stub.
 *
 * SAS7BDAT and XPORT (XPT) are proprietary SAS formats. Full decoding
 * requires a native or WASM library. This stub accepts an injectable
 * decoder, mirroring the pattern used by `readOrc` and `readFeather`.
 *
 * Provide a decoder via `options.decoder` or by setting
 * `globalThis.__sasDecoder` before calling this function.
 *
 * @example
 * ```ts
 * import { readSas } from "tsb";
 * globalThis.__sasDecoder = mySasDecoder;
 * const df = await readSas("data/survey.sas7bdat");
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── decoder interface ────────────────────────────────────────────────────────

/** A decoded column in a SAS dataset. */
export interface SasColumn {
  /** Column name. */
  name: string;
  /** Column type: "numeric" (double) or "character" (string). */
  type: "numeric" | "character";
  /** Column label (from SAS metadata). */
  label?: string;
  /** Format string (e.g. "DATE9.", "DOLLAR10.2"). */
  format?: string;
}

/** Result returned by a SAS decoder. */
export interface SasResult {
  /** Column metadata. */
  columns: readonly SasColumn[];
  /** Row data — one array per row, matching column order. */
  rows: readonly (readonly unknown[])[];
  /**
   * Dataset-level metadata (e.g. creation date, host OS, SAS version).
   * Keys are lowercase metadata field names.
   */
  meta?: Readonly<Record<string, string>>;
}

/** Minimal interface a SAS decoder must expose. */
export interface SasDecoder {
  /**
   * Decode a raw SAS byte buffer into a `SasResult`.
   *
   * @param buf     - Raw SAS7BDAT or XPORT bytes.
   * @param format  - File format hint: `"sas7bdat"` (default) or `"xport"`.
   */
  decode(buf: Uint8Array, format?: "sas7bdat" | "xport"): SasResult;
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `readSas`. */
export interface ReadSasOptions {
  /** SAS file format hint. Defaults to `"sas7bdat"`. */
  format?: "sas7bdat" | "xport";
  /** Column names to include. If omitted, all columns are returned. */
  columns?: readonly string[];
  /** Maximum number of rows to return (from the start). Omit for all rows. */
  nrows?: number;
  /** Explicit decoder (overrides `globalThis.__sasDecoder`). */
  decoder?: SasDecoder;
}

// ─── globalThis extension ─────────────────────────────────────────────────────

type GlobalThisWithSasDecoder = typeof globalThis & {
  __sasDecoder?: SasDecoder;
};

// ─── implementation ───────────────────────────────────────────────────────────

/**
 * Read a SAS file and return a DataFrame.
 *
 * **Status**: stub — full SAS decoding requires a WASM or native decoder.
 *
 * @param source  - `Uint8Array` of raw SAS bytes, or a URL string.
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded SAS dataset.
 * @throws {TypeError} if no decoder is available.
 *
 * @example
 * ```ts
 * globalThis.__sasDecoder = mySasDecoder;
 * const df = await readSas("data/study.sas7bdat");
 * console.log(df.shape);
 * ```
 */
export async function readSas(
  source: Uint8Array | string,
  options: ReadSasOptions = {},
): Promise<DataFrame> {
  const bytes = await resolveBytes(source);
  const decoder = options.decoder ?? (globalThis as GlobalThisWithSasDecoder).__sasDecoder;

  if (decoder === undefined) {
    throw new TypeError(
      "readSas: no SAS decoder available.\n" +
        "Set globalThis.__sasDecoder to an object with a decode(Uint8Array): SasResult method,\n" +
        "or pass options.decoder directly.",
    );
  }

  const result = decoder.decode(bytes, options.format ?? "sas7bdat");
  return buildDataFrame(result, options);
}

/** Fetch bytes from a URL or return the raw buffer. */
async function resolveBytes(source: Uint8Array | string): Promise<Uint8Array> {
  if (typeof source !== "string") {
    return source;
  }
  const resp = await fetch(source);
  if (!resp.ok) {
    throw new TypeError(`readSas: HTTP ${resp.status} fetching '${source}'`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

/** Build a DataFrame from a decoded SasResult. */
function buildDataFrame(result: SasResult, options: ReadSasOptions): DataFrame {
  const { columns, rows } = result;

  const colFilter = options.columns;
  const selectedCols =
    colFilter !== undefined ? columns.filter((c) => colFilter.includes(c.name)) : columns;

  const rowLimit = options.nrows;
  const selectedRows = rowLimit !== undefined ? rows.slice(0, rowLimit) : rows;

  if (selectedRows.length === 0 || selectedCols.length === 0) {
    return DataFrame.fromColumns({});
  }

  const colData: Record<string, Scalar[]> = {};
  for (const col of selectedCols) {
    const colIdx = columns.indexOf(col);
    colData[col.name] = selectedRows.map((row) => {
      const val = row[colIdx];
      if (val === null || val === undefined) {
        return null;
      }
      if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") {
        return val;
      }
      return String(val);
    });
  }

  return DataFrame.fromColumns(colData);
}
