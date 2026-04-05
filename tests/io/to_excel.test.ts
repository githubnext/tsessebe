/**
 * Tests for Excel writer.
 */
import { describe, expect, it } from "bun:test";
import { DataFrame, Series, seriesToExcel, toExcel } from "../../src/index.ts";

describe("toExcel", () => {
  it("returns a Uint8Array", () => {
    const df = DataFrame.fromRecords([{ a: 1, b: "hello" }]);
    const bytes = toExcel(df);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
  });

  it("starts with PK zip signature", () => {
    const df = DataFrame.fromRecords([{ x: 1 }]);
    const bytes = toExcel(df);
    // PK = 0x50 0x4B
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("produces larger output for larger DataFrames", () => {
    const records = Array.from({ length: 100 }, (_, i) => ({ id: i, val: i * 2 }));
    const df = DataFrame.fromRecords(records);
    const bytes = toExcel(df);
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("accepts custom sheet name", () => {
    const df = DataFrame.fromRecords([{ a: 1 }]);
    const bytes = toExcel(df, { sheetName: "MySheet" });
    expect(bytes).toBeInstanceOf(Uint8Array);
  });

  it("includes index column when requested", () => {
    const df = DataFrame.fromRecords([{ a: 1, b: 2 }]);
    const withIndex = toExcel(df, { index: true });
    const withoutIndex = toExcel(df, { index: false });
    // With index should produce a bit different (more) content
    expect(withIndex.length).toBeGreaterThanOrEqual(withoutIndex.length);
  });
});

describe("seriesToExcel", () => {
  it("returns a Uint8Array", () => {
    const s = new Series({ data: [1, 2, 3], name: "values" });
    const bytes = seriesToExcel(s);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x50);
  });

  it("handles empty series", () => {
    const s = new Series({ data: [], name: "empty" });
    const bytes = seriesToExcel(s);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });
});
