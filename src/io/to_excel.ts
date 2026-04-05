/**
 * Excel writer — serialises a DataFrame to a basic XLSX-compatible format.
 *
 * This is a pure-TypeScript, zero-dependency XLSX writer that produces
 * the minimal Open XML needed to open the file in Excel / LibreOffice.
 *
 * It does NOT require a WASM runtime and produces small, correct files.
 * Complex features (merged cells, formulas, charts) are out of scope.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { toExcel } from "tsb";
 *
 * const df = DataFrame.fromRecords([{ a: 1, b: "hello" }, { a: 2, b: "world" }]);
 * const bytes = toExcel(df);
 * // write bytes to disk: Bun.write("output.xlsx", bytes)
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for the Excel writer. */
export interface ToExcelOptions {
  /** Sheet name (default "Sheet1"). */
  sheetName?: string;
  /** Whether to write row index as first column (default false). */
  index?: boolean;
  /** Start row (1-based, default 1). */
  startRow?: number;
  /** Start column (1-based, default 1). */
  startCol?: number;
}

// ─── toExcel ──────────────────────────────────────────────────────────────────

/**
 * Serialise a DataFrame to an XLSX file and return the raw bytes.
 *
 * The output is a minimal but fully valid XLSX (Open XML) package.
 */
export function toExcel(df: DataFrame, opts: ToExcelOptions = {}): Uint8Array {
  const { sheetName = "Sheet1", index = false, startRow = 1, startCol = 1 } = opts;

  const cols = df.columns.values.map(String);
  const nRows = df.shape[0];

  // Build rows: header + data
  const rows: CellValue[][] = [];

  // Header row
  if (index) {
    rows.push(["index", ...cols]);
  } else {
    rows.push([...cols]);
  }

  // Data rows
  for (let i = 0; i < nRows; i++) {
    const row: CellValue[] = [];
    if (index) {
      row.push(String(df.index.values[i] ?? i));
    }
    for (const col of cols) {
      row.push(df.col(col).iloc(i) ?? null);
    }
    rows.push(row);
  }

  return buildXlsx(rows, sheetName, startRow, startCol);
}

/**
 * Serialise a Series to an XLSX file.
 */
export function seriesToExcel(series: Series, opts: ToExcelOptions = {}): Uint8Array {
  const { sheetName = "Sheet1", index = true, startRow = 1, startCol = 1 } = opts;
  const name = series.name ?? "value";
  const rows: CellValue[][] = [];
  const header: CellValue[] = index ? ["index", name] : [name];
  rows.push(header);
  for (let i = 0; i < series.length; i++) {
    const val = series.iloc(i) ?? null;
    if (index) {
      rows.push([String(series.index.values[i] ?? i), val]);
    } else {
      rows.push([val]);
    }
  }
  return buildXlsx(rows, sheetName, startRow, startCol);
}

// ─── XLSX builder ─────────────────────────────────────────────────────────────

type CellValue = Scalar;

/**
 * Build a minimal XLSX Uint8Array from a 2-D array of cell values.
 * Uses a local PKZip implementation — no dependencies.
 */
function buildXlsx(
  rows: CellValue[][],
  sheetName: string,
  startRow: number,
  startCol: number,
): Uint8Array {
  const sharedStrings: string[] = [];
  const strIndex = new Map<string, number>();

  function intern(s: string): number {
    const existing = strIndex.get(s);
    if (existing !== undefined) {
      return existing;
    }
    const idx = sharedStrings.length;
    sharedStrings.push(s);
    strIndex.set(s, idx);
    return idx;
  }

  // Build worksheet XML
  const rowsXml = rows
    .map((row, ri) => {
      const rowNum = startRow + ri;
      const cellsXml = row
        .map((val, ci) => {
          const colLetter = colName(startCol + ci);
          const cellRef = `${colLetter}${rowNum}`;
          return cellXml(cellRef, val, intern);
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const worksheetXml = `${xmlDecl()}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;

  const sharedStringsXml = `${xmlDecl()}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings.map((s) => `<si><t>${escXml(s)}</t></si>`).join("")}</sst>`;

  const workbookXml = `${xmlDecl()}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const workbookRels = `${xmlDecl()}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

  const contentTypes = `${xmlDecl()}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

  const rootRels = `${xmlDecl()}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  // Assemble ZIP
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: "[Content_Types].xml", data: encode(contentTypes) },
    { name: "_rels/.rels", data: encode(rootRels) },
    { name: "xl/workbook.xml", data: encode(workbookXml) },
    { name: "xl/_rels/workbook.xml.rels", data: encode(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: encode(worksheetXml) },
    { name: "xl/sharedStrings.xml", data: encode(sharedStringsXml) },
  ];

  return buildZip(files);
}

// ─── cell rendering ───────────────────────────────────────────────────────────

function cellXml(ref: string, val: CellValue, intern: (s: string) => number): string {
  if (val === null || val === undefined) {
    return `<c r="${ref}"/>`;
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return `<c r="${ref}"/>`;
    }
    return `<c r="${ref}" t="n"><v>${val}</v></c>`;
  }
  if (typeof val === "boolean") {
    return `<c r="${ref}" t="b"><v>${val ? 1 : 0}</v></c>`;
  }
  const s = String(val);
  const si = intern(s);
  return `<c r="${ref}" t="s"><v>${si}</v></c>`;
}

function colName(n: number): string {
  let name = "";
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    x = Math.floor((x - 1) / 26);
  }
  return name;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlDecl(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
}

const textEncoder = new TextEncoder();
function encode(s: string): Uint8Array {
  return textEncoder.encode(s);
}

// ─── minimal PKZip writer ─────────────────────────────────────────────────────

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function buildZip(files: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header
    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // no compression
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true); // CRC-32
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory entry
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    centralDirs.push(cd);

    offset += local.length;
  }

  const cdSize = centralDirs.reduce((s, b) => s + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + cdSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const b of localHeaders) {
    out.set(b, pos);
    pos += b.length;
  }
  for (const b of centralDirs) {
    out.set(b, pos);
    pos += b.length;
  }
  out.set(eocd, pos);
  return out;
}

// ─── CRC-32 ───────────────────────────────────────────────────────────────────

const CRC32_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
