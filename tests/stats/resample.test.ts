/**
 * Tests for resample — time-based resampling for Series and DataFrame.
 *
 * Mirrors the behaviour of pandas.DataFrame.resample / pandas.Series.resample.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Index,
  type Label,
  Series,
  resampleDataFrame,
  resampleSeries,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function d(iso: string): Date {
  return new Date(iso);
}

function nanOrNum(v: unknown): boolean {
  return (typeof v === "number" && Number.isNaN(v)) || typeof v === "number";
}

// ─── SeriesResampler — daily ───────────────────────────────────────────────────

describe("resampleSeries – daily ('D')", () => {
  test("sum groups intra-day timestamps into UTC-day bins", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-02T09:00Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    const r = resampleSeries(s, "D").sum();
    expect(r.toArray()).toEqual([3, 3]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });

  test("mean per day", () => {
    const dates = [d("2024-01-01T06:00Z"), d("2024-01-01T18:00Z"), d("2024-01-02T12:00Z")];
    const s = new Series({ data: [10, 20, 30], index: dates });
    const r = resampleSeries(s, "D").mean();
    expect(r.toArray()).toEqual([15, 30]);
  });

  test("max per day", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-02T00:00Z")];
    const s = new Series({ data: [5, 3, 8], index: dates });
    expect(resampleSeries(s, "D").max().toArray()).toEqual([5, 8]);
  });

  test("min per day", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-02T00:00Z")];
    const s = new Series({ data: [5, 3, 8], index: dates });
    expect(resampleSeries(s, "D").min().toArray()).toEqual([3, 8]);
  });

  test("count excludes NaN values", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-02T00:00Z")];
    const s = new Series({ data: [1, Number.NaN, 3], index: dates });
    expect(resampleSeries(s, "D").count().toArray()).toEqual([1, 1]);
  });

  test("size includes NaN values", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-02T00:00Z")];
    const s = new Series({ data: [1, Number.NaN, 3], index: dates });
    expect(resampleSeries(s, "D").size().toArray()).toEqual([2, 1]);
  });

  test("first / last per day", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z"), d("2024-01-01T18:00Z")];
    const s = new Series({ data: [10, 20, 30], index: dates });
    expect(resampleSeries(s, "D").first().toArray()).toEqual([10]);
    expect(resampleSeries(s, "D").last().toArray()).toEqual([30]);
  });

  test("std per day (sample std)", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z")];
    const s = new Series({ data: [2, 4], index: dates });
    const std = resampleSeries(s, "D").std().toArray()[0] as number;
    expect(Math.abs(std - Math.sqrt(2))).toBeLessThan(1e-10);
  });

  test("var per day", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z")];
    const s = new Series({ data: [2, 4], index: dates });
    const v = resampleSeries(s, "D").var().toArray()[0] as number;
    expect(Math.abs(v - 2)).toBeLessThan(1e-10);
  });

  test("empty bin between two active days fills with NaN for sum", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-03T00:00Z")];
    const s = new Series({ data: [1, 3], index: dates });
    const r = resampleSeries(s, "D").sum();
    expect(r.size).toBe(3);
    expect(r.toArray()[0]).toBe(1);
    expect(Number.isNaN(r.toArray()[1] as number)).toBe(true);
    expect(r.toArray()[2]).toBe(3);
  });

  test("empty bin between two active days fills with 0 for count", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-03T00:00Z")];
    const s = new Series({ data: [1, 3], index: dates });
    const r = resampleSeries(s, "D").count();
    expect(r.toArray()).toEqual([1, 0, 1]);
  });

  test("single observation", () => {
    const dates = [d("2024-03-15T10:00Z")];
    const s = new Series({ data: [42], index: dates });
    const r = resampleSeries(s, "D").sum();
    expect(r.toArray()).toEqual([42]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  test("preserves series name", () => {
    const dates = [d("2024-01-01T00:00Z")];
    const s = new Series({ data: [1], index: dates, name: "revenue" });
    expect(resampleSeries(s, "D").sum().name).toBe("revenue");
  });

  test("label='right' shifts labels by one day", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-02T00:00Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const r = resampleSeries(s, "D", { label: "right" }).sum();
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-02T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-01-03T00:00:00.000Z");
  });
});

// ─── SeriesResampler — hourly ──────────────────────────────────────────────────

describe("resampleSeries – hourly ('H')", () => {
  test("sum per hour", () => {
    const dates = [
      d("2024-01-01T00:00Z"),
      d("2024-01-01T00:30Z"),
      d("2024-01-01T01:00Z"),
      d("2024-01-01T01:45Z"),
    ];
    const s = new Series({ data: [1, 2, 3, 4], index: dates });
    expect(resampleSeries(s, "H").sum().toArray()).toEqual([3, 7]);
  });

  test("hour labels are on the hour boundary", () => {
    const dates = [d("2024-01-01T05:30Z"), d("2024-01-01T05:59Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const r = resampleSeries(s, "H").sum();
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-01T05:00:00.000Z");
  });
});

// ─── SeriesResampler — minute ──────────────────────────────────────────────────

describe("resampleSeries – minute ('T' / 'min')", () => {
  test("T: sum per minute", () => {
    const dates = [d("2024-01-01T00:00:10Z"), d("2024-01-01T00:00:50Z"), d("2024-01-01T00:01:30Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    expect(resampleSeries(s, "T").sum().toArray()).toEqual([3, 3]);
  });

  test("min alias matches T", () => {
    const dates = [d("2024-01-01T00:00:30Z"), d("2024-01-01T00:01:00Z")];
    const s = new Series({ data: [5, 10], index: dates });
    expect(resampleSeries(s, "min").sum().toArray()).toEqual(
      resampleSeries(s, "T").sum().toArray(),
    );
  });
});

// ─── SeriesResampler — second ──────────────────────────────────────────────────

describe("resampleSeries – second ('S')", () => {
  test("sum per second", () => {
    const dates = [
      d("2024-01-01T00:00:00.100Z"),
      d("2024-01-01T00:00:00.500Z"),
      d("2024-01-01T00:00:01.000Z"),
    ];
    const s = new Series({ data: [1, 2, 3], index: dates });
    expect(resampleSeries(s, "S").sum().toArray()).toEqual([3, 3]);
  });
});

// ─── SeriesResampler — weekly ─────────────────────────────────────────────────

describe("resampleSeries – weekly ('W')", () => {
  test("default label is the Sunday at the end of the week", () => {
    // Jan 8 2024 is a Monday; Jan 14 is the following Sunday
    const dates = [d("2024-01-08T00:00Z"), d("2024-01-10T00:00Z"), d("2024-01-14T00:00Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    const r = resampleSeries(s, "W").sum();
    expect(r.size).toBe(1);
    expect(r.toArray()).toEqual([6]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-14T00:00:00.000Z");
  });

  test("dates spanning two weeks produce two bins", () => {
    const dates = [d("2024-01-10T00:00Z"), d("2024-01-18T00:00Z")];
    const s = new Series({ data: [10, 20], index: dates });
    const r = resampleSeries(s, "W").sum();
    expect(r.size).toBe(2);
    expect(r.toArray()[0]).toBe(10);
    expect(r.toArray()[1]).toBe(20);
  });

  test("Sunday is included in the CURRENT week's bin (closed right)", () => {
    const dates = [d("2024-01-07T00:00Z"), d("2024-01-14T00:00Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const r = resampleSeries(s, "W").sum();
    // Jan 7 = Sunday → bin label Jan 7
    // Jan 14 = Sunday → bin label Jan 14
    expect(r.size).toBe(2);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-07T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-01-14T00:00:00.000Z");
  });

  test("label='left' shifts label to Monday", () => {
    const dates = [d("2024-01-10T00:00Z")]; // Wed
    const s = new Series({ data: [5], index: dates });
    const r = resampleSeries(s, "W", { label: "left" }).sum();
    // default right label would be Jan 14 (Sun); left label = Jan 14 - 6 = Jan 8 (Mon)
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-08T00:00:00.000Z");
  });

  test("W-MON bins end on Monday", () => {
    // Jan 15 2024 is a Monday
    const dates = [d("2024-01-09T00:00Z"), d("2024-01-15T00:00Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const r = resampleSeries(s, "W-MON").sum();
    expect((r.index.at(0) as Date).getUTCDay()).toBe(1); // Monday
  });
});

// ─── SeriesResampler — month start ('MS') ─────────────────────────────────────

describe("resampleSeries – month start ('MS')", () => {
  test("sums within the same month", () => {
    const dates = [d("2024-01-01Z"), d("2024-01-15Z"), d("2024-01-31Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    const r = resampleSeries(s, "MS").sum();
    expect(r.toArray()).toEqual([6]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  test("two different months produce two bins", () => {
    const dates = [d("2024-01-15Z"), d("2024-02-10Z"), d("2024-02-28Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    const r = resampleSeries(s, "MS").sum();
    expect(r.toArray()).toEqual([1, 5]);
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-02-01T00:00:00.000Z");
  });

  test("empty month in range is filled with NaN", () => {
    const dates = [d("2024-01-15Z"), d("2024-03-10Z")];
    const s = new Series({ data: [1, 3], index: dates });
    const r = resampleSeries(s, "MS").sum();
    expect(r.size).toBe(3);
    expect(r.toArray()[0]).toBe(1);
    expect(Number.isNaN(r.toArray()[1] as number)).toBe(true);
    expect(r.toArray()[2]).toBe(3);
  });
});

// ─── SeriesResampler — month end ('ME') ───────────────────────────────────────

describe("resampleSeries – month end ('ME')", () => {
  test("labels by last day of month", () => {
    const dates = [d("2024-01-15Z"), d("2024-02-20Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const r = resampleSeries(s, "ME").sum();
    expect(r.toArray()).toEqual([1, 2]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-31T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-02-29T00:00:00.000Z"); // 2024 is leap year
  });
});

// ─── SeriesResampler — quarter start ('QS') ──────────────────────────────────

describe("resampleSeries – quarter start ('QS')", () => {
  test("Q1 and Q2 bins", () => {
    const dates = [d("2024-01-15Z"), d("2024-02-20Z"), d("2024-04-05Z"), d("2024-06-01Z")];
    const s = new Series({ data: [1, 2, 3, 4], index: dates });
    const r = resampleSeries(s, "QS").sum();
    expect(r.toArray()).toEqual([3, 7]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });

  test("Q4 bin is Oct–Dec", () => {
    const dates = [d("2024-10-01Z"), d("2024-11-15Z"), d("2024-12-31Z")];
    const s = new Series({ data: [10, 20, 30], index: dates });
    const r = resampleSeries(s, "QS").sum();
    expect(r.toArray()).toEqual([60]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-10-01T00:00:00.000Z");
  });
});

// ─── SeriesResampler — quarter end ('QE') ─────────────────────────────────────

describe("resampleSeries – quarter end ('QE')", () => {
  test("labels by last day of quarter", () => {
    const dates = [d("2024-02-15Z"), d("2024-05-10Z")];
    const s = new Series({ data: [5, 7], index: dates });
    const r = resampleSeries(s, "QE").sum();
    expect(r.toArray()).toEqual([5, 7]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-03-31T00:00:00.000Z");
    expect((r.index.at(1) as Date).toISOString()).toBe("2024-06-30T00:00:00.000Z");
  });
});

// ─── SeriesResampler — year start ('YS' / 'AS') ──────────────────────────────

describe("resampleSeries – year start ('YS' / 'AS')", () => {
  test("same year groups into one bin", () => {
    const dates = [d("2024-01-15Z"), d("2024-06-01Z"), d("2024-12-31Z")];
    const s = new Series({ data: [1, 2, 3], index: dates });
    const r = resampleSeries(s, "YS").sum();
    expect(r.toArray()).toEqual([6]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  test("two years produce two bins", () => {
    const dates = [d("2023-06-01Z"), d("2024-03-01Z")];
    const s = new Series({ data: [10, 20], index: dates });
    const r = resampleSeries(s, "YS").sum();
    expect(r.toArray()).toEqual([10, 20]);
  });

  test("AS alias matches YS", () => {
    const dates = [d("2024-06-01Z"), d("2025-01-01Z")];
    const s = new Series({ data: [1, 2], index: dates });
    const rYS = resampleSeries(s, "YS").sum();
    const rAS = resampleSeries(s, "AS").sum();
    expect(rYS.toArray()).toEqual(rAS.toArray());
  });
});

// ─── SeriesResampler — year end ('YE' / 'AE') ────────────────────────────────

describe("resampleSeries – year end ('YE' / 'AE')", () => {
  test("labels by Dec 31", () => {
    const dates = [d("2024-06-01Z"), d("2024-12-31Z")];
    const s = new Series({ data: [5, 5], index: dates });
    const r = resampleSeries(s, "YE").sum();
    expect(r.toArray()).toEqual([10]);
    expect((r.index.at(0) as Date).toISOString()).toBe("2024-12-31T00:00:00.000Z");
  });
});

// ─── SeriesResampler — ohlc ───────────────────────────────────────────────────

describe("resampleSeries – ohlc()", () => {
  test("computes open/high/low/close for a daily bin", () => {
    const dates = [
      d("2024-01-01T00:00Z"),
      d("2024-01-01T06:00Z"),
      d("2024-01-01T12:00Z"),
      d("2024-01-01T18:00Z"),
    ];
    const s = new Series({ data: [100, 150, 80, 120], index: dates });
    const ohlc = resampleSeries(s, "D").ohlc();
    expect(ohlc.col("open").toArray()).toEqual([100]);
    expect(ohlc.col("high").toArray()).toEqual([150]);
    expect(ohlc.col("low").toArray()).toEqual([80]);
    expect(ohlc.col("close").toArray()).toEqual([120]);
  });

  test("ohlc with two days", () => {
    const dates = [
      d("2024-01-01T00:00Z"),
      d("2024-01-01T12:00Z"),
      d("2024-01-02T00:00Z"),
      d("2024-01-02T12:00Z"),
    ];
    const s = new Series({ data: [10, 20, 5, 15], index: dates });
    const ohlc = resampleSeries(s, "D").ohlc();
    expect(ohlc.columns.values).toEqual(["open", "high", "low", "close"]);
    expect(ohlc.col("open").toArray()).toEqual([10, 5]);
    expect(ohlc.col("high").toArray()).toEqual([20, 15]);
    expect(ohlc.col("low").toArray()).toEqual([10, 5]);
    expect(ohlc.col("close").toArray()).toEqual([20, 15]);
  });

  test("ohlc empty bin fills all columns with NaN", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-03T00:00Z")];
    const s = new Series({ data: [1, 3], index: dates });
    const ohlc = resampleSeries(s, "D").ohlc();
    expect(ohlc.shape[0]).toBe(3);
    expect(Number.isNaN(ohlc.col("open").toArray()[1] as number)).toBe(true);
    expect(Number.isNaN(ohlc.col("close").toArray()[1] as number)).toBe(true);
  });
});

// ─── SeriesResampler — agg() ──────────────────────────────────────────────────

describe("resampleSeries – agg()", () => {
  test("agg with built-in name", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z")];
    const s = new Series({ data: [1, 3], index: dates });
    expect(resampleSeries(s, "D").agg("sum").toArray()).toEqual([4]);
    expect(resampleSeries(s, "D").agg("mean").toArray()).toEqual([2]);
  });

  test("agg with custom function", () => {
    const dates = [d("2024-01-01T00:00Z"), d("2024-01-01T12:00Z")];
    const s = new Series({ data: [2, 4], index: dates });
    const r = resampleSeries(s, "D").agg((vals) => {
      const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      return nums.reduce((a, b) => a * b, 1);
    });
    expect(r.toArray()).toEqual([8]);
  });

  test("unknown agg name throws", () => {
    const s = new Series({ data: [1], index: [d("2024-01-01Z")] });
    // biome-ignore lint/suspicious/noExplicitAny: intentional bad input for test
    expect(() => resampleSeries(s, "D").agg("bogus" as any)).toThrow();
  });
});

// ─── DataFrameResampler ───────────────────────────────────────────────────────

describe("resampleDataFrame – daily ('D')", () => {
  test("sum per column per day", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z"), d("2024-01-02Z")]);
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] }, { index: idx });
    const r = resampleDataFrame(df, "D").sum();
    expect(r.col("a").toArray()).toEqual([3, 3]);
    expect(r.col("b").toArray()).toEqual([30, 30]);
  });

  test("mean per column per day", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z"), d("2024-01-02Z")]);
    const df = DataFrame.fromColumns({ a: [1, 3, 10] }, { index: idx });
    const r = resampleDataFrame(df, "D").mean();
    expect(r.col("a").toArray()).toEqual([2, 10]);
  });

  test("count excludes NaN", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z"), d("2024-01-02Z")]);
    const df = DataFrame.fromColumns({ a: [1, Number.NaN, 3] }, { index: idx });
    const r = resampleDataFrame(df, "D").count();
    expect(r.col("a").toArray()).toEqual([1, 1]);
  });

  test("first and last per column per day", () => {
    const idx = new Index<Label>([
      d("2024-01-01Z"),
      d("2024-01-01T06:00Z"),
      d("2024-01-01T12:00Z"),
    ]);
    const df = DataFrame.fromColumns({ v: [5, 15, 25] }, { index: idx });
    expect(resampleDataFrame(df, "D").first().col("v").toArray()).toEqual([5]);
    expect(resampleDataFrame(df, "D").last().col("v").toArray()).toEqual([25]);
  });

  test("empty bin filled with NaN", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-03Z")]);
    const df = DataFrame.fromColumns({ v: [1, 3] }, { index: idx });
    const r = resampleDataFrame(df, "D").sum();
    expect(r.shape[0]).toBe(3);
    expect(Number.isNaN(r.col("v").toArray()[1] as number)).toBe(true);
  });
});

describe("resampleDataFrame – monthly ('MS')", () => {
  test("sum per month across multiple columns", () => {
    const idx = new Index<Label>([d("2024-01-10Z"), d("2024-01-20Z"), d("2024-02-05Z")]);
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] }, { index: idx });
    const r = resampleDataFrame(df, "MS").sum();
    expect(r.col("x").toArray()).toEqual([3, 3]);
    expect(r.col("y").toArray()).toEqual([9, 6]);
  });
});

describe("resampleDataFrame – agg() with per-column specs", () => {
  test("different aggregations per column", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z"), d("2024-01-02Z")]);
    const df = DataFrame.fromColumns({ a: [1, 3, 10], b: [100, 200, 300] }, { index: idx });
    const r = resampleDataFrame(df, "D").agg({ a: "sum", b: "mean" });
    expect(r.col("a").toArray()).toEqual([4, 10]);
    expect(r.col("b").toArray()).toEqual([150, 300]);
  });

  test("agg with a custom function for all columns", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z")]);
    const df = DataFrame.fromColumns({ v: [2, 4] }, { index: idx });
    const r = resampleDataFrame(df, "D").agg((vals) => {
      const nums = vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      return nums.length;
    });
    expect(r.col("v").toArray()).toEqual([2]);
  });
});

describe("resampleDataFrame – size()", () => {
  test("returns a Series of bin sizes", () => {
    const idx = new Index<Label>([d("2024-01-01Z"), d("2024-01-01T12:00Z"), d("2024-01-02Z")]);
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: idx });
    const r = resampleDataFrame(df, "D").size();
    expect(r.toArray()).toEqual([2, 1]);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("resampleSeries – property-based", () => {
  test("sum over all bins equals sum over entire series (no NaN)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ts: fc.integer({ min: 0, max: 86400000 * 30 }), // 30 days range in ms
            val: fc.float({ noNaN: true, noDefaultInfinity: true, min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (items) => {
          const dates = items.map((it) => new Date(Date.UTC(2024, 0, 1) + it.ts));
          const data = items.map((it) => it.val);
          const s = new Series({ data, index: dates });
          const binSum = resampleSeries(s, "D").sum();
          const totalBinSum = (binSum.toArray() as number[]).reduce(
            (acc, v) => acc + (Number.isNaN(v) ? 0 : v),
            0,
          );
          const totalSeries = data.reduce((a, b) => a + b, 0);
          expect(Math.abs(totalBinSum - totalSeries)).toBeLessThan(1e-6);
        },
      ),
    );
  });

  test("count bins always <= size (no NaN counting)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ts: fc.integer({ min: 0, max: 86400000 * 10 }),
            val: fc.oneof(
              fc.float({ noNaN: true, noDefaultInfinity: true }),
              fc.constant(Number.NaN),
            ),
          }),
          { minLength: 1, maxLength: 15 },
        ),
        (items) => {
          const dates = items.map((it) => new Date(Date.UTC(2024, 0, 1) + it.ts));
          const data = items.map((it) => it.val);
          const s = new Series({ data, index: dates });
          const cnt = resampleSeries(s, "D").count().toArray() as number[];
          const sz = resampleSeries(s, "D").size().toArray() as number[];
          for (let i = 0; i < cnt.length; i++) {
            expect((cnt[i] as number) <= (sz[i] as number)).toBe(true);
          }
        },
      ),
    );
  });

  test("bin labels for 'D' are always at UTC midnight", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 86400000 * 365 }), { minLength: 1, maxLength: 30 }),
        (offsets) => {
          const dates = offsets.map((off) => new Date(Date.UTC(2024, 0, 1) + off));
          const s = new Series({ data: dates.map(() => 1), index: dates });
          const r = resampleSeries(s, "D").sum();
          for (let i = 0; i < r.size; i++) {
            const lbl = r.index.at(i) as Date;
            expect(lbl.getUTCHours()).toBe(0);
            expect(lbl.getUTCMinutes()).toBe(0);
            expect(lbl.getUTCSeconds()).toBe(0);
            expect(lbl.getUTCMilliseconds()).toBe(0);
          }
        },
      ),
    );
  });

  test("monthly MS labels are always on the 1st of the month", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 86400000 * 730 }), { minLength: 1, maxLength: 20 }),
        (offsets) => {
          const dates = offsets.map((off) => new Date(Date.UTC(2024, 0, 1) + off));
          const s = new Series({ data: dates.map(() => 1), index: dates });
          const r = resampleSeries(s, "MS").sum();
          for (let i = 0; i < r.size; i++) {
            const lbl = r.index.at(i) as Date;
            expect(lbl.getUTCDate()).toBe(1);
          }
        },
      ),
    );
  });

  test("weekly W labels are always on a Sunday", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 86400000 * 60 }), { minLength: 1, maxLength: 20 }),
        (offsets) => {
          const dates = offsets.map((off) => new Date(Date.UTC(2024, 0, 1) + off));
          const s = new Series({ data: dates.map(() => 1), index: dates });
          const r = resampleSeries(s, "W").sum();
          for (let i = 0; i < r.size; i++) {
            const lbl = r.index.at(i) as Date;
            expect(lbl.getUTCDay()).toBe(0); // Sunday = 0
          }
        },
      ),
    );
  });

  test("output bins are in ascending chronological order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 86400000 * 365 }), { minLength: 2, maxLength: 20 }),
        (offsets) => {
          const dates = offsets.map((off) => new Date(Date.UTC(2024, 0, 1) + off));
          const s = new Series({ data: dates.map(() => 1), index: dates });
          const r = resampleSeries(s, "D").sum();
          for (let i = 1; i < r.size; i++) {
            const prev = (r.index.at(i - 1) as Date).getTime();
            const cur = (r.index.at(i) as Date).getTime();
            expect(cur > prev).toBe(true);
          }
        },
      ),
    );
  });
});
