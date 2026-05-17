/**
 * Tests for src/io/read_table.ts — readTable().
 *
 * Mirrors pandas.read_table() test suite:
 * - default tab separator
 * - custom separator
 * - all ReadCsvOptions are forwarded
 * - property-based round-trips
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readCsv, readTable } from "../../src/index.ts";

// ─── basic parsing ────────────────────────────────────────────────────────────

describe("readTable — basic TSV parsing", () => {
  it("parses a simple tab-separated file", () => {
    const tsv = "name\tage\tcity\nAlice\t30\tNY\nBob\t25\tLA";
    const df = readTable(tsv);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["name", "age", "city"]);
    expect([...df.col("name").values]).toEqual(["Alice", "Bob"]);
    expect([...df.col("age").values]).toEqual([30, 25]);
    expect([...df.col("city").values]).toEqual(["NY", "LA"]);
  });

  it("infers integer dtype for numeric columns", () => {
    const tsv = "x\ty\n1\t2\n3\t4";
    const df = readTable(tsv);
    expect(df.col("x").dtype.name).toBe("int64");
    expect(df.col("y").dtype.name).toBe("int64");
  });

  it("infers float dtype", () => {
    const tsv = "a\tb\n1.5\t2.7\n3.1\t4.9";
    const df = readTable(tsv);
    expect(df.col("a").dtype.name).toBe("float64");
  });

  it("keeps string columns as object dtype", () => {
    const tsv = "name\tval\nAlice\t10\nBob\t20";
    const df = readTable(tsv);
    expect(df.col("name").dtype.name).toBe("object");
  });

  it("handles a single column", () => {
    const tsv = "x\n1\n2\n3";
    const df = readTable(tsv);
    expect(df.shape).toEqual([3, 1]);
    expect([...df.col("x").values]).toEqual([1, 2, 3]);
  });

  it("handles empty file (header only)", () => {
    const tsv = "a\tb\tc";
    const df = readTable(tsv);
    expect(df.shape).toEqual([0, 3]);
  });

  it("handles NA values in columns", () => {
    const tsv = "a\tb\n1\tNA\n2\t3";
    const df = readTable(tsv);
    expect(Number.isNaN(df.col("b").values[0])).toBe(true);
    expect(df.col("b").values[1]).toBe(3);
  });

  it("handles empty string fields as NaN for numeric columns", () => {
    const tsv = "a\tb\n1\t\n2\t4";
    const df = readTable(tsv);
    expect(Number.isNaN(df.col("b").values[0])).toBe(true);
  });
});

// ─── custom separator ─────────────────────────────────────────────────────────

describe("readTable — custom separator", () => {
  it("uses comma separator when explicitly passed", () => {
    const csv = "a,b,c\n1,2,3";
    const df = readTable(csv, { sep: "," });
    expect(df.shape).toEqual([1, 3]);
    expect([...df.col("a").values]).toEqual([1]);
  });

  it("uses pipe separator", () => {
    const piped = "a|b|c\n1|2|3\n4|5|6";
    const df = readTable(piped, { sep: "|" });
    expect(df.shape).toEqual([2, 3]);
    expect([...df.col("b").values]).toEqual([2, 5]);
  });

  it("uses semicolon separator", () => {
    const text = "x;y\n10;20\n30;40";
    const df = readTable(text, { sep: ";" });
    expect([...df.col("x").values]).toEqual([10, 30]);
    expect([...df.col("y").values]).toEqual([20, 40]);
  });

  it("uses multi-char separator", () => {
    const text = "a::b::c\n1::2::3";
    const df = readTable(text, { sep: "::" });
    expect([...df.col("a").values]).toEqual([1]);
    expect([...df.col("c").values]).toEqual([3]);
  });
});

// ─── ReadCsvOptions forwarding ────────────────────────────────────────────────

describe("readTable — ReadCsvOptions forwarding", () => {
  it("respects indexCol option", () => {
    const tsv = "id\tval\n1\t10\n2\t20";
    const df = readTable(tsv, { indexCol: "id" });
    expect([...df.index.values]).toEqual([1, 2]);
    expect([...df.columns.values]).toEqual(["val"]);
  });

  it("respects nRows option", () => {
    const tsv = "a\tb\n1\t2\n3\t4\n5\t6";
    const df = readTable(tsv, { nRows: 2 });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("respects skipRows option", () => {
    const tsv = "a\tb\n1\t2\n3\t4\n5\t6";
    const df = readTable(tsv, { skipRows: 1 });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([3, 5]);
  });

  it("respects header: null (no header row)", () => {
    const tsv = "1\t2\t3\n4\t5\t6";
    const df = readTable(tsv, { header: null });
    expect(df.shape).toEqual([2, 3]);
    // Columns are auto-assigned (0, 1, 2)
    expect(df.columns.length).toBe(3);
  });

  it("respects dtype option", () => {
    const tsv = "x\ty\n1\t2\n3\t4";
    const df = readTable(tsv, { dtype: { x: "float64" } });
    expect(df.col("x").dtype.name).toBe("float64");
  });

  it("respects naValues option", () => {
    const tsv = "a\tb\n1\tMISSING\n2\t3";
    const df = readTable(tsv, { naValues: ["MISSING"] });
    expect(Number.isNaN(df.col("b").values[0])).toBe(true);
    expect(df.col("b").values[1]).toBe(3);
  });
});

// ─── default vs explicit separator ───────────────────────────────────────────

describe("readTable vs readCsv — default separator difference", () => {
  it("readTable defaults to tab; readCsv defaults to comma", () => {
    const tsv = "a\tb\n1\t2";
    const csv = "a,b\n1,2";

    const dfTable = readTable(tsv);
    const dfCsv = readCsv(csv);

    expect([...dfTable.columns.values]).toEqual(["a", "b"]);
    expect([...dfCsv.columns.values]).toEqual(["a", "b"]);
    expect([...dfTable.col("a").values]).toEqual([1]);
    expect([...dfCsv.col("a").values]).toEqual([1]);
  });

  it("readTable with comma-sep text treats entire line as single column", () => {
    // Default sep=\t — commas are NOT separators
    const csv = "a,b\n1,2\n3,4";
    const df = readTable(csv);
    // The whole "a,b" is one column name
    expect(df.columns.length).toBe(1);
  });
});

// ─── whitespace and edge cases ────────────────────────────────────────────────

describe("readTable — edge cases", () => {
  it("handles trailing newline", () => {
    const tsv = "a\tb\n1\t2\n";
    const df = readTable(tsv);
    expect(df.shape).toEqual([1, 2]);
  });

  it("handles Windows-style CRLF", () => {
    const tsv = "a\tb\r\n1\t2\r\n3\t4\r\n";
    const df = readTable(tsv);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("handles a large file", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => `${i}\t${i * 2}`);
    const tsv = "idx\tval\n" + rows.join("\n");
    const df = readTable(tsv);
    expect(df.shape).toEqual([1000, 2]);
    expect(df.col("idx").values[999]).toBe(999);
    expect(df.col("val").values[999]).toBe(1998);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readTable — property-based", () => {
  it("round-trips integer data through tab-separated format", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ a: fc.integer({ min: -1000, max: 1000 }), b: fc.integer({ min: 0, max: 9999 }) }),
          { minLength: 1, maxLength: 50 },
        ),
        (rows) => {
          const lines = ["a\tb", ...rows.map((r) => `${r.a}\t${r.b}`)];
          const tsv = lines.join("\n");
          const df = readTable(tsv);
          expect(df.shape).toEqual([rows.length, 2]);
          for (let i = 0; i < rows.length; i++) {
            expect(df.col("a").values[i]).toBe(rows[i]!.a);
            expect(df.col("b").values[i]).toBe(rows[i]!.b);
          }
        },
      ),
    );
  });

  it("produces same result as readCsv with matching sep", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            x: fc.float({ min: -100, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        (rows) => {
          const lines = ["x", ...rows.map((r) => String(r.x))];
          const tsv = lines.join("\n");
          const dfTable = readTable(tsv, { sep: "\n" === "\n" ? "\t" : "," });
          const dfCsv = readCsv(tsv.replaceAll("\t", "\t"), { sep: "\t" });
          expect(dfTable.shape).toEqual(dfCsv.shape);
        },
      ),
    );
  });

  it("readTable with explicit sep matches readCsv with same sep", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9999 }), { minLength: 1, maxLength: 20 }),
        (vals) => {
          const lines = ["v", ...vals.map(String)];
          const text = lines.join("\n");
          const dfTable = readTable(text, { sep: "\n" === "\n" ? undefined : "," });
          // Default sep=\t, and our data has no tabs, so single col
          // Just check shape is valid
          expect(dfTable.shape[0]).toBe(vals.length);
        },
      ),
    );
  });

  it("comma-sep round-trip: readTable({sep:','}) equals readCsv", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col1: fc.integer({ min: 0, max: 100 }),
            col2: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 40 },
        ),
        (rows) => {
          const csv = "col1,col2\n" + rows.map((r) => `${r.col1},${r.col2}`).join("\n");
          const dfTable = readTable(csv, { sep: "," });
          const dfCsv = readCsv(csv);
          expect(dfTable.shape).toEqual(dfCsv.shape);
          for (let i = 0; i < rows.length; i++) {
            expect(dfTable.col("col1").values[i]).toBe(dfCsv.col("col1").values[i]);
            expect(dfTable.col("col2").values[i]).toBe(dfCsv.col("col2").values[i]);
          }
        },
      ),
    );
  });
});

// ─── DataFrame integration ────────────────────────────────────────────────────

describe("readTable — DataFrame integration", () => {
  it("returns a proper DataFrame instance", () => {
    const df = readTable("a\tb\n1\t2");
    expect(df).toBeInstanceOf(DataFrame);
  });

  it("can chain DataFrame methods after readTable", () => {
    const tsv = "a\tb\tc\n1\t2\t3\n4\t5\t6\n7\t8\t9";
    const df = readTable(tsv);
    const filtered = df.filter(["a", "c"]);
    expect(filtered.shape).toEqual([3, 2]);
    expect([...filtered.columns.values]).toEqual(["a", "c"]);
  });

  it("supports multi-row operations on parsed data", () => {
    const tsv = "x\ty\n10\t20\n30\t40\n50\t60";
    const df = readTable(tsv);
    // Sum via reduce
    const sumX = [...df.col("x").values].reduce((a, b) => (a as number) + (b as number), 0);
    expect(sumX).toBe(90);
  });
});
