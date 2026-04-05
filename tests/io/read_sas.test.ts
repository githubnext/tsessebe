import { describe, expect, test } from "bun:test";
import { readSas } from "../../src/index.ts";
import type { SasColumn, SasDecoder, SasResult } from "../../src/index.ts";

// ─── mock decoder ─────────────────────────────────────────────────────────────

function mockDecoder(result: SasResult): SasDecoder {
  return { decode: (): SasResult => result };
}

function makeColumns(): readonly SasColumn[] {
  return [
    { name: "id", type: "numeric", label: "Subject ID" },
    { name: "age", type: "numeric" },
    { name: "group", type: "character", format: "$8." },
  ];
}

function makeResult(): SasResult {
  return {
    columns: makeColumns(),
    rows: [
      [1, 25, "A"],
      [2, 30, "B"],
      [3, 22, "A"],
    ],
  };
}

// ─── basic decode ─────────────────────────────────────────────────────────────

describe("readSas basic", () => {
  test("decodes all columns and rows", async () => {
    const df = await readSas(new Uint8Array(4), { decoder: mockDecoder(makeResult()) });
    expect(df.shape).toEqual([3, 3]);
    expect(df.columns.values).toEqual(["id", "age", "group"]);
  });

  test("column values are correct", async () => {
    const df = await readSas(new Uint8Array(4), { decoder: mockDecoder(makeResult()) });
    expect(df.col("id")?.values).toEqual([1, 2, 3]);
    expect(df.col("group")?.values).toEqual(["A", "B", "A"]);
  });

  test("throws without decoder", async () => {
    await expect(readSas(new Uint8Array(4))).rejects.toThrow(TypeError);
  });
});

// ─── options ──────────────────────────────────────────────────────────────────

describe("readSas options", () => {
  test("nrows limits rows", async () => {
    const df = await readSas(new Uint8Array(4), { decoder: mockDecoder(makeResult()), nrows: 2 });
    expect(df.shape[0]).toBe(2);
  });

  test("columns filter", async () => {
    const df = await readSas(new Uint8Array(4), {
      decoder: mockDecoder(makeResult()),
      columns: ["id", "age"],
    });
    expect(df.columns.values).toEqual(["id", "age"]);
    expect(df.columns.values.includes("group")).toBe(false);
  });

  test("empty result returns empty DataFrame", async () => {
    const emptyResult: SasResult = { columns: [], rows: [] };
    const df = await readSas(new Uint8Array(4), { decoder: mockDecoder(emptyResult) });
    expect(df.shape).toEqual([0, 0]);
  });

  test("null values become null in DataFrame", async () => {
    const result: SasResult = {
      columns: [{ name: "val", type: "numeric" }],
      rows: [[1], [null], [3]],
    };
    const df = await readSas(new Uint8Array(4), { decoder: mockDecoder(result) });
    expect(df.col("val")?.values[1]).toBeNull();
  });
});

// ─── format hint ──────────────────────────────────────────────────────────────

describe("readSas format", () => {
  test("passes format to decoder", async () => {
    let capturedFormat: "sas7bdat" | "xport" | undefined;
    const decoder: SasDecoder = {
      decode: (_buf, fmt) => {
        capturedFormat = fmt;
        return makeResult();
      },
    };
    await readSas(new Uint8Array(4), { decoder, format: "xport" });
    expect(capturedFormat).toBe("xport");
  });

  test("defaults to sas7bdat", async () => {
    let capturedFormat: "sas7bdat" | "xport" | undefined;
    const decoder: SasDecoder = {
      decode: (_buf, fmt) => {
        capturedFormat = fmt;
        return makeResult();
      },
    };
    await readSas(new Uint8Array(4), { decoder });
    expect(capturedFormat).toBe("sas7bdat");
  });
});
