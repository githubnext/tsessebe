/**
 * Tests for src/io/read_excel.ts — readExcel() and xlsxSheetNames().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readExcel, xlsxSheetNames } from "../../src/index.ts";

// ─── minimal XLSX fixture builder ─────────────────────────────────────────────

const ENC = new TextEncoder();

function le16(n: number): Uint8Array {
  const v = n & 0xffff;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
}

function le32(n: number): Uint8Array {
  const v = n >>> 0;
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) {
    total += p.length;
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

interface ZipFile {
  name: string;
  data: Uint8Array;
}

/** Build a minimal STORED (uncompressed) ZIP archive. CRC is set to 0. */
function buildStoredZip(files: ZipFile[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const localOffsets: number[] = [];
  let curOffset = 0;

  for (const f of files) {
    const nameBytes = ENC.encode(f.name);
    const lh = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // local file sig
      le16(20), // version needed
      le16(0), // flags
      le16(0), // method = STORED
      le16(0),
      le16(0), // mod time, mod date
      le32(0), // CRC-32 (zeroed)
      le32(f.data.length), // compressed size
      le32(f.data.length), // uncompressed size
      le16(nameBytes.length), // filename length
      le16(0), // extra field length
      nameBytes,
      f.data,
    );
    localOffsets.push(curOffset);
    localParts.push(lh);
    curOffset += lh.length;
  }

  const cdParts: Uint8Array[] = [];
  for (const [i, f] of files.entries()) {
    const nameBytes = ENC.encode(f.name);
    const off = localOffsets[i] ?? 0;
    const cd = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // central dir sig
      le16(20),
      le16(20), // version made by, needed
      le16(0),
      le16(0), // flags, method = STORED
      le16(0),
      le16(0), // mod time, mod date
      le32(0), // CRC-32
      le32(f.data.length), // compressed size
      le32(f.data.length), // uncompressed size
      le16(nameBytes.length), // filename length
      le16(0),
      le16(0), // extra, comment length
      le16(0),
      le16(0), // disk start, internal attrs
      le32(0), // external attrs
      le32(off), // local header offset
      nameBytes,
    );
    cdParts.push(cd);
  }

  const cdSize = cdParts.reduce((s, p) => s + p.length, 0);
  const cdOffset = curOffset;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // end of central dir sig
    le16(0),
    le16(0), // disk numbers
    le16(files.length),
    le16(files.length), // entry counts
    le32(cdSize), // central dir size
    le32(cdOffset), // central dir offset
    le16(0), // comment length
  );

  return concat(...localParts, ...cdParts, eocd);
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function numToColLetter(c: number): string {
  let col = c + 1;
  let result = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    col = Math.floor((col - 1) / 26);
  }
  return result;
}

type CellValue = string | number | boolean | null;

interface SstContext {
  stringList: string[];
  stringIdx: Map<string, number>;
}

/** Register a string in the SST and return its index. */
function regStr(ctx: SstContext, s: string): number {
  const existing = ctx.stringIdx.get(s);
  if (existing !== undefined) {
    return existing;
  }
  const idx = ctx.stringList.length;
  ctx.stringList.push(s);
  ctx.stringIdx.set(s, idx);
  return idx;
}

/** Build SST XML from a context. */
function buildSstXml(ctx: SstContext): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ctx.stringList.length}" uniqueCount="${ctx.stringList.length}">`,
    ...ctx.stringList.map((s) => `<si><t>${escXml(s)}</t></si>`),
    "</sst>",
  ].join("\n");
}

/** Render one data cell to XML. */
function renderCell(ref: string, cell: CellValue, ctx: SstContext): string {
  if (typeof cell === "string") {
    const idx = regStr(ctx, cell);
    return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
  }
  if (typeof cell === "boolean") {
    return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}"><v>${cell}</v></c>`;
}

/** Build worksheet XML from headers, rows, and SST context. */
function buildWsXml(headers: string[], rows: CellValue[][], ctx: SstContext): string {
  const wsRowParts: string[] = [];
  const hCells = headers.map((h, c) => {
    const idx = regStr(ctx, h);
    return `<c r="${numToColLetter(c)}1" t="s"><v>${idx}</v></c>`;
  });
  wsRowParts.push(`<row r="1">${hCells.join("")}</row>`);
  for (const [ri, row] of rows.entries()) {
    const rowNum = ri + 2;
    const cells: string[] = [];
    for (const [ci, cell] of row.entries()) {
      if (cell === null || cell === undefined) {
        continue;
      }
      cells.push(renderCell(`${numToColLetter(ci)}${rowNum}`, cell, ctx));
    }
    wsRowParts.push(`<row r="${rowNum}">${cells.join("")}</row>`);
  }
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    "<sheetData>",
    ...wsRowParts,
    "</sheetData>",
    "</worksheet>",
  ].join("\n");
}

