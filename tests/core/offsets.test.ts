/**
 * Tests for date offsets.
 */
import { describe, expect, it } from "bun:test";
import {
  BusinessDay,
  DateOffset,
  MonthBegin,
  MonthEnd,
  YearBegin,
  YearEnd,
  addOffset,
  dateRange,
} from "../../src/index.ts";

const d = (s: string): Date => new Date(s);

describe("DateOffset", () => {
  it("adds calendar days", () => {
    const result = addOffset(d("2024-01-10T00:00:00.000Z"), new DateOffset(5, "D"));
    expect(result.getUTCDate()).toBe(15);
  });

  it("adds hours", () => {
    const result = addOffset(d("2024-01-01T00:00:00.000Z"), new DateOffset(3, "H"));
    expect(result.getUTCHours()).toBe(3);
  });

  it("adds months (no overflow)", () => {
    const result = addOffset(d("2024-01-15T00:00:00.000Z"), new DateOffset(1, "M"));
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(15);
  });

  it("clamps to month end on overflow", () => {
    // Jan 31 + 1 month = Feb 29 (2024 is leap year)
    const result = addOffset(d("2024-01-31T00:00:00.000Z"), new DateOffset(1, "M"));
    expect(result.getUTCDate()).toBe(29);
    expect(result.getUTCMonth()).toBe(1);
  });

  it("adds weeks", () => {
    const result = addOffset(d("2024-01-01T00:00:00.000Z"), new DateOffset(2, "W"));
    expect(result.getUTCDate()).toBe(15);
  });

  it("adds years via 'A' unit", () => {
    const result = addOffset(d("2024-03-15T00:00:00.000Z"), new DateOffset(1, "A"));
    expect(result.getUTCFullYear()).toBe(2025);
  });

  it("adds years via 'Y' alias", () => {
    const result = addOffset(d("2024-03-15T00:00:00.000Z"), new DateOffset(1, "Y"));
    expect(result.getUTCFullYear()).toBe(2025);
  });

  it("adds quarters", () => {
    const result = addOffset(d("2024-01-01T00:00:00.000Z"), new DateOffset(2, "Q"));
    expect(result.getUTCMonth()).toBe(6); // July
  });
});

describe("BusinessDay", () => {
  it("skips weekends forward", () => {
    // Friday 2024-01-05 + 1 bd = Monday 2024-01-08
    const result = addOffset(d("2024-01-05T00:00:00.000Z"), new BusinessDay(1));
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(8);
  });

  it("skips weekends backward", () => {
    // Monday 2024-01-08 - 1 bd = Friday 2024-01-05
    const result = addOffset(d("2024-01-08T00:00:00.000Z"), new BusinessDay(-1));
    expect(result.getUTCDay()).toBe(5); // Friday
    expect(result.getUTCDate()).toBe(5);
  });

  it("skips Saturday and Sunday", () => {
    // Friday + 3 bd = Wednesday next week
    const result = addOffset(d("2024-01-05T00:00:00.000Z"), new BusinessDay(3));
    expect(result.getUTCDate()).toBe(10);
  });
});

describe("MonthEnd", () => {
  it("snaps to end of month", () => {
    const _result = addOffset(d("2024-01-15T00:00:00.000Z"), new MonthEnd(0));
    // 0 advance but snap: result should be in Jan... let's test n=1
    const r2 = addOffset(d("2024-01-15T00:00:00.000Z"), new MonthEnd(1));
    expect(r2.getUTCMonth()).toBe(1); // Feb
    expect(r2.getUTCDate()).toBe(29); // Feb 29 (leap year)
  });
});

describe("MonthBegin", () => {
  it("snaps to beginning of month", () => {
    const result = addOffset(d("2024-01-15T00:00:00.000Z"), new MonthBegin(1));
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCMonth()).toBe(1); // February
  });
});

describe("YearEnd", () => {
  it("snaps to Dec 31", () => {
    const result = addOffset(d("2024-06-15T00:00:00.000Z"), new YearEnd(0));
    expect(result.getUTCMonth()).toBe(11); // December
    expect(result.getUTCDate()).toBe(31);
  });
});

describe("YearBegin", () => {
  it("snaps to Jan 1", () => {
    const result = addOffset(d("2024-06-15T00:00:00.000Z"), new YearBegin(1));
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCFullYear()).toBe(2025);
  });
});

describe("dateRange", () => {
  it("generates sequence of dates", () => {
    const dates = dateRange(d("2024-01-01T00:00:00.000Z"), 3, new DateOffset(1, "M"));
    expect(dates).toHaveLength(3);
    expect(dates[0]?.getUTCMonth()).toBe(0);
    expect(dates[1]?.getUTCMonth()).toBe(1);
    expect(dates[2]?.getUTCMonth()).toBe(2);
  });

  it("returns empty array for 0 periods", () => {
    const dates = dateRange(d("2024-01-01T00:00:00.000Z"), 0, new DateOffset(1));
    expect(dates).toHaveLength(0);
  });
});
