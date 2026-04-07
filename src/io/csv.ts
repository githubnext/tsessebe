/**
 * readCsv / toCsv — CSV I/O for DataFrame.
 *
 * Mirrors `pandas.read_csv()` and `pandas.DataFrame.to_csv()`:
 * - `readCsv(text, options?)` — parse a CSV string into a DataFrame
 * - `toCsv(df, options?)` — serialize a DataFrame to a CSV string
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { DtypeName, Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link readCsv}. */
export interface ReadCsvOptions {
  /** Column separator. Default: `","`. */
  readonly sep?: string;
  /**
   * Row index of the header row, or `null` for no header.
   * Default: `0` (first row is the header).
   */
  readonly header?: number | null;
  /**
   * Column name or index of the column to use as the row index.
   * Default: `null` (use a default `RangeIndex`).
   */
  readonly indexCol?: string | number | null;
  /**
   * Map of column name → dtype name to force a specific type for that column.
   */
  readonly dtype?: Readonly<Record<string, DtypeName>>;
  /**
   * Additional strings to treat as missing/NA (in addition to built-in defaults).
   */
  readonly naValues?: readonly string[];
  /**
   * Number of data rows to skip at the beginning (after the header).
   * Default: `0`.
   */
  readonly skipRows?: number;
  /**
   * Maximum number of data rows to read.
   * Default: unlimited.
   */
  readonly nRows?: number;
}

/** Options for {@link toCsv}. */
export interface ToCsvOptions {
  /** Column separator. Default: `","`. */
  readonly sep?: string;
  /** Whether to include the header row. Default: `true`. */
  readonly header?: boolean;
  /** Whether to include the index column. Default: `true`. */
  readonly index?: boolean;
  /** Line terminator. Default: `"\n"`. */
  readonly lineterminator?: string;
  /** String representation for missing/NaN values. Default: `""`. */
  readonly naRep?: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_NA_STRINGS: ReadonlySet<string> = new Set([
  "",
  "null",
  "NULL",
  "NaN",
  "NA",
  "N/A",
  "n/a",
  "#N/A",
  "none",
  "None",
  "#NA",
]);

// Top-level regex literals (Biome `useTopLevelRegex` rule).
const RE_LINE_SPLIT = /\r\n|\n|\r/;
const RE_INT = /^-?\d+$/;
const RE_FLOAT = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const RE_BOOL_TRUE = /^(true|True|TRUE)$/;
const RE_BOOL_FALSE = /^(false|False|FALSE)$/;
const RE_DOUBLE_QUOTE = /"/g;

// ─── CSV line parser ──────────────────────────────────────────────────────────

/** Split text into non-empty lines. */
function splitLines(text: string): string[] {
  return text.split(RE_LINE_SPLIT).filter((l) => l.length > 0);
}

/**
 * Parse one CSV line into raw string fields.
 * Handles double-quoted fields — `""` inside quotes represents a literal `"`.
 */
function parseLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  let i = 0;
  while (i < line.length) {
    const ch = line.charAt(i);
    if (inQuote) {
      if (ch === '"' && line.charAt(i + 1) === '"') {
        current += '"';
        i += 2;
      } else if (ch === '"') {
        inQuote = false;
        i += 1;
      } else {
        current += ch;
        i += 1;
      }
    } else if (ch === '"') {
      inQuote = true;
      i += 1;
    } else if (line.startsWith(sep, i)) {
      fields.push(current);
      current = "";
      i += sep.length;
    } else {
      current += ch;
      i += 1;
    }
  }
  fields.push(current);
  return fields;
}

// ─── dtype inference ──────────────────────────────────────────────────────────

/** True when a raw string should be treated as missing. */
function isNaRaw(raw: string, naSet: ReadonlySet<string>): boolean {
  return naSet.has(raw);
}

/** Infer the most specific dtype for a column from its raw string values. */
function inferColumnDtype(raws: readonly string[], naSet: ReadonlySet<string>): DtypeName {
  const nonNa = raws.filter((r) => !isNaRaw(r, naSet));
  if (nonNa.length === 0) {
    return "object";
  }
  const allBool = nonNa.every((r) => RE_BOOL_TRUE.test(r) || RE_BOOL_FALSE.test(r));
  if (allBool) {
    return "bool";
  }
  const allInt = nonNa.every((r) => RE_INT.test(r));
  if (allInt) {
    return "int64";
  }
  const allFloat = nonNa.every((r) => RE_FLOAT.test(r));
  if (allFloat) {
    return "float64";
  }
  return "string";
}

/** Parse a raw string to a Scalar for an inferred dtype. */
function parseInferred(raw: string, dtype: DtypeName, naSet: ReadonlySet<string>): Scalar {
  if (isNaRaw(raw, naSet)) {
    return null;
  }
  if (dtype === "bool") {
    return RE_BOOL_TRUE.test(raw);
  }
  if (dtype === "int64") {
    return Number.parseInt(raw, 10);
  }
  if (dtype === "float64") {
    return Number.parseFloat(raw);
  }
  return raw;
}