/** Build a minimal single-sheet XLSX buffer. */
function makeXlsx(headers: string[], rows: CellValue[][], sheetName = "Sheet1"): Uint8Array {
  const ctx: SstContext = { stringList: [], stringIdx: new Map() };
  // Pre-register header strings
  for (const h of headers) {
    regStr(ctx, h);
  }
  // Pre-register data strings
  for (const row of rows) {
    for (const cell of row) {
      if (typeof cell === "string") {
        regStr(ctx, cell);
      }
    }
  }
  const sstXml = buildSstXml(ctx);
  const wsXml = buildWsXml(headers, rows, ctx);
  const wbXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    `<sheets><sheet name="${escXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>`,
    "</workbook>",
  ].join("\n");
  const wbRelsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
  const relsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const ctXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
  return buildStoredZip([
    { name: "[Content_Types].xml", data: ENC.encode(ctXml) },
    { name: "_rels/.rels", data: ENC.encode(relsXml) },
    { name: "xl/workbook.xml", data: ENC.encode(wbXml) },
    { name: "xl/_rels/workbook.xml.rels", data: ENC.encode(wbRelsXml) },
    { name: "xl/sharedStrings.xml", data: ENC.encode(sstXml) },
    { name: "xl/worksheets/sheet1.xml", data: ENC.encode(wsXml) },
  ]);
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("readExcel — basic reading", () => {
  it("reads a simple 3-column sheet with numbers", () => {
    const buf = makeXlsx(
      ["a", "b", "c"],
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
    );
    const df = readExcel(buf);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect([...df.col("a").values]).toEqual([1, 4]);
    expect([...df.col("b").values]).toEqual([2, 5]);
    expect([...df.col("c").values]).toEqual([3, 6]);
  });

  it("reads string columns", () => {
    const buf = makeXlsx(
      ["name", "city"],
      [
        ["Alice", "New York"],
        ["Bob", "London"],
      ],
    );
    const df = readExcel(buf);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("city").values]).toEqual(["New York", "London"]);
  });

  it("reads boolean columns", () => {
    const buf = makeXlsx(
      ["flag", "val"],
      [
        [true, 1],
        [false, 2],
        [true, 3],
      ],
    );
    const df = readExcel(buf);
    expect([...df.col("flag").values]).toEqual([true, false, true]);
  });

  it("reads mixed-type columns as object dtype", () => {
    const buf = makeXlsx(["mixed"], [["hello"], [42], ["world"]]);
    const df = readExcel(buf);
    expect([...df.col("mixed").values]).toEqual(["hello", 42, "world"]);
  });

  it("handles null/empty cells", () => {
    const buf = makeXlsx(
      ["a", "b"],
      [
        [1, null],
        [null, 2],
      ],
    );
    const df = readExcel(buf);
    expect([...df.col("a").values]).toEqual([1, null]);
    expect([...df.col("b").values]).toEqual([null, 2]);
  });

  it("returns a DataFrame instance", () => {
    const buf = makeXlsx(["x"], [[1], [2]]);
    const df = readExcel(buf);
    expect(df).toBeInstanceOf(DataFrame);
  });
});

describe("readExcel — sheetName option", () => {
  it("sheetName: 0 returns the first sheet (default)", () => {
    const buf = makeXlsx(["x"], [[10], [20]]);
    const df0 = readExcel(buf, { sheetName: 0 });
    const dfDefault = readExcel(buf);
    expect([...df0.col("x").values]).toEqual([...dfDefault.col("x").values]);
  });

  it("sheetName: string finds sheet by name", () => {
    const buf = makeXlsx(["v"], [[99]], "MySheet");
    const df = readExcel(buf, { sheetName: "MySheet" });
    expect([...df.col("v").values]).toEqual([99]);
  });

  it("throws on invalid sheet name", () => {
    const buf = makeXlsx(["x"], [[1]]);
    expect(() => readExcel(buf, { sheetName: "NoSuch" })).toThrow();
  });

  it("throws on out-of-range sheet index", () => {
    const buf = makeXlsx(["x"], [[1]]);
    expect(() => readExcel(buf, { sheetName: 5 })).toThrow();
  });
});

describe("readExcel — header option", () => {
  it("header: null uses numeric column names", () => {
    const buf = makeXlsx(["a", "b"], [[1, 2]]);
    const df = readExcel(buf, { header: null });
    // With header: null, all rows are data — columns are "0", "1"
    expect([...df.columns.values]).toEqual(["0", "1"]);
    // Both rows become data rows
    expect(df.shape[0]).toBe(2);
  });

  it("header: 0 is the default", () => {
    const buf = makeXlsx(["name", "score"], [["Alice", 95]]);
    const df = readExcel(buf, { header: 0 });
    expect([...df.columns.values]).toEqual(["name", "score"]);
  });
});

