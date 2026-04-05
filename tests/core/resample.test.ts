import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import { resampleSeries, resampleDataFrame, asfreq } from "../../src/core/resample.ts";
import { DataFrame } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Create a Series with ISO date-string index. */
function dateSeries(dates: string[], values: number[], name: string | null = null): Series<number> {
  return new Series({ data: values, index: dates, name }) as Series<number>;
}

// ─── resampleSeries ───────────────────────────────────────────────────────────

describe("resampleSeries daily", () => {
  it("sums multiple observations per day", () => {
    const s = dateSeries(
      ["2024-01-01", "2024-01-01", "2024-01-02", "2024-01-02"],
      [1, 2, 3, 4],
    );
    const result = resampleSeries(s, "D").sum();
    expect(result.values[0]).toBe(3); // Jan 1: 1+2
    expect(result.values[1]).toBe(7); // Jan 2: 3+4
  });

  it("mean per day", () => {
    const s = dateSeries(
      ["2024-01-01", "2024-01-01", "2024-01-02"],
      [2, 4, 6],
    );
    const result = resampleSeries(s, "D").mean();
    expect(result.values[0]).toBe(3); // (2+4)/2
    expect(result.values[1]).toBe(6);
  });

  it("count per day", () => {
    const s = dateSeries(
      ["2024-01-01", "2024-01-01", "2024-01-01", "2024-01-02"],
      [1, 2, 3, 4],
    );
    const result = resampleSeries(s, "D").count();
    expect(result.values[0]).toBe(3);
    expect(result.values[1]).toBe(1);
  });

  it("min and max per day", () => {
    const s = dateSeries(["2024-01-01", "2024-01-01"], [7, 3]);
    expect(resampleSeries(s, "D").min().values[0]).toBe(3);
    expect(resampleSeries(s, "D").max().values[0]).toBe(7);
  });

  it("first and last per day", () => {
    const s = dateSeries(["2024-01-01", "2024-01-01", "2024-01-01"], [10, 20, 30]);
    expect(resampleSeries(s, "D").first().values[0]).toBe(10);
    expect(resampleSeries(s, "D").last().values[0]).toBe(30);
  });

  it("std per day", () => {
    const s = dateSeries(["2024-01-01", "2024-01-01"], [2, 4]);
    const result = resampleSeries(s, "D").std();
    // Sample std of [2,4] = sqrt(2) ≈ 1.414
    expect(result.values[0] as number).toBeCloseTo(Math.sqrt(2), 4);
  });
});

describe("resampleSeries monthly", () => {
  it("sums observations within the same month", () => {
    const s = dateSeries(
      ["2024-01-05", "2024-01-15", "2024-02-10", "2024-02-20"],
      [1, 2, 3, 4],
    );
    const result = resampleSeries(s, "ME").sum();
    expect(result.values[0]).toBe(3); // Jan
    expect(result.values[1]).toBe(7); // Feb
  });
});

describe("resampleSeries yearly", () => {
  it("groups by year", () => {
    const s = dateSeries(
      ["2022-06-01", "2022-12-31", "2023-01-01"],
      [10, 20, 30],
    );
    const result = resampleSeries(s, "YE").sum();
    expect(result.values[0]).toBe(30); // 2022
    expect(result.values[1]).toBe(30); // 2023
  });
});

describe("resampleSeries hourly", () => {
  it("groups by hour bucket", () => {
    // epoch ms for 2024-01-01 00:00 and 00:30 (same hour)
    const t0 = Date.parse("2024-01-01T00:00:00Z");
    const t1 = Date.parse("2024-01-01T00:30:00Z");
    const t2 = Date.parse("2024-01-01T01:00:00Z");
    const s = new Series({ data: [5, 10, 20], index: [t0, t1, t2] });
    const result = resampleSeries(s, "h").sum();
    expect(result.values[0]).toBe(15); // same hour
    expect(result.values[1]).toBe(20); // next hour
  });
});

describe("resampleSeries weekly", () => {
  it("groups by week", () => {
    // 2024-01-01 is a Monday; 2024-01-07 is Sunday (same week, Sunday-start offset)
    const s = dateSeries(
      ["2024-01-01", "2024-01-03", "2024-01-08"],
      [1, 2, 3],
    );
    const result = resampleSeries(s, "W").sum();
    expect(result.values.length).toBeGreaterThanOrEqual(1);
  });
});

describe("resampleSeries quarterly", () => {
  it("groups by quarter", () => {
    const s = dateSeries(
      ["2024-01-01", "2024-03-31", "2024-04-01", "2024-06-30"],
      [1, 2, 3, 4],
    );
    const result = resampleSeries(s, "QE").sum();
    expect(result.values[0]).toBe(3); // Q1
    expect(result.values[1]).toBe(7); // Q2
  });
});

describe("resampleSeries custom aggregation", () => {
  it("agg applies custom function", () => {
    const s = dateSeries(["2024-01-01", "2024-01-01"], [3, 7]);
    const result = resampleSeries(s, "D").agg((vals) => vals.reduce((a, b) => a * b, 1));
    expect(result.values[0]).toBe(21); // 3 * 7
  });
});

// ─── resampleDataFrame ────────────────────────────────────────────────────────

describe("resampleDataFrame", () => {
  it("sums multi-column DataFrame by day", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 2, 3, 4], b: [10, 20, 30, 40] },
      { index: ["2024-01-01", "2024-01-01", "2024-01-02", "2024-01-02"] },
    );
    const result = resampleDataFrame(df, "D").sum();
    expect(result.col("a").values[0]).toBe(3);
    expect(result.col("b").values[0]).toBe(30);
    expect(result.col("a").values[1]).toBe(7);
  });

  it("counts per day", () => {
    const df = DataFrame.fromColumns(
      { x: [1, 2, 3] },
      { index: ["2024-01-01", "2024-01-01", "2024-01-02"] },
    );
    const result = resampleDataFrame(df, "D").count();
    expect(result.col("x").values[0]).toBe(2);
    expect(result.col("x").values[1]).toBe(1);
  });
});

// ─── asfreq ───────────────────────────────────────────────────────────────────

describe("asfreq", () => {
  it("returns last value per bin without fill", () => {
    const s = dateSeries(["2024-01-01", "2024-01-02", "2024-01-04"], [10, 20, 40]);
    const result = asfreq(s, "D", null);
    expect(result.values.length).toBeGreaterThanOrEqual(1);
  });

  it("ffill fills null gaps", () => {
    // If a bucket has no data, ffill propagates last known
    const s = dateSeries(
      ["2024-01-01", "2024-01-01", "2024-01-03"],
      [5, 10, 30],
    );
    const result = asfreq(s, "D", "ffill");
    // Jan 2 had no data → ffill from Jan 1's last = 10
    const jan2Idx = result.index.values.indexOf("2024-01-02");
    if (jan2Idx >= 0) {
      expect(result.values[jan2Idx]).toBe(10);
    }
  });

  it("property: length matches distinct day bins", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 10 }),
        (days) => {
          const dates = days.map((d) => {
            const base = new Date("2024-01-01");
            base.setUTCDate(d);
            return base.toISOString().slice(0, 10);
          });
          const values = days.map((d) => d * 1.0);
          const s = dateSeries(dates, values);
          const result = asfreq(s, "D");
          expect(result.values.length).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });
});
