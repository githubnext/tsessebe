import { describe, expect, it } from "bun:test";
import { readOrc } from "../../src/io/read_orc.ts";
import type { OrcDecoder } from "../../src/io/read_orc.ts";

// ─── mock decoder ─────────────────────────────────────────────────────────────

function makeDecoder(records: Record<string, unknown>[]): OrcDecoder {
  return {
    decode(_buf: Uint8Array): unknown[] {
      return records;
    },
  };
}

// ─── readOrc ──────────────────────────────────────────────────────────────────

describe("readOrc", () => {
  it("decodes records into a DataFrame with injected decoder", async () => {
    const decoder = makeDecoder([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    const df = await readOrc(new Uint8Array(4), { decoder });
    expect(df.columns.values).toContain("name");
    expect(df.columns.values).toContain("age");
    expect(df.index.size).toBe(2);
    expect(df.col("name").values[0]).toBe("Alice");
    expect(df.col("age").values[1]).toBe(25);
  });

  it("returns empty DataFrame for zero records", async () => {
    const decoder = makeDecoder([]);
    const df = await readOrc(new Uint8Array(4), { decoder });
    expect(df.index.size).toBe(0);
  });

  it("filters columns with options.columns", async () => {
    const decoder = makeDecoder([{ a: 1, b: 2, c: 3 }]);
    const df = await readOrc(new Uint8Array(4), { decoder, columns: ["a", "c"] });
    expect(df.columns.values).toContain("a");
    expect(df.columns.values).toContain("c");
    expect(df.columns.values).not.toContain("b");
  });

  it("applies nrows limit", async () => {
    const decoder = makeDecoder([
      { x: 1 },
      { x: 2 },
      { x: 3 },
      { x: 4 },
    ]);
    const df = await readOrc(new Uint8Array(4), { decoder, nrows: 2 });
    expect(df.index.size).toBe(2);
    expect(df.col("x").values[0]).toBe(1);
    expect(df.col("x").values[1]).toBe(2);
  });

  it("throws TypeError when no decoder is available", async () => {
    const gt = globalThis as { __orcDecoder?: unknown };
    const original = gt.__orcDecoder;
    gt.__orcDecoder = undefined;
    await expect(readOrc(new Uint8Array(4))).rejects.toThrow(TypeError);
    gt.__orcDecoder = original;
  });

  it("columns option silently skips unknown columns", async () => {
    const decoder = makeDecoder([{ a: 1 }]);
    const df = await readOrc(new Uint8Array(4), { decoder, columns: ["a", "z"] });
    expect(df.columns.values).toContain("a");
    expect(df.columns.values).not.toContain("z");
  });
});
