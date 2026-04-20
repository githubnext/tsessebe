/**
 * readExcel — XLSX file reading for DataFrame.
 *
 * Mirrors `pandas.read_excel()`:
 * - `readExcel(data, options?)` — parse an XLSX binary buffer into a DataFrame.
 * - `xlsxSheetNames(data)` — list sheet names without parsing cell data.
 *
 * Supports:
 * - Shared string table (type `"s"`)
 * - Inline strings (type `"inlineStr"`)
 * - Numbers (type absent or `"n"`)
 * - Booleans (type `"b"`)
 * - Formula cached values (type `"str"`)
 * - Error cells (type `"e"`) — returned as null
 * - ZIP STORED (method 0) and DEFLATED (method 8) entries
 *
 * Limitations (deferred):
 * - XLSX only — not XLS (legacy binary format)
 * - No ZIP64 support (up to ~4 GB)
 * - Date serial numbers are not converted (returned as numeric)
 *
 * @module
 */

// biome-ignore lint/correctness/noNodejsModules: raw DEFLATE decompression for ZIP/XLSX requires node:zlib
import { inflateRawSync } from "node:zlib";
import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import { Series } from "../core/index.ts";
import { Dtype } from "../core/index.ts";
import type { DtypeName, Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link readExcel}. */
export interface ReadExcelOptions {
  /**
   * Which sheet to read.
   * - `string`: exact sheet name
   * - `number`: 0-based sheet index
   * - Default: `0` (first sheet)
   */
  readonly sheetName?: string | number;
  /**
   * Row index of the header row, or `null` for no header (columns become
   * `"0"`, `"1"`, `"2"`, …).
   * Default: `0`.
   */
  readonly header?: number | null;
  /**
   * Column name or 0-based index of the column to use as the row index.
   * Default: `null` (use a default `RangeIndex`).
   */
  readonly indexCol?: string | number | null;
  /**
   * Number of data rows to skip after the header row.
   * Default: `0`.
   */
  readonly skipRows?: number;
  /**
   * Maximum number of data rows to read.
   */
  readonly nrows?: number;
  /**
   * Additional strings to treat as NA (beyond the built-in set:
   * `""`, `"NA"`, `"N/A"`, `"null"`, `"NaN"`, `"nan"`, `"#N/A"`).
   */
  readonly naValues?: readonly string[];
  /**
   * Explicit dtype overrides per column name.
   */
  readonly dtype?: Readonly<Record<string, DtypeName>>;
}

// ─── ZIP low-level helpers ────────────────────────────────────────────────────

/** Read a little-endian uint16 from a buffer. */
function readU16(buf: Uint8Array, off: number): number {
  return ((buf[off] ?? 0) | ((buf[off + 1] ?? 0) << 8)) >>> 0;
}

/** Read a little-endian uint32 from a buffer. */
function readU32(buf: Uint8Array, off: number): number {
  return (
    ((buf[off] ?? 0) |
      ((buf[off + 1] ?? 0) << 8) |
      ((buf[off + 2] ?? 0) << 16) |
      ((buf[off + 3] ?? 0) << 24)) >>>
    0
  );
}

const ZIP_EOCD_SIG = 0x06054b50;
const ZIP_CD_SIG = 0x02014b50;
const ZIP_COMP_STORED = 0;
const ZIP_COMP_DEFLATE = 8;

interface ZipEntry {
  readonly name: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly method: number;
  readonly dataOffset: number;
}

/** Search for the End-of-Central-Directory record. */
function findEocd(buf: Uint8Array): number {
  const minOff = Math.max(0, buf.length - 65558);
  for (let i = buf.length - 22; i >= minOff; i--) {
    if (readU32(buf, i) === ZIP_EOCD_SIG) {
      return i;
    }
  }
  throw new Error("Not a valid XLSX file: no ZIP end-of-central-directory found");
}

/** Compute the actual data offset from the local file header. */
function localDataOffset(buf: Uint8Array, localOff: number): number {
  const nameLen = readU16(buf, localOff + 26);
  const extraLen = readU16(buf, localOff + 28);
  return localOff + 30 + nameLen + extraLen;
}

