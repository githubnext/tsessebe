/**
 * Tests for stats/date_range — generate fixed-frequency Date sequences.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { advanceDate, dateRange, parseFreq } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function utc(y: number, mo: number, d: number, h = 0, min = 0, s = 0): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, min, s));
}

function ms(d: Date): number {
  return d.getTime();
}

// ─── parseFreq ────────────────────────────────────────────────────────────────

describe("parseFreq", () => {
  it("parses plain 'D'", () => {
    const pf = parseFreq("D");
    expect(pf.n).toBe(1);
    expect(pf.unit).toBe("D");
    expect(pf.anchor).toBe(0);
  });

  it("parses '2D'", () => {
    const pf = parseFreq("2D");
    expect(pf.n).toBe(2);
    expect(pf.unit).toBe("D");
  });

  it("normalises 'H' → 'h'", () => {
    expect(parseFreq("H").unit).toBe("h");
  });

  it("normalises 'T' → 'min'", () => {
    expect(parseFreq("T").unit).toBe("min");
  });

  it("normalises 'S' → 's'", () => {
    expect(parseFreq("S").unit).toBe("s");
  });

  it("normalises 'L' → 'ms'", () => {
    expect(parseFreq("L").unit).toBe("ms");
  });

  it("normalises 'A' → 'YE'", () => {
    expect(parseFreq("A").unit).toBe("YE");
  });

  it("normalises 'AS' → 'YS'", () => {
    expect(parseFreq("AS").unit).toBe("YS");
  });

  it("normalises 'Q' → 'QE'", () => {
    expect(parseFreq("Q").unit).toBe("QE");
  });

  it("normalises 'M' → 'ME'", () => {
    expect(parseFreq("M").unit).toBe("ME");
  });

  it("parses 'W' with default anchor = 0 (Sun)", () => {
    const pf = parseFreq("W");
    expect(pf.unit).toBe("W");
    expect(pf.anchor).toBe(0);
  });

  it("parses 'W-MON' with anchor = 1", () => {
    const pf = parseFreq("W-MON");
    expect(pf.unit).toBe("W");
    expect(pf.anchor).toBe(1);
  });

  it("parses 'W-FRI' with anchor = 5", () => {
    const pf = parseFreq("W-FRI");
    expect(pf.unit).toBe("W");
    expect(pf.anchor).toBe(5);
  });

  it("parses '3MS'", () => {
    const pf = parseFreq("3MS");
    expect(pf.n).toBe(3);
    expect(pf.unit).toBe("MS");
  });

  it("throws for unrecognised freq", () => {
    expect(() => parseFreq("UNKNOWN")).toThrow(RangeError);
  });
});

// ─── advanceDate ──────────────────────────────────────────────────────────────

describe("advanceDate — D", () => {
  it("advances one calendar day", () => {
    const d = utc(2024, 1, 1);
    expect(ms(advanceDate(d, parseFreq("D")))).toBe(ms(utc(2024, 1, 2)));
  });

  it("advances 2 days with '2D'", () => {
    const d = utc(2024, 1, 1);
    expect(ms(advanceDate(d, parseFreq("2D")))).toBe(ms(utc(2024, 1, 3)));
  });
});

describe("advanceDate — h/min/s/ms", () => {
  it("advances 1 hour", () => {
    const d = utc(2024, 1, 1, 0, 0, 0);
    expect(ms(advanceDate(d, parseFreq("h")))).toBe(ms(utc(2024, 1, 1, 1, 0, 0)));
  });

  it("advances 30 minutes with '30min'", () => {
    const d = utc(2024, 1, 1, 0, 0, 0);
    const r = advanceDate(d, parseFreq("30min"));
    expect(ms(r)).toBe(ms(utc(2024, 1, 1, 0, 30, 0)));
  });

  it("advances 1 second", () => {
    const d = utc(2024, 1, 1);
    const r = advanceDate(d, parseFreq("s"));
    expect(r.getTime() - d.getTime()).toBe(1_000);
  });

  it("advances 1 ms", () => {
    const d = utc(2024, 1, 1);
    const r = advanceDate(d, parseFreq("ms"));
    expect(r.getTime() - d.getTime()).toBe(1);
  });
});

describe("advanceDate — B (business day)", () => {
  it("Mon → Tue", () => {
    const d = utc(2024, 1, 1); // Monday
    expect(ms(advanceDate(d, parseFreq("B")))).toBe(ms(utc(2024, 1, 2)));
  });

  it("Fri → Mon (skips weekend)", () => {
    const d = utc(2024, 1, 5); // Friday
    expect(ms(advanceDate(d, parseFreq("B")))).toBe(ms(utc(2024, 1, 8)));
  });
});

describe("advanceDate — MS/ME", () => {
  it("MS advances to next month-start", () => {
    const d = utc(2024, 1, 1);
    expect(ms(advanceDate(d, parseFreq("MS")))).toBe(ms(utc(2024, 2, 1)));
  });

  it("ME advances to next month-end", () => {
    const d = utc(2024, 1, 31);
    expect(ms(advanceDate(d, parseFreq("ME")))).toBe(ms(utc(2024, 2, 29))); // 2024 leap year
  });
});

describe("advanceDate — QS/QE", () => {
  it("QS from Jan goes to Apr 1", () => {
    const d = utc(2024, 1, 1);
    expect(ms(advanceDate(d, parseFreq("QS")))).toBe(ms(utc(2024, 4, 1)));
  });

  it("QE from Jan goes to Mar 31", () => {
    const d = utc(2024, 1, 1);
    expect(ms(advanceDate(d, parseFreq("QE")))).toBe(ms(utc(2024, 3, 31)));
  });
});

describe("advanceDate — YS/YE", () => {
  it("YS advances to Jan 1 next year", () => {
    const d = utc(2024, 6, 15);
    expect(ms(advanceDate(d, parseFreq("YS")))).toBe(ms(utc(2025, 1, 1)));
  });

  it("YE advances to Dec 31 next year", () => {
    const d = utc(2024, 6, 15);
    expect(ms(advanceDate(d, parseFreq("YE")))).toBe(ms(utc(2025, 12, 31)));
  });
});

// ─── dateRange — basic daily ──────────────────────────────────────────────────

describe("dateRange — daily", () => {
  it("start + periods = 5 gives 5 dates", () => {
    const r = dateRange({ start: "2024-01-01", periods: 5 });
    expect(r).toHaveLength(5);
    expect(ms(r[0] as Date)).toBe(ms(utc(2024, 1, 1)));
    expect(ms(r[4] as Date)).toBe(ms(utc(2024, 1, 5)));
  });

  it("start + end covers the range", () => {
    const r = dateRange({ start: "2024-01-01", end: "2024-01-05" });
    expect(r).toHaveLength(5);
  });

  it("consecutive dates are 1 day apart", () => {
    const r = dateRange({ start: "2024-03-28", periods: 5 });
    for (let i = 1; i < r.length; i++) {
      expect((r[i] as Date).getTime() - (r[i - 1] as Date).getTime()).toBe(86_400_000);
    }
  });

  it("end + periods gives correct start", () => {
    const r = dateRange({ end: "2024-01-05", periods: 5 });
    expect(r).toHaveLength(5);
    expect(ms(r[0] as Date)).toBe(ms(utc(2024, 1, 1)));
    expect(ms(r[4] as Date)).toBe(ms(utc(2024, 1, 5)));
  });
});

// ─── dateRange — inclusive ────────────────────────────────────────────────────

describe("dateRange — inclusive", () => {
  it("'both' includes start and end", () => {
    const r = dateRange({ start: "2024-01-01", end: "2024-01-03", inclusive: "both" });
    expect(r).toHaveLength(3);
  });

  it("'neither' excludes start and end", () => {
    const r = dateRange({ start: "2024-01-01", end: "2024-01-05", inclusive: "neither" });
    expect(r).toHaveLength(3);
    expect(ms(r[0] as Date)).toBe(ms(utc(2024, 1, 2)));
    expect(ms(r[2] as Date)).toBe(ms(utc(2024, 1, 4)));
  });

  it("'left' excludes end only", () => {
    const r = dateRange({ start: "2024-01-01", end: "2024-01-04", inclusive: "left" });
    expect(r).toHaveLength(3);
    expect(ms(r[2] as Date)).toBe(ms(utc(2024, 1, 3)));
  });

  it("'right' excludes start only", () => {
    const r = dateRange({ start: "2024-01-01", end: "2024-01-04", inclusive: "right" });
    expect(r).toHaveLength(3);
    expect(ms(r[0] as Date)).toBe(ms(utc(2024, 1, 2)));
  });
});

// ─── dateRange — hourly ───────────────────────────────────────────────────────

describe("dateRange — hourly", () => {
  it("6 hours from midnight", () => {
    const r = dateRange({
      start: "2024-01-01T00:00:00Z",
      end: "2024-01-01T06:00:00Z",
      freq: "h",
    });
    expect(r).toHaveLength(7);
    expect(ms(r[6] as Date)).toBe(ms(utc(2024, 1, 1, 6)));
  });

  it("2-hourly gives half as many steps", () => {
    const r = dateRange({
      start: "2024-01-01T00:00:00Z",
      periods: 4,
      freq: "2H",
    });
    expect(r).toHaveLength(4);
    expect((r[3] as Date).getTime() - (r[0] as Date).getTime()).toBe(3 * 2 * 3_600_000);
  });
});

// ─── dateRange — business days ────────────────────────────────────────────────

describe("dateRange — business days", () => {
  it("5 business days starting Monday", () => {
    const r = dateRange({ start: "2024-01-01", periods: 5, freq: "B" }); // Mon 2024-01-01
    expect(r).toHaveLength(5);
    // Mon Tue Wed Thu Fri
    expect(ms(r[4] as Date)).toBe(ms(utc(2024, 1, 5)));
  });

  it("skips weekend: Friday → Monday", () => {
    const r = dateRange({ start: "2024-01-05", periods: 2, freq: "B" }); // Fri
    expect(ms(r[1] as Date)).toBe(ms(utc(2024, 1, 8)));
  });
});

// ─── dateRange — weekly ───────────────────────────────────────────────────────

describe("dateRange — weekly", () => {
  it("4 weekly dates land on Sundays", () => {
    const r = dateRange({ start: "2024-01-01", periods: 4, freq: "W" }); // Mon start
    for (const d of r) {
      expect(d.getUTCDay()).toBe(0); // Sunday
    }
    expect(r).toHaveLength(4);
  });

  it("W-MON lands on Mondays", () => {
    const r = dateRange({ start: "2024-01-01", periods: 3, freq: "W-MON" }); // Mon start
    for (const d of r) {
      expect(d.getUTCDay()).toBe(1);
    }
  });
});

// ─── dateRange — month start/end ─────────────────────────────────────────────

describe("dateRange — MS", () => {
  it("generates 6 month-starts", () => {
    const r = dateRange({ start: "2024-01-01", periods: 6, freq: "MS" });
    expect(r).toHaveLength(6);
    for (const d of r) {
      expect(d.getUTCDate()).toBe(1);
    }
    expect(ms(r[5] as Date)).toBe(ms(utc(2024, 6, 1)));
  });

  it("ME: generates month-ends", () => {
    const r = dateRange({ start: "2024-01-31", periods: 3, freq: "ME" });
    expect(r).toHaveLength(3);
    const days = r.map((d) => d.getUTCDate());
    expect(days[0]).toBe(31); // Jan
    expect(days[1]).toBe(29); // Feb (leap)
    expect(days[2]).toBe(31); // Mar
  });
});

// ─── dateRange — quarter start/end ───────────────────────────────────────────

describe("dateRange — QS", () => {
  it("generates 4 quarter-starts", () => {
    const r = dateRange({ start: "2024-01-01", periods: 4, freq: "QS" });
    expect(r).toHaveLength(4);
    const months = r.map((d) => d.getUTCMonth() + 1);
    expect(months).toStrictEqual([1, 4, 7, 10]); // Jan Apr Jul Oct
  });

  it("QE: generates 4 quarter-ends", () => {
    const r = dateRange({ start: "2024-01-01", periods: 4, freq: "QE" });
    const months = r.map((d) => d.getUTCMonth() + 1);
    expect(months).toStrictEqual([3, 6, 9, 12]);
    expect(r[0]?.getUTCDate()).toBe(31); // Mar 31
    expect(r[1]?.getUTCDate()).toBe(30); // Jun 30
  });
});

// ─── dateRange — year start/end ───────────────────────────────────────────────

describe("dateRange — YS/YE", () => {
  it("YS generates Jan 1 for each year", () => {
    const r = dateRange({ start: "2024-01-01", periods: 3, freq: "YS" });
    expect(r).toHaveLength(3);
    const years = r.map((d) => d.getUTCFullYear());
    expect(years).toStrictEqual([2024, 2025, 2026]);
  });

  it("YE generates Dec 31 for each year", () => {
    const r = dateRange({ start: "2024-06-15", periods: 3, freq: "YE" });
    for (const d of r) {
      expect(d.getUTCMonth()).toBe(11);
      expect(d.getUTCDate()).toBe(31);
    }
  });

  it("A is alias for YE", () => {
    const r1 = dateRange({ start: "2024-06-15", periods: 2, freq: "YE" });
    const r2 = dateRange({ start: "2024-06-15", periods: 2, freq: "A" });
    expect(r1.map(ms)).toStrictEqual(r2.map(ms));
  });
});

// ─── dateRange — normalize ────────────────────────────────────────────────────

describe("dateRange — normalize", () => {
  it("snaps start to midnight UTC", () => {
    const r = dateRange({
      start: new Date("2024-01-01T15:30:00Z"),
      periods: 3,
      freq: "D",
      normalize: true,
    });
    expect(r[0]?.getUTCHours()).toBe(0);
    expect(r[0]?.getUTCMinutes()).toBe(0);
  });
});

// ─── dateRange — numeric / Date inputs ───────────────────────────────────────

describe("dateRange — input types", () => {
  it("accepts Date objects", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    const r = dateRange({ start, periods: 3 });
    expect(r).toHaveLength(3);
  });

  it("accepts numeric timestamps", () => {
    const ts = Date.UTC(2024, 0, 1);
    const r = dateRange({ start: ts, periods: 3 });
    expect(r).toHaveLength(3);
    expect(ms(r[0] as Date)).toBe(ts);
  });
});

// ─── dateRange — error cases ─────────────────────────────────────────────────

describe("dateRange — errors", () => {
  it("throws if fewer than two of start/end/periods are given", () => {
    expect(() => dateRange({ start: "2024-01-01" })).toThrow(RangeError);
  });

  it("throws for bad frequency", () => {
    expect(() => dateRange({ start: "2024-01-01", periods: 3, freq: "BOGUS" })).toThrow(RangeError);
  });

  it("returns empty array when start > end", () => {
    const r = dateRange({ start: "2024-01-10", end: "2024-01-05" });
    expect(r).toHaveLength(0);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("dateRange — property tests", () => {
  it("length equals periods for start+periods", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (periods) => {
        const r = dateRange({ start: "2024-01-01", periods });
        return r.length === periods;
      }),
    );
  });

  it("all dates are strictly ascending", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (periods) => {
        const r = dateRange({ start: "2024-01-01", periods, freq: "D" });
        for (let i = 1; i < r.length; i++) {
          if ((r[i] as Date).getTime() <= (r[i - 1] as Date).getTime()) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("end + periods recovers start correctly (daily)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 30 }), (periods) => {
        const end = "2024-06-30";
        const r = dateRange({ end, periods, freq: "D" });
        const expected = dateRange({ start: r[0] as Date, periods, freq: "D" });
        return r.map(ms).join() === expected.map(ms).join();
      }),
    );
  });

  it("start+end length ≥ start+periods for same step count", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (periods) => {
        const r = dateRange({ start: "2024-01-01", periods, freq: "D" });
        const last = r.at(-1);
        if (last === undefined) {
          return true;
        }
        const r2 = dateRange({ start: "2024-01-01", end: last, freq: "D" });
        return r2.length === r.length;
      }),
    );
  });
});