/** Parse an int/uint dtype (helper to keep CC low). */
function parseForcedInt(raw: string): Scalar {
  const n = Number(raw);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

/** Parse a float dtype (helper to keep CC low). */
function parseForcedFloat(raw: string): Scalar {
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/** Parse a bool dtype (helper to keep CC low). */
function parseForcedBool(raw: string): Scalar {
  if (RE_BOOL_TRUE.test(raw)) {
    return true;
  }
  if (RE_BOOL_FALSE.test(raw)) {
    return false;
  }
  return null;
}

/** Parse a raw string to a Scalar when a specific dtype is forced by the caller. */
function parseForcedDtype(raw: string, dtypeName: DtypeName, naSet: ReadonlySet<string>): Scalar {
  if (isNaRaw(raw, naSet)) {
    return null;
  }
  if (dtypeName.startsWith("int") || dtypeName.startsWith("uint")) {
    return parseForcedInt(raw);
  }
  if (dtypeName.startsWith("float")) {
    return parseForcedFloat(raw);
  }
  if (dtypeName === "bool") {
    return parseForcedBool(raw);
  }
  return raw;
}

/** Build a `Series` from raw strings with the resolved dtype. */
function buildColumnSeries(
  name: string,
  raws: readonly string[],
  dtypeName: DtypeName,
  naSet: ReadonlySet<string>,
  forced: boolean,
): Series<Scalar> {
  const data: Scalar[] = raws.map((r) =>
    forced ? parseForcedDtype(r, dtypeName, naSet) : parseInferred(r, dtypeName, naSet),
  );
  return new Series({ data, name, dtype: Dtype.from(dtypeName) });
}

// ─── column extraction ────────────────────────────────────────────────────────

/** Transpose rows into per-column raw-string arrays. */
function extractRawColumns(rows: readonly (readonly string[])[], numCols: number): string[][] {
  const rawCols: string[][] = Array.from({ length: numCols }, (): string[] => []);
  for (const row of rows) {
    for (let ci = 0; ci < numCols; ci++) {
      const rawVal = row[ci];
      (rawCols[ci] as string[]).push(rawVal ?? "");
    }
  }
  return rawCols;
}

/** True when a column should become the row index. */
function isIndexColumn(name: string, ci: number, indexCol: string | number | null): boolean {
  if (indexCol === null) {
    return false;
  }
  if (typeof indexCol === "string") {
    return indexCol === name;
  }
  return indexCol === ci;
}

/** Build an empty DataFrame with named columns but no rows. */
function emptyDataFrame(colNames: readonly string[]): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    colMap.set(name, new Series({ data: [], name }));
  }
  return new DataFrame(colMap, new Index<Label>([]));
}

// ─── public: readCsv ──────────────────────────────────────────────────────────

/**
 * Parse a CSV string into a `DataFrame`.
 *
 * Mirrors `pandas.read_csv()`.
 *
 * @param text    - Raw CSV string (supports `\n`, `\r\n`, `\r` line endings).
 * @param options - Optional parsing configuration.
 * @returns         A new `DataFrame`.
 *
 * @example
 * ```ts
 * import { readCsv } from "tsb";
 *
 * const df = readCsv("a,b,c\n1,2,3\n4,5,6");
 * // DataFrame: a=[1,4], b=[2,5], c=[3,6]
 * ```
 */
/** Build the NA set from options. */
function buildNaSet(naValues: readonly string[] | undefined): Set<string> {
  const naSet: Set<string> = new Set(DEFAULT_NA_STRINGS);
  if (naValues !== undefined) {
    for (const v of naValues) {
      naSet.add(v);
    }
  }
  return naSet;
}

/** Parse the header row and determine where data rows begin. */
function parseHeader(
  lines: readonly string[],
  headerRow: number | null,
  sep: string,
): { colNames: string[]; dataStart: number } | null {
  if (headerRow === null || headerRow < 0) {
    return { colNames: [], dataStart: 0 };
  }
  if (headerRow >= lines.length) {
    return null; // signals "return empty DataFrame"
  }
  return {
    colNames: parseLine(lines[headerRow] as string, sep),
    dataStart: headerRow + 1,
  };
}

/** Build columns and an optional index series from parsed rows. */
function buildColumnsFromRows(
  colNames: readonly string[],
  rows: readonly (readonly string[])[],
  dtypeMap: Readonly<Record<string, DtypeName>>,
  naSet: ReadonlySet<string>,
  indexCol: string | number | null,
): { colMap: Map<string, Series<Scalar>>; indexSeries: Series<Scalar> | null } {
  const numCols = colNames.length;
  const rawCols = extractRawColumns(rows, numCols);
  const colMap = new Map<string, Series<Scalar>>();
  let indexSeries: Series<Scalar> | null = null;

  for (let ci = 0; ci < numCols; ci++) {
    const name = colNames[ci] as string;
    const raws = rawCols[ci] as readonly string[];
    const forcedName: DtypeName | undefined = dtypeMap[name];
    const forced = forcedName !== undefined;
    const dtypeName: DtypeName = forced ? (forcedName as DtypeName) : inferColumnDtype(raws, naSet);
    const series = buildColumnSeries(name, raws, dtypeName, naSet, forced);

    if (isIndexColumn(name, ci, indexCol)) {
      indexSeries = series;
    } else {
      colMap.set(name, series);
    }
  }

  return { colMap, indexSeries };
}