/** Parse the ZIP central directory and return a name→entry map. */
function parseZipEntries(buf: Uint8Array): Map<string, ZipEntry> {
  const eocd = findEocd(buf);
  const cdOffset = readU32(buf, eocd + 16);
  const cdSize = readU32(buf, eocd + 12);
  const dec = new TextDecoder("utf-8");
  const entries = new Map<string, ZipEntry>();
  let pos = cdOffset;
  while (pos < cdOffset + cdSize && pos + 46 <= buf.length) {
    if (readU32(buf, pos) !== ZIP_CD_SIG) {
      break;
    }
    const method = readU16(buf, pos + 10);
    const compressedSize = readU32(buf, pos + 20);
    const uncompressedSize = readU32(buf, pos + 24);
    const nameLen = readU16(buf, pos + 28);
    const extraLen = readU16(buf, pos + 30);
    const commentLen = readU16(buf, pos + 32);
    const localOff = readU32(buf, pos + 42);
    const name = dec.decode(buf.subarray(pos + 46, pos + 46 + nameLen));
    const dataOffset = localDataOffset(buf, localOff);
    entries.set(name, { name, compressedSize, uncompressedSize, method, dataOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Decompress a ZIP entry and decode it as a UTF-8 string. */
function extractEntry(buf: Uint8Array, entry: ZipEntry): string {
  const raw = buf.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  let bytes: Uint8Array;
  if (entry.method === ZIP_COMP_STORED) {
    bytes = raw;
  } else if (entry.method === ZIP_COMP_DEFLATE) {
    bytes = inflateRawSync(raw);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${entry.method}`);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/** Extract a named entry or return null if absent. */
function getZipEntry(buf: Uint8Array, entries: Map<string, ZipEntry>, name: string): string | null {
  const entry = entries.get(name);
  if (entry === undefined) {
    return null;
  }
  return extractEntry(buf, entry);
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

// Top-level regex constants (Biome useTopLevelRegex)
const RE_XML_ENTITY = /&(?:amp|lt|gt|quot|apos);/g;
const RE_SST_SI = /<si>([\s\S]*?)<\/si>/g;
const RE_SST_T = /<t(?:[^>]*)>([\s\S]*?)<\/t>/g;
const RE_WB_SHEET = /<sheet\b([^>]*)>/g;
const RE_REL = /<Relationship\b([^>]*)>/g;
const RE_ROW = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
const RE_CELL = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
const RE_CELL_V = /<v>([\s\S]*?)<\/v>/;
const RE_CELL_IS = /<is>[\s\S]*?<t(?:[^>]*)>([\s\S]*?)<\/t>/;
const RE_COL_LETTERS = /^([A-Z]+)(\d+)$/;

/** Replace XML character references with their literal characters. */
function xmlUnescape(s: string): string {
  return s.replace(RE_XML_ENTITY, (m) => {
    if (m === "&amp;") {
      return "&";
    }
    if (m === "&lt;") {
      return "<";
    }
    if (m === "&gt;") {
      return ">";
    }
    if (m === "&quot;") {
      return '"';
    }
    return "'";
  });
}

/**
 * Extract the value of a single named XML attribute from an attribute string.
 * Uses `new RegExp` (not a literal) to support dynamic attribute names.
 */
function attrVal(attrStr: string, key: string): string {
  const re = new RegExp(`\\b${key}="([^"]*)"`);
  return re.exec(attrStr)?.[1] ?? "";
}

// ─── XLSX-specific XML parsing ────────────────────────────────────────────────

/** Iterate all non-overlapping matches of a global regex against a string. */
function* regexAll(re: RegExp, str: string): Generator<RegExpExecArray> {
  re.lastIndex = 0;
  let m = re.exec(str);
  while (m !== null) {
    yield m;
    m = re.exec(str);
  }
}

/** Parse the shared string table XML into an array of strings. */
function parseSiText(siContent: string): string {
  let text = "";
  for (const t of regexAll(RE_SST_T, siContent)) {
    text += xmlUnescape(t[1] ?? "");
  }
  return text;
}

/** Parse the shared string table XML into an array of strings. */
function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  for (const si of regexAll(RE_SST_SI, xml)) {
    strings.push(parseSiText(si[1] ?? ""));
  }
  return strings;
}

interface SheetInfo {
  readonly name: string;
  readonly rid: string;
}

/** Parse the workbook XML and return a list of sheet descriptors. */
function parseWorkbookSheets(xml: string): SheetInfo[] {
  const sheets: SheetInfo[] = [];
  for (const m of regexAll(RE_WB_SHEET, xml)) {
    const attrs = m[1] ?? "";
    const name = xmlUnescape(attrVal(attrs, "name"));
    const rid = attrVal(attrs, "r:id");
    if (name !== "") {
      sheets.push({ name, rid });
    }
  }
  return sheets;
}

/** Parse the workbook relationships XML and return a rid→target map. */
function parseRelationships(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of regexAll(RE_REL, xml)) {
    const attrs = m[1] ?? "";
    const id = attrVal(attrs, "Id");
    const target = attrVal(attrs, "Target");
    if (id !== "") {
      map.set(id, target);
    }
  }
  return map;
}

// ─── Cell parsing ─────────────────────────────────────────────────────────────

/** Convert a column letter string (e.g. "A", "AB") to a 0-based index. */
function colLetterToIndex(col: string): number {
  let idx = 0;
  for (const ch of col) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

/**
 * Parse a cell reference (e.g. "A1") into [rowIndex, colIndex] (both 0-based).
 */
function parseCellRef(ref: string): readonly [number, number] {
  const m = RE_COL_LETTERS.exec(ref);
  if (m === null) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }
  const colLetters = m[1] ?? "";
  const rowNum = Number.parseInt(m[2] ?? "1", 10);
  return [rowNum - 1, colLetterToIndex(colLetters)];
}

/** Resolve a cell value given its type tag and raw text. */
function resolveCellValue(
  cellType: string,
  vText: string,
  isText: string,
  sharedStrings: readonly string[],
): Scalar {
  if (cellType === "s") {
    const idx = Number.parseInt(vText, 10);
    return sharedStrings[idx] ?? null;
  }
  if (cellType === "b") {
    return vText === "1";
  }
  if (cellType === "inlineStr") {
    return xmlUnescape(isText);
  }
  if (cellType === "e") {
    return null;
  }
  // "str" (formula string), "n" (number), or absent (number)
  if (vText === "") {
    return null;
  }
  const n = Number(vText);
  return Number.isNaN(n) ? xmlUnescape(vText) : n;
}

interface RawRow {
  readonly rowIndex: number;
  readonly cells: ReadonlyMap<number, Scalar>;
}

/** Parse a single `<row>` element into a RawRow. */
function parseOneRow(
  rowAttrs: string,
  rowContent: string,
  sharedStrings: readonly string[],
): RawRow {
  const rowIdxStr = attrVal(rowAttrs, "r");
  const rowIndex = rowIdxStr === "" ? 0 : Number.parseInt(rowIdxStr, 10) - 1;
  const cells = new Map<number, Scalar>();
  for (const cellMatch of regexAll(RE_CELL, rowContent)) {
    const cellAttrs = cellMatch[1] ?? "";
    const cellContent = cellMatch[2] ?? "";
    const ref = attrVal(cellAttrs, "r");
    if (ref === "") {
      continue;
    }
    const cellType = attrVal(cellAttrs, "t");
    const vMatch = RE_CELL_V.exec(cellContent);
    const vText = vMatch !== null ? xmlUnescape(vMatch[1] ?? "") : "";
    const isMatch = RE_CELL_IS.exec(cellContent);
    const isText = isMatch?.[1] ?? "";
    const [, colIdx] = parseCellRef(ref);
    cells.set(colIdx, resolveCellValue(cellType, vText, isText, sharedStrings));
  }
  return { rowIndex, cells };
}

/** Parse all `<row>` elements from a worksheet XML string. */
function parseWorksheetRows(xml: string, sharedStrings: readonly string[]): RawRow[] {
  const rows: RawRow[] = [];
  for (const rowMatch of regexAll(RE_ROW, xml)) {
    rows.push(parseOneRow(rowMatch[1] ?? "", rowMatch[2] ?? "", sharedStrings));
  }
  return rows;
}

// ─── DataFrame construction ───────────────────────────────────────────────────

const BUILTIN_NA = new Set(["", "NA", "N/A", "null", "NaN", "nan", "#N/A"]);

/** True when a string value should be coerced to null. */
function isNaStr(s: string, extraNa: ReadonlySet<string>): boolean {
  return BUILTIN_NA.has(s) || extraNa.has(s);
}

/** Coerce a raw cell value to null when it matches an NA sentinel. */
function coerceNa(val: Scalar, extraNa: ReadonlySet<string>): Scalar {
  if (typeof val === "string" && isNaStr(val, extraNa)) {
    return null;
  }
  return val;
}

/** Compute the maximum column index across all rows. */
function maxColIndex(rows: readonly RawRow[]): number {
  let max = 0;
  for (const row of rows) {
    for (const col of row.cells.keys()) {
      if (col > max) {
        max = col;
      }
    }
  }
  return max;
}

interface ColumnarData {
  readonly columns: string[];
  readonly data: Scalar[][];
}

/** Pad header labels array to `numCols` with numeric fallback names. */
function padHeaderLabels(labels: string[], numCols: number): void {
  while (labels.length < numCols) {
    labels.push(String(labels.length));
  }
}

/** Extract header labels from the header row. */
function extractHeaderLabels(
  rows: readonly RawRow[],
  headerRow: number,
  numCols: number,
): string[] {
  const labels: string[] = [];
  const hRow = rows.find((r) => r.rowIndex === headerRow);
  if (hRow !== undefined) {
    for (let c = 0; c < numCols; c++) {
      const v = hRow.cells.get(c) ?? null;
      labels.push(v !== null ? String(v) : String(c));
    }
  }
  return labels;
}

/** Pivot sliced data rows into per-column arrays. */
function pivotToColumns(
  sliced: readonly RawRow[],
  numCols: number,
  extraNa: ReadonlySet<string>,
): Scalar[][] {
  const data: Scalar[][] = Array.from({ length: numCols }, (): Scalar[] => []);
  for (const row of sliced) {
    for (let c = 0; c < numCols; c++) {
      const val = coerceNa(row.cells.get(c) ?? null, extraNa);
      (data[c] as Scalar[]).push(val);
    }
  }
  return data;
}

/** Separate header and data rows, then pivot to column-oriented arrays. */
function buildColumnarData(
  rows: readonly RawRow[],
  headerRow: number | null,
  skipRows: number,
  nrows: number | undefined,
  extraNa: ReadonlySet<string>,
): ColumnarData {
  const numCols = rows.length === 0 ? 0 : maxColIndex(rows) + 1;
  const dataRows = rows.filter((r) => headerRow === null || r.rowIndex !== headerRow);
  const headerLabels = headerRow !== null ? extractHeaderLabels(rows, headerRow, numCols) : [];
  padHeaderLabels(headerLabels, numCols);
  const sliced = dataRows.slice(skipRows, nrows !== undefined ? skipRows + nrows : undefined);
  const data = pivotToColumns(sliced, numCols, extraNa);
  return { columns: headerLabels, data };
}

/** Infer a dtype from a column's scalar values. */
function inferColDtype(values: readonly Scalar[], override: DtypeName | undefined): DtypeName {
  if (override !== undefined) {
    return override;
  }
  let allNum = true;
  let allBool = true;
  let allStr = true;
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v !== "number") {
      allNum = false;
    }
    if (typeof v !== "boolean") {
      allBool = false;
    }
    if (typeof v !== "string") {
      allStr = false;
    }
  }
  if (allBool) {
    return "bool";
  }
  if (allNum) {
    return "float64";
  }
  if (allStr) {
    return "string";
  }
  return "object";
}

