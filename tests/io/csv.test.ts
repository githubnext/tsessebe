/**
 * Tests for src/io/csv.ts — readCsv() and toCsv().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readCsv, toCsv } from "../../src/index.ts";

// ─── readCsv: basic parsing ───────────────────────────────────────────────────

describe("readCsv — basic parsing", () => {
  it("parses a simple 3-column CSV", () => {
    const df = readCsv("a,b,c\n1,2,3\n4,5,6");
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect([...df.col("a").values]).toEqual([1, 4]);
    expect([...df.col("b").values]).toEqual([2, 5]);
    expect([...df.col("c").values]).toEqual([3, 6]);
  });

  it("infers integer dtype", () => {
    const df = readCsv("x\n10\n20\n30");
    expect(df.col("x").dtype.name).toBe("int64");
    expect([...df.col("x").values]).toEqual([10, 20, 30]);
  });

  it("infers float dtype", () => {
    const df = readCsv("x\n1.5\n2.5");
    expect(df.col("x").dtype.name).toBe("float64");
    expect([...df.col("x").values]).toEqual([1.5, 2.5]);
  });

  it("infers float dtype for scientific notation", () => {
    const df = readCsv("x\n1e3\n2.5e-1");
    expect(df.col("x").dtype.name).toBe("float64");
    expect([...df.col("x").values]).toEqual([1000, 0.25]);
  });

  it("infers boolean dtype", () => {
    const df = readCsv("flag\ntrue\nfalse\nTrue");
    expect(df.col("flag").dtype.name).toBe("bool");
    expect([...df.col("flag").values]).toEqual([true, false, true]);
  });

  it("infers string dtype for mixed content", () => {
    const df = readCsv("name\nalice\nbob");
    expect(df.col("name").dtype.name).toBe("string");
    expect([...df.col("name").values]).toEqual(["alice", "bob"]);
  });

  it("handles CRLF line endings", () => {
    const df = readCsv("a,b\r\n1,2\r\n3,4");
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("handles CR-only line endings", () => {
    const df = readCsv("a,b\r1,2\r3,4");
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("returns empty DataFrame for whitespace-only string", () => {
    const df = readCsv("");
    expect(df.shape).toEqual([0, 0]);
  });

  it("returns empty-row DataFrame when only header present", () => {
    const df = readCsv("a,b,c");
    expect(df.shape).toEqual([0, 3]);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
  });

  it("handles single-column CSV", () => {
    const df = readCsv("v\n10\n20");
    expect(df.shape).toEqual([2, 1]);
    expect([...df.col("v").values]).toEqual([10, 20]);
  });

  it("handles negative integers", () => {
    const df = readCsv("x\n-1\n-2\n3");
    expect(df.col("x").dtype.name).toBe("int64");
    expect([...df.col("x").values]).toEqual([-1, -2, 3]);
  });
});

// ─── readCsv: NA handling ─────────────────────────────────────────────────────

describe("readCsv — NA handling", () => {
  it("treats empty fields as null", () => {
    const df = readCsv("a,b\n1,\n,3");
    expect(df.col("a").values[1]).toBeNull();
    expect(df.col("b").values[0]).toBeNull();
  });

  it("treats 'NA' as null", () => {
    const df = readCsv("x\n1\nNA\n3");
    expect(df.col("x").values[1]).toBeNull();
  });

  it("treats 'NaN' as null", () => {
    const df = readCsv("x\n1.0\nNaN\n3.0");
    expect(df.col("x").values[1]).toBeNull();
  });

  it("treats 'null' and 'None' as null", () => {
    const df = readCsv("x\nnull\nNone");
    expect(df.col("x").values[0]).toBeNull();
    expect(df.col("x").values[1]).toBeNull();
  });

  it("treats custom naValues as null", () => {
    const df = readCsv("x\n1\nMISSING\n3", { naValues: ["MISSING"] });
    expect(df.col("x").values[1]).toBeNull();
  });

  it("all-NA column gets object dtype", () => {
    const df = readCsv("x\nNA\nNA");
    expect(df.col("x").dtype.name).toBe("object");
  });
});

// ─── readCsv: quoted fields ───────────────────────────────────────────────────

describe("readCsv — quoted fields", () => {
  it("handles a field containing the separator inside quotes", () => {
    const df = readCsv('name,note\n"Smith, Jr.",hello');
    expect(df.col("name").values[0]).toBe("Smith, Jr.");
    expect(df.col("note").values[0]).toBe("hello");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const df = readCsv('q\n"say ""hi"""');
    expect(df.col("q").values[0]).toBe('say "hi"');
  });

  it("handles quoted strings with spaces", () => {
    const df = readCsv('a,b\n"hello world",2');
    expect(df.col("a").values[0]).toBe("hello world");
    expect(df.col("b").values[0]).toBe(2);
  });
});

// ─── readCsv: options ─────────────────────────────────────────────────────────

describe("readCsv — options", () => {
  it("respects custom sep (semicolon)", () => {
    const df = readCsv("a;b;c\n1;2;3", { sep: ";" });
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect(df.col("a").values[0]).toBe(1);
  });

  it("respects tab separator", () => {
    const df = readCsv("a\tb\n1\t2", { sep: "\t" });
    expect([...df.columns.values]).toEqual(["a", "b"]);
    expect(df.col("a").values[0]).toBe(1);
  });

  it("generates numeric column names when header=null", () => {
    const df = readCsv("1,2,3\n4,5,6", { header: null });
    expect([...df.columns.values]).toEqual(["0", "1", "2"]);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.col("0").values]).toEqual([1, 4]);
  });

  it("forces dtype when dtype option provided", () => {
    const df = readCsv("x\n1\n2\n3", { dtype: { x: "float64" } });
    expect(df.col("x").dtype.name).toBe("float64");
    expect(df.col("x").values[0]).toBe(1.0);
  });

  it("respects nRows limit", () => {
    const df = readCsv("a\n1\n2\n3\n4\n5", { nRows: 3 });
    expect(df.shape).toEqual([3, 1]);
    expect([...df.col("a").values]).toEqual([1, 2, 3]);
  });

  it("respects skipRows", () => {
    const df = readCsv("a\n1\n2\n3", { skipRows: 1 });
    expect(df.shape).toEqual([2, 1]);
    expect([...df.col("a").values]).toEqual([2, 3]);
  });

  it("uses indexCol by name to set row index", () => {
    const df = readCsv("id,val\na,10\nb,20", { indexCol: "id" });
    expect([...df.columns.values]).toEqual(["val"]);
    expect([...df.index.values]).toEqual(["a", "b"]);
  });

  it("uses indexCol by position to set row index", () => {
    const df = readCsv("id,val\na,10\nb,20", { indexCol: 0 });
    expect([...df.columns.values]).toEqual(["val"]);
    expect([...df.index.values]).toEqual(["a", "b"]);
  });
});

// ─── toCsv: basic serialization ───────────────────────────────────────────────

describe("toCsv — basic serialization", () => {
  it("serializes a simple DataFrame with header and index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df);
    const lines = csv.split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toBe(",a,b");
    expect(lines[1]).toBe("0,1,3");
    expect(lines[2]).toBe("1,2,4");
  });

  it("omits index when index=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df, { index: false });
    const lines = csv.split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toBe("a,b");
    expect(lines[1]).toBe("1,3");
    expect(lines[2]).toBe("2,4");
  });

  it("omits header when header=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const csv = toCsv(df, { header: false, index: false });
    const lines = csv.split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toBe("1");
    expect(lines[1]).toBe("2");
  });

  it("uses custom separator", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const csv = toCsv(df, { sep: ";", index: false });
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("a;b");
    expect(lines[1]).toBe("1;2");
  });

  it("uses naRep for null values", () => {
    const df = DataFrame.fromColumns({ x: [1, null, 3] });
    const csv = toCsv(df, { index: false, naRep: "NA" });
    const lines = csv.split("\n").filter((l) => l.length > 0);
    expect(lines[1]).toBe("NA");
  });

  it("quotes fields that contain the separator", () => {
    const df = DataFrame.fromColumns({ name: ["Smith, Jr."] });
    const csv = toCsv(df, { index: false });
    expect(csv).toContain('"Smith, Jr."');
  });

  it("uses custom lineterminator", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const csv = toCsv(df, { index: false, lineterminator: "\r\n" });
    expect(csv).toContain("\r\n");
  });

  it("returns empty string for no-column DataFrame with no header", () => {
    const df = DataFrame.fromColumns({});
    const csv = toCsv(df, { index: false, header: false });
    expect(csv).toBe("");
  });

  it("CSV ends with a newline", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const csv = toCsv(df, { index: false });
    expect(csv.endsWith("\n")).toBe(true);
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("readCsv / toCsv — round-trip", () => {
  it("round-trips a numeric DataFrame", () => {
    const original = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] });
    const csv = toCsv(original, { index: false });
    const restored = readCsv(csv);
    expect([...restored.col("x").values]).toEqual([1, 2, 3]);
    expect([...restored.col("y").values]).toEqual([4, 5, 6]);
  });

  it("round-trips a float DataFrame", () => {
    const original = DataFrame.fromColumns({ x: [1.5, 2.5, 3.5] });
    const csv = toCsv(original, { index: false });
    const restored = readCsv(csv);
    expect([...restored.col("x").values]).toEqual([1.5, 2.5, 3.5]);
  });

  it("round-trips a string DataFrame", () => {
    const original = DataFrame.fromColumns({ name: ["alice", "bob"] });
    const csv = toCsv(original, { index: false });
    const restored = readCsv(csv);
    expect([...restored.col("name").values]).toEqual(["alice", "bob"]);
  });

  it("round-trips a boolean DataFrame", () => {
    const original = DataFrame.fromColumns({ flag: [true, false, true] });
    const csv = toCsv(original, { index: false });
    const restored = readCsv(csv);
    expect([...restored.col("flag").values]).toEqual([true, false, true]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("readCsv — property tests", () => {
  it("never throws on arbitrary text input", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        readCsv(text);
        return true;
      }),
    );
  });

  it("shape rows matches number of data lines", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 999 }),
            fc.integer({ min: 0, max: 999 }),
          ),
          { minLength: 1, maxLength: 20 },
        ),
        (dataRows) => {
          const lines = dataRows.map(([a, b]) => `${a},${b}`).join("\n");
          const csv = `col1,col2\n${lines}`;
          const df = readCsv(csv);
          return df.shape[0] === dataRows.length;
        },
      ),
    );
  });

  it("toCsv always ends with newline for non-empty DataFrames", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (nums) => {
          const df = DataFrame.fromColumns({ v: nums });
          const csv = toCsv(df, { index: false });
          return csv.endsWith("\n");
        },
      ),
    );
  });
});
