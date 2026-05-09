/**
 * Tests for pd.Grouper — mirrors pandas.Grouper behaviour.
 */

import { describe, expect, test } from "bun:test";
import { Grouper, isGrouper } from "../../src/index.ts";

describe("Grouper constructor", () => {
  test("defaults", () => {
    const g = new Grouper();
    expect(g.key).toBeUndefined();
    expect(g.freq).toBeUndefined();
    expect(g.axis).toBe(0);
    expect(g.sort).toBe(false);
    expect(g.dropna).toBe(true);
    expect(g.level).toBeUndefined();
    expect(g.closed).toBeUndefined();
    expect(g.label).toBeUndefined();
  });

  test("key grouper", () => {
    const g = new Grouper({ key: "dept" });
    expect(g.key).toBe("dept");
    expect(g.isKeyGrouper()).toBe(true);
    expect(g.isFreqGrouper()).toBe(false);
    expect(g.isLevelGrouper()).toBe(false);
  });

  test("freq grouper", () => {
    const g = new Grouper({ key: "date", freq: "1D" });
    expect(g.freq).toBe("1D");
    expect(g.isFreqGrouper()).toBe(true);
    expect(g.isKeyGrouper()).toBe(false);
  });

  test("level grouper", () => {
    const g = new Grouper({ level: 0 });
    expect(g.level).toBe(0);
    expect(g.isLevelGrouper()).toBe(true);
    expect(g.isKeyGrouper()).toBe(false);
  });

  test("sort option", () => {
    const g = new Grouper({ key: "x", sort: true });
    expect(g.sort).toBe(true);
  });

  test("dropna option", () => {
    const g = new Grouper({ key: "x", dropna: false });
    expect(g.dropna).toBe(false);
  });

  test("closed and label options", () => {
    const g = new Grouper({ key: "date", freq: "ME", closed: "left", label: "right" });
    expect(g.closed).toBe("left");
    expect(g.label).toBe("right");
  });

  test("axis option", () => {
    const g = new Grouper({ axis: 1 });
    expect(g.axis).toBe(1);
  });

  test("level by name", () => {
    const g = new Grouper({ level: "city" });
    expect(g.level).toBe("city");
    expect(g.isLevelGrouper()).toBe(true);
  });
});

describe("Grouper.toString()", () => {
  test("empty grouper", () => {
    expect(new Grouper().toString()).toBe("Grouper()");
  });

  test("key-only grouper", () => {
    expect(new Grouper({ key: "dept" }).toString()).toBe('Grouper(key="dept")');
  });

  test("freq grouper", () => {
    expect(new Grouper({ key: "date", freq: "ME" }).toString()).toBe(
      'Grouper(key="date", freq="ME")',
    );
  });

  test("sort and dropna", () => {
    const s = new Grouper({ key: "x", sort: true, dropna: false }).toString();
    expect(s).toContain("sort=true");
    expect(s).toContain("dropna=false");
  });

  test("level grouper", () => {
    expect(new Grouper({ level: 0 }).toString()).toBe("Grouper(level=0)");
  });
});

describe("isGrouper()", () => {
  test("returns true for Grouper instances", () => {
    expect(isGrouper(new Grouper())).toBe(true);
    expect(isGrouper(new Grouper({ key: "x" }))).toBe(true);
  });

  test("returns false for non-Grouper values", () => {
    expect(isGrouper("col")).toBe(false);
    expect(isGrouper(42)).toBe(false);
    expect(isGrouper(null)).toBe(false);
    expect(isGrouper(undefined)).toBe(false);
    expect(isGrouper({ key: "x" })).toBe(false);
  });
});
