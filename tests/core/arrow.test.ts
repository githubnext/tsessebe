import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, fromArrow, toArrow } from "../../src/index.ts";
import type { ArrowTableDecoder, ArrowTableEncoder } from "../../src/index.ts";

// ─── mock decoder ─────────────────────────────────────────────────────────────

function mockDecoder(records: Record<string, unknown>[]): ArrowTableDecoder {
  return { decode: (): unknown[] => records };
}

function mockEncoder(): { encoder: ArrowTableEncoder; captured: Record<string, unknown>[][] } {
  const captured: Record<string, unknown>[][] = [];
  const encoder: ArrowTableEncoder = {
    encode: (recs) => {
      captured.push([...recs] as Record<string, unknown>[]);
      return new Uint8Array(8);
    },
  };
  return { encoder, captured };
}

// ─── fromArrow ────────────────────────────────────────────────────────────────

describe("fromArrow", () => {
  test("decodes records to DataFrame", async () => {
    const records = [
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ];
    const df = await fromArrow(new Uint8Array(4), { decoder: mockDecoder(records) });
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("a")?.values).toEqual([1, 2]);
    expect(df.col("b")?.values).toEqual(["x", "y"]);
  });

  test("throws without decoder", async () => {
    await expect(fromArrow(new Uint8Array(4))).rejects.toThrow(TypeError);
  });

  test("nrows limit", async () => {
    const records = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const df = await fromArrow(new Uint8Array(4), { decoder: mockDecoder(records), nrows: 2 });
    expect(df.shape[0]).toBe(2);
  });

  test("columns filter", async () => {
    const records = [{ a: 1, b: 2, c: 3 }];
    const df = await fromArrow(new Uint8Array(4), {
      decoder: mockDecoder(records),
      columns: ["a", "c"],
    });
    expect(df.columns.values).toEqual(["a", "c"]);
  });

  test("empty records returns empty DataFrame", async () => {
    const df = await fromArrow(new Uint8Array(4), { decoder: mockDecoder([]) });
    expect(df.shape).toEqual([0, 0]);
  });

  test("null values are preserved", async () => {
    const df = await fromArrow(new Uint8Array(4), {
      decoder: mockDecoder([{ v: null }, { v: 42 }]),
    });
    expect(df.col("v")?.values[0]).toBeNull();
  });
});

// ─── toArrow ──────────────────────────────────────────────────────────────────

describe("toArrow", () => {
  test("throws without encoder", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => toArrow(df)).toThrow(TypeError);
  });

  test("passes records to encoder", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const { encoder, captured } = mockEncoder();
    toArrow(df, { encoder });
    expect(captured.length).toBe(1);
    expect(captured[0]?.length).toBe(2);
    expect(captured[0]?.[0]).toMatchObject({ a: 1, b: "x" });
  });

  test("returns Uint8Array", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const { encoder } = mockEncoder();
    const result = toArrow(df, { encoder });
    expect(result).toBeInstanceOf(Uint8Array);
  });

  test("columns filter", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2], c: [3] });
    const { encoder, captured } = mockEncoder();
    toArrow(df, { encoder, columns: ["a", "c"] });
    const rec = captured[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(rec ?? {})).toEqual(["a", "c"]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("fromArrow property", () => {
  test("row count matches records length", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ a: fc.float({ noNaN: true }), b: fc.string() }), { maxLength: 100 }),
        async (records) => {
          const df = await fromArrow(new Uint8Array(4), { decoder: mockDecoder(records) });
          expect(df.shape[0]).toBe(records.length);
        },
      ),
    );
  });
});
