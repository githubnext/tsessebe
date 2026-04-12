/**
 * Tests for stats/to_datetime — convert scalars, arrays, and Series to Date.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, toDatetime } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function series(data: Scalar[]): Series<Scalar> {
  return new Series({ data });
}

// ─── null / missing ───────────────────────────────────────────────────────────

describe("toDatetime — missing values", () => {
  it("returns null for null", () => {
    expect(toDatetime(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toDatetime(undefined)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(toDatetime(Number.NaN)).toBeNull();
  });
});

// ─── Date passthrough ─────────────────────────────────────────────────────────

describe("toDatetime — Date passthrough", () => {
  it("returns the same Date object unchanged", () => {
    const d = new Date(2024, 0, 15);
    const result = toDatetime(d);
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getTime()).toBe(d.getTime());
  });

  it("utc:true still returns a Date with the same timestamp", () => {
    const d = new Date(2024, 5, 1);
    const result = toDatetime(d, { utc: true });
    expect((result as Date).getTime()).toBe(d.getTime());
  });
});

// ─── numeric inputs ───────────────────────────────────────────────────────────

describe("toDatetime — numeric inputs", () => {
  it("treats number as milliseconds by default", () => {
    const ms = Date.UTC(2024, 0, 1);
    const result = toDatetime(ms);
    expect((result as Date).getTime()).toBe(ms);
  });

  it("unit=s — seconds", () => {
    const s = Date.UTC(2024, 0, 1) / 1000;
    const result = toDatetime(s, { unit: "s" });
    expect((result as Date).getTime()).toBe(s * 1000);
  });

  it("unit=us — microseconds", () => {
    const ms = Date.UTC(2024, 3, 15);
    const us = ms * 1000;
    const result = toDatetime(us, { unit: "us" });
    expect((result as Date).getTime()).toBe(ms);
  });

  it("unit=ns — nanoseconds", () => {
    const ms = Date.UTC(2020, 6, 4);
    const ns = ms * 1_000_000;
    const result = toDatetime(ns, { unit: "ns" });
    expect((result as Date).getTime()).toBe(ms);
  });
});

// ─── string — ISO 8601 ────────────────────────────────────────────────────────

describe("toDatetime — ISO strings", () => {
  it("parses YYYY-MM-DD", () => {
    const result = toDatetime("2024-03-15") as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // 0-indexed
    expect(result.getDate()).toBe(15);
  });

  it("parses YYYY-MM-DDTHH:MM:SSZ", () => {
    const result = toDatetime("2024-01-01T00:00:00Z") as Date;
    expect(result.getTime()).toBe(Date.UTC(2024, 0, 1));
  });

  it("parses datetime with offset", () => {
    const result = toDatetime("2024-06-15T12:30:00+05:30") as Date;
    expect(result).toBeInstanceOf(Date);
  });
});

// ─── string — US format (MDY) ─────────────────────────────────────────────────

describe("toDatetime — US date strings (MM/DD/YYYY)", () => {
  it("parses MM/DD/YYYY", () => {
    const result = toDatetime("01/15/2024") as Date;
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it("parses M/D/YYYY (no zero-padding)", () => {
    const result = toDatetime("3/5/2024") as Date;
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(5);
  });

  it("parses MM/DD/YY with year expansion", () => {
    const result = toDatetime("01/15/24") as Date;
    expect(result.getFullYear()).toBe(2024);
  });

  it("dayfirst=true treats first field as day", () => {
    const result = toDatetime("02/01/2024", { dayfirst: true }) as Date;
    // DD/MM/YYYY → 2 Jan 2024
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(2);
  });

  it("parses with time component", () => {
    const result = toDatetime("06/15/2024 14:30:00") as Date;
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

// ─── string — European format (DMY dash) ─────────────────────────────────────

describe("toDatetime — European date strings (DD-MM-YYYY)", () => {
  it("parses DD-MM-YYYY", () => {
    const result = toDatetime("15-03-2024") as Date;
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(15);
  });

  it("parses with time", () => {
    const result = toDatetime("15-03-2024 10:00:30") as Date;
    expect(result.getHours()).toBe(10);
    expect(result.getSeconds()).toBe(30);
  });
});

// ─── string — compact YYYYMMDD ────────────────────────────────────────────────

describe("toDatetime — compact strings (YYYYMMDD)", () => {
  it("parses YYYYMMDD", () => {
    const result = toDatetime("20240115") as Date;
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

// ─── string — integer string ──────────────────────────────────────────────────

describe("toDatetime — integer strings", () => {
  it("parses integer string as milliseconds", () => {
    const ms = Date.UTC(2024, 0, 1);
    const result = toDatetime(String(ms)) as Date;
    expect(result.getTime()).toBe(ms);
  });
});

// ─── errors handling ──────────────────────────────────────────────────────────

describe("toDatetime — errors option", () => {
  it("errors=raise throws on unparseable string (default)", () => {
    expect(() => toDatetime("not-a-date")).toThrow(TypeError);
  });

  it("errors=raise throws on unparseable boolean", () => {
    expect(() => toDatetime(true as unknown as Scalar)).toThrow(TypeError);
  });

  it("errors=coerce returns null on unparseable string", () => {
    expect(toDatetime("not-a-date", { errors: "coerce" })).toBeNull();
  });

  it("errors=coerce returns null on boolean", () => {
    expect(toDatetime(true as unknown as Scalar, { errors: "coerce" })).toBeNull();
  });

  it("errors=ignore returns original string unchanged", () => {
    const result = toDatetime("nope", { errors: "ignore" }) as unknown as string;
    expect(result).toBe("nope");
  });

  it("errors=ignore returns original boolean unchanged", () => {
    const v = true as unknown as Scalar;
    const result = toDatetime(v, { errors: "ignore" }) as unknown as boolean;
    expect(result).toBe(true);
  });
});

// ─── array overload ───────────────────────────────────────────────────────────

describe("toDatetime — array overload", () => {
  it("converts an array of mixed inputs", () => {
    const result = toDatetime(["2024-01-01", null, "2024-06-15"]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeInstanceOf(Date);
    expect(result[1]).toBeNull();
    expect(result[2]).toBeInstanceOf(Date);
  });

  it("errors=coerce turns bad entries to null", () => {
    const result = toDatetime(["2024-01-01", "bad", "2024-03-01"], { errors: "coerce" });
    expect(result[1]).toBeNull();
  });
});

// ─── Series overload ──────────────────────────────────────────────────────────

describe("toDatetime — Series overload", () => {
  it("converts a Series<Scalar> to Series<Date|null>", () => {
    const s = series(["2024-01-01", null, "2024-06-15"]);
    const result = toDatetime(s);
    expect(result).toBeInstanceOf(Series);
    expect(result.size).toBe(3);
    expect(result.values[0]).toBeInstanceOf(Date);
    expect(result.values[1]).toBeNull();
  });

  it("preserves index and name", () => {
    const s = new Series({ data: ["2024-01-01"], name: "dates" });
    const result = toDatetime(s);
    expect(result.name).toBe("dates");
  });

  it("dtype is datetime", () => {
    const s = series(["2024-01-01"]);
    const result = toDatetime(s);
    expect(result.dtype.kind).toBe("datetime");
  });

  it("errors=coerce in Series turns bad values to null", () => {
    const s = series(["2024-01-01", "bad-date", "2024-03-01"]);
    const result = toDatetime(s, { errors: "coerce" });
    expect(result.values[1]).toBeNull();
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("toDatetime — property tests", () => {
  it("Date roundtrip: toDatetime(d) preserves milliseconds", () => {
    fc.assert(
      fc.property(fc.date(), (d) => {
        const result = toDatetime(d) as Date;
        return result instanceof Date && result.getTime() === d.getTime();
      }),
    );
  });

  it("numeric ms roundtrip: toDatetime(n) gives Date with same getTime()", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2_000_000_000_000 }), (ms) => {
        const result = toDatetime(ms) as Date;
        return result instanceof Date && result.getTime() === ms;
      }),
    );
  });

  it("errors=coerce never throws on arbitrary scalars", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.double(), fc.boolean(), fc.constant(null)), (v) => {
        const s = v as unknown as Scalar;
        try {
          toDatetime(s, { errors: "coerce" });
          return true;
        } catch {
          return false;
        }
      }),
    );
  });

  it("errors=ignore never throws and always returns something", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.double(), fc.boolean(), fc.constant(null)), (v) => {
        const s = v as unknown as Scalar;
        let ok = true;
        try {
          const r = toDatetime(s, { errors: "ignore" });
          ok = r !== undefined;
        } catch {
          ok = false;
        }
        return ok;
      }),
    );
  });
});
