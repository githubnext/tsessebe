/**
 * Tests for src/stats/select_dtypes.ts — selectDtypes().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, selectDtypes } from "../../src/index.ts";
import type { DtypeSpecifier } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const RE_INCLUDE_EXCLUDE = /include and exclude/;

function makeDF(): DataFrame {
  return DataFrame.fromColumns({
    i32: [1, 2, 3],
    f64: [1.1, 2.2, 3.3],
    flag: [true, false, true],
    label: ["a", "b", "c"],
  });
}

// ─── basic include / exclude ──────────────────────────────────────────────────

describe("selectDtypes — include", () => {
  it("include number keeps int and float columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["number"] });
    expect([...out.columns.values].sort()).toEqual(["f64", "i32"].sort());
  });

  it("include integer keeps only int columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["integer"] });
    expect([...out.columns.values]).toEqual(["i32"]);
  });

  it("include floating keeps only float columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["floating"] });
    expect([...out.columns.values]).toEqual(["f64"]);
  });

  it("include bool keeps only bool columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["bool"] });
    expect([...out.columns.values]).toEqual(["flag"]);
  });

  it("include string keeps only string columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["string"] });
    expect([...out.columns.values]).toEqual(["label"]);
  });

  it("include exact dtype name", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["int64"] });
    // int columns inferred as int64 by default
    expect([...out.columns.values]).toEqual(["i32"]);
  });

  it("include multiple aliases", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["bool", "string"] });
    expect([...out.columns.values].sort()).toEqual(["flag", "label"].sort());
  });

  it("include with no match returns empty DataFrame", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["datetime"] });
    expect(out.columns.size).toBe(0);
  });
});

describe("selectDtypes — exclude", () => {
  it("exclude number removes int and float columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { exclude: ["number"] });
    expect([...out.columns.values].sort()).toEqual(["flag", "label"].sort());
  });

  it("exclude string removes string columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { exclude: ["string"] });
    expect([...out.columns.values].sort()).toEqual(["f64", "flag", "i32"].sort());
  });

  it("exclude everything returns empty DataFrame", () => {
    const df = makeDF();
    const out = selectDtypes(df, { exclude: ["number", "bool", "string"] });
    expect(out.columns.size).toBe(0);
  });
});

describe("selectDtypes — include + exclude", () => {
  it("number include + float exclude keeps only int columns", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["number"], exclude: ["floating"] });
    expect([...out.columns.values]).toEqual(["i32"]);
  });
});

describe("selectDtypes — edge cases", () => {
  it("no options returns the original DataFrame unchanged", () => {
    const df = makeDF();
    const out = selectDtypes(df);
    expect(out.columns.size).toBe(df.columns.size);
  });

  it("empty include/exclude arrays returns the original DataFrame unchanged", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: [], exclude: [] });
    expect(out.columns.size).toBe(df.columns.size);
  });

  it("throws when same specifier in both include and exclude", () => {
    const df = makeDF();
    expect(() => selectDtypes(df, { include: ["number"], exclude: ["number"] })).toThrow(
      RE_INCLUDE_EXCLUDE,
    );
  });

  it("preserves row index of the original DataFrame", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["number"] });
    expect(out.shape[0]).toBe(df.shape[0]);
  });

  it("result columns have correct dtypes", () => {
    const df = makeDF();
    const out = selectDtypes(df, { include: ["number"] });
    for (const col of out.columns.values) {
      expect(out.col(col).dtype.isNumeric).toBe(true);
    }
  });

  it("signed alias keeps only signed int columns", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3],
      b: [1.5, 2.5, 3.5],
    });
    const out = selectDtypes(df, { include: ["signed"] });
    expect([...out.columns.values]).toEqual(["a"]);
  });
});

describe("selectDtypes — datetime / category columns", () => {
  it("include datetime keeps only datetime columns", () => {
    const dates: Date[] = [new Date("2024-01-01"), new Date("2024-06-01"), new Date("2024-12-31")];
    const df = DataFrame.fromColumns({
      ts: dates,
      val: [1, 2, 3],
    });
    const out = selectDtypes(df, { include: ["datetime"] });
    expect([...out.columns.values]).toEqual(["ts"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("selectDtypes — property tests", () => {
  it("include subset never increases column count", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DtypeSpecifier>("number", "integer", "floating", "bool", "string"),
        (alias) => {
          const df = makeDF();
          const out = selectDtypes(df, { include: [alias] });
          return out.columns.size <= df.columns.size;
        },
      ),
    );
  });

  it("exclude subset never increases column count", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DtypeSpecifier>("number", "integer", "floating", "bool", "string"),
        (alias) => {
          const df = makeDF();
          const out = selectDtypes(df, { exclude: [alias] });
          return out.columns.size <= df.columns.size;
        },
      ),
    );
  });

  it("include(X) + exclude(X) always gives empty DataFrame for single-kind DFs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
        (vals) => {
          const df = DataFrame.fromColumns({ a: vals });
          const out = selectDtypes(df, { include: ["number"], exclude: ["integer"] });
          return out.columns.size === 0;
        },
      ),
    );
  });
});
