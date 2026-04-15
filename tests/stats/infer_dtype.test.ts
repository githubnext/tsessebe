/**
 * Tests for infer_dtype — infer the most specific dtype from a value sequence.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/core/index.ts";
import { Interval } from "../../src/core/interval.ts";
import { Period } from "../../src/core/period.ts";
import { Timedelta } from "../../src/core/timedelta.ts";
import { Timestamp } from "../../src/core/timestamp.ts";
import { inferDtype } from "../../src/stats/infer_dtype.ts";

// ─── empty / all-null ─────────────────────────────────────────────────────────

describe("inferDtype — empty / null", () => {
  test("empty array → empty", () => {
    expect(inferDtype([])).toBe("empty");
  });

  test("all null, skipna=true → empty", () => {
    expect(inferDtype([null, null, null])).toBe("empty");
  });

  test("all undefined, skipna=true → empty", () => {
    expect(inferDtype([undefined, undefined])).toBe("empty");
  });

  test("null + undefined, skipna=true → empty", () => {
    expect(inferDtype([null, undefined])).toBe("empty");
  });

  test("all null, skipna=false → mixed", () => {
    expect(inferDtype([null, null], { skipna: false })).toBe("mixed");
  });
});

// ─── boolean ──────────────────────────────────────────────────────────────────

describe("inferDtype — boolean", () => {
  test("all true → boolean", () => {
    expect(inferDtype([true, true, true])).toBe("boolean");
  });

  test("all false → boolean", () => {
    expect(inferDtype([false])).toBe("boolean");
  });

  test("mixed bool → boolean", () => {
    expect(inferDtype([true, false, true])).toBe("boolean");
  });

  test("bool + null, skipna=true → boolean", () => {
    expect(inferDtype([true, null, false])).toBe("boolean");
  });

  test("bool + null, skipna=false → mixed", () => {
    expect(inferDtype([true, null], { skipna: false })).toBe("mixed");
  });
});

// ─── integer ──────────────────────────────────────────────────────────────────

describe("inferDtype — integer", () => {
  test("whole numbers → integer", () => {
    expect(inferDtype([1, 2, 3])).toBe("integer");
  });

  test("negative integers → integer", () => {
    expect(inferDtype([-5, -3, 0])).toBe("integer");
  });

  test("zero → integer", () => {
    expect(inferDtype([0])).toBe("integer");
  });

  test("int + null, skipna=true → integer", () => {
    expect(inferDtype([1, null, 3])).toBe("integer");
  });

  test("bigints only → integer", () => {
    expect(inferDtype([1n, 2n, 3n])).toBe("integer");
  });
});

// ─── floating ─────────────────────────────────────────────────────────────────

describe("inferDtype — floating", () => {
  test("float-only → floating", () => {
    expect(inferDtype([1.1, 2.2, 3.3])).toBe("floating");
  });

  test("NaN alone → floating", () => {
    expect(inferDtype([Number.NaN])).toBe("floating");
  });

  test("Infinity → floating", () => {
    expect(inferDtype([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])).toBe("floating");
  });

  test("float + null, skipna=true → floating", () => {
    expect(inferDtype([1.5, null])).toBe("floating");
  });
});

// ─── mixed-integer-float ──────────────────────────────────────────────────────

describe("inferDtype — mixed-integer-float", () => {
  test("int + float → mixed-integer-float", () => {
    expect(inferDtype([1, 2.5, 3])).toBe("mixed-integer-float");
  });

  test("bigint + float → mixed-integer-float", () => {
    expect(inferDtype([1n, 2.5])).toBe("mixed-integer-float");
  });

  test("int + float + null, skipna=true → mixed-integer-float", () => {
    expect(inferDtype([1, null, 2.5])).toBe("mixed-integer-float");
  });
});

// ─── decimal (bigint + integer) ───────────────────────────────────────────────

describe("inferDtype — decimal", () => {
  test("bigint + integer → decimal", () => {
    expect(inferDtype([1n, 2])).toBe("decimal");
  });
});

// ─── string ───────────────────────────────────────────────────────────────────

describe("inferDtype — string", () => {
  test("all strings → string", () => {
    expect(inferDtype(["a", "b", "c"])).toBe("string");
  });

  test("string + null, skipna=true → string", () => {
    expect(inferDtype(["a", null, "c"])).toBe("string");
  });

  test("empty string → string", () => {
    expect(inferDtype([""])).toBe("string");
  });
});

// ─── date ─────────────────────────────────────────────────────────────────────

describe("inferDtype — date", () => {
  test("Date objects → date", () => {
    expect(inferDtype([new Date(), new Date()])).toBe("date");
  });

  test("Date + null, skipna=true → date", () => {
    expect(inferDtype([new Date(), null])).toBe("date");
  });
});

// ─── datetime (Timestamp) ─────────────────────────────────────────────────────

describe("inferDtype — datetime", () => {
  test("Timestamp objects → datetime", () => {
    const ts = Timestamp.fromtimestamp(0);
    expect(inferDtype([ts, ts])).toBe("datetime");
  });
});

// ─── timedelta ────────────────────────────────────────────────────────────────

describe("inferDtype — timedelta", () => {
  test("Timedelta objects → timedelta", () => {
    const td = Timedelta.fromComponents({ days: 1 });
    expect(inferDtype([td, td])).toBe("timedelta");
  });
});

// ─── period ───────────────────────────────────────────────────────────────────

describe("inferDtype — period", () => {
  test("Period objects → period", () => {
    const p = Period.fromDate(new Date("2024-01-01T00:00:00Z"), "M");
    expect(inferDtype([p, p])).toBe("period");
  });
});

// ─── interval ────────────────────────────────────────────────────────────────

describe("inferDtype — interval", () => {
  test("Interval objects → interval", () => {
    const iv = new Interval(0, 1);
    expect(inferDtype([iv, iv])).toBe("interval");
  });
});

// ─── mixed ────────────────────────────────────────────────────────────────────

describe("inferDtype — mixed", () => {
  test("int + string → mixed-integer", () => {
    expect(inferDtype([1, "a"])).toBe("mixed-integer");
  });

  test("int + bool → mixed-integer", () => {
    expect(inferDtype([1, true])).toBe("mixed-integer");
  });

  test("string + bool → mixed", () => {
    expect(inferDtype(["a", true])).toBe("mixed");
  });

  test("int + Date → mixed-integer", () => {
    expect(inferDtype([1, new Date()])).toBe("mixed-integer");
  });

  test("string + Date → mixed", () => {
    expect(inferDtype(["a", new Date()])).toBe("mixed");
  });
});

// ─── Series input ─────────────────────────────────────────────────────────────

describe("inferDtype — Series input", () => {
  test("integer Series → integer", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(inferDtype(s)).toBe("integer");
  });

  test("string Series → string", () => {
    const s = new Series({ data: ["x", "y"] });
    expect(inferDtype(s)).toBe("string");
  });

  test("float Series → floating", () => {
    const s = new Series({ data: [1.1, 2.2] });
    expect(inferDtype(s)).toBe("floating");
  });

  test("empty Series → empty", () => {
    const s = new Series({ data: [] });
    expect(inferDtype(s)).toBe("empty");
  });
});

// ─── property-based ──────────────────────────────────────────────────────────

describe("inferDtype — property tests", () => {
  test("all-integer arrays always return integer", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1 }), (arr) => inferDtype(arr) === "integer"),
    );
  });

  test("all-string arrays always return string", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1 }), (arr) => inferDtype(arr) === "string"),
    );
  });

  test("all-boolean arrays always return boolean", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1 }), (arr) => inferDtype(arr) === "boolean"),
    );
  });

  test("result is always a string", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.double(), fc.string(), fc.boolean(), fc.constant(null))),
        (arr) => typeof inferDtype(arr) === "string",
      ),
    );
  });
});
