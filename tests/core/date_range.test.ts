/**
 * Tests for DatetimeIndex, date_range, and bdate_range.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  BusinessDay,
  Day,
  Hour,
  MonthBegin,
  MonthEnd,
  YearBegin,
  YearEnd,
} from "../../src/core/date_offset.ts";
import { DatetimeIndex, bdate_range, date_range, resolveFreq } from "../../src/core/date_range.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const utc = (y: number, m: number, d: number, h = 0, min = 0, s = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min, s));

// ─── DatetimeIndex.fromDates ──────────────────────────────────────────────────

describe("DatetimeIndex.fromDates", () => {
  it("stores dates in order", () => {
    const d1 = utc(2024, 1, 1);
    const d2 = utc(2024, 1, 2);
    const idx = DatetimeIndex.fromDates([d1, d2]);
    expect(idx.size).toBe(2);
    expect(idx.at(0).getTime()).toBe(d1.getTime());
    expect(idx.at(1).getTime()).toBe(d2.getTime());
  });

  it("empty index", () => {
    const idx = DatetimeIndex.fromDates([]);
    expect(idx.size).toBe(0);
    expect(idx.empty).toBe(true);
  });

  it("preserves name", () => {
    const idx = DatetimeIndex.fromDates([], "my_index");
    expect(idx.name).toBe("my_index");
  });

  it("default name is null", () => {
    expect(DatetimeIndex.fromDates([]).name).toBeNull();
  });
});

// ─── DatetimeIndex.fromTimestamps ─────────────────────────────────────────────

describe("DatetimeIndex.fromTimestamps", () => {
  it("converts ms to dates", () => {
    const idx = DatetimeIndex.fromTimestamps([0, 86_400_000]);
    expect(idx.at(0).getTime()).toBe(0);
    expect(idx.at(1).getTime()).toBe(86_400_000);
  });
});

// ─── DatetimeIndex properties ─────────────────────────────────────────────────

describe("DatetimeIndex properties", () => {
  it("ndim is 1", () => {
    expect(DatetimeIndex.fromDates([]).ndim).toBe(1);
  });

  it("shape matches size", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 1, 1)]);
    expect(idx.shape).toEqual([1]);
  });

  it("values returns readonly array", () => {
    const d = utc(2024, 3, 15);
    const idx = DatetimeIndex.fromDates([d]);
    expect(idx.values[0]?.getTime()).toBe(d.getTime());
  });

  it("toArray returns mutable copy", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 1, 1)]);
    const arr = idx.toArray();
    arr.push(utc(2024, 1, 2)); // should not affect original
    expect(idx.size).toBe(1);
  });

  it("at throws on out-of-bounds", () => {
    const idx = DatetimeIndex.fromDates([]);
    expect(() => idx.at(0)).toThrow(RangeError);
  });
});

// ─── DatetimeIndex.min / max ──────────────────────────────────────────────────

describe("DatetimeIndex min/max", () => {
  it("min returns earliest", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 3, 1), utc(2024, 1, 1), utc(2024, 6, 1)]);
    expect(idx.min()?.getTime()).toBe(utc(2024, 1, 1).getTime());
  });

  it("max returns latest", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 3, 1), utc(2024, 1, 1), utc(2024, 6, 1)]);
    expect(idx.max()?.getTime()).toBe(utc(2024, 6, 1).getTime());
  });

  it("min on empty returns null", () => {
    expect(DatetimeIndex.fromDates([]).min()).toBeNull();
  });

  it("max on empty returns null", () => {
    expect(DatetimeIndex.fromDates([]).max()).toBeNull();
  });

  it("min equals max for single element", () => {
    const d = utc(2024, 1, 1);
    const idx = DatetimeIndex.fromDates([d]);
    expect(idx.min()?.getTime()).toBe(d.getTime());
    expect(idx.max()?.getTime()).toBe(d.getTime());
  });
});

// ─── DatetimeIndex.sort ───────────────────────────────────────────────────────

describe("DatetimeIndex.sort", () => {
  it("ascending (default)", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 3, 1), utc(2024, 1, 1)]);
    const s = idx.sort();
    expect(s.at(0).getTime()).toBe(utc(2024, 1, 1).getTime());
    expect(s.at(1).getTime()).toBe(utc(2024, 3, 1).getTime());
  });

  it("descending", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 1, 1), utc(2024, 3, 1)]);
    const s = idx.sort(false);
    expect(s.at(0).getTime()).toBe(utc(2024, 3, 1).getTime());
  });

  it("does not mutate original", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 3, 1), utc(2024, 1, 1)]);
    idx.sort();
    expect(idx.at(0).getTime()).toBe(utc(2024, 3, 1).getTime()); // unchanged
  });
});

// ─── DatetimeIndex.unique ─────────────────────────────────────────────────────

describe("DatetimeIndex.unique", () => {
  it("removes duplicates", () => {
    const d = utc(2024, 1, 1);
    const idx = DatetimeIndex.fromDates([d, d, utc(2024, 1, 2)]);
    const u = idx.unique();
    expect(u.size).toBe(2);
  });

  it("preserves first occurrence order", () => {
    const d1 = utc(2024, 3, 1);
    const d2 = utc(2024, 1, 1);
    const idx = DatetimeIndex.fromDates([d1, d2, d1]);
    const u = idx.unique();
    expect(u.at(0).getTime()).toBe(d1.getTime());
    expect(u.at(1).getTime()).toBe(d2.getTime());
  });

  it("empty stays empty", () => {
    expect(DatetimeIndex.fromDates([]).unique().size).toBe(0);
  });
});

// ─── DatetimeIndex.filter ─────────────────────────────────────────────────────

describe("DatetimeIndex.filter", () => {
  it("keeps matching dates", () => {
    const idx = date_range({ start: "2024-01-01", periods: 5 });
    const filtered = idx.filter((d) => d.getUTCDate() % 2 === 1);
    expect(filtered.size).toBe(3); // Jan 1, 3, 5
  });

  it("empty result when nothing matches", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 1, 1)]);
    expect(idx.filter(() => false).size).toBe(0);
  });
});

// ─── DatetimeIndex.normalize ──────────────────────────────────────────────────

describe("DatetimeIndex.normalize", () => {
  it("floors to midnight UTC", () => {
    const idx = DatetimeIndex.fromDates([new Date("2024-03-15T14:30:00Z")]);
    const norm = idx.normalize();
    expect(norm.at(0).toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("already midnight stays unchanged", () => {
    const d = utc(2024, 1, 1);
    const idx = DatetimeIndex.fromDates([d]);
    expect(idx.normalize().at(0).getTime()).toBe(d.getTime());
  });
});

// ─── DatetimeIndex.shift ──────────────────────────────────────────────────────

describe("DatetimeIndex.shift", () => {
  it("shifts forward by n days using string freq", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3 });
    const shifted = idx.shift(7, "D");
    expect(shifted.at(0).toISOString()).toBe("2024-01-08T00:00:00.000Z");
    expect(shifted.at(1).toISOString()).toBe("2024-01-09T00:00:00.000Z");
  });

  it("shifts backward with negative n", () => {
    const idx = date_range({ start: "2024-01-08", periods: 2 });
    const shifted = idx.shift(-7, "D");
    expect(shifted.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("n=0 returns equal index", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3 });
    const shifted = idx.shift(0, "D");
    expect(shifted.at(0).getTime()).toBe(idx.at(0).getTime());
  });

  it("shifts by hour", () => {
    const idx = date_range({ start: "2024-01-01", periods: 2, freq: "H" });
    const shifted = idx.shift(3, "H");
    expect(shifted.at(0).toISOString()).toBe("2024-01-01T03:00:00.000Z");
  });
});

// ─── DatetimeIndex.snap ───────────────────────────────────────────────────────

describe("DatetimeIndex.snap", () => {
  it("snaps to month-start", () => {
    const idx = DatetimeIndex.fromDates([new Date("2024-01-15T00:00:00Z")]);
    const snapped = idx.snap("MS");
    expect(snapped.at(0).toISOString()).toBe("2024-02-01T00:00:00.000Z");
  });

  it("already on anchor stays", () => {
    const idx = DatetimeIndex.fromDates([new Date("2024-01-01T00:00:00Z")]);
    const snapped = idx.snap("MS");
    expect(snapped.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });
});

// ─── DatetimeIndex.slice ──────────────────────────────────────────────────────

describe("DatetimeIndex.slice", () => {
  it("slices range", () => {
    const idx = date_range({ start: "2024-01-01", periods: 5 });
    const sl = idx.slice(1, 3);
    expect(sl.size).toBe(2);
    expect(sl.at(0).toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });

  it("slice to end", () => {
    const idx = date_range({ start: "2024-01-01", periods: 5 });
    expect(idx.slice(3).size).toBe(2);
  });
});

// ─── DatetimeIndex.concat ─────────────────────────────────────────────────────

describe("DatetimeIndex.concat", () => {
  it("appends other after self", () => {
    const a = date_range({ start: "2024-01-01", periods: 2 });
    const b = date_range({ start: "2024-01-03", periods: 2 });
    const c = a.concat(b);
    expect(c.size).toBe(4);
    expect(c.at(2).toISOString()).toBe("2024-01-03T00:00:00.000Z");
  });
});

// ─── DatetimeIndex.contains ───────────────────────────────────────────────────

describe("DatetimeIndex.contains", () => {
  it("returns true for present date", () => {
    const d = utc(2024, 1, 1);
    const idx = DatetimeIndex.fromDates([d]);
    expect(idx.contains(new Date(d.getTime()))).toBe(true);
  });

  it("returns false for absent date", () => {
    const idx = DatetimeIndex.fromDates([utc(2024, 1, 1)]);
    expect(idx.contains(utc(2024, 1, 2))).toBe(false);
  });
});

// ─── DatetimeIndex.toStrings ──────────────────────────────────────────────────

describe("DatetimeIndex.toStrings", () => {
  it("produces ISO strings", () => {
    const idx = date_range({ start: "2024-01-01", periods: 2 });
    expect(idx.toStrings()).toEqual(["2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z"]);
  });
});

// ─── DatetimeIndex iterator ───────────────────────────────────────────────────

describe("DatetimeIndex iteration", () => {
  it("iterates with for-of", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3 });
    const collected: number[] = [];
    for (const d of idx) {
      collected.push(d.getUTCDate());
    }
    expect(collected).toEqual([1, 2, 3]);
  });
});

// ─── resolveFreq ─────────────────────────────────────────────────────────────

describe("resolveFreq", () => {
  it("D → Day(1)", () => {
    const off = resolveFreq("D");
    expect(off.name).toBe("Day");
    expect(off.n).toBe(1);
  });

  it("B → BusinessDay(1)", () => {
    expect(resolveFreq("B").name).toBe("BusinessDay");
  });

  it("MS → MonthBegin(1)", () => {
    expect(resolveFreq("MS").name).toBe("MonthBegin");
  });

  it("QS → MonthBegin(3)", () => {
    const off = resolveFreq("QS");
    expect(off.name).toBe("MonthBegin");
    expect(off.n).toBe(3);
  });

  it("QS with n=2 → MonthBegin(6)", () => {
    const off = resolveFreq("QS", 2);
    expect(off.n).toBe(6);
  });

  it("pass-through DateOffset object", () => {
    const d = new Day(7);
    expect(resolveFreq(d)).toBe(d);
  });
});

// ─── date_range: start + end ──────────────────────────────────────────────────

describe("date_range — start + end", () => {
  it("daily range Jan 1–5", () => {
    const idx = date_range({ start: "2024-01-01", end: "2024-01-05" });
    expect(idx.size).toBe(5);
    expect(idx.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(idx.at(4).toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("single date when start == end", () => {
    const idx = date_range({ start: "2024-01-01", end: "2024-01-01" });
    expect(idx.size).toBe(1);
  });

  it("empty when start > end", () => {
    const idx = date_range({ start: "2024-01-10", end: "2024-01-01" });
    expect(idx.size).toBe(0);
  });

  it("hourly range", () => {
    const idx = date_range({ start: "2024-01-01", end: "2024-01-01T03:00:00Z", freq: "H" });
    expect(idx.size).toBe(4);
  });

  it("monthly range (MS)", () => {
    const idx = date_range({ start: "2024-01-01", end: "2024-06-01", freq: "MS" });
    expect(idx.size).toBe(6);
    expect(idx.at(1).toISOString()).toBe("2024-02-01T00:00:00.000Z");
  });

  it("month-end range (ME)", () => {
    const idx = date_range({ start: "2024-01-31", end: "2024-04-30", freq: "ME" });
    expect(idx.size).toBe(4);
    expect(idx.at(0).toISOString()).toBe("2024-01-31T00:00:00.000Z");
    expect(idx.at(3).toISOString()).toBe("2024-04-30T00:00:00.000Z");
  });

  it("year-start range (AS)", () => {
    const idx = date_range({ start: "2024-01-01", end: "2026-01-01", freq: "AS" });
    expect(idx.size).toBe(3);
  });

  it("accepts Date objects", () => {
    const idx = date_range({ start: new Date("2024-01-01"), end: new Date("2024-01-03") });
    expect(idx.size).toBe(3);
  });

  it("assigns name", () => {
    const idx = date_range({ start: "2024-01-01", end: "2024-01-03", name: "dates" });
    expect(idx.name).toBe("dates");
  });

  it("normalize floors start and end to midnight", () => {
    const idx = date_range({
      start: "2024-01-01T12:00:00Z",
      end: "2024-01-03T18:00:00Z",
      normalize: true,
    });
    expect(idx.size).toBe(3);
    expect(idx.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });
});

// ─── date_range: start + periods ──────────────────────────────────────────────

describe("date_range — start + periods", () => {
  it("5 daily periods from Jan 1", () => {
    const idx = date_range({ start: "2024-01-01", periods: 5 });
    expect(idx.size).toBe(5);
    expect(idx.at(4).toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("periods=0 returns empty", () => {
    const idx = date_range({ start: "2024-01-01", periods: 0 });
    expect(idx.size).toBe(0);
  });

  it("1 period returns single date", () => {
    const idx = date_range({ start: "2024-01-01", periods: 1 });
    expect(idx.size).toBe(1);
  });

  it("hourly periods", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3, freq: "H" });
    expect(idx.at(2).toISOString()).toBe("2024-01-01T02:00:00.000Z");
  });

  it("monthly periods (MS)", () => {
    const idx = date_range({ start: "2024-01-01", periods: 4, freq: "MS" });
    expect(idx.size).toBe(4);
    expect(idx.at(3).toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });

  it("quarterly periods (QS)", () => {
    const idx = date_range({ start: "2024-01-01", periods: 4, freq: "QS" });
    expect(idx.size).toBe(4);
    expect(idx.at(1).toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });

  it("YE periods", () => {
    const idx = date_range({ start: "2024-12-31", periods: 3, freq: "YE" });
    expect(idx.at(0).toISOString()).toBe("2024-12-31T00:00:00.000Z");
    expect(idx.at(1).toISOString()).toBe("2025-12-31T00:00:00.000Z");
  });

  it("week periods", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3, freq: "W" });
    expect(idx.size).toBe(3);
    expect(idx.at(1).getTime() - idx.at(0).getTime()).toBe(7 * 86_400_000);
  });

  it("DateOffset object as freq", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3, freq: new Day(2) });
    expect(idx.at(1).toISOString()).toBe("2024-01-03T00:00:00.000Z");
  });
});

// ─── date_range: end + periods ────────────────────────────────────────────────

describe("date_range — end + periods", () => {
  it("3 daily periods ending Jan 10", () => {
    const idx = date_range({ end: "2024-01-10", periods: 3 });
    expect(idx.size).toBe(3);
    expect(idx.at(2).toISOString()).toBe("2024-01-10T00:00:00.000Z");
    expect(idx.at(0).toISOString()).toBe("2024-01-08T00:00:00.000Z");
  });

  it("periods=1 returns just end", () => {
    const idx = date_range({ end: "2024-06-15", periods: 1 });
    expect(idx.size).toBe(1);
    expect(idx.at(0).toISOString()).toBe("2024-06-15T00:00:00.000Z");
  });

  it("hourly, 4 periods ending at noon", () => {
    const idx = date_range({ end: "2024-01-01T03:00:00Z", periods: 4, freq: "H" });
    expect(idx.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(idx.at(3).toISOString()).toBe("2024-01-01T03:00:00.000Z");
  });

  it("monthly (MS) 3 periods ending April 1", () => {
    const idx = date_range({ end: "2024-04-01", periods: 3, freq: "MS" });
    expect(idx.at(0).toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(idx.at(2).toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });
});

// ─── date_range: error cases ──────────────────────────────────────────────────

describe("date_range — errors", () => {
  it("throws when neither start nor end given", () => {
    expect(() => date_range({ periods: 5 })).toThrow();
  });

  it("throws when only start given with no periods or end", () => {
    expect(() => date_range({ start: "2024-01-01" })).toThrow();
  });

  it("throws on invalid date string", () => {
    expect(() => date_range({ start: "not-a-date", periods: 3 })).toThrow(RangeError);
  });
});

// ─── bdate_range ─────────────────────────────────────────────────────────────

describe("bdate_range", () => {
  it("default freq is BusinessDay", () => {
    // 2024-01-01 is Monday; 5 business days → Mon–Fri
    const idx = bdate_range({ start: "2024-01-01", periods: 5 });
    expect(idx.size).toBe(5);
    expect(idx.at(4).toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("skips weekend: Mon + 1 business day = Tue", () => {
    // 2024-01-05 is Friday. One business day later = Monday 2024-01-08
    const idx = bdate_range({ start: "2024-01-05", periods: 2 });
    expect(idx.at(1).toISOString()).toBe("2024-01-08T00:00:00.000Z");
  });

  it("start+end with 'B' freq", () => {
    // Mon Jan 1 to Fri Jan 5 = 5 dates
    const idx = bdate_range({ start: "2024-01-01", end: "2024-01-05" });
    expect(idx.size).toBe(5);
  });

  it("start+end skips weekend", () => {
    // Mon Jan 1 → Mon Jan 8: Mon–Fri Jan 1–5, then Mon Jan 8 = 6
    const idx = bdate_range({ start: "2024-01-01", end: "2024-01-08" });
    expect(idx.size).toBe(6);
    // Jan 6 (Sat) and Jan 7 (Sun) should not be in the index
    const isoStrings = idx.toStrings();
    expect(isoStrings.includes("2024-01-06T00:00:00.000Z")).toBe(false);
    expect(isoStrings.includes("2024-01-07T00:00:00.000Z")).toBe(false);
  });

  it("end + periods", () => {
    // 2024-01-05 is Friday; 3 business days back: Thu Jan 4, Wed Jan 3, Fri Jan 5
    const idx = bdate_range({ end: "2024-01-05", periods: 3 });
    expect(idx.size).toBe(3);
    expect(idx.at(2).toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("custom freq overrides B default", () => {
    const idx = bdate_range({ start: "2024-01-01", periods: 3, freq: "D" });
    expect(idx.at(1).toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("date_range — property tests", () => {
  it("size matches periods (start+periods)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (n) => {
        const idx = date_range({ start: "2024-01-01", periods: n });
        return idx.size === n;
      }),
    );
  });

  it("first element equals start (start+periods, non-zero)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (n) => {
        const start = "2024-06-15";
        const idx = date_range({ start, periods: n });
        return idx.at(0).toISOString().startsWith("2024-06-15");
      }),
    );
  });

  it("last element equals end (start+end, daily)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 29 }), (extraDays) => {
        const start = new Date("2024-01-01T00:00:00Z");
        const end = new Date(start.getTime() + extraDays * 86_400_000);
        const idx = date_range({ start, end });
        if (idx.size === 0) {
          return true; // empty when start > end
        }
        const last = idx.at(idx.size - 1);
        return last.getTime() === end.getTime();
      }),
    );
  });

  it("sorted ascending after sort()", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 20 })
          .map((arr) => arr.map((n) => new Date(n * 86_400_000))),
        (dates) => {
          const idx = DatetimeIndex.fromDates(dates).sort();
          for (let i = 1; i < idx.size; i++) {
            if ((idx.at(i).getTime() ?? 0) < (idx.at(i - 1).getTime() ?? 0)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("unique has no duplicates", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 10 })
          .map((arr) => arr.map((n) => new Date(n * 86_400_000))),
        (dates) => {
          const idx = DatetimeIndex.fromDates(dates).unique();
          const ms = idx.toArray().map((d) => d.getTime());
          return new Set(ms).size === ms.length;
        },
      ),
    );
  });

  it("concat(a, b).size === a.size + b.size", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), (p1, p2) => {
        const a = date_range({ start: "2024-01-01", periods: p1 });
        const b = date_range({ start: "2025-01-01", periods: p2 });
        return a.concat(b).size === p1 + p2;
      }),
    );
  });

  it("bdate_range contains only weekdays (Mon–Fri)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (n) => {
        const idx = bdate_range({ start: "2024-01-01", periods: n });
        for (const d of idx) {
          const dow = d.getUTCDay();
          if (dow === 0 || dow === 6) {
            return false; // weekend
          }
        }
        return true;
      }),
    );
  });

  it("daily consecutive elements differ by exactly 1 day", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (n) => {
        const idx = date_range({ start: "2024-06-01", periods: n });
        for (let i = 1; i < idx.size; i++) {
          if (idx.at(i).getTime() - idx.at(i - 1).getTime() !== 86_400_000) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("shift(n) + shift(-n) round-trips for Day freq", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (n, periods) => {
          const idx = date_range({ start: "2024-01-15", periods });
          const shifted = idx.shift(n, "D").shift(-n, "D");
          for (let i = 0; i < idx.size; i++) {
            if (shifted.at(i).getTime() !== idx.at(i).getTime()) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── extra coverage: freq aliases ─────────────────────────────────────────────

describe("date_range freq aliases", () => {
  const aliases: [string, number][] = [
    ["T", 3],
    ["min", 3],
    ["S", 3],
    ["L", 3],
    ["ms", 3],
    ["QE", 3],
    ["AE", 3],
    ["AS", 3],
    ["YS", 3],
    ["YE", 3],
  ];

  for (const [freq, periods] of aliases) {
    it(`freq "${freq}" produces ${periods} elements`, () => {
      const idx = date_range({
        start: "2024-01-01",
        periods,
        freq: freq as import("../../src/core/date_range.ts").DateRangeFreq,
      });
      expect(idx.size).toBe(periods);
    });
  }

  it("QE produces quarter-ends", () => {
    const idx = date_range({ start: "2024-01-31", periods: 3, freq: "QE" });
    expect(idx.at(0).toISOString()).toBe("2024-01-31T00:00:00.000Z");
    expect(idx.at(1).toISOString()).toBe("2024-04-30T00:00:00.000Z");
  });

  it("AE produces year-ends", () => {
    const idx = date_range({ start: "2024-12-31", periods: 3, freq: "AE" });
    expect(idx.at(2).toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("AS/YS produces year-starts", () => {
    const idx = date_range({ start: "2024-01-01", periods: 3, freq: "AS" });
    expect(idx.at(2).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

// ─── DateOffset integration ───────────────────────────────────────────────────

describe("date_range with DateOffset objects", () => {
  it("MonthEnd(2) steps every 2 months", () => {
    const idx = date_range({ start: "2024-01-31", periods: 3, freq: new MonthEnd(2) });
    expect(idx.at(1).toISOString()).toBe("2024-03-31T00:00:00.000Z");
    expect(idx.at(2).toISOString()).toBe("2024-05-31T00:00:00.000Z");
  });

  it("MonthBegin with start+end", () => {
    const idx = date_range({
      start: "2024-01-01",
      end: "2024-06-01",
      freq: new MonthBegin(1),
    });
    expect(idx.size).toBe(6);
  });

  it("YearBegin over 5 years", () => {
    const idx = date_range({ start: "2020-01-01", periods: 5, freq: new YearBegin(1) });
    expect(idx.at(4).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("YearEnd start+periods", () => {
    const idx = date_range({ start: "2024-12-31", periods: 3, freq: new YearEnd(1) });
    expect(idx.at(2).toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("BusinessDay start+end", () => {
    const idx = date_range({
      start: "2024-01-01",
      end: "2024-01-05",
      freq: new BusinessDay(1),
    });
    expect(idx.size).toBe(5);
  });

  it("Hour(2) — every 2 hours", () => {
    const idx = date_range({ start: "2024-01-01", periods: 4, freq: new Hour(2) });
    expect(idx.at(3).toISOString()).toBe("2024-01-01T06:00:00.000Z");
  });
});
