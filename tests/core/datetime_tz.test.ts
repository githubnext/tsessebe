/**
 * Tests for TZDatetimeIndex, tz_localize, and tz_convert.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DatetimeIndex, date_range } from "../../src/core/date_range.ts";
import { TZDatetimeIndex, tz_convert, tz_localize } from "../../src/core/datetime_tz.ts";

// ─── tz_localize — UTC (offset = 0) ──────────────────────────────────────────

describe("tz_localize — UTC (identity)", () => {
  it("UTC offset is zero — timestamps unchanged", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const aware = tz_localize(naive, "UTC");
    expect(aware.tz).toBe("UTC");
    expect(aware.size).toBe(5);
    for (let i = 0; i < naive.size; i++) {
      expect(aware.at(i).getTime()).toBe(naive.at(i).getTime());
    }
  });

  it("preserves name", () => {
    const naive = date_range({ start: "2024-01-01", periods: 2, name: "my_index" });
    expect(tz_localize(naive, "UTC").name).toBe("my_index");
  });

  it("null name by default", () => {
    const naive = date_range({ start: "2024-01-01", periods: 1 });
    expect(tz_localize(naive, "UTC").name).toBeNull();
  });

  it("empty index", () => {
    const naive = date_range({ start: "2024-01-01", periods: 0 });
    const aware = tz_localize(naive, "UTC");
    expect(aware.size).toBe(0);
    expect(aware.empty).toBe(true);
  });
});

// ─── tz_localize — America/New_York ──────────────────────────────────────────

describe("tz_localize — America/New_York", () => {
  it("localizes midnight NYC (EST, UTC-5) → UTC+5h in January", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3, freq: "D" });
    const ny = tz_localize(naive, "America/New_York");

    expect(ny.tz).toBe("America/New_York");
    // 2024-01-01 00:00 EST → 2024-01-01T05:00Z
    expect(ny.at(0).toISOString()).toBe("2024-01-01T05:00:00.000Z");
    expect(ny.at(1).toISOString()).toBe("2024-01-02T05:00:00.000Z");
    expect(ny.at(2).toISOString()).toBe("2024-01-03T05:00:00.000Z");
  });

  it("localizes midnight NYC (EDT, UTC-4) → UTC+4h in July", () => {
    const naive = date_range({ start: "2024-07-04", periods: 2, freq: "D" });
    const ny = tz_localize(naive, "America/New_York");

    // 2024-07-04 00:00 EDT → 2024-07-04T04:00Z
    expect(ny.at(0).toISOString()).toBe("2024-07-04T04:00:00.000Z");
    expect(ny.at(1).toISOString()).toBe("2024-07-05T04:00:00.000Z");
  });
});

// ─── tz_localize — Asia/Kolkata (UTC+5:30) ───────────────────────────────────

describe("tz_localize — Asia/Kolkata (UTC+5:30)", () => {
  it("localizes midnight IST → UTC-5h30m", () => {
    const naive = date_range({ start: "2024-06-15", periods: 2, freq: "D" });
    const ist = tz_localize(naive, "Asia/Kolkata");

    // 2024-06-15 00:00 IST → 2024-06-14T18:30Z
    expect(ist.at(0).toISOString()).toBe("2024-06-14T18:30:00.000Z");
    expect(ist.at(1).toISOString()).toBe("2024-06-15T18:30:00.000Z");
  });
});

// ─── tz_convert ───────────────────────────────────────────────────────────────

describe("tz_convert — basic", () => {
  it("converting to UTC preserves timestamps (same ms values)", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3 });
    const ny = tz_localize(naive, "America/New_York");
    const utcIdx = tz_convert(ny, "UTC");

    expect(utcIdx.tz).toBe("UTC");
    for (let i = 0; i < ny.size; i++) {
      expect(utcIdx.at(i).getTime()).toBe(ny.at(i).getTime());
    }
  });

  it("UTC timestamps preserved when converting between arbitrary timezones", () => {
    const naive = date_range({ start: "2024-06-15", periods: 2 });
    const ist = tz_localize(naive, "Asia/Kolkata");
    const london = tz_convert(ist, "Europe/London");

    expect(london.tz).toBe("Europe/London");
    for (let i = 0; i < ist.size; i++) {
      expect(london.at(i).getTime()).toBe(ist.at(i).getTime());
    }
  });

  it("free-function tz_convert equals method tz_convert", () => {
    const naive = date_range({ start: "2024-03-01", periods: 4 });
    const ny = tz_localize(naive, "America/New_York");
    const via_fn = tz_convert(ny, "Europe/Paris");
    const via_method = ny.tz_convert("Europe/Paris");

    expect(via_fn.tz).toBe(via_method.tz);
    for (let i = 0; i < via_fn.size; i++) {
      expect(via_fn.at(i).getTime()).toBe(via_method.at(i).getTime());
    }
  });

  it("chained tz_convert stays on same UTC ms", () => {
    const idx = new TZDatetimeIndex([new Date("2024-08-01T12:00:00.000Z").getTime()], "UTC", null);
    const tokyo = tz_convert(idx, "Asia/Tokyo");
    const back = tz_convert(tokyo, "UTC");
    expect(back.at(0).getTime()).toBe(idx.at(0).getTime());
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("tz_localize → tz_convert round-trip", () => {
  it("localize then convert to UTC and strip give same result", () => {
    // Use a date well outside DST transition for stability
    const naive = date_range({ start: "2024-01-15", periods: 5, freq: "H" });
    const ny = tz_localize(naive, "America/New_York");
    const backToUtc = ny.tz_convert("UTC");
    const stripped = ny.tz_localize_none();

    for (let i = 0; i < ny.size; i++) {
      expect(backToUtc.at(i).getTime()).toBe(stripped.at(i).getTime());
    }
  });

  it("localize UTC is identity (tz_localize_none gives original ms)", () => {
    const naive = date_range({ start: "2024-03-01", periods: 8, freq: "H" });
    const aware = tz_localize(naive, "UTC");
    for (let i = 0; i < naive.size; i++) {
      expect(aware.at(i).getTime()).toBe(naive.at(i).getTime());
    }
  });
});

// ─── TZDatetimeIndex properties ───────────────────────────────────────────────

describe("TZDatetimeIndex properties", () => {
  const base = () => tz_localize(date_range({ start: "2024-01-01", periods: 3 }), "UTC");

  it("ndim is 1", () => {
    expect(base().ndim).toBe(1);
  });

  it("shape matches size", () => {
    const idx = base();
    expect(idx.shape).toEqual([3]);
    expect(idx.shape[0]).toBe(idx.size);
  });

  it("values is readonly array of UTC ms numbers", () => {
    const idx = base();
    expect(idx.values.length).toBe(3);
    expect(typeof idx.values[0]).toBe("number");
    expect(idx.values[0]).toBe(new Date("2024-01-01").getTime());
  });

  it("at throws RangeError out of bounds", () => {
    const idx = base();
    expect(() => idx.at(10)).toThrow(RangeError);
    expect(() => idx.at(-1)).toThrow(RangeError);
  });

  it("empty index is empty", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 0 }), "UTC");
    expect(idx.empty).toBe(true);
    expect(idx.size).toBe(0);
  });
});

// ─── TZDatetimeIndex.toArray / toTimestamps ───────────────────────────────────

describe("TZDatetimeIndex.toArray / toTimestamps", () => {
  it("toArray returns Date objects", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 2 }), "UTC");
    const arr = idx.toArray();
    expect(arr.length).toBe(2);
    expect(arr[0] instanceof Date).toBe(true);
  });

  it("toTimestamps returns numbers equal to values", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 2 }), "UTC");
    const ts = idx.toTimestamps();
    expect(ts.length).toBe(2);
    expect(ts[0]).toBe(idx.values[0]);
    expect(ts[1]).toBe(idx.values[1]);
  });

  it("toArray and toTimestamps are mutable copies (not frozen)", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 2 }), "UTC");
    const arr = idx.toArray();
    const ts = idx.toTimestamps();
    arr[0] = new Date(0);
    ts[0] = 0;
    // originals unchanged
    expect(idx.at(0).getTime()).not.toBe(0);
  });
});

// ─── TZDatetimeIndex.toLocalStrings ───────────────────────────────────────────

describe("TZDatetimeIndex.toLocalStrings", () => {
  it("UTC produces +00:00 offset strings", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 1 }), "UTC");
    const strs = idx.toLocalStrings();
    expect(strs.length).toBe(1);
    expect(strs[0]).toContain("+00:00");
    expect(strs[0]).toContain("2024-01-01");
  });

  it("NYC January shows -05:00 and correct date", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 1 }), "America/New_York");
    const s = idx.toLocalStrings()[0] ?? "";
    expect(s).toContain("-05:00");
    expect(s).toContain("2024-01-01T00:00:00.000");
  });

  it("NYC July shows -04:00 (EDT)", () => {
    const idx = tz_localize(date_range({ start: "2024-07-04", periods: 1 }), "America/New_York");
    const s = idx.toLocalStrings()[0] ?? "";
    expect(s).toContain("-04:00");
    expect(s).toContain("2024-07-04T00:00:00.000");
  });

  it("IST shows +05:30", () => {
    const idx = tz_localize(date_range({ start: "2024-06-01", periods: 1 }), "Asia/Kolkata");
    const s = idx.toLocalStrings()[0] ?? "";
    expect(s).toContain("+05:30");
    expect(s).toContain("2024-06-01T00:00:00.000");
  });

  it("after tz_convert London in winter shows +00:00", () => {
    // NY Jan → UTC → London
    const ny = tz_localize(date_range({ start: "2024-01-15", periods: 1 }), "America/New_York");
    const london = ny.tz_convert("Europe/London");
    const s = london.toLocalStrings()[0] ?? "";
    expect(s).toContain("+00:00"); // London is UTC+0 in January
  });
});

// ─── TZDatetimeIndex.tz_localize_none ────────────────────────────────────────

describe("TZDatetimeIndex.tz_localize_none", () => {
  it("returns DatetimeIndex with same UTC ms", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3 });
    const ny = tz_localize(naive, "America/New_York");
    const stripped = ny.tz_localize_none();

    expect(stripped.size).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(stripped.at(i).getTime()).toBe(ny.at(i).getTime());
    }
  });

  it("preserves name", () => {
    const naive = date_range({ start: "2024-01-01", periods: 1, name: "foo" });
    const stripped = tz_localize(naive, "UTC").tz_localize_none();
    expect(stripped.name).toBe("foo");
  });
});

// ─── TZDatetimeIndex.min / max ───────────────────────────────────────────────

describe("TZDatetimeIndex.min / max", () => {
  it("empty index returns null for both", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 0 }), "UTC");
    expect(idx.min()).toBeNull();
    expect(idx.max()).toBeNull();
  });

  it("min returns earliest UTC Date", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const idx = tz_localize(naive, "UTC");
    expect(idx.min()?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("max returns latest UTC Date", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const idx = tz_localize(naive, "UTC");
    expect(idx.max()?.toISOString()).toBe("2024-01-05T00:00:00.000Z");
  });

  it("single element: min === max", () => {
    const idx = tz_localize(DatetimeIndex.fromDates([new Date("2024-06-01T00:00:00Z")]), "UTC");
    expect(idx.min()?.getTime()).toBe(idx.max()?.getTime());
  });
});

// ─── TZDatetimeIndex.sort ─────────────────────────────────────────────────────

describe("TZDatetimeIndex.sort", () => {
  it("ascending sort puts earliest first", () => {
    const dates = [
      new Date("2024-03-01T00:00:00Z"),
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-02-01T00:00:00Z"),
    ];
    const naive = DatetimeIndex.fromDates(dates);
    const idx = tz_localize(naive, "UTC").sort();
    expect(idx.at(0).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(idx.at(1).toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(idx.at(2).toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });

  it("descending sort puts latest first", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3, freq: "D" });
    const idx = tz_localize(naive, "UTC").sort(false);
    expect(idx.at(0).toISOString()).toBe("2024-01-03T00:00:00.000Z");
    expect(idx.at(2).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("preserves tz after sort", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 3 }), "America/New_York");
    expect(idx.sort().tz).toBe("America/New_York");
  });
});

// ─── TZDatetimeIndex.unique ───────────────────────────────────────────────────

describe("TZDatetimeIndex.unique", () => {
  it("removes duplicate UTC timestamps", () => {
    const d = new Date("2024-01-01T00:00:00Z");
    const naive = DatetimeIndex.fromDates([d, d, d]);
    const idx = tz_localize(naive, "UTC").unique();
    expect(idx.size).toBe(1);
  });

  it("preserves distinct timestamps", () => {
    const naive = date_range({ start: "2024-01-01", periods: 4, freq: "D" });
    expect(tz_localize(naive, "UTC").unique().size).toBe(4);
  });
});

// ─── TZDatetimeIndex.filter ───────────────────────────────────────────────────

describe("TZDatetimeIndex.filter", () => {
  it("filters by index position", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const idx = tz_localize(naive, "UTC");
    const even = idx.filter((_, i) => i % 2 === 0);
    expect(even.size).toBe(3);
    expect(even.tz).toBe("UTC");
  });

  it("filter by Date value", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const idx = tz_localize(naive, "UTC");
    const cutoff = new Date("2024-01-03T00:00:00Z");
    const before = idx.filter((d) => d.getTime() <= cutoff.getTime());
    expect(before.size).toBe(3);
  });
});

// ─── TZDatetimeIndex.slice ───────────────────────────────────────────────────

describe("TZDatetimeIndex.slice", () => {
  it("slices correctly", () => {
    const naive = date_range({ start: "2024-01-01", periods: 5, freq: "D" });
    const idx = tz_localize(naive, "UTC").slice(1, 3);
    expect(idx.size).toBe(2);
    expect(idx.at(0).toISOString()).toBe("2024-01-02T00:00:00.000Z");
    expect(idx.at(1).toISOString()).toBe("2024-01-03T00:00:00.000Z");
  });

  it("slice preserves tz", () => {
    const idx = tz_localize(date_range({ start: "2024-01-01", periods: 5 }), "Asia/Tokyo");
    expect(idx.slice(0, 2).tz).toBe("Asia/Tokyo");
  });
});

// ─── TZDatetimeIndex.concat ───────────────────────────────────────────────────

describe("TZDatetimeIndex.concat", () => {
  it("concatenates same-tz indexes", () => {
    const a = tz_localize(date_range({ start: "2024-01-01", periods: 2 }), "UTC");
    const b = tz_localize(date_range({ start: "2024-01-03", periods: 2 }), "UTC");
    const c = a.concat(b);
    expect(c.size).toBe(4);
    expect(c.tz).toBe("UTC");
    expect(c.at(2).toISOString()).toBe(b.at(0).toISOString());
  });

  it("throws RangeError on timezone mismatch", () => {
    const a = tz_localize(date_range({ start: "2024-01-01", periods: 1 }), "UTC");
    const b = tz_localize(date_range({ start: "2024-01-02", periods: 1 }), "America/New_York");
    expect(() => a.concat(b)).toThrow(RangeError);
  });
});

// ─── TZDatetimeIndex.contains ────────────────────────────────────────────────

describe("TZDatetimeIndex.contains", () => {
  it("returns true for a present UTC Date", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3 });
    const idx = tz_localize(naive, "UTC");
    expect(idx.contains(new Date("2024-01-01T00:00:00.000Z"))).toBe(true);
    expect(idx.contains(new Date("2024-01-03T00:00:00.000Z"))).toBe(true);
  });

  it("returns false for absent timestamp", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3 });
    const idx = tz_localize(naive, "UTC");
    expect(idx.contains(new Date("2025-06-01T00:00:00.000Z"))).toBe(false);
  });
});

// ─── TZDatetimeIndex iteration ────────────────────────────────────────────────

describe("TZDatetimeIndex [Symbol.iterator]", () => {
  it("iterates as Date objects with correct count", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3 });
    const idx = tz_localize(naive, "UTC");
    const collected: Date[] = [];
    for (const d of idx) {
      collected.push(d);
    }
    expect(collected.length).toBe(3);
    expect(collected[0] instanceof Date).toBe(true);
  });

  it("iterates in UTC ms order", () => {
    const naive = date_range({ start: "2024-01-01", periods: 3, freq: "D" });
    const idx = tz_localize(naive, "UTC");
    const times = [...idx].map((d) => d.getTime());
    const t0 = times[0];
    const t1 = times[1];
    const t2 = times[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) {
      throw new Error("Expected 3 timestamps");
    }
    expect(t1 - t0).toBe(86_400_000);
    expect(t2 - t1).toBe(86_400_000);
  });
});

// ─── DST edge cases ───────────────────────────────────────────────────────────

describe("tz_localize — DST: spring-forward (America/New_York 2024-03-10)", () => {
  it("03:00 AM after spring-forward is EDT (UTC-4) → 07:00Z", () => {
    // Spring-forward happens at 2024-03-10 02:00 EST → clocks jump to 03:00 EDT.
    // Wall clock 03:00 on that day = 03:00 EDT (UTC-4) → 07:00Z
    const naive = DatetimeIndex.fromDates([new Date(Date.UTC(2024, 2, 10, 3, 0, 0))]);
    const aware = tz_localize(naive, "America/New_York");
    expect(aware.at(0).toISOString()).toBe("2024-03-10T07:00:00.000Z");
  });
});

describe("tz_localize — DST: fall-back (America/New_York 2024-11-03)", () => {
  it("01:30 AM (ambiguous) uses pre-transition EDT (UTC-4) → 05:30Z", () => {
    // Fall-back at 2024-11-03 02:00 EDT → clocks fall to 01:00 EST.
    // 01:30 is ambiguous; we use the pre-transition (EDT, UTC-4) occurrence.
    const naive = DatetimeIndex.fromDates([new Date(Date.UTC(2024, 10, 3, 1, 30, 0))]);
    const aware = tz_localize(naive, "America/New_York");
    expect(aware.at(0).toISOString()).toBe("2024-11-03T05:30:00.000Z");
  });
});

// ─── property tests ──────────────────────────────────────────────────────────

describe("property tests", () => {
  it("UTC round-trip: tz_localize('UTC').at(i) equals naive.at(i)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 364 }), (offset) => {
        const baseMs = new Date("2024-01-01T00:00:00.000Z").getTime();
        const ms = baseMs + offset * 86_400_000;
        const naive = DatetimeIndex.fromDates([new Date(ms)]);
        const aware = tz_localize(naive, "UTC");
        return aware.at(0).getTime() === ms;
      }),
    );
  });

  it("tz_convert preserves UTC ms across timezone pairs", () => {
    const tzPairs: [string, string][] = [
      ["America/New_York", "UTC"],
      ["Asia/Kolkata", "Europe/London"],
      ["UTC", "Pacific/Auckland"],
    ];
    for (const [fromTz, toTz] of tzPairs) {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 364 }), (offset) => {
          const baseMs = new Date("2024-01-01T00:00:00.000Z").getTime();
          const ms = baseMs + offset * 86_400_000;
          const naive = DatetimeIndex.fromDates([new Date(ms)]);
          const src = tz_localize(naive, fromTz);
          const dst = tz_convert(src, toTz);
          return dst.at(0).getTime() === src.at(0).getTime();
        }),
      );
    }
  });

  it("filter complement partition: evens + odds = total", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (n) => {
        const naive = date_range({ start: "2024-01-01", periods: n, freq: "D" });
        const idx = tz_localize(naive, "UTC");
        const evens = idx.filter((_, i) => i % 2 === 0);
        const odds = idx.filter((_, i) => i % 2 !== 0);
        return evens.size + odds.size === n;
      }),
    );
  });

  it("sort(asc).min() === sort(desc).max() for non-empty indexes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (n) => {
        const naive = date_range({ start: "2024-01-01", periods: n, freq: "D" });
        const idx = tz_localize(naive, "UTC");
        const sortedAsc = idx.sort(true);
        const sortedDesc = idx.sort(false);
        return sortedAsc.at(0).getTime() === sortedDesc.at(n - 1).getTime();
      }),
    );
  });

  it("unique().size <= size", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), (n) => {
        const naive = date_range({ start: "2024-01-01", periods: n, freq: "D" });
        const idx = tz_localize(naive, "UTC");
        return idx.unique().size <= idx.size;
      }),
    );
  });
});
