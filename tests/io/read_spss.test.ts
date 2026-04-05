import { describe, expect, test } from "bun:test";
import { readSpss } from "../../src/index.ts";
import type { SpssDecoder, SpssResult, SpssVariable } from "../../src/index.ts";

// ─── mock decoder ─────────────────────────────────────────────────────────────

function mockDecoder(result: SpssResult): SpssDecoder {
  return { decode: (): SpssResult => result };
}

function makeVariables(): readonly SpssVariable[] {
  return [
    { name: "id", label: "Subject ID", measureLevel: "scale" },
    {
      name: "gender",
      label: "Gender",
      measureLevel: "nominal",
      valueLabels: { "1": "Male", "2": "Female" },
    },
    { name: "score", label: "Test Score", measureLevel: "scale" },
  ];
}

function makeResult(): SpssResult {
  return {
    variables: makeVariables(),
    rows: [
      [1, 1, 85],
      [2, 2, 92],
      [3, 1, 78],
    ],
    meta: { creation_date: "2024-01-01", software: "IBM SPSS Statistics 29" },
  };
}

// ─── basic decode ─────────────────────────────────────────────────────────────

describe("readSpss basic", () => {
  test("decodes all variables and rows", async () => {
    const df = await readSpss(new Uint8Array(4), { decoder: mockDecoder(makeResult()) });
    expect(df.shape).toEqual([3, 3]);
    expect(df.columns.values).toEqual(["id", "gender", "score"]);
  });

  test("raw numeric codes preserved by default", async () => {
    const df = await readSpss(new Uint8Array(4), { decoder: mockDecoder(makeResult()) });
    expect(df.col("gender")?.values).toEqual([1, 2, 1]);
  });

  test("throws without decoder", async () => {
    await expect(readSpss(new Uint8Array(4))).rejects.toThrow(TypeError);
  });
});

// ─── value labels ─────────────────────────────────────────────────────────────

describe("readSpss applyValueLabels", () => {
  test("applies labels when flag is true", async () => {
    const df = await readSpss(new Uint8Array(4), {
      decoder: mockDecoder(makeResult()),
      applyValueLabels: true,
    });
    expect(df.col("gender")?.values).toEqual(["Male", "Female", "Male"]);
  });

  test("does not apply labels when flag is false", async () => {
    const df = await readSpss(new Uint8Array(4), {
      decoder: mockDecoder(makeResult()),
      applyValueLabels: false,
    });
    expect(df.col("gender")?.values).toEqual([1, 2, 1]);
  });

  test("columns without labels are unaffected", async () => {
    const df = await readSpss(new Uint8Array(4), {
      decoder: mockDecoder(makeResult()),
      applyValueLabels: true,
    });
    expect(df.col("score")?.values).toEqual([85, 92, 78]);
  });
});

// ─── options ──────────────────────────────────────────────────────────────────

describe("readSpss options", () => {
  test("nrows limits rows", async () => {
    const df = await readSpss(new Uint8Array(4), { decoder: mockDecoder(makeResult()), nrows: 1 });
    expect(df.shape[0]).toBe(1);
  });

  test("columns filter", async () => {
    const df = await readSpss(new Uint8Array(4), {
      decoder: mockDecoder(makeResult()),
      columns: ["id", "score"],
    });
    expect(df.columns.values).toEqual(["id", "score"]);
  });

  test("empty result returns empty DataFrame", async () => {
    const df = await readSpss(new Uint8Array(4), {
      decoder: mockDecoder({ variables: [], rows: [] }),
    });
    expect(df.shape).toEqual([0, 0]);
  });

  test("null values become null in DataFrame", async () => {
    const result: SpssResult = {
      variables: [{ name: "x" }],
      rows: [[1], [null], [3]],
    };
    const df = await readSpss(new Uint8Array(4), { decoder: mockDecoder(result) });
    expect(df.col("x")?.values[1]).toBeNull();
  });
});
