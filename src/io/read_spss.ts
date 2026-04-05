/**
 * read_spss — SPSS (SAV/ZSAV) file reader stub.
 *
 * IBM SPSS Statistics `.sav` and compressed `.zsav` files require a
 * proprietary or WASM decoder. This stub accepts an injectable decoder,
 * mirroring the pattern used by `readSas` and `readOrc`.
 *
 * Provide a decoder via `options.decoder` or by setting
 * `globalThis.__spssDecoder` before calling this function.
 *
 * @example
 * ```ts
 * import { readSpss } from "tsb";
 * globalThis.__spssDecoder = mySpssDecoder;
 * const df = await readSpss("data/study.sav");
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── value labels ─────────────────────────────────────────────────────────────

/**
 * Value labels for a single SPSS variable.
 *
 * Keys are the raw numeric codes; values are the human-readable labels.
 *
 * @example `{ "1": "Male", "2": "Female", "9": "Unknown" }`
 */
export type SpssValueLabels = Readonly<Record<string, string>>;

// ─── decoder interface ────────────────────────────────────────────────────────

/** Metadata for a single SPSS variable. */
export interface SpssVariable {
  /** Variable name (short identifier, up to 64 chars in modern SPSS). */
  name: string;
  /** Variable label (longer descriptive text). */
  label?: string;
  /** SPSS measurement level. */
  measureLevel?: "nominal" | "ordinal" | "scale";
  /** Value labels for coded/categorical variables. */
  valueLabels?: SpssValueLabels;
}

/** Result returned by an SPSS decoder. */
export interface SpssResult {
  /** Variable metadata (one entry per variable, in column order). */
  variables: readonly SpssVariable[];
  /** Row data — one array per row, values in variable order. */
  rows: readonly (readonly unknown[])[];
  /**
   * File-level metadata (e.g. creation date, software version, label).
   * Keys are lowercase field names.
   */
  meta?: Readonly<Record<string, string>>;
}

/** Minimal interface an SPSS decoder must expose. */
export interface SpssDecoder {
  /**
   * Decode a raw SAV/ZSAV byte buffer into a `SpssResult`.
   *
   * @param buf - Raw SPSS `.sav` or `.zsav` bytes.
   */
  decode(buf: Uint8Array): SpssResult;
}

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `readSpss`. */
export interface ReadSpssOptions {
  /** Variable names to include. If omitted, all variables are returned. */
  columns?: readonly string[];
  /** Maximum number of rows to return (from the start). Omit for all rows. */
  nrows?: number;
  /**
   * Whether to convert coded variables to their value labels.
   * When `true`, numeric codes are replaced with their label strings.
   * Default: `false`.
   */
  applyValueLabels?: boolean;
  /** Explicit decoder (overrides `globalThis.__spssDecoder`). */
  decoder?: SpssDecoder;
}

// ─── globalThis extension ─────────────────────────────────────────────────────

type GlobalThisWithSpssDecoder = typeof globalThis & {
  __spssDecoder?: SpssDecoder;
};

// ─── implementation ───────────────────────────────────────────────────────────

/**
 * Read an SPSS `.sav` or `.zsav` file and return a DataFrame.
 *
 * **Status**: stub — full SPSS decoding requires a WASM or native decoder.
 *
 * @param source  - `Uint8Array` of raw SPSS bytes, or a URL string.
 * @param options - Optional read options.
 * @returns A `DataFrame` built from the decoded SPSS dataset.
 * @throws {TypeError} if no decoder is available.
 *
 * @example
 * ```ts
 * globalThis.__spssDecoder = myDecoder;
 * const df = await readSpss("data/responses.sav", { applyValueLabels: true });
 * console.log(df.head());
 * ```
 */
export async function readSpss(
  source: Uint8Array | string,
  options: ReadSpssOptions = {},
): Promise<DataFrame> {
  const bytes = await resolveBytes(source);
  const decoder = options.decoder ?? (globalThis as GlobalThisWithSpssDecoder).__spssDecoder;

  if (decoder === undefined) {
    throw new TypeError(
      "readSpss: no SPSS decoder available.\n" +
        "Set globalThis.__spssDecoder to an object with a decode(Uint8Array): SpssResult method,\n" +
        "or pass options.decoder directly.",
    );
  }

  const result = decoder.decode(bytes);
  return buildDataFrame(result, options);
}

/** Fetch bytes from a URL or return the raw buffer. */
async function resolveBytes(source: Uint8Array | string): Promise<Uint8Array> {
  if (typeof source !== "string") {
    return source;
  }
  const resp = await fetch(source);
  if (!resp.ok) {
    throw new TypeError(`readSpss: HTTP ${resp.status} fetching '${source}'`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

/** Coerce a raw value to a Scalar. */
function toScalar(val: unknown): Scalar {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") {
    return val;
  }
  return String(val);
}

/** Resolve a value through value labels if applicable. */
function resolveValue(val: unknown, variable: SpssVariable, applyLabels: boolean): Scalar {
  if (applyLabels && variable.valueLabels !== undefined) {
    const key = String(val);
    const label = variable.valueLabels[key];
    if (label !== undefined) {
      return label;
    }
  }
  return toScalar(val);
}

/** Build a DataFrame from a decoded SpssResult. */
function buildDataFrame(result: SpssResult, options: ReadSpssOptions): DataFrame {
  const { variables, rows } = result;
  const applyLabels = options.applyValueLabels ?? false;

  const colFilter = options.columns;
  const selectedVars =
    colFilter !== undefined ? variables.filter((v) => colFilter.includes(v.name)) : variables;

  const rowLimit = options.nrows;
  const selectedRows = rowLimit !== undefined ? rows.slice(0, rowLimit) : rows;

  if (selectedRows.length === 0 || selectedVars.length === 0) {
    return DataFrame.fromColumns({});
  }

  const colData: Record<string, Scalar[]> = {};
  for (const variable of selectedVars) {
    const varIdx = variables.indexOf(variable);
    colData[variable.name] = selectedRows.map((row) => {
      return resolveValue(row[varIdx], variable, applyLabels);
    });
  }

  return DataFrame.fromColumns(colData);
}
