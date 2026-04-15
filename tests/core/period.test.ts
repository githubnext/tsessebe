/**
 * Tests for Period and PeriodIndex.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Period, PeriodIndex } from "../../src/index.ts";
import type { PeriodFreq } from "../../src/index.ts";

// ─── top-level regex ──────────────────────────────────────────────────────────

const RE_WEEK_STR = /^1970-01-05\/1970-01-11$/;

// ─── helpers ─────────────────────────────────────────────────────────────────

const utc = (s: string): Date => new Date(s + (s.includes("T") ? "" : "T00:00:00Z"));

// ─── Period.fromDate ──────────────────────────────────────────────────────────

describe("Period.fromDate — annual", () => {
  it("creates a year period from a date", () => {
    const p = Period.fromDate(utc("2024-07-15"), "A");
    expect(p.freq).toBe("A");
    expect(p.toString()).toBe("2024");
  });

  it("start and end cover the full year", () => {
    const p = Period.fromDate(utc("2024-07-15"), "A");
    expect(p.startTime.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(p.endTime.toISOString()).toBe("2024-12-31T23:59:59.999Z");
  });

  it("Y alias works", () => {
    const p = Period.fromDate(utc("2024-07-15"), "Y");
    expect(p.freq).toBe("A");
    expect(p.toString()).toBe("2024");
  });
});

describe("Period.fromDate — quarterly", () => {
  it("Q1", () => {
    const p = Period.fromDate(utc("2024-02-29"), "Q");
    expect(p.toString()).toBe("2024Q1");
  });

  it("Q2", () => {
    const p = Period.fromDate(utc("2024-06-30"), "Q");
    expect(p.toString()).toBe("2024Q2");
  });

  it("Q3", () => {
    const p = Period.fromDate(utc("2024-09-01"), "Q");
    expect(p.toString()).toBe("2024Q3");
  });

  it("Q4", () => {
    const p = Period.fromDate(utc("2024-11-30"), "Q");
    expect(p.toString()).toBe("2024Q4");
  });

  it("start and end of Q2 2024", () => {
    const p = Period.fromDate(utc("2024-05-15"), "Q");
    expect(p.startTime.toISOString()).toBe("2024-04-01T00:00:00.000Z");
    expect(p.endTime.toISOString()).toBe("2024-06-30T23:59:59.999Z");
  });
});

describe("Period.fromDate — monthly", () => {
  it("creates correct month period", () => {
    const p = Period.fromDate(utc("2024-03-15"), "M");
    expect(p.toString()).toBe("2024-03");
  });

  it("start and end of March 2024", () => {
    const p = Period.fromDate(utc("2024-03-15"), "M");
    expect(p.startTime.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(p.endTime.toISOString()).toBe("2024-03-31T23:59:59.999Z");
  });

  it("handles December", () => {
    const p = Period.fromDate(utc("2023-12-25"), "M");
    expect(p.toString()).toBe("2023-12");
    expect(p.endTime.toISOString()).toBe("2023-12-31T23:59:59.999Z");
  });

  it("handles leap-year February", () => {
    const p = Period.fromDate(utc("2024-02-29"), "M");
    expect(p.toString()).toBe("2024-02");
    expect(p.endTime.toISOString()).toBe("2024-02-29T23:59:59.999Z");
  });
});

describe("Period.fromDate — weekly", () => {
  it("1970-01-01 (Thursday) belongs to week 0", () => {
    const p = Period.fromDate(utc("1970-01-01"), "W");
    expect(p.ordinal).toBe(0);
    expect(p.startTime.toISOString()).toBe("1969-12-29T00:00:00.000Z"); // Monday
    expect(p.endTime.toISOString()).toBe("1970-01-04T23:59:59.999Z"); // Sunday
  });

  it("1970-01-05 (Monday) starts week 1", () => {
    const p = Period.fromDate(utc("1970-01-05"), "W");
    expect(p.ordinal).toBe(1);
    expect(p.toString()).toMatch(RE_WEEK_STR);
  });

  it("week string format is start/end", () => {
    const p = Period.fromDate(utc("2024-01-15"), "W"); // Monday 2024-01-15
    const s = p.toString();
    expect(s).toContain("/");
    const parts = s.split("/");
    expect(parts).toHaveLength(2);
  });
});

describe("Period.fromDate — daily", () => {
  it("creates a day period", () => {
    const p = Period.fromDate(utc("2024-03-15"), "D");
    expect(p.toString()).toBe("2024-03-15");
    expect(p.startTime.toISOString()).toBe("2024-03-15T00:00:00.000Z");
    expect(p.endTime.toISOString()).toBe("2024-03-15T23:59:59.999Z");
  });

  it("epoch day ordinal is 0", () => {
    const p = Period.fromDate(utc("1970-01-01"), "D");
    expect(p.ordinal).toBe(0);
  });
});

describe("Period.fromDate — hourly / minutely / secondly", () => {
  it("H format", () => {
    const p = Period.fromDate(new Date("2024-03-15T14:35:00Z"), "H");
    expect(p.toString()).toBe("2024-03-15 14:00");
    expect(p.startTime.toISOString()).toBe("2024-03-15T14:00:00.000Z");
    expect(p.endTime.toISOString()).toBe("2024-03-15T14:59:59.999Z");
  });

  it("T format (minute)", () => {
    const p = Period.fromDate(new Date("2024-03-15T14:35:42Z"), "T");
    expect(p.toString()).toBe("2024-03-15 14:35");
  });

  it("min alias maps to T", () => {
    const p = Period.fromDate(new Date("2024-03-15T14:35:42Z"), "min");
    expect(p.freq).toBe("T");
  });

  it("S format (second)", () => {
    const p = Period.fromDate(new Date("2024-03-15T14:35:42Z"), "S");
    expect(p.toString()).toBe("2024-03-15 14:35:42");
    expect(p.startTime.toISOString()).toBe("2024-03-15T14:35:42.000Z");
    expect(p.endTime.toISOString()).toBe("2024-03-15T14:35:42.999Z");
  });
});

describe("Period.fromString", () => {
  it("parses annual", () => {
    const p = Period.fromString("2024", "A");
    expect(p.toString()).toBe("2024");
  });

  it("parses quarter", () => {
    const p = Period.fromString("2024Q3", "Q");
    expect(p.toString()).toBe("2024Q3");
  });

  it("parses month", () => {
    const p = Period.fromString("2024-03", "M");
    expect(p.toString()).toBe("2024-03");
  });

  it("parses day", () => {
    const p = Period.fromString("2024-03-15", "D");
    expect(p.toString()).toBe("2024-03-15");
  });

  it("parses week range", () => {
    const p = Period.fromString("1970-01-05/1970-01-11", "W");
    expect(p.ordinal).toBe(1);
  });

  it("parses ISO datetime for H", () => {
    const p = Period.fromString("2024-03-15T14:00:00Z", "H");
    expect(p.toString()).toBe("2024-03-15 14:00");
  });

  it("throws on unparseable string", () => {
    expect(() => Period.fromString("not-a-date", "D")).toThrow();
  });
});

// ─── Period constructor ───────────────────────────────────────────────────────

describe("Period constructor", () => {
  it("stores ordinal and freq", () => {
    const p = new Period(42, "M");
    expect(p.ordinal).toBe(42);
    expect(p.freq).toBe("M");
  });

  it("throws on non-integer ordinal", () => {
    expect(() => new Period(1.5, "D")).toThrow();
  });

  it("throws on invalid freq", () => {
    expect(() => new Period(0, "Z" as PeriodFreq)).toThrow();
  });

  it("normalises Y → A", () => {
    const p = new Period(0, "Y" as PeriodFreq);
    expect(p.freq).toBe("A");
  });
});

// ─── Period arithmetic ────────────────────────────────────────────────────────

describe("Period.add", () => {
  it("shifts forward", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.add(3).toString()).toBe("2024-06");
  });

  it("shifts backward", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.add(-2).toString()).toBe("2024-01");
  });

  it("add 0 is identity", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.add(0).equals(p)).toBe(true);
  });

  it("crosses year boundary", () => {
    const p = Period.fromDate(utc("2024-11-01"), "M");
    expect(p.add(2).toString()).toBe("2025-01");
  });
});

describe("Period.diff", () => {
  it("computes difference between same-freq periods", () => {
    const a = Period.fromDate(utc("2024-05-01"), "M");
    const b = Period.fromDate(utc("2024-01-01"), "M");
    expect(a.diff(b)).toBe(4);
  });

  it("negative diff when other is later", () => {
    const a = Period.fromDate(utc("2024-01-01"), "M");
    const b = Period.fromDate(utc("2024-04-01"), "M");
    expect(a.diff(b)).toBe(-3);
  });

  it("diff of equal periods is 0", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.diff(p)).toBe(0);
  });

  it("throws on different frequencies", () => {
    const a = Period.fromDate(utc("2024-01-01"), "M");
    const b = Period.fromDate(utc("2024-01-01"), "D");
    expect(() => a.diff(b)).toThrow();
  });
});

describe("Period.compareTo", () => {
  it("earlier < later", () => {
    const a = Period.fromDate(utc("2024-01-01"), "Q");
    const b = Period.fromDate(utc("2024-07-01"), "Q");
    expect(a.compareTo(b)).toBeLessThan(0);
    expect(b.compareTo(a)).toBeGreaterThan(0);
  });

  it("equal periods compare to 0", () => {
    const p = Period.fromDate(utc("2024-01-01"), "Q");
    expect(p.compareTo(p)).toBe(0);
  });

  it("throws on different frequencies", () => {
    const a = Period.fromDate(utc("2024-01-01"), "M");
    const b = Period.fromDate(utc("2024-01-01"), "Q");
    expect(() => a.compareTo(b)).toThrow();
  });
});

describe("Period.equals", () => {
  it("same ordinal + same freq → true", () => {
    const a = Period.fromDate(utc("2024-03-01"), "M");
    const b = Period.fromDate(utc("2024-03-15"), "M"); // same month
    expect(a.equals(b)).toBe(true);
  });

  it("different ordinal → false", () => {
    const a = Period.fromDate(utc("2024-03-01"), "M");
    const b = Period.fromDate(utc("2024-04-01"), "M");
    expect(a.equals(b)).toBe(false);
  });

  it("different freq → false", () => {
    const a = Period.fromDate(utc("2024-01-01"), "M");
    const b = Period.fromDate(utc("2024-01-01"), "D");
    expect(a.equals(b)).toBe(false);
  });
});

describe("Period.contains", () => {
  it("date inside period returns true", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.contains(utc("2024-03-15"))).toBe(true);
    expect(p.contains(utc("2024-03-01"))).toBe(true);
    expect(p.contains(new Date("2024-03-31T23:59:59.999Z"))).toBe(true);
  });

  it("date outside period returns false", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    expect(p.contains(utc("2024-02-28"))).toBe(false);
    expect(p.contains(utc("2024-04-01"))).toBe(false);
  });
});

describe("Period.asfreq", () => {
  it("converts monthly to annual using start", () => {
    const p = Period.fromDate(utc("2024-07-01"), "M");
    const a = p.asfreq("A", "start");
    expect(a.toString()).toBe("2024");
  });

  it("converts quarterly to monthly using start", () => {
    const p = Period.fromDate(utc("2024-04-01"), "Q");
    const m = p.asfreq("M", "start");
    expect(m.toString()).toBe("2024-04");
  });

  it("converts quarterly to monthly using end", () => {
    const p = Period.fromDate(utc("2024-04-01"), "Q"); // Q2
    const m = p.asfreq("M", "end");
    expect(m.toString()).toBe("2024-06"); // June
  });

  it("defaults how to start", () => {
    const p = Period.fromDate(utc("2024-04-01"), "Q");
    expect(p.asfreq("M").toString()).toBe("2024-04");
  });
});

describe("Period.durationMs", () => {
  it("daily period is 86_400_000 ms", () => {
    const p = Period.fromDate(utc("2024-03-15"), "D");
    expect(p.durationMs).toBe(86_400_000);
  });

  it("annual period contains 366 days in leap year 2024", () => {
    const p = Period.fromDate(utc("2024-01-01"), "A");
    const expectedMs = 366 * 86_400_000;
    expect(p.durationMs).toBe(expectedMs);
  });

  it("annual period contains 365 days in non-leap year", () => {
    const p = Period.fromDate(utc("2023-01-01"), "A");
    const expectedMs = 365 * 86_400_000;
    expect(p.durationMs).toBe(expectedMs);
  });
});

describe("Period.toJSON", () => {
  it("returns string representation", () => {
    const p = Period.fromDate(utc("2024-03-15"), "M");
    expect(p.toJSON()).toBe("2024-03");
  });
});

// ─── PeriodIndex.fromRange ────────────────────────────────────────────────────

describe("PeriodIndex.fromRange", () => {
  it("creates quarterly index for 2024", () => {
    const start = Period.fromDate(utc("2024-01-01"), "Q");
    const end = Period.fromDate(utc("2024-12-31"), "Q");
    const idx = PeriodIndex.fromRange(start, end);
    expect(idx.size).toBe(4);
    expect(idx.at(0).toString()).toBe("2024Q1");
    expect(idx.at(3).toString()).toBe("2024Q4");
  });

  it("creates monthly index", () => {
    const start = Period.fromDate(utc("2024-01-01"), "M");
    const end = Period.fromDate(utc("2024-06-30"), "M");
    const idx = PeriodIndex.fromRange(start, end);
    expect(idx.size).toBe(6);
    expect(idx.at(0).toString()).toBe("2024-01");
    expect(idx.at(5).toString()).toBe("2024-06");
  });

  it("single-element range", () => {
    const p = Period.fromDate(utc("2024-03-01"), "M");
    const idx = PeriodIndex.fromRange(p, p);
    expect(idx.size).toBe(1);
  });

  it("throws when start > end", () => {
    const start = Period.fromDate(utc("2024-06-01"), "M");
    const end = Period.fromDate(utc("2024-01-01"), "M");
    expect(() => PeriodIndex.fromRange(start, end)).toThrow();
  });

  it("throws on mismatched frequencies", () => {
    const start = Period.fromDate(utc("2024-01-01"), "M");
    const end = Period.fromDate(utc("2024-12-31"), "Q");
    expect(() => PeriodIndex.fromRange(start, end)).toThrow();
  });

  it("stores name option", () => {
    const p = Period.fromDate(utc("2024-01-01"), "Q");
    const idx = PeriodIndex.fromRange(p, p, { name: "quarter" });
    expect(idx.name).toBe("quarter");
  });
});

// ─── PeriodIndex.periodRange ──────────────────────────────────────────────────

describe("PeriodIndex.periodRange", () => {
  it("generates n periods forward", () => {
    const start = Period.fromDate(utc("2024-01-01"), "M");
    const idx = PeriodIndex.periodRange(start, 6);
    expect(idx.size).toBe(6);
    expect(idx.at(0).toString()).toBe("2024-01");
    expect(idx.at(5).toString()).toBe("2024-06");
  });

  it("throws when periods ≤ 0", () => {
    const p = Period.fromDate(utc("2024-01-01"), "M");
    expect(() => PeriodIndex.periodRange(p, 0)).toThrow();
    expect(() => PeriodIndex.periodRange(p, -1)).toThrow();
  });

  it("throws when periods is non-integer", () => {
    const p = Period.fromDate(utc("2024-01-01"), "M");
    expect(() => PeriodIndex.periodRange(p, 1.5)).toThrow();
  });
});

// ─── PeriodIndex.fromPeriods ──────────────────────────────────────────────────

describe("PeriodIndex.fromPeriods", () => {
  it("builds from an array of periods", () => {
    const periods = [
      Period.fromDate(utc("2024-01-01"), "M"),
      Period.fromDate(utc("2024-02-01"), "M"),
      Period.fromDate(utc("2024-03-01"), "M"),
    ];
    const idx = PeriodIndex.fromPeriods(periods);
    expect(idx.size).toBe(3);
    expect(idx.freq).toBe("M");
  });

  it("throws on empty array", () => {
    expect(() => PeriodIndex.fromPeriods([])).toThrow();
  });

  it("throws on mixed frequencies", () => {
    const periods = [
      Period.fromDate(utc("2024-01-01"), "M"),
      Period.fromDate(utc("2024-01-01"), "D"),
    ];
    expect(() => PeriodIndex.fromPeriods(periods)).toThrow();
  });
});

// ─── PeriodIndex properties ───────────────────────────────────────────────────

describe("PeriodIndex properties", () => {
  it("shape returns [size]", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    expect(idx.shape).toEqual([4]);
  });

  it("ndim is 1", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    expect(idx.ndim).toBe(1);
  });

  it("empty is false for non-empty index", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 1);
    expect(idx.empty).toBe(false);
  });

  it("name defaults to null", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 1);
    expect(idx.name).toBeNull();
  });
});

// ─── PeriodIndex methods ──────────────────────────────────────────────────────

describe("PeriodIndex.at", () => {
  const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);

  it("positive index", () => {
    expect(idx.at(0).toString()).toBe("2024Q1");
    expect(idx.at(3).toString()).toBe("2024Q4");
  });

  it("negative index (Python-style)", () => {
    expect(idx.at(-1).toString()).toBe("2024Q4");
    expect(idx.at(-4).toString()).toBe("2024Q1");
  });

  it("throws out of bounds", () => {
    expect(() => idx.at(4)).toThrow();
    expect(() => idx.at(-5)).toThrow();
  });
});

describe("PeriodIndex.getLoc", () => {
  const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);

  it("returns correct position", () => {
    expect(idx.getLoc(Period.fromDate(utc("2024-04-01"), "Q"))).toBe(1);
    expect(idx.getLoc(Period.fromDate(utc("2024-10-01"), "Q"))).toBe(3);
  });

  it("throws when not found", () => {
    expect(() => idx.getLoc(Period.fromDate(utc("2025-01-01"), "Q"))).toThrow();
  });

  it("throws on frequency mismatch", () => {
    expect(() => idx.getLoc(Period.fromDate(utc("2024-01-01"), "M"))).toThrow();
  });
});

describe("PeriodIndex.contains", () => {
  const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "M"), 6);

  it("finds present period", () => {
    expect(idx.contains(Period.fromDate(utc("2024-03-01"), "M"))).toBe(true);
  });

  it("returns false for absent period", () => {
    expect(idx.contains(Period.fromDate(utc("2024-08-01"), "M"))).toBe(false);
  });

  it("returns false for wrong frequency", () => {
    expect(idx.contains(Period.fromDate(utc("2024-03-01"), "Q"))).toBe(false);
  });
});

describe("PeriodIndex.toArray", () => {
  it("returns Period objects", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "M"), 3);
    const arr = idx.toArray();
    expect(arr).toHaveLength(3);
    expect(arr[0]?.toString()).toBe("2024-01");
    expect(arr[2]?.toString()).toBe("2024-03");
  });
});

describe("PeriodIndex.shift", () => {
  it("shifts all periods forward", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    const shifted = idx.shift(4);
    expect(shifted.at(0).toString()).toBe("2025Q1");
    expect(shifted.at(3).toString()).toBe("2025Q4");
  });

  it("shifts backward", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 2);
    const shifted = idx.shift(-4);
    expect(shifted.at(0).toString()).toBe("2023Q1");
  });
});

describe("PeriodIndex.asfreq", () => {
  it("converts quarterly index to monthly (start)", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    const monthly = idx.asfreq("M", "start");
    expect(monthly.freq).toBe("M");
    expect(monthly.size).toBe(4);
    expect(monthly.at(0).toString()).toBe("2024-01");
    expect(monthly.at(1).toString()).toBe("2024-04");
  });

  it("converts quarterly index to monthly (end)", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    const monthly = idx.asfreq("M", "end");
    expect(monthly.at(0).toString()).toBe("2024-03");
    expect(monthly.at(1).toString()).toBe("2024-06");
  });

  it("defaults how to start", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 1);
    expect(idx.asfreq("M").at(0).toString()).toBe("2024-01");
  });
});

describe("PeriodIndex.sort", () => {
  it("returns sorted index", () => {
    const periods = [
      Period.fromDate(utc("2024-03-01"), "M"),
      Period.fromDate(utc("2024-01-01"), "M"),
      Period.fromDate(utc("2024-02-01"), "M"),
    ];
    const idx = PeriodIndex.fromPeriods(periods);
    const sorted = idx.sort();
    expect(sorted.at(0).toString()).toBe("2024-01");
    expect(sorted.at(2).toString()).toBe("2024-03");
  });
});

describe("PeriodIndex.unique", () => {
  it("removes duplicate ordinals", () => {
    const periods = [
      Period.fromDate(utc("2024-01-01"), "M"),
      Period.fromDate(utc("2024-01-15"), "M"), // same month
      Period.fromDate(utc("2024-02-01"), "M"),
    ];
    const idx = PeriodIndex.fromPeriods(periods);
    const uniq = idx.unique();
    expect(uniq.size).toBe(2);
  });
});

describe("PeriodIndex.toDatetimeStart / toDatetimeEnd", () => {
  it("toDatetimeStart returns start of each period", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 2);
    const starts = idx.toDatetimeStart();
    expect(starts[0]?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(starts[1]?.toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });

  it("toDatetimeEnd returns end of each period", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 2);
    const ends = idx.toDatetimeEnd();
    expect(ends[0]?.toISOString()).toBe("2024-03-31T23:59:59.999Z");
    expect(ends[1]?.toISOString()).toBe("2024-06-30T23:59:59.999Z");
  });
});

describe("PeriodIndex iteration", () => {
  it("iterates via for-of", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    const labels: string[] = [];
    for (const p of idx) {
      labels.push(p.toString());
    }
    expect(labels).toEqual(["2024Q1", "2024Q2", "2024Q3", "2024Q4"]);
  });
});

describe("PeriodIndex.toString", () => {
  it("produces a readable summary", () => {
    const idx = PeriodIndex.periodRange(Period.fromDate(utc("2024-01-01"), "Q"), 4);
    expect(idx.toString()).toContain("PeriodIndex");
    expect(idx.toString()).toContain("2024Q1");
    expect(idx.toString()).toContain('freq="Q"');
    expect(idx.toString()).toContain("length=4");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("Period — property: ordinal round-trip", () => {
  it("M: fromDate → ordinal → startTime contains original date", () => {
    fc.assert(
      fc.property(fc.integer({ min: -600, max: 600 }), (monthOffset) => {
        const year = 1970 + Math.floor(monthOffset / 12);
        const month = ((monthOffset % 12) + 12) % 12;
        const date = new Date(Date.UTC(year, month, 15));
        const p = Period.fromDate(date, "M");
        expect(p.startTime <= date && date <= p.endTime).toBe(true);
        expect(p.contains(date)).toBe(true);
      }),
    );
  });

  it("D: ordinal round-trip is exact", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: 10000 }), (dayOrd) => {
        const p = new Period(dayOrd, "D");
        const recovered = Period.fromDate(p.startTime, "D");
        expect(recovered.ordinal).toBe(dayOrd);
      }),
    );
  });

  it("Q: startTime is always first day of a quarter", () => {
    fc.assert(
      fc.property(fc.integer({ min: -200, max: 200 }), (qOrd) => {
        const p = new Period(qOrd, "Q");
        const start = p.startTime;
        const month = start.getUTCMonth(); // 0-based
        expect([0, 3, 6, 9]).toContain(month);
        expect(start.getUTCDate()).toBe(1);
      }),
    );
  });

  it("A: startTime is always Jan 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 100 }), (yearOrd) => {
        const p = new Period(yearOrd, "A");
        const start = p.startTime;
        expect(start.getUTCMonth()).toBe(0);
        expect(start.getUTCDate()).toBe(1);
      }),
    );
  });
});

describe("Period — property: add/diff inverse", () => {
  it("diff(add(n)) === n for monthly periods", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 600 }),
        fc.integer({ min: -100, max: 100 }),
        (baseOrd, n) => {
          const p = new Period(baseOrd, "M");
          const shifted = p.add(n);
          expect(shifted.diff(p)).toBe(n);
        },
      ),
    );
  });
});

describe("Period — property: contains start and end", () => {
  it("every period contains its own startTime and endTime", () => {
    const freqs: PeriodFreq[] = ["A", "Q", "M", "D", "H"];
    fc.assert(
      fc.property(
        fc.integer({ min: -500, max: 500 }),
        fc.constantFrom(...freqs),
        (ordinal, freq) => {
          const p = new Period(ordinal, freq);
          expect(p.contains(p.startTime)).toBe(true);
          expect(p.contains(p.endTime)).toBe(true);
        },
      ),
    );
  });
});

describe("PeriodIndex — property: fromRange size", () => {
  it("size = end.ordinal - start.ordinal + 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 100 }),
        (startOrd, span) => {
          const start = new Period(startOrd, "M");
          const end = new Period(startOrd + span, "M");
          const idx = PeriodIndex.fromRange(start, end);
          expect(idx.size).toBe(span + 1);
        },
      ),
    );
  });
});
