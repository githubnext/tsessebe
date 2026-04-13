/**
 * Tests for src/stats/format_ops.ts
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/index.ts";
import { Series } from "../../src/core/index.ts";
import {
  applyDataFrameFormatter,
  applySeriesFormatter,
  dataFrameToString,
  formatCompact,
  formatCurrency,
  formatEngineering,
  formatFloat,
  formatPercent,
  formatScientific,
  formatThousands,
  makeCurrencyFormatter,
  makeFloatFormatter,
  makePercentFormatter,
  seriesToString,
} from "../../src/stats/format_ops.ts";

// ─── formatFloat ──────────────────────────────────────────────────────────────

describe("formatFloat", () => {
  test("default 2 decimal places", () => {
    expect(formatFloat(3.14159)).toBe("3.14");
  });

  test("0 decimal places", () => {
    expect(formatFloat(3.7, 0)).toBe("4");
  });

  test("4 decimal places", () => {
    expect(formatFloat(1.23456789, 4)).toBe("1.2346");
  });

  test("negative number", () => {
    expect(formatFloat(-2.5, 1)).toBe("-2.5");
  });

  test("zero", () => {
    expect(formatFloat(0, 3)).toBe("0.000");
  });

  test("Infinity", () => {
    expect(formatFloat(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatFloat(Number.NaN)).toBe("NaN");
  });

  test("property: result is a string", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        return typeof formatFloat(n) === "string";
      }),
    );
  });

  test("property: contains correct number of decimal places", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e15, max: 1e15 }),
        fc.integer({ min: 0, max: 6 }),
        (n, d) => {
          const result = formatFloat(n, d);
          if (d === 0) {
            return !result.includes(".");
          }
          const parts = result.split(".");
          return parts.length === 2 && (parts[1]?.length ?? 0) === d;
        },
      ),
    );
  });
});

// ─── formatPercent ────────────────────────────────────────────────────────────

describe("formatPercent", () => {
  test("basic percentage", () => {
    expect(formatPercent(0.1234, 1)).toBe("12.3%");
  });

  test("100%", () => {
    expect(formatPercent(1.0, 0)).toBe("100%");
  });

  test("0%", () => {
    expect(formatPercent(0, 2)).toBe("0.00%");
  });

  test("negative", () => {
    expect(formatPercent(-0.05, 1)).toBe("-5.0%");
  });

  test("Infinity", () => {
    expect(formatPercent(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatPercent(Number.NaN)).toBe("NaN");
  });

  test("ends with %", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        return formatPercent(n).endsWith("%");
      }),
    );
  });
});

// ─── formatScientific ─────────────────────────────────────────────────────────

describe("formatScientific", () => {
  test("large number", () => {
    // toExponential(3) → "1.235e+4"
    expect(formatScientific(12345.678, 3)).toBe("1.235e+4");
  });

  test("small number", () => {
    expect(formatScientific(0.00123, 2)).toBe("1.23e-3");
  });

  test("Infinity", () => {
    expect(formatScientific(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatScientific(Number.NaN)).toBe("NaN");
  });

  test("property: contains e", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: 1e-100, max: 1e100 }), (n) => {
        return formatScientific(n).includes("e");
      }),
    );
  });
});

// ─── formatEngineering ───────────────────────────────────────────────────────

describe("formatEngineering", () => {
  test("kilo range", () => {
    const result = formatEngineering(12345.678, 3);
    expect(result).toBe("12.346e+3");
  });

  test("mega range", () => {
    expect(formatEngineering(1_000_000, 1)).toBe("1.0e+6");
  });

  test("milli range", () => {
    expect(formatEngineering(0.001, 2)).toBe("1.00e-3");
  });

  test("zero", () => {
    expect(formatEngineering(0, 2)).toBe("0.00e+0");
  });

  test("negative", () => {
    expect(formatEngineering(-1200, 1)).toBe("-1.2e+3");
  });

  test("Infinity", () => {
    expect(formatEngineering(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatEngineering(Number.NaN)).toBe("NaN");
  });

  test("property: exponent is multiple of 3", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 1e-9, max: 1e9 }),
        (n) => {
          if (n === 0) return true;
          const result = formatEngineering(n);
          const match = result.match(/e([+-])(\d+)$/);
          if (!match) return false;
          const exp = Number(match[2]);
          return exp % 3 === 0;
        },
      ),
    );
  });
});

// ─── formatThousands ─────────────────────────────────────────────────────────

describe("formatThousands", () => {
  test("basic", () => {
    expect(formatThousands(1234567.89, 2)).toBe("1,234,567.89");
  });

  test("no decimals", () => {
    expect(formatThousands(1000000, 0)).toBe("1,000,000");
  });

  test("small number", () => {
    expect(formatThousands(123, 2)).toBe("123.00");
  });

  test("negative", () => {
    expect(formatThousands(-1234.5, 1)).toBe("-1,234.5");
  });

  test("custom separator", () => {
    expect(formatThousands(1234567, 0, ".")).toBe("1.234.567");
  });

  test("Infinity", () => {
    expect(formatThousands(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatThousands(Number.NaN)).toBe("NaN");
  });
});

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  test("dollar", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  test("euro symbol", () => {
    expect(formatCurrency(9876.54, "€", 2)).toBe("€9,876.54");
  });

  test("negative", () => {
    expect(formatCurrency(-500.0, "$", 2)).toBe("-$500.00");
  });

  test("zero", () => {
    expect(formatCurrency(0, "$", 2)).toBe("$0.00");
  });

  test("Infinity", () => {
    expect(formatCurrency(Infinity)).toBe("$Infinity");
  });

  test("NaN", () => {
    expect(formatCurrency(Number.NaN)).toBe("$NaN");
  });
});

// ─── formatCompact ────────────────────────────────────────────────────────────

describe("formatCompact", () => {
  test("trillions", () => {
    expect(formatCompact(1_234_567_890_000, 2)).toBe("1.23T");
  });

  test("billions", () => {
    expect(formatCompact(2_500_000_000, 1)).toBe("2.5B");
  });

  test("millions", () => {
    expect(formatCompact(1_234_567, 2)).toBe("1.23M");
  });

  test("thousands", () => {
    expect(formatCompact(9876, 1)).toBe("9.9K");
  });

  test("small number", () => {
    expect(formatCompact(123.45, 2)).toBe("123.45");
  });

  test("zero", () => {
    expect(formatCompact(0, 2)).toBe("0.00");
  });

  test("negative millions", () => {
    expect(formatCompact(-2_000_000, 1)).toBe("-2.0M");
  });

  test("Infinity", () => {
    expect(formatCompact(Infinity)).toBe("Infinity");
  });

  test("NaN", () => {
    expect(formatCompact(Number.NaN)).toBe("NaN");
  });
});

// ─── formatter factories ──────────────────────────────────────────────────────

describe("makeFloatFormatter", () => {
  test("basic usage", () => {
    const fmt = makeFloatFormatter(3);
    expect(fmt(3.14159)).toBe("3.142");
  });

  test("non-numeric value", () => {
    const fmt = makeFloatFormatter(2);
    expect(fmt("hello")).toBe("hello");
  });

  test("null value", () => {
    const fmt = makeFloatFormatter(2);
    expect(fmt(null)).toBe("");
  });

  test("property: numeric values formatted correctly", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 4 }),
        (n, d) => {
          const fmt = makeFloatFormatter(d);
          return fmt(n) === formatFloat(n, d);
        },
      ),
    );
  });
});

describe("makePercentFormatter", () => {
  test("basic usage", () => {
    const fmt = makePercentFormatter(1);
    expect(fmt(0.1234)).toBe("12.3%");
  });

  test("non-numeric value", () => {
    const fmt = makePercentFormatter(2);
    expect(fmt("N/A")).toBe("N/A");
  });

  test("null value", () => {
    const fmt = makePercentFormatter(2);
    expect(fmt(null)).toBe("");
  });
});

describe("makeCurrencyFormatter", () => {
  test("dollar default", () => {
    const fmt = makeCurrencyFormatter();
    expect(fmt(1000)).toBe("$1,000.00");
  });

  test("euro", () => {
    const fmt = makeCurrencyFormatter("€", 2);
    expect(fmt(999.99)).toBe("€999.99");
  });

  test("non-numeric", () => {
    const fmt = makeCurrencyFormatter("$");
    expect(fmt("N/A")).toBe("N/A");
  });

  test("null value", () => {
    const fmt = makeCurrencyFormatter("$");
    expect(fmt(null)).toBe("");
  });
});

// ─── applySeriesFormatter ────────────────────────────────────────────────────

describe("applySeriesFormatter", () => {
  test("applies formatter to each element", () => {
    const s = new Series<number>({ data: [0.1, 0.2, 0.3] });
    const result = applySeriesFormatter(s, makePercentFormatter(0));
    expect(result.values[0]).toBe("10%");
    expect(result.values[1]).toBe("20%");
    expect(result.values[2]).toBe("30%");
  });

  test("preserves index", () => {
    const s = new Series<number>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = applySeriesFormatter(s, makeFloatFormatter(1));
    expect(result.index.at(0)).toBe("a");
    expect(result.index.at(1)).toBe("b");
    expect(result.index.at(2)).toBe("c");
  });

  test("preserves name", () => {
    const s = new Series<number>({ data: [1.5, 2.5], name: "price" });
    const result = applySeriesFormatter(s, makeFloatFormatter(2));
    expect(result.name).toBe("price");
  });

  test("result dtype is string", () => {
    const s = new Series<number>({ data: [1, 2, 3] });
    const result = applySeriesFormatter(s, makeFloatFormatter(2));
    expect(result.dtype.name).toBe("string");
  });

  test("empty series", () => {
    const s = new Series<number>({ data: [] });
    const result = applySeriesFormatter(s, makeFloatFormatter(2));
    expect(result.size).toBe(0);
  });

  test("property: output size matches input size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1 }),
        (vals) => {
          const s = new Series<number>({ data: vals });
          const result = applySeriesFormatter(s, makeFloatFormatter(2));
          return result.size === s.size;
        },
      ),
    );
  });
});

// ─── applyDataFrameFormatter ─────────────────────────────────────────────────

describe("applyDataFrameFormatter", () => {
  test("applies formatters to matching columns", () => {
    const df = DataFrame.fromColumns({
      price: [10.1, 20.2, 30.3],
      pct: [0.1, 0.2, 0.3],
    });
    const result = applyDataFrameFormatter(df, {
      price: makeCurrencyFormatter("$", 1),
      pct: makePercentFormatter(0),
    });
    expect(result["price"]).toEqual(["$10.1", "$20.2", "$30.3"]);
    expect(result["pct"]).toEqual(["10%", "20%", "30%"]);
  });

  test("uses String for columns without a formatter", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const result = applyDataFrameFormatter(df, {});
    expect(result["a"]).toEqual(["1", "2"]);
    expect(result["b"]).toEqual(["x", "y"]);
  });

  test("returns all columns", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4], z: [5, 6] });
    const result = applyDataFrameFormatter(df, { x: makeFloatFormatter(1) });
    expect(Object.keys(result).sort()).toEqual(["x", "y", "z"]);
  });

  test("empty dataframe", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const result = applyDataFrameFormatter(df, {});
    expect(result["a"]).toEqual([]);
    expect(result["b"]).toEqual([]);
  });
});

// ─── seriesToString ──────────────────────────────────────────────────────────

describe("seriesToString", () => {
  test("basic output", () => {
    const s = new Series<number>({ data: [1, 2, 3], name: "x" });
    const out = seriesToString(s);
    expect(out).toContain("1");
    expect(out).toContain("2");
    expect(out).toContain("3");
    expect(out).toContain("Name: x");
    expect(out).toContain("dtype:");
  });

  test("no name when null", () => {
    const s = new Series<number>({ data: [1, 2] });
    const out = seriesToString(s);
    expect(out).not.toContain("Name:");
    expect(out).toContain("dtype:");
  });

  test("custom formatter", () => {
    const s = new Series<number>({ data: [0.1, 0.2] });
    const out = seriesToString(s, { formatter: makePercentFormatter(0) });
    expect(out).toContain("10%");
    expect(out).toContain("20%");
  });

  test("truncates when maxRows exceeded", () => {
    const data = Array.from({ length: 100 }, (_, i) => i);
    const s = new Series<number>({ data });
    const out = seriesToString(s, { maxRows: 5 });
    expect(out).toContain("...");
    expect(out.split("\n").length).toBeLessThan(20);
  });

  test("empty series", () => {
    const s = new Series<number>({ data: [] });
    const out = seriesToString(s);
    expect(out).toContain("dtype:");
  });

  test("returns a string", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1 }),
        (vals) => {
          const s = new Series<number>({ data: vals });
          return typeof seriesToString(s) === "string";
        },
      ),
    );
  });
});

// ─── dataFrameToString ───────────────────────────────────────────────────────

describe("dataFrameToString", () => {
  test("basic output contains column names", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const out = dataFrameToString(df);
    expect(out).toContain("a");
    expect(out).toContain("b");
    expect(out).toContain("1");
    expect(out).toContain("x");
  });

  test("truncates rows with ...", () => {
    const df = DataFrame.fromColumns({
      val: Array.from({ length: 100 }, (_, i) => i),
    });
    const out = dataFrameToString(df, { maxRows: 10 });
    expect(out).toContain("...");
  });

  test("truncates cols with row x col footer", () => {
    const cols: Record<string, number[]> = {};
    for (let i = 0; i < 30; i++) {
      cols[`col${i}`] = [1, 2];
    }
    const df = DataFrame.fromColumns(cols);
    const out = dataFrameToString(df, { maxCols: 5 });
    expect(out).toContain("rows × 30 columns");
  });

  test("custom formatters applied", () => {
    const df = DataFrame.fromColumns({ price: [1.5, 2.5] });
    const out = dataFrameToString(df, {
      formatters: { price: makeCurrencyFormatter("$", 2) },
    });
    expect(out).toContain("$1.50");
    expect(out).toContain("$2.50");
  });

  test("empty dataframe", () => {
    const df = DataFrame.fromColumns({ a: [], b: [] });
    const out = dataFrameToString(df);
    expect(typeof out).toBe("string");
    expect(out).toContain("a");
    expect(out).toContain("b");
  });

  test("returns a string", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 20 }),
        (vals) => {
          const df = DataFrame.fromColumns({ x: vals, y: vals });
          return typeof dataFrameToString(df) === "string";
        },
      ),
    );
  });
});
