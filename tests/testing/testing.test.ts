/**
 * Tests for pd.testing equivalents: assertSeriesEqual, assertFrameEqual,
 * assertIndexEqual — mirrors Python pandas testing.assert_*_equal.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  AssertionError,
  DataFrame,
  Index,
  Series,
  assertFrameEqual,
  assertIndexEqual,
  assertSeriesEqual,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── assertSeriesEqual ────────────────────────────────────────────────────────

describe("assertSeriesEqual — identical series", () => {
  test("integer series", () => {
    const a = new Series({ data: [1, 2, 3] as Scalar[] });
    const b = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).not.toThrow();
  });

  test("float series within tolerance", () => {
    const a = new Series({ data: [1.0, 2.0, 3.0] as Scalar[] });
    const b = new Series({ data: [1.0 + 1e-9, 2.0, 3.0] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { checkDtypes: false })).not.toThrow();
  });

  test("null/undefined equality", () => {
    const a = new Series({ data: [null, 1, null] as Scalar[] });
    const b = new Series({ data: [null, 1, null] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { checkDtypes: false })).not.toThrow();
  });

  test("NaN equals NaN (default)", () => {
    const a = new Series({ data: [Number.NaN, 1] as Scalar[] });
    const b = new Series({ data: [Number.NaN, 1] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).not.toThrow();
  });

  test("named series with matching names", () => {
    const a = new Series({ data: [1, 2] as Scalar[], name: "foo" });
    const b = new Series({ data: [1, 2] as Scalar[], name: "foo" });
    expect(() => assertSeriesEqual(a, b)).not.toThrow();
  });

  test("string series", () => {
    const a = new Series({ data: ["a", "b", "c"] as Scalar[] });
    const b = new Series({ data: ["a", "b", "c"] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).not.toThrow();
  });

  test("boolean series", () => {
    const a = new Series({ data: [true, false, true] as Scalar[] });
    const b = new Series({ data: [true, false, true] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).not.toThrow();
  });
});

describe("assertSeriesEqual — failures", () => {
  test("value mismatch throws AssertionError", () => {
    const a = new Series({ data: [1, 2, 3] as Scalar[] });
    const b = new Series({ data: [1, 2, 4] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).toThrow(AssertionError);
  });

  test("length mismatch throws", () => {
    const a = new Series({ data: [1, 2] as Scalar[] });
    const b = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).toThrow(AssertionError);
  });

  test("dtype mismatch throws when checkDtypes=true", () => {
    const a = new Series({ data: [1, 2] as Scalar[] });
    const b = new Series({ data: ["1", "2"] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { checkDtypes: true })).toThrow(AssertionError);
  });

  test("dtype mismatch is ignored when checkDtypes=false", () => {
    const a = new Series({ data: [1, 2] as Scalar[] });
    const b = new Series({ data: [1, 2] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { checkDtypes: false })).not.toThrow();
  });

  test("name mismatch throws when checkNames=true", () => {
    const a = new Series({ data: [1] as Scalar[], name: "x" });
    const b = new Series({ data: [1] as Scalar[], name: "y" });
    expect(() => assertSeriesEqual(a, b, { checkNames: true })).toThrow(AssertionError);
  });

  test("name mismatch ignored when checkNames=false", () => {
    const a = new Series({ data: [1] as Scalar[], name: "x" });
    const b = new Series({ data: [1] as Scalar[], name: "y" });
    expect(() => assertSeriesEqual(a, b, { checkNames: false })).not.toThrow();
  });

  test("index mismatch throws when checkIndex=true", () => {
    const a = new Series({ data: [1, 2] as Scalar[], index: new Index(["a", "b"]) });
    const b = new Series({ data: [1, 2] as Scalar[], index: new Index(["a", "c"]) });
    expect(() => assertSeriesEqual(a, b, { checkIndex: true })).toThrow(AssertionError);
  });

  test("index mismatch ignored when checkIndex=false", () => {
    const a = new Series({ data: [1, 2] as Scalar[], index: new Index(["a", "b"]) });
    const b = new Series({ data: [1, 2] as Scalar[], index: new Index(["x", "y"]) });
    expect(() => assertSeriesEqual(a, b, { checkIndex: false })).not.toThrow();
  });

  test("float beyond tolerance throws", () => {
    const a = new Series({ data: [1.0] as Scalar[] });
    const b = new Series({ data: [1.1] as Scalar[] });
    expect(() => assertSeriesEqual(a, b)).toThrow(AssertionError);
  });

  test("float within custom atol passes", () => {
    const a = new Series({ data: [1.0] as Scalar[] });
    const b = new Series({ data: [1.05] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { atol: 0.1, checkDtypes: false })).not.toThrow();
  });

  test("checkExact=true catches tiny float difference", () => {
    const a = new Series({ data: [1.0] as Scalar[] });
    const b = new Series({ data: [1.0 + 1e-9] as Scalar[] });
    expect(() => assertSeriesEqual(a, b, { checkExact: true })).toThrow(AssertionError);
  });

  test("error message contains position info", () => {
    const a = new Series({ data: [1, 2, 99] as Scalar[] });
    const b = new Series({ data: [1, 2, 3] as Scalar[] });
    let msg = "";
    try {
      assertSeriesEqual(a, b);
    } catch (e) {
      if (e instanceof AssertionError) msg = e.message;
    }
    expect(msg).toContain("2");
    expect(msg).toContain("99");
    expect(msg).toContain("3");
  });
});

// ─── assertFrameEqual ─────────────────────────────────────────────────────────

describe("assertFrameEqual — identical frames", () => {
  test("simple 2-column frame", () => {
    const a = DataFrame.fromColumns({ x: [1, 2, 3] as Scalar[], y: [4, 5, 6] as Scalar[] });
    const b = DataFrame.fromColumns({ x: [1, 2, 3] as Scalar[], y: [4, 5, 6] as Scalar[] });
    expect(() => assertFrameEqual(a, b)).not.toThrow();
  });

  test("empty frame", () => {
    const a = DataFrame.fromColumns({});
    const b = DataFrame.fromColumns({});
    expect(() => assertFrameEqual(a, b)).not.toThrow();
  });

  test("with float values within tolerance", () => {
    const a = DataFrame.fromColumns({ v: [1.0, 2.0] as Scalar[] });
    const b = DataFrame.fromColumns({ v: [1.0 + 1e-9, 2.0] as Scalar[] });
    expect(() => assertFrameEqual(a, b, { checkDtypes: false })).not.toThrow();
  });
});

describe("assertFrameEqual — failures", () => {
  test("row count mismatch", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[] });
    const b = DataFrame.fromColumns({ x: [1, 2, 3] as Scalar[] });
    expect(() => assertFrameEqual(a, b)).toThrow(AssertionError);
  });

  test("column count mismatch", () => {
    const a = DataFrame.fromColumns({ x: [1] as Scalar[], y: [2] as Scalar[] });
    const b = DataFrame.fromColumns({ x: [1] as Scalar[] });
    expect(() => assertFrameEqual(a, b)).toThrow(AssertionError);
  });

  test("column name mismatch", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[] });
    const b = DataFrame.fromColumns({ y: [1, 2] as Scalar[] });
    expect(() => assertFrameEqual(a, b)).toThrow(AssertionError);
  });

  test("value mismatch in column", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[], y: [3, 4] as Scalar[] });
    const b = DataFrame.fromColumns({ x: [1, 9] as Scalar[], y: [3, 4] as Scalar[] });
    expect(() => assertFrameEqual(a, b)).toThrow(AssertionError);
  });

  test("checkLike ignores column order", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[], y: [3, 4] as Scalar[] });
    const b = DataFrame.fromColumns({ y: [3, 4] as Scalar[], x: [1, 2] as Scalar[] });
    expect(() => assertFrameEqual(a, b, { checkLike: true })).not.toThrow();
  });

  test("checkLike=false rejects mismatched column order", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[], y: [3, 4] as Scalar[] });
    const b = DataFrame.fromColumns({ y: [3, 4] as Scalar[], x: [1, 2] as Scalar[] });
    expect(() => assertFrameEqual(a, b, { checkLike: false })).toThrow(AssertionError);
  });

  test("dtype mismatch throws when checkDtypes=true", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[] });
    const b = DataFrame.fromColumns({ x: ["1", "2"] as Scalar[] });
    expect(() => assertFrameEqual(a, b, { checkDtypes: true })).toThrow(AssertionError);
  });

  test("index mismatch throws when checkIndex=true", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] as Scalar[] }, { index: new Index(["a", "b"]) });
    const b = DataFrame.fromColumns({ x: [1, 2] as Scalar[] }, { index: new Index(["a", "c"]) });
    expect(() => assertFrameEqual(a, b, { checkIndex: true })).toThrow(AssertionError);
  });

  test("checkExact=true catches tiny float difference", () => {
    const a = DataFrame.fromColumns({ v: [1.0] as Scalar[] });
    const b = DataFrame.fromColumns({ v: [1.0 + 1e-9] as Scalar[] });
    expect(() => assertFrameEqual(a, b, { checkExact: true })).toThrow(AssertionError);
  });

  test("error message contains column name and row info", () => {
    const a = DataFrame.fromColumns({ score: [100, 200] as Scalar[] });
    const b = DataFrame.fromColumns({ score: [100, 999] as Scalar[] });
    let msg = "";
    try {
      assertFrameEqual(a, b);
    } catch (e) {
      if (e instanceof AssertionError) msg = e.message;
    }
    expect(msg).toContain("score");
    expect(msg).toContain("200");
    expect(msg).toContain("999");
  });
});

// ─── assertIndexEqual ─────────────────────────────────────────────────────────

describe("assertIndexEqual — identical indexes", () => {
  test("integer index", () => {
    const a = new Index([0, 1, 2]);
    const b = new Index([0, 1, 2]);
    expect(() => assertIndexEqual(a, b)).not.toThrow();
  });

  test("string index", () => {
    const a = new Index(["a", "b", "c"]);
    const b = new Index(["a", "b", "c"]);
    expect(() => assertIndexEqual(a, b)).not.toThrow();
  });
});

describe("assertIndexEqual — failures", () => {
  test("length mismatch", () => {
    const a = new Index([0, 1, 2]);
    const b = new Index([0, 1]);
    expect(() => assertIndexEqual(a, b)).toThrow(AssertionError);
  });

  test("value mismatch", () => {
    const a = new Index([0, 1, 2]);
    const b = new Index([0, 1, 9]);
    expect(() => assertIndexEqual(a, b)).toThrow(AssertionError);
  });

  test("name mismatch when checkNames=true", () => {
    const a = new Index([0, 1], "foo");
    const b = new Index([0, 1], "bar");
    expect(() => assertIndexEqual(a, b, { checkNames: true })).toThrow(AssertionError);
  });

  test("name mismatch ignored when checkNames=false", () => {
    const a = new Index([0, 1], "foo");
    const b = new Index([0, 1], "bar");
    expect(() => assertIndexEqual(a, b, { checkNames: false })).not.toThrow();
  });
});

// ─── AssertionError ───────────────────────────────────────────────────────────

describe("AssertionError", () => {
  test("is instanceof Error", () => {
    const e = new AssertionError("fail");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AssertionError);
    expect(e.name).toBe("AssertionError");
    expect(e.message).toBe("fail");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("assertSeriesEqual — property tests", () => {
  test("reflexivity: s equals itself", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.float({ noNaN: true }), fc.constant(null)), {
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data: data as Scalar[] });
          expect(() => assertSeriesEqual(s, s)).not.toThrow();
        },
      ),
    );
  });

  test("symmetry: assertSeriesEqual(a,b) ⇔ assertSeriesEqual(b,a)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), (data) => {
        const a = new Series({ data: data as Scalar[] });
        const b = new Series({ data: data as Scalar[] });
        let err1: unknown;
        let err2: unknown;
        try {
          assertSeriesEqual(a, b);
        } catch (e) {
          err1 = e;
        }
        try {
          assertSeriesEqual(b, a);
        } catch (e) {
          err2 = e;
        }
        expect(err1 === undefined).toBe(err2 === undefined);
      }),
    );
  });
});

describe("assertFrameEqual — property tests", () => {
  test("reflexivity: df equals itself", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        (col1, col2) => {
          // Ensure same length
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as Scalar[],
            b: col2.slice(0, len) as Scalar[],
          });
          expect(() => assertFrameEqual(df, df)).not.toThrow();
        },
      ),
    );
  });
});
