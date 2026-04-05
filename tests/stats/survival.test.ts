/**
 * Tests for Kaplan-Meier survival estimator and log-rank test.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { kaplanMeier, logRankTest } from "../../src/index.ts";
import type { SurvivalEvent } from "../../src/index.ts";

// ─── kaplanMeier ──────────────────────────────────────────────────────────────

describe("kaplanMeier", () => {
  it("throws on empty input", () => {
    expect(() => kaplanMeier([])).toThrow(RangeError);
  });

  it("all censored returns no event times", () => {
    const events: SurvivalEvent[] = [
      { time: 1, event: false },
      { time: 2, event: false },
    ];
    const km = kaplanMeier(events);
    expect(km.times).toHaveLength(0);
  });

  it("single event: S drops correctly", () => {
    const events: SurvivalEvent[] = [
      { time: 5, event: true },
      { time: 10, event: false },
    ];
    const km = kaplanMeier(events);
    expect(km.times).toEqual([5]);
    // At t=5: n=2, d=1, S = 1 * (2-1)/2 = 0.5
    expect(km.survivalProb[0]).toBeCloseTo(0.5, 8);
    expect(km.nAtRisk[0]).toBe(2);
    expect(km.nEvents[0]).toBe(1);
  });

  it("standard KM calculation", () => {
    const events: SurvivalEvent[] = [
      { time: 2, event: true },
      { time: 5, event: true },
      { time: 5, event: false },
      { time: 8, event: true },
      { time: 12, event: false },
    ];
    const km = kaplanMeier(events);
    // Event times: 2, 5, 8
    expect(km.times).toEqual([2, 5, 8]);
    // t=2: n=5, d=1, S=4/5=0.8
    expect(km.survivalProb[0]).toBeCloseTo(0.8, 8);
    // t=5: n=4, d=1, S=0.8*(3/4)=0.6
    expect(km.survivalProb[1]).toBeCloseTo(0.6, 8);
    // t=8: n=2, d=1, S=0.6*(1/2)=0.3
    expect(km.survivalProb[2]).toBeCloseTo(0.3, 8);
  });

  it("S(0) = 1 implicitly", () => {
    const events: SurvivalEvent[] = [{ time: 10, event: true }];
    const km = kaplanMeier(events);
    expect(km.survivalProb[0]).toBeCloseTo(0, 8);
  });

  it("medianSurvival is first t where S(t) <= 0.5", () => {
    const events: SurvivalEvent[] = [
      { time: 1, event: true },
      { time: 2, event: true },
      { time: 3, event: true },
    ];
    const km = kaplanMeier(events);
    // After t=2: n=3, d1+d2=2, S = (2/3)*(1/2) = 1/3 <= 0.5 => median=2
    expect(km.medianSurvival).toBe(2);
  });

  it("medianSurvival is null if S never reaches 0.5", () => {
    const events: SurvivalEvent[] = [
      { time: 10, event: false },
      { time: 20, event: false },
    ];
    const km = kaplanMeier(events);
    expect(km.medianSurvival).toBeNull();
  });

  it("survivalProb is non-increasing", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            time: fc.integer({ min: 1, max: 100 }),
            event: fc.boolean(),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        (evs) => {
          const eventsWithAtLeastOne = evs.some((e) => e.event)
            ? evs
            : evs.map((e, i) => (i === 0 ? { ...e, event: true } : e));
          const km = kaplanMeier(eventsWithAtLeastOne);
          for (let i = 1; i < km.survivalProb.length; i++) {
            if ((km.survivalProb[i] ?? 0) > (km.survivalProb[i - 1] ?? 0) + 1e-10) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── logRankTest ──────────────────────────────────────────────────────────────

describe("logRankTest", () => {
  it("throws on empty group", () => {
    expect(() => logRankTest([], [{ time: 1, event: true }])).toThrow(RangeError);
  });

  it("identical groups yield large p-value", () => {
    const group: SurvivalEvent[] = [
      { time: 2, event: true },
      { time: 5, event: false },
      { time: 8, event: true },
    ];
    const result = logRankTest(group, group);
    expect(result.pValue).toBeGreaterThan(0.05);
    expect(result.df).toBe(1);
  });

  it("well-separated groups yield small p-value", () => {
    const g1: SurvivalEvent[] = Array.from({ length: 10 }, (_, i) => ({
      time: i + 1,
      event: true,
    }));
    const g2: SurvivalEvent[] = Array.from({ length: 10 }, (_, i) => ({
      time: i + 100,
      event: true,
    }));
    const result = logRankTest(g1, g2);
    expect(result.pValue).toBeLessThan(0.01);
  });

  it("statistic >= 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ time: fc.integer({ min: 1, max: 50 }), event: fc.boolean() }), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.array(fc.record({ time: fc.integer({ min: 1, max: 50 }), event: fc.boolean() }), {
          minLength: 2,
          maxLength: 10,
        }),
        (g1, g2) => {
          const result = logRankTest(g1, g2);
          return result.statistic >= 0 && result.pValue >= 0 && result.pValue <= 1;
        },
      ),
    );
  });
});