/** Build a DataFrame from parsed rows and options. */
function buildDataFrame(rows: readonly RawRow[], options: ReadExcelOptions): DataFrame {
  const headerRow = options.header !== undefined ? (options.header ?? null) : 0;
  const skipRows = options.skipRows ?? 0;
  const extraNa = new Set(options.naValues ?? []);
  const dtypeOvr: Readonly<Record<string, DtypeName>> = options.dtype ?? {};
  const { columns, data } = buildColumnarData(rows, headerRow, skipRows, options.nrows, extraNa);
  const indexColOpt = options.indexCol ?? null;
  const indexColIdx = resolveIndexColIdx(columns, indexColOpt);
  const rowCount = (data[0] ?? []).length;
  const colMap = new Map<string, Series<Scalar>>();
  for (let c = 0; c < columns.length; c++) {
    if (c === indexColIdx) {
      continue;
    }
    const colName = columns[c] ?? String(c);
    const colData = data[c] ?? [];
    const dtypeName = inferColDtype(colData, dtypeOvr[colName]);
    colMap.set(colName, new Series({ data: colData, dtype: Dtype.from(dtypeName), name: colName }));
  }
  const toLabel = (v: Scalar): Label =>
    v === undefined || typeof v === "bigint" || (typeof v === "object" && v !== null) ? null : v;
  const rowIndex =
    indexColIdx >= 0
      ? new Index<Label>((data[indexColIdx] ?? []).map(toLabel))
      : new RangeIndex(rowCount);
  return new DataFrame(colMap, rowIndex);
}