export function readCsv(text: string, options?: ReadCsvOptions): DataFrame {
  const sep = options?.sep ?? ",";
  const headerRow = options?.header === undefined ? 0 : options.header;
  const indexCol = options?.indexCol ?? null;
  const dtypeMap: Readonly<Record<string, DtypeName>> = options?.dtype ?? {};
  const skipRows = options?.skipRows ?? 0;
  const nRows = options?.nRows ?? null;
  const naSet = buildNaSet(options?.naValues);

  const lines = splitLines(text);
  const headerResult = parseHeader(lines, headerRow, sep);
  if (headerResult === null) {
    return new DataFrame(new Map(), new Index<Label>([]));
  }
  let { colNames } = headerResult;
  const { dataStart } = headerResult;

  let dataLines = lines.slice(dataStart + skipRows);
  if (nRows !== null) {
    dataLines = dataLines.slice(0, nRows);
  }

  if (dataLines.length === 0) {
    if (colNames.length === 0) {
      return new DataFrame(new Map(), new Index<Label>([]));
    }
    return emptyDataFrame(colNames);
  }

  const rows = dataLines.map((l) => parseLine(l, sep));

  if (colNames.length === 0) {
    const numCols = rows[0]?.length ?? 0;
    colNames = Array.from({ length: numCols }, (_, i) => String(i));
  }

  const { colMap, indexSeries } = buildColumnsFromRows(colNames, rows, dtypeMap, naSet, indexCol);

  const rowIndex: Index<Label> =
    indexSeries !== null
      ? new Index<Label>(indexSeries.values as readonly Label[])
      : (new RangeIndex(rows.length) as unknown as Index<Label>);

  return new DataFrame(colMap, rowIndex);
}

// ─── public: toCsv ────────────────────────────────────────────────────────────

/** Quote a CSV field when it contains the separator, a quote, or a newline. */
function quoteCsvField(val: string, sep: string): string {
  const needsQuoting = val.includes(sep) || val.includes('"') || val.includes("\n");
  if (!needsQuoting) {
    return val;
  }
  return `"${val.replace(RE_DOUBLE_QUOTE, '""')}"`;
}

/** Convert a scalar to its CSV string representation. */
function scalarToStr(v: Scalar, naRep: string): string {
  if (v === null || v === undefined) {
    return naRep;
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return naRep;
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  return String(v);
}

/**
 * Serialize a `DataFrame` to a CSV string.
 *
 * Mirrors `pandas.DataFrame.to_csv()`.
 *
 * @param df      - The DataFrame to serialize.
 * @param options - Optional formatting options.
 * @returns         A CSV string.
 *
 * @example
 * ```ts
 * import { DataFrame, toCsv } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * toCsv(df, { index: false });
 * // "a,b\n1,3\n2,4\n"
 * ```
 */
/** Build the CSV header line. */
function buildHeaderLine(colNames: readonly Label[], sep: string, includeIndex: boolean): string {
  const headerFields: string[] = [];
  if (includeIndex) {
    headerFields.push("");
  }
  for (const name of colNames) {
    headerFields.push(quoteCsvField(String(name), sep));
  }
  return headerFields.join(sep);
}

/** Build a single CSV data row. */
function buildDataRow(
  df: DataFrame,
  ri: number,
  colNames: readonly Label[],
  indexVals: readonly (Label | undefined)[],
  sep: string,
  naRep: string,
  includeIndex: boolean,
): string {
  const fields: string[] = [];
  if (includeIndex) {
    const idxVal = indexVals[ri] ?? null;
    const idxStr = idxVal !== null ? String(idxVal) : naRep;
    fields.push(quoteCsvField(idxStr, sep));
  }
  for (const name of colNames) {
    const s = df.col(String(name));
    const v = s.iloc(ri);
    fields.push(quoteCsvField(scalarToStr(v, naRep), sep));
  }
  return fields.join(sep);
}

export function toCsv(df: DataFrame, options?: ToCsvOptions): string {
  const sep = options?.sep ?? ",";
  const includeHeader = options?.header ?? true;
  const includeIndex = options?.index ?? true;
  const linesep = options?.lineterminator ?? "\n";
  const naRep = options?.naRep ?? "";

  const colNames = df.columns.values;
  const nRows = df.shape[0];
  const indexVals = df.index.values;
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(buildHeaderLine(colNames, sep, includeIndex));
  }

  for (let ri = 0; ri < nRows; ri++) {
    lines.push(buildDataRow(df, ri, colNames, indexVals, sep, naRep, includeIndex));
  }

  if (lines.length === 0) {
    return "";
  }
  return lines.join(linesep) + linesep;
}
