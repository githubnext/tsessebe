import { describe, expect, it } from "bun:test";
import { readFeather, toFeather } from "../../src/io/read_feather.ts";
import type { ArrowDecoder, ArrowEncoder } from "../../src/io/read_feather.ts";
import { DataFrame } from "../../src/index.ts";

// ─── mock decoder / encoder ───────────────────────────────────────────────────

function makeDecoder(records: Record<string, unknown>[]): ArrowDecoder {
  return {
    decode(_buf: Uint8Array): unknown[] {
      return records;
    },
  };
}

function makeEncoder(): ArrowEncoder & { captured: Record<string, unknown>[] } {
  const enc = {
    captured: [] as Record<string, unknown>[],
    encode(records: Record<string, unknown>[]): Uint8Array {
      enc.captured = records;
      return new Uint8Array([0, 1, 2, 3]);
    },
  };
  return enc;
}

// ─── readFeather ──────────────────────────────────────────────────────────────

describe("readFeather", () => {
  it("decodes records into a DataFrame", async () => {
    const decoder = makeDecoder([
      { city: "NYC", pop: 8336817 },
      { city: "LA", pop: 3979576 },
    ]);
    const df = await readFeather(new Uint8Array(8), { decoder });
    expect(df.index.size).toBe(2);
    expect(df.col("city").values[0]).toBe("NYC");
    expect(df.col("pop").values[1]).toBe(3979576);
  });

  it("returns empty DataFrame for zero records", async () => {
    const decoder = makeDecoder([]);
    const df = await readFeather(new Uint8Array(4), { decoder });
    expect(df.index.size).toBe(0);
  });

  it("filters columns", async () => {
    const decoder = makeDecoder([{ a: 1, b: 2, c: 3 }]);
    const df = await readFeather(new Uint8Array(4), { decoder, columns: ["a", "b"] });
    expect(df.columns.values).toContain("a");
    expect(df.columns.values).toContain("b");
    expect(df.columns.values).not.toContain("c");
  });

  it("applies nrows limit", async () => {
    const decoder = makeDecoder([{ v: 10 }, { v: 20 }, { v: 30 }]);
    const df = await readFeather(new Uint8Array(4), { decoder, nrows: 1 });
    expect(df.index.size).toBe(1);
    expect(df.col("v").values[0]).toBe(10);
  });

  it("throws TypeError without a decoder", async () => {
    const gt = globalThis as { __arrowDecoder?: unknown };
    const orig = gt.__arrowDecoder;
    gt.__arrowDecoder = undefined;
    await expect(readFeather(new Uint8Array(4))).rejects.toThrow(TypeError);
    gt.__arrowDecoder = orig;
  });
});

// ─── toFeather ────────────────────────────────────────────────────────────────

describe("toFeather", () => {
  it("encodes a DataFrame into bytes", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: ["a", "b", "c"] });
    const encoder = makeEncoder();
    const bytes = toFeather(df, { encoder });
    expect(bytes.length).toBeGreaterThan(0);
    expect(encoder.captured.length).toBe(3);
    expect(encoder.captured[0]).toEqual({ x: 1, y: "a" });
    expect(encoder.captured[2]).toEqual({ x: 3, y: "c" });
  });

  it("encodes an empty DataFrame into bytes", () => {
    const df = DataFrame.fromColumns({});
    const encoder = makeEncoder();
    const bytes = toFeather(df, { encoder });
    expect(bytes.length).toBeGreaterThanOrEqual(0);
    expect(encoder.captured.length).toBe(0);
  });

  it("throws TypeError without an encoder", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const gt = globalThis as { __arrowEncoder?: unknown };
    const orig = gt.__arrowEncoder;
    gt.__arrowEncoder = undefined;
    expect(() => toFeather(df)).toThrow(TypeError);
    gt.__arrowEncoder = orig;
  });

  it("roundtrips: toFeather → readFeather recovers the same data", async () => {
    const original = DataFrame.fromColumns({ a: [10, 20], b: ["x", "y"] });
    const encoder = makeEncoder();
    const bytes = toFeather(original, { encoder });

    const decoder = makeDecoder(encoder.captured);
    const recovered = await readFeather(bytes, { decoder });
    expect(recovered.col("a").values).toEqual([10, 20]);
    expect(recovered.col("b").values).toEqual(["x", "y"]);
  });
});
