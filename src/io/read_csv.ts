/**
 * read_csv — Parse CSV text (or a file path in Bun) into a DataFrame.
 *
 * Mirrors a subset of `pandas.read_csv`.
 */

import { DataFrame } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── options ─────────────────────────────────────────────────────────────────

/** Options for {@link readCsv}. */
export interface ReadCsvOptions {
  /**
   * Row to use as column names (0-based; default 0).
   * Set to `null` to generate integer column names.
   */
  readonly header?: number | null;
  /**
   * Index column — name or 0-based integer position to use as the row index.
   * If `null` (default) a RangeIndex is used.
   */
  readonly indexCol?: string | number | null;
  /**
   * Column separator (default `","`).
   */
  readonly sep?: string;
  /**
   * Values to treat as NaN / missing (default: `["", "NA", "NaN", "null", "NULL", "N/A"]`).
   */
  readonly naValues?: readonly string[];
  /**
   * Skip this many rows from the top before reading header + data (default 0).
   */
  readonly skipRows?: number;
  /**
   * Only read this many data rows (not counting the header).
   */
  readonly nrows?: number;
  /**
   * Column names to use.  When provided, `header` is treated as a data row
   * unless set to `null`.
   */
  readonly names?: readonly string[];
}

// ─── defaults ────────────────────────────────────────────────────────────────

const DEFAULT_NA: ReadonlySet<string> = new Set([
  "",
  "NA",
  "NaN",
  "NAN",
  "nan",
  "null",
  "NULL",
  "N/A",
  "n/a",
  "#N/A",
  "#NA",
]);

// ─── helpers ─────────────────────────────────────────────────────────────────

const INTEGER_RE = /^-?\d+$/;
const FLOAT_RE = /^-?\d*\.?\d+([eE][+-]?\d+)?$/;

/** Split a single CSV line into fields, respecting double-quoted fields. */
function splitCsvLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  const sepLen = sep.length;

  for (let i = 0; i < line.length; ) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (!inQuotes && line.startsWith(sep, i)) {
      fields.push(current);
      current = "";
      i += sepLen;
      continue;
    }
    current += ch;
    i++;
  }
  fields.push(current);
  return fields;
}

/** Coerce a raw string cell to a Scalar. */
function coerceValue(raw: string, naSet: ReadonlySet<string>): Scalar {
  if (naSet.has(raw)) {
    return null;
  }
  // integer
  if (INTEGER_RE.test(raw)) {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  // float
  if (FLOAT_RE.test(raw)) {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  // boolean
  if (raw === "true" || raw === "True" || raw === "TRUE") {
    return true;
  }
  if (raw === "false" || raw === "False" || raw === "FALSE") {
    return false;
  }
  return raw;
}

/** Split text into non-empty lines, removing `\r`. */
function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l, i, arr) => i < arr.length - 1 || l !== "");
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into a {@link DataFrame}.
 *
 * @example
 * ```ts
 * const df = readCsv("a,b,c\n1,2,3\n4,5,6");
 * df.shape; // [2, 3]
 * ```
 */
export function readCsv(text: string, options?: ReadCsvOptions): DataFrame {
  const sep = options?.sep ?? ",";
  const naSet: ReadonlySet<string> =
    options?.naValues !== undefined ? new Set(options.naValues) : DEFAULT_NA;
  const skipRows = options?.skipRows ?? 0;
  const headerRow = options?.header !== undefined ? options.header : 0;

  let lines = splitLines(text);

  // Skip leading rows
  if (skipRows > 0) {
    lines = lines.slice(skipRows);
  }

  if (lines.length === 0) {
    return DataFrame.fromRecords([]);
  }

  // Resolve column names
  let colNames: string[];
  let dataStartLine: number;

  if (options?.names !== undefined && options.names.length > 0) {
    colNames = [...options.names];
    // If header is explicitly null, treat row 0 as data; otherwise skip header row
    dataStartLine = headerRow === null ? 0 : (headerRow ?? 0) + 1;
  } else if (headerRow === null) {
    // No header — generate 0,1,2,…
    const firstLine = lines[0];
    const nCols = firstLine !== undefined ? splitCsvLine(firstLine, sep).length : 0;
    colNames = Array.from({ length: nCols }, (_, i) => String(i));
    dataStartLine = 0;
  } else {
    const hIdx = headerRow ?? 0;
    const headerLine = lines[hIdx];
    colNames =
      headerLine !== undefined ? splitCsvLine(headerLine, sep).map((s) => s.trim()) : [];
    dataStartLine = hIdx + 1;
  }

  let dataLines = lines.slice(dataStartLine);
  if (options?.nrows !== undefined) {
    dataLines = dataLines.slice(0, options.nrows);
  }

  // Build column arrays
  const colData: Map<string, Scalar[]> = new Map(colNames.map((n) => [n, []]));

  for (const line of dataLines) {
    const cells = splitCsvLine(line, sep);
    for (let ci = 0; ci < colNames.length; ci++) {
      const colName = colNames[ci];
      if (colName === undefined) {
        continue;
      }
      const col = colData.get(colName);
      if (col !== undefined) {
        const raw = cells[ci] ?? "";
        col.push(coerceValue(raw, naSet));
      }
    }
  }

  // Resolve indexCol
  const indexColOpt = options?.indexCol ?? null;
  let rowIndex: readonly Label[] | undefined;
  const finalColNames: string[] = [];

  if (indexColOpt !== null) {
    const idxName =
      typeof indexColOpt === "number" ? (colNames[indexColOpt] ?? "") : indexColOpt;
    const idxData = colData.get(idxName);
    if (idxData !== undefined) {
      rowIndex = idxData.map((v) =>
        v === null || typeof v === "string" || typeof v === "number" ? v : null,
      );
      colData.delete(idxName);
    }
    for (const n of colNames) {
      if (n !== idxName) {
        finalColNames.push(n);
      }
    }
  } else {
    finalColNames.push(...colNames);
  }

  const colRecord: Record<string, readonly Scalar[]> = {};
  for (const n of finalColNames) {
    const arr = colData.get(n);
    if (arr !== undefined) {
      colRecord[n] = arr;
    }
  }

  return DataFrame.fromColumns(colRecord, rowIndex !== undefined ? { index: rowIndex } : undefined);
}
