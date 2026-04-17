/**
 * Benchmark: readExcel / xlsxSheetNames — parse a 10k-row XLSX file.
 * Outputs JSON: {"function": "read_excel", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readExcel, xlsxSheetNames } from "../../src/index.ts";

// ─── minimal XLSX builder (adapted from tests/io/read_excel.test.ts) ──────────

const ENC = new TextEncoder();

function le16(n: number): Uint8Array {
  const v = n & 0xffff;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
}
function le32(n: number): Uint8Array {
  const v = n >>> 0;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
}
function joinBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}
function buildStoredZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const localOffsets: number[] = [];
  let curOffset = 0;
  for (const f of files) {
    const nameBytes = ENC.encode(f.name);
    const lh = joinBytes(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      le16(20), le16(0), le16(0), le16(0), le16(0), le32(0),
      le32(f.data.length), le32(f.data.length),
      le16(nameBytes.length), le16(0), nameBytes, f.data,
    );
    localOffsets.push(curOffset);
    localParts.push(lh);
    curOffset += lh.length;
  }
  const cdParts: Uint8Array[] = [];
  for (const [i, f] of files.entries()) {
    const nameBytes = ENC.encode(f.name);
    const off = localOffsets[i] ?? 0;
    cdParts.push(joinBytes(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      le16(20), le16(20), le16(0), le16(0), le16(0), le16(0), le32(0),
      le32(f.data.length), le32(f.data.length),
      le16(nameBytes.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(off),
      nameBytes,
    ));
  }
  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const cdOffset = curOffset;
  const eocd = joinBytes(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    le16(0), le16(0), le16(files.length), le16(files.length),
    le32(cdSize), le32(cdOffset), le16(0),
  );
  return joinBytes(...localParts, ...cdParts, eocd);
}
function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function colLetter(c: number): string {
  let col = c + 1; let result = "";
  while (col > 0) { const rem = (col - 1) % 26; result = String.fromCharCode(65 + rem) + result; col = Math.floor((col - 1) / 26); }
  return result;
}
function makeXlsx(headers: string[], rows: (string | number | null)[][]): Uint8Array {
  const strs: string[] = []; const strIdx = new Map<string, number>();
  const reg = (s: string): number => { const x = strIdx.get(s); if (x !== undefined) return x; const i = strs.length; strs.push(s); strIdx.set(s, i); return i; };
  for (const h of headers) reg(h);
  for (const row of rows) for (const c of row) if (typeof c === "string") reg(c);
  const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strs.length}" uniqueCount="${strs.length}">\n${strs.map((s) => `<si><t>${escXml(s)}</t></si>`).join("\n")}\n</sst>`;
  const hCells = headers.map((h, c) => `<c r="${colLetter(c)}1" t="s"><v>${reg(h)}</v></c>`).join("");
  const dataCells = rows.map((row, ri) => {
    const cells = row.map((cell, ci) => cell === null ? "" : typeof cell === "string" ? `<c r="${colLetter(ci)}${ri + 2}" t="s"><v>${reg(cell)}</v></c>` : `<c r="${colLetter(ci)}${ri + 2}"><v>${cell}</v></c>`).join("");
    return `<row r="${ri + 2}">${cells}</row>`;
  }).join("\n");
  const ws = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${hCells}</row>\n${dataCells}</sheetData></worksheet>`;
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;
  return buildStoredZip([
    { name: "[Content_Types].xml", data: ENC.encode(ct) },
    { name: "_rels/.rels", data: ENC.encode(rels) },
    { name: "xl/workbook.xml", data: ENC.encode(wb) },
    { name: "xl/_rels/workbook.xml.rels", data: ENC.encode(wbRels) },
    { name: "xl/sharedStrings.xml", data: ENC.encode(sst) },
    { name: "xl/worksheets/sheet1.xml", data: ENC.encode(ws) },
  ]);
}

// ─── benchmark ────────────────────────────────────────────────────────────────

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const headers = ["id", "name", "value", "score"];
const rows: (string | number | null)[][] = Array.from({ length: ROWS }, (_, i) => [
  i,
  `item_${i % 100}`,
  i * 1.5,
  Math.sin(i * 0.01),
]);

const xlsx = makeXlsx(headers, rows);

for (let i = 0; i < WARMUP; i++) {
  readExcel(xlsx);
  xlsxSheetNames(xlsx);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  readExcel(xlsx);
  xlsxSheetNames(xlsx);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_excel",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
