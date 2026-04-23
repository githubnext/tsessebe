/**
 * Tests for timedelta_range — mirrors pandas' pd.timedelta_range tests.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Timedelta, timedelta_range } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function days(n: number): Timedelta {
  return Timedelta.fromMilliseconds(n * 86_400_000);
}

function hours(n: number): Timedelta {
  return Timedelta.fromMilliseconds(n * 3_600_000);
}

// ─── basic construction ───────────────────────────────────────────────────────

describe("timedelta_range — start + periods + freq", () => {
  it("generates N values from start", () => {
    const idx = timedelta_range({ start: "0 days", periods: 5, freq: "D" });
    expect(idx.size).toBe(5);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(1).totalDays).toBeCloseTo(1);
    expect(idx.at(4).totalDays).toBeCloseTo(4);
  });

  it("works with H freq", () => {
    const idx = timedelta_range({ start: "0 days", periods: 4, freq: "H" });
    expect(idx.size).toBe(4);
    expect(idx.at(0).totalHours).toBeCloseTo(0);
    expect(idx.at(3).totalHours).toBeCloseTo(3);
  });

  it("works with min / T freq", () => {
    const idxT = timedelta_range({ start: "0 days", periods: 3, freq: "T" });
    const idxMin = timedelta_range({ start: "0 days", periods: 3, freq: "min" });
    expect(idxT.size).toBe(3);
    expect(idxT.at(1).totalMilliseconds).toBe(60_000);
    expect(idxMin.at(1).totalMilliseconds).toBe(60_000);
  });

  it("works with S freq", () => {
    const idx = timedelta_range({ start: "0 days", periods: 5, freq: "S" });
    expect(idx.at(2).totalMilliseconds).toBe(2_000);
  });

  it("works with L / ms freq", () => {
    const idxL = timedelta_range({ start: "0 days", periods: 3, freq: "L" });
    const idxMs = timedelta_range({ start: "0 days", periods: 3, freq: "ms" });
    expect(idxL.at(2).totalMilliseconds).toBe(2);
    expect(idxMs.at(2).totalMilliseconds).toBe(2);
  });

  it("works with W freq", () => {
    const idx = timedelta_range({ start: "0 days", periods: 3, freq: "W" });
    expect(idx.at(1).totalDays).toBeCloseTo(7);
  });

  it("works with multiplier prefix: 2H", () => {
    const idx = timedelta_range({ start: "0 days", periods: 4, freq: "2H" });
    expect(idx.at(1).totalHours).toBeCloseTo(2);
    expect(idx.at(3).totalHours).toBeCloseTo(6);
  });

  it("works with multiplier prefix: 30min", () => {
    const idx = timedelta_range({ start: "0 days", periods: 5, freq: "30min" });
    expect(idx.at(1).totalMilliseconds).toBe(30 * 60_000);
  });

  it("generates 0 items when periods=0", () => {
    const idx = timedelta_range({ start: "0 days", periods: 0, freq: "D" });
    expect(idx.size).toBe(0);
  });

  it("generates 1 item when periods=1", () => {
    const idx = timedelta_range({ start: "1 days", periods: 1, freq: "D" });
    expect(idx.size).toBe(1);
    expect(idx.at(0).totalDays).toBeCloseTo(1);
  });

  it("accepts Timedelta object as start", () => {
    const idx = timedelta_range({ start: days(2), periods: 3, freq: "D" });
    expect(idx.at(0).totalDays).toBeCloseTo(2);
    expect(idx.at(2).totalDays).toBeCloseTo(4);
  });

  it("accepts numeric milliseconds as start", () => {
    const idx = timedelta_range({ start: 0, periods: 3, freq: "H" });
    expect(idx.at(1).totalHours).toBeCloseTo(1);
  });
});

describe("timedelta_range — end + periods + freq", () => {
  it("generates N values ending at end", () => {
    const idx = timedelta_range({ end: "4 days", periods: 5, freq: "D" });
    expect(idx.size).toBe(5);
    expect(idx.at(4).totalDays).toBeCloseTo(4);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
  });

  it("step is computed from freq, not from end/periods", () => {
    const idx = timedelta_range({ end: "3 days", periods: 4, freq: "D" });
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(3).totalDays).toBeCloseTo(3);
  });
});

describe("timedelta_range — start + end + freq", () => {
  it("goes from start to end by freq", () => {
    const idx = timedelta_range({ start: "1 days", end: "3 days", freq: "D" });
    expect(idx.size).toBe(3);
    expect(idx.at(0).totalDays).toBeCloseTo(1);
    expect(idx.at(2).totalDays).toBeCloseTo(3);
  });

  it("returns empty when start > end (positive freq)", () => {
    const idx = timedelta_range({ start: "3 days", end: "1 days", freq: "D" });
    expect(idx.size).toBe(0);
  });

  it("accepts string inputs for start and end", () => {
    const idx = timedelta_range({ start: "0 days 00:00:00", end: "0 days 02:00:00", freq: "H" });
    expect(idx.size).toBe(3);
    expect(idx.at(1).totalHours).toBeCloseTo(1);
  });

  it("freq as number (ms)", () => {
    const idx = timedelta_range({ start: 0, end: 3_600_000 * 2, freq: 3_600_000 });
    expect(idx.size).toBe(3);
    expect(idx.at(1).totalHours).toBeCloseTo(1);
  });
});

describe("timedelta_range — start + end + periods (linear spacing)", () => {
  it("linspace between 0 and 4 days with 5 periods", () => {
    const idx = timedelta_range({ start: "0 days", end: "4 days", periods: 5 });
    expect(idx.size).toBe(5);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(2).totalDays).toBeCloseTo(2);
    expect(idx.at(4).totalDays).toBeCloseTo(4);
  });

  it("linspace 2 values = just start and end", () => {
    const idx = timedelta_range({ start: "0 days", end: "6 days", periods: 2 });
    expect(idx.size).toBe(2);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(1).totalDays).toBeCloseTo(6);
  });

  it("linspace 1 value = just start", () => {
    const idx = timedelta_range({ start: "2 days", end: "4 days", periods: 1 });
    expect(idx.size).toBe(1);
    expect(idx.at(0).totalDays).toBeCloseTo(2);
  });

  it("linspace 0 values = empty", () => {
    const idx = timedelta_range({ start: "0 days", end: "4 days", periods: 0 });
    expect(idx.size).toBe(0);
  });
});

// ─── name option ─────────────────────────────────────────────────────────────

describe("timedelta_range — name option", () => {
  it("sets the name on the index", () => {
    const idx = timedelta_range({ start: "0 days", periods: 3, freq: "D", name: "my_index" });
    expect(idx.name).toBe("my_index");
  });

  it("name defaults to null", () => {
    const idx = timedelta_range({ start: "0 days", periods: 2, freq: "D" });
    expect(idx.name).toBeNull();
  });
});

// ─── closed option ────────────────────────────────────────────────────────────

describe("timedelta_range — closed option", () => {
  it("closed=both includes both endpoints (default)", () => {
    const idx = timedelta_range({ start: "0 days", end: "2 days", freq: "D", closed: "both" });
    expect(idx.size).toBe(3);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(2).totalDays).toBeCloseTo(2);
  });

  it("closed=left excludes end", () => {
    const idx = timedelta_range({ start: "0 days", end: "2 days", freq: "D", closed: "left" });
    expect(idx.size).toBe(2);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(1).totalDays).toBeCloseTo(1);
  });

  it("closed=right excludes start", () => {
    const idx = timedelta_range({ start: "0 days", end: "2 days", freq: "D", closed: "right" });
    expect(idx.size).toBe(2);
    expect(idx.at(0).totalDays).toBeCloseTo(1);
    expect(idx.at(1).totalDays).toBeCloseTo(2);
  });

  it("closed=neither excludes both endpoints", () => {
    const idx = timedelta_range({ start: "0 days", end: "3 days", freq: "D", closed: "neither" });
    expect(idx.size).toBe(2);
    expect(idx.at(0).totalDays).toBeCloseTo(1);
    expect(idx.at(1).totalDays).toBeCloseTo(2);
  });

  it("closed=null same as both", () => {
    const idx = timedelta_range({ start: "0 days", end: "2 days", freq: "D", closed: null });
    expect(idx.size).toBe(3);
  });
});

// ─── error cases ─────────────────────────────────────────────────────────────

describe("timedelta_range — error cases", () => {
  it("throws with fewer than 2 parameters", () => {
    expect(() => timedelta_range({ start: "0 days" })).toThrow();
    expect(() => timedelta_range({ periods: 3 })).toThrow();
    expect(() => timedelta_range({ freq: "D" })).toThrow();
  });

  it("throws with unknown freq unit", () => {
    expect(() => timedelta_range({ start: "0 days", periods: 3, freq: "Q" })).toThrow();
  });

  it("throws with negative periods", () => {
    expect(() => timedelta_range({ start: "0 days", periods: -1, freq: "D" })).toThrow();
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("timedelta_range — property-based", () => {
  it("start+periods+freq: size always equals periods", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        const idx = timedelta_range({ start: 0, periods: n, freq: "H" });
        return idx.size === n;
      }),
    );
  });

  it("start+end+freq: all values are between start and end (ascending)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (startD, rangeD) => {
          const startMs = startD * 86_400_000;
          const endMs = startMs + rangeD * 86_400_000;
          const idx = timedelta_range({ start: startMs, end: endMs, freq: "D" });
          for (let i = 0; i < idx.size; i++) {
            const v = idx.at(i).totalMilliseconds;
            if (v < startMs || v > endMs) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("start+end+periods: values are monotone and within bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (n, rangeH) => {
          const endMs = rangeH * 3_600_000;
          const idx = timedelta_range({ start: 0, end: endMs, periods: n });
          if (idx.size !== n) {
            return false;
          }
          for (let i = 1; i < idx.size; i++) {
            if (idx.at(i).totalMilliseconds < idx.at(i - 1).totalMilliseconds) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("closed=left always excludes end when end is in range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
        const endMs = n * 86_400_000;
        const idx = timedelta_range({ start: 0, end: endMs, freq: "D", closed: "left" });
        for (let i = 0; i < idx.size; i++) {
          if (idx.at(i).totalMilliseconds === endMs) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("closed=right always excludes start (0ms) when start is in range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
        const endMs = n * 86_400_000;
        const idx = timedelta_range({ start: 0, end: endMs, freq: "D", closed: "right" });
        for (let i = 0; i < idx.size; i++) {
          if (idx.at(i).totalMilliseconds === 0) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("step size is constant for start+end+freq", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 2, max: 20 }), (step, n) => {
        const endMs = step * n * 3_600_000;
        const freqStr = `${step}H` as const;
        const idx = timedelta_range({ start: 0, end: endMs, freq: freqStr });
        if (idx.size < 2) {
          return true;
        }
        const expectedStep = step * 3_600_000;
        for (let i = 1; i < idx.size; i++) {
          const diff = idx.at(i).totalMilliseconds - idx.at(i - 1).totalMilliseconds;
          if (Math.abs(diff - expectedStep) > 1) {
            return false;
          }
        }
        return true;
      }),
    );
  });
});

// ─── pandas parity tests ──────────────────────────────────────────────────────

describe("timedelta_range — pandas parity", () => {
  it("pd.timedelta_range('1 days', periods=4): [1,2,3,4] days", () => {
    const idx = timedelta_range({ start: "1 days", periods: 4, freq: "D" });
    expect(idx.size).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(idx.at(i).totalDays).toBeCloseTo(i + 1);
    }
  });

  it("pd.timedelta_range('1 days', '4 days'): [1,2,3,4] days", () => {
    const idx = timedelta_range({ start: "1 days", end: "4 days", freq: "D" });
    expect(idx.size).toBe(4);
    expect(idx.at(3).totalDays).toBeCloseTo(4);
  });

  it("pd.timedelta_range('1 days', periods=4, freq='6H'): 1d,1.25d,1.5d,1.75d", () => {
    const idx = timedelta_range({ start: "1 days", periods: 4, freq: "6H" });
    expect(idx.size).toBe(4);
    expect(idx.at(0).totalHours).toBeCloseTo(24);
    expect(idx.at(1).totalHours).toBeCloseTo(30);
    expect(idx.at(2).totalHours).toBeCloseTo(36);
    expect(idx.at(3).totalHours).toBeCloseTo(42);
  });

  it("pd.timedelta_range(end='5 days', periods=4, freq='D'): [2,3,4,5] days", () => {
    const idx = timedelta_range({ end: "5 days", periods: 4, freq: "D" });
    expect(idx.size).toBe(4);
    expect(idx.at(0).totalDays).toBeCloseTo(2);
    expect(idx.at(3).totalDays).toBeCloseTo(5);
  });

  it("pd.timedelta_range('0 days', '2 days', periods=5): linspace", () => {
    const idx = timedelta_range({ start: "0 days", end: "2 days", periods: 5 });
    expect(idx.size).toBe(5);
    expect(idx.at(0).totalDays).toBeCloseTo(0);
    expect(idx.at(2).totalDays).toBeCloseTo(1);
    expect(idx.at(4).totalDays).toBeCloseTo(2);
  });

  it("Timedelta objects as start/end", () => {
    const idx = timedelta_range({ start: days(1), end: days(3), freq: "D" });
    expect(idx.size).toBe(3);
    expect(idx.at(0).totalDays).toBeCloseTo(1);
    expect(idx.at(2).totalDays).toBeCloseTo(3);
  });

  it("hours(0) to hours(3) step H via Timedelta objects", () => {
    const idx = timedelta_range({ start: hours(0), end: hours(3), freq: "H" });
    expect(idx.size).toBe(4);
    expect(idx.at(2).totalHours).toBeCloseTo(2);
  });
});