/** Resolve the numeric column index for the index column option. */
function resolveIndexColIdx(columns: readonly string[], opt: string | number | null): number {
  if (opt === null) {
    return -1;
  }
  if (typeof opt === "number") {
    return opt;
  }
  const idx = columns.indexOf(opt);
  return idx;
}

// ─── sheet path resolution ────────────────────────────────────────────────────

/** Resolve the XML path inside the ZIP for a given sheet. */
function resolveSheetPath(
  rels: ReadonlyMap<string, string>,
  sheetInfo: SheetInfo,
  sheetIndex: number,
): string {
  const target = rels.get(sheetInfo.rid) ?? `worksheets/sheet${sheetIndex + 1}.xml`;
  return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

/** Select the SheetInfo for the requested sheetName option. */
function selectSheet(sheets: readonly SheetInfo[], sheetName: string | number): SheetInfo {
  if (typeof sheetName === "number") {
    const s = sheets[sheetName];
    if (s === undefined) {
      throw new Error(`Sheet index out of range: ${sheetName}`);
    }
    return s;
  }
  const s = sheets.find((sh) => sh.name === sheetName);
  if (s === undefined) {
    throw new Error(`Sheet not found: "${sheetName}"`);
  }
  return s;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse an XLSX binary buffer into a `DataFrame`.
 *
 * Mirrors `pandas.read_excel()`.
 *
 * @param data    - XLSX file contents as a `Uint8Array` or `ArrayBuffer`.
 * @param options - Parsing options (sheet selection, header, index column, etc.).
 * @returns A `DataFrame` containing the sheet data.
 *
 * @example
 * ```ts
 * import { readFileSync } from "node:fs";
 * const buf = readFileSync("data.xlsx");
 * const df = readExcel(new Uint8Array(buf));
 * // df.shape → [100, 5]
 * ```
 */
export function readExcel(
  data: Uint8Array | ArrayBufferLike,
  options?: ReadExcelOptions,
): DataFrame {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const opts = options ?? {};
  const entries = parseZipEntries(buf);

  // Load shared strings (optional — may be absent for numeric-only sheets)
  const sstXml = getZipEntry(buf, entries, "xl/sharedStrings.xml") ?? "";
  const sharedStrings = sstXml === "" ? [] : parseSharedStrings(sstXml);

  // Load workbook to find sheet names
  const wbXml = getZipEntry(buf, entries, "xl/workbook.xml");
  if (wbXml === null) {
    throw new Error("Invalid XLSX: xl/workbook.xml not found");
  }
  const sheets = parseWorkbookSheets(wbXml);
  if (sheets.length === 0) {
    throw new Error("Invalid XLSX: no sheets found in workbook");
  }

  const sheetName = opts.sheetName ?? 0;
  const sheetInfo = selectSheet(sheets, sheetName);
  const sheetIndex = typeof sheetName === "number" ? sheetName : sheets.indexOf(sheetInfo);

  // Resolve sheet XML path via workbook relationships
  const relsXml = getZipEntry(buf, entries, "xl/_rels/workbook.xml.rels") ?? "";
  const rels = relsXml === "" ? new Map<string, string>() : parseRelationships(relsXml);
  const sheetPath = resolveSheetPath(rels, sheetInfo, sheetIndex);

  const wsXml = getZipEntry(buf, entries, sheetPath);
  if (wsXml === null) {
    throw new Error(`Sheet XML not found at path: ${sheetPath}`);
  }
  const rows = parseWorksheetRows(wsXml, sharedStrings);
  return buildDataFrame(rows, opts);
}

/**
 * Return the sheet names in an XLSX file without parsing cell data.
 *
 * @param data - XLSX file contents as a `Uint8Array` or `ArrayBuffer`.
 * @returns Array of sheet name strings in workbook order.
 *
 * @example
 * ```ts
 * xlsxSheetNames(buf); // ["Sheet1", "Sheet2"]
 * ```
 */
export function xlsxSheetNames(data: Uint8Array | ArrayBufferLike): string[] {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const entries = parseZipEntries(buf);
  const wbXml = getZipEntry(buf, entries, "xl/workbook.xml");
  if (wbXml === null) {
    return [];
  }
  return parseWorkbookSheets(wbXml).map((s) => s.name);
}