describe("readExcel — indexCol option", () => {
  it("indexCol: string sets named column as row index", () => {
    const buf = makeXlsx(
      ["id", "val"],
      [
        ["a", 1],
        ["b", 2],
      ],
    );
    const df = readExcel(buf, { indexCol: "id" });
    expect(df.shape).toEqual([2, 1]);
    expect([...df.index.values]).toEqual(["a", "b"]);
    expect([...df.columns.values]).toEqual(["val"]);
  });

  it("indexCol: number sets column by position", () => {
    const buf = makeXlsx(
      ["k", "v"],
      [
        ["x", 10],
        ["y", 20],
      ],
    );
    const df = readExcel(buf, { indexCol: 0 });
    expect([...df.index.values]).toEqual(["x", "y"]);
    expect([...df.columns.values]).toEqual(["v"]);
  });
});

describe("readExcel — skipRows / nrows options", () => {
  it("skipRows skips leading data rows", () => {
    const buf = makeXlsx(["n"], [[1], [2], [3], [4]]);
    const df = readExcel(buf, { skipRows: 2 });
    expect([...df.col("n").values]).toEqual([3, 4]);
  });

  it("nrows limits the number of rows returned", () => {
    const buf = makeXlsx(["n"], [[1], [2], [3], [4]]);
    const df = readExcel(buf, { nrows: 2 });
    expect([...df.col("n").values]).toEqual([1, 2]);
  });

  it("skipRows + nrows combined", () => {
    const buf = makeXlsx(["n"], [[1], [2], [3], [4]]);
    const df = readExcel(buf, { skipRows: 1, nrows: 2 });
    expect([...df.col("n").values]).toEqual([2, 3]);
  });
});

describe("readExcel — naValues option", () => {
  it("treats empty string cells as null by default", () => {
    const buf = makeXlsx(["v"], [[""], [1]]);
    const df = readExcel(buf);
    expect(df.col("v").values[0]).toBeNull();
  });

  it("treats custom naValues strings as null", () => {
    const buf = makeXlsx(["v"], [["MISSING"], ["ok"]]);
    const df = readExcel(buf, { naValues: ["MISSING"] });
    expect(df.col("v").values[0]).toBeNull();
    expect(df.col("v").values[1]).toBe("ok");
  });
});

describe("readExcel — error cases", () => {
  it("throws on non-ZIP input", () => {
    const notZip = new Uint8Array([1, 2, 3, 4, 5]);
    expect(() => readExcel(notZip)).toThrow();
  });

  it("accepts ArrayBuffer input", () => {
    const buf = makeXlsx(["x"], [[42]]);
    const ab = buf.buffer;
    const df = readExcel(ab);
    expect([...df.col("x").values]).toEqual([42]);
  });
});

describe("xlsxSheetNames", () => {
  it("returns sheet names from workbook", () => {
    const buf = makeXlsx(["x"], [[1]], "DataSheet");
    const names = xlsxSheetNames(buf);
    expect(names).toEqual(["DataSheet"]);
  });

  it("returns empty array for invalid ZIP (no workbook)", () => {
    // Build a ZIP with no xl/workbook.xml
    const buf = buildStoredZip([{ name: "dummy.txt", data: ENC.encode("hello") }]);
    const names = xlsxSheetNames(buf);
    expect(names).toEqual([]);
  });

  it("accepts ArrayBuffer", () => {
    const buf = makeXlsx(["a"], [[1]]);
    const names = xlsxSheetNames(buf.buffer);
    expect(names).toEqual(["Sheet1"]);
  });
});

describe("readExcel — property-based tests", () => {
  it("round-trips numeric data: shape is preserved", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.array(
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
            minLength: 1,
            maxLength: 5,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (headers, rowsRaw) => {
          // Ensure all rows have same width as headers
          const width = headers.length;
          const rows = rowsRaw.map((r) =>
            Array.from({ length: width }, (_, i): CellValue => r[i] ?? 0),
          );
          const buf = makeXlsx(headers, rows);
          const df = readExcel(buf);
          expect(df.shape[0]).toBe(rows.length);
          expect(df.shape[1]).toBe(width);
        },
      ),
    );
  });

  it("xlsxSheetNames: returns non-empty array for valid XLSX", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (sheetName) => {
        const buf = makeXlsx(["x"], [[1]], sheetName);
        const names = xlsxSheetNames(buf);
        expect(names.length).toBe(1);
        expect(names[0]).toBe(sheetName);
      }),
    );
  });
});
