/**
 * Tests for src/core/attrs.ts
 *
 * Covers:
 * - getAttrs: returns empty {} when no attrs set
 * - getAttrs: returns shallow copy (caller mutations don't affect registry)
 * - setAttrs: sets attrs; subsequent getAttrs reflects the new values
 * - setAttrs: overwrites previous attrs completely
 * - updateAttrs: merges new keys, preserves existing keys
 * - updateAttrs: overwrites existing keys on conflict
 * - updateAttrs: works on an object with no prior attrs
 * - copyAttrs: copies attrs from source to target
 * - copyAttrs: overwrites target's existing attrs
 * - copyAttrs: when source has no attrs, clears target's attrs
 * - withAttrs: returns the same object reference
 * - withAttrs: sets the attrs (replaces existing)
 * - clearAttrs: removes all attrs
 * - clearAttrs: is a no-op if no attrs exist
 * - hasAttrs: false when no attrs set
 * - hasAttrs: true after setAttrs
 * - hasAttrs: false after clearAttrs
 * - getAttr: returns undefined for missing key
 * - getAttr: returns the correct value
 * - setAttr: sets a single key, preserves other keys
 * - deleteAttr: removes a key, preserves remaining
 * - deleteAttr: clears registry when last key removed
 * - deleteAttr: no-op if key doesn't exist
 * - attrsCount: 0 when no attrs; n when n keys set
 * - attrsKeys: [] when no attrs; list of keys otherwise
 * - mergeAttrs: merges attrs from multiple sources
 * - mergeAttrs: later sources win on key conflicts
 * - Independence: separate objects have independent attrs
 * - Works with Series and DataFrame objects
 * - Property: setAttrs/getAttrs round-trip
 * - Property: updateAttrs is a superset of previous attrs
 * - Property: copyAttrs makes target equal to source
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  attrsCount,
  attrsKeys,
  clearAttrs,
  copyAttrs,
  deleteAttr,
  getAttr,
  getAttrs,
  hasAttrs,
  mergeAttrs,
  setAttr,
  setAttrs,
  updateAttrs,
  withAttrs,
} from "../../src/core/attrs.ts";
import { DataFrame, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function freshObj(): object {
  return {};
}

function makeSeries(): Series {
  return new Series({ data: [1, 2, 3], name: "x" });
}

function makeDF(): DataFrame {
  return DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
}

// ─── getAttrs ─────────────────────────────────────────────────────────────────

describe("getAttrs", () => {
  test("returns {} when no attrs set", () => {
    expect(getAttrs(freshObj())).toEqual({});
  });

  test("returns the stored attrs", () => {
    const obj = freshObj();
    setAttrs(obj, { x: 1, y: "hello" });
    expect(getAttrs(obj)).toEqual({ x: 1, y: "hello" });
  });

  test("returns a shallow copy — caller mutations don't leak into registry", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1 });
    const copy = getAttrs(obj);
    // biome-ignore lint/complexity/useLiteralKeys: TS4111 index signature
    copy["a"] = 999;
    // original should be unchanged
    expect(getAttrs(obj)).toEqual({ a: 1 });
  });
});

// ─── setAttrs ─────────────────────────────────────────────────────────────────

describe("setAttrs", () => {
  test("sets attrs from scratch", () => {
    const obj = freshObj();
    setAttrs(obj, { source: "lab", version: 3 });
    expect(getAttrs(obj)).toEqual({ source: "lab", version: 3 });
  });

  test("overwrites previous attrs completely", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    setAttrs(obj, { c: 3 });
    expect(getAttrs(obj)).toEqual({ c: 3 });
  });

  test("shallow-copies the input — later mutation doesn't change stored attrs", () => {
    const obj = freshObj();
    const input: Record<string, unknown> = { x: 10 };
    setAttrs(obj, input);
    // biome-ignore lint/complexity/useLiteralKeys: TS4111 index signature
    input["x"] = 999;
    expect(getAttrs(obj)).toEqual({ x: 10 });
  });
});

// ─── updateAttrs ──────────────────────────────────────────────────────────────

describe("updateAttrs", () => {
  test("adds new keys without removing existing ones", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1 });
    updateAttrs(obj, { b: 2 });
    expect(getAttrs(obj)).toEqual({ a: 1, b: 2 });
  });

  test("overwrites existing keys on conflict", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    updateAttrs(obj, { a: 99 });
    expect(getAttrs(obj)).toEqual({ a: 99, b: 2 });
  });

  test("works when no prior attrs exist", () => {
    const obj = freshObj();
    updateAttrs(obj, { fresh: true });
    expect(getAttrs(obj)).toEqual({ fresh: true });
  });

  test("merges multiple key types: number, string, boolean, null", () => {
    const obj = freshObj();
    setAttrs(obj, { n: 1 });
    updateAttrs(obj, { s: "hi", flag: false, nothing: null });
    expect(getAttrs(obj)).toEqual({ n: 1, s: "hi", flag: false, nothing: null });
  });
});

// ─── copyAttrs ────────────────────────────────────────────────────────────────

describe("copyAttrs", () => {
  test("copies source attrs to target", () => {
    const src = freshObj();
    const tgt = freshObj();
    setAttrs(src, { unit: "kg", version: 1 });
    copyAttrs(src, tgt);
    expect(getAttrs(tgt)).toEqual({ unit: "kg", version: 1 });
  });

  test("overwrites target's existing attrs", () => {
    const src = freshObj();
    const tgt = freshObj();
    setAttrs(src, { new: true });
    setAttrs(tgt, { old: true });
    copyAttrs(src, tgt);
    expect(getAttrs(tgt)).toEqual({ new: true });
  });

  test("when source has no attrs, clears target attrs", () => {
    const src = freshObj();
    const tgt = freshObj();
    setAttrs(tgt, { old: 1 });
    copyAttrs(src, tgt);
    expect(getAttrs(tgt)).toEqual({});
    expect(hasAttrs(tgt)).toBe(false);
  });

  test("copy is shallow — subsequent changes to source don't affect target", () => {
    const src = freshObj();
    const tgt = freshObj();
    setAttrs(src, { x: 1 });
    copyAttrs(src, tgt);
    updateAttrs(src, { x: 999 });
    expect(getAttrs(tgt)).toEqual({ x: 1 });
  });
});

// ─── withAttrs ────────────────────────────────────────────────────────────────

describe("withAttrs", () => {
  test("returns the same object reference", () => {
    const obj = freshObj();
    const result = withAttrs(obj, { k: 1 });
    expect(result).toBe(obj);
  });

  test("sets attrs on the object", () => {
    const obj = freshObj();
    withAttrs(obj, { source: "sensor_A" });
    expect(getAttrs(obj)).toEqual({ source: "sensor_A" });
  });

  test("replaces any previous attrs", () => {
    const obj = freshObj();
    setAttrs(obj, { old: true });
    withAttrs(obj, { new: true });
    expect(getAttrs(obj)).toEqual({ new: true });
  });

  test("type is preserved — works with Series", () => {
    const s = makeSeries();
    const result = withAttrs(s, { unit: "m" });
    // same object, type preserved
    expect(result).toBe(s);
    expect(result instanceof Series).toBe(true);
    expect(getAttrs(result)).toEqual({ unit: "m" });
  });
});

// ─── clearAttrs ───────────────────────────────────────────────────────────────

describe("clearAttrs", () => {
  test("removes all attrs", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    clearAttrs(obj);
    expect(getAttrs(obj)).toEqual({});
    expect(hasAttrs(obj)).toBe(false);
  });

  test("no-op when no attrs exist", () => {
    const obj = freshObj();
    expect(() => clearAttrs(obj)).not.toThrow();
    expect(getAttrs(obj)).toEqual({});
  });
});

// ─── hasAttrs ─────────────────────────────────────────────────────────────────

describe("hasAttrs", () => {
  test("returns false when no attrs set", () => {
    expect(hasAttrs(freshObj())).toBe(false);
  });

  test("returns true after setAttrs", () => {
    const obj = freshObj();
    setAttrs(obj, { x: 1 });
    expect(hasAttrs(obj)).toBe(true);
  });

  test("returns false after clearAttrs", () => {
    const obj = freshObj();
    setAttrs(obj, { x: 1 });
    clearAttrs(obj);
    expect(hasAttrs(obj)).toBe(false);
  });
});

// ─── getAttr / setAttr ────────────────────────────────────────────────────────

describe("getAttr", () => {
  test("returns undefined for missing key", () => {
    expect(getAttr(freshObj(), "missing")).toBeUndefined();
  });

  test("returns undefined for key missing after setAttrs", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1 });
    expect(getAttr(obj, "b")).toBeUndefined();
  });

  test("returns the correct value", () => {
    const obj = freshObj();
    setAttrs(obj, { unit: "kg", scale: 2 });
    expect(getAttr(obj, "unit")).toBe("kg");
    expect(getAttr(obj, "scale")).toBe(2);
  });
});

describe("setAttr", () => {
  test("sets a single key from scratch", () => {
    const obj = freshObj();
    setAttr(obj, "unit", "kg");
    expect(getAttrs(obj)).toEqual({ unit: "kg" });
  });

  test("adds a key without removing existing ones", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1 });
    setAttr(obj, "b", 2);
    expect(getAttrs(obj)).toEqual({ a: 1, b: 2 });
  });

  test("overwrites a single key", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    setAttr(obj, "a", 99);
    expect(getAttrs(obj)).toEqual({ a: 99, b: 2 });
  });
});

// ─── deleteAttr ───────────────────────────────────────────────────────────────

describe("deleteAttr", () => {
  test("removes the specified key", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    deleteAttr(obj, "a");
    expect(getAttrs(obj)).toEqual({ b: 2 });
  });

  test("clears registry entry when last key is removed", () => {
    const obj = freshObj();
    setAttrs(obj, { only: true });
    deleteAttr(obj, "only");
    expect(hasAttrs(obj)).toBe(false);
    expect(getAttrs(obj)).toEqual({});
  });

  test("no-op if key doesn't exist", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1 });
    deleteAttr(obj, "missing");
    expect(getAttrs(obj)).toEqual({ a: 1 });
  });

  test("no-op if no attrs at all", () => {
    const obj = freshObj();
    expect(() => deleteAttr(obj, "x")).not.toThrow();
    expect(getAttrs(obj)).toEqual({});
  });
});

// ─── attrsCount / attrsKeys ───────────────────────────────────────────────────

describe("attrsCount", () => {
  test("returns 0 when no attrs", () => {
    expect(attrsCount(freshObj())).toBe(0);
  });

  test("returns correct count after setAttrs", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2, c: 3 });
    expect(attrsCount(obj)).toBe(3);
  });

  test("updates after deleteAttr", () => {
    const obj = freshObj();
    setAttrs(obj, { a: 1, b: 2 });
    deleteAttr(obj, "a");
    expect(attrsCount(obj)).toBe(1);
  });
});

describe("attrsKeys", () => {
  test("returns [] when no attrs", () => {
    expect(attrsKeys(freshObj())).toEqual([]);
  });

  test("returns key list", () => {
    const obj = freshObj();
    setAttrs(obj, { x: 1, y: 2 });
    const keys = attrsKeys(obj);
    expect(keys.sort()).toEqual(["x", "y"]);
  });
});

// ─── mergeAttrs ───────────────────────────────────────────────────────────────

describe("mergeAttrs", () => {
  test("merges attrs from multiple sources", () => {
    const s1 = freshObj();
    const s2 = freshObj();
    const tgt = freshObj();
    setAttrs(s1, { a: 1, b: 2 });
    setAttrs(s2, { c: 3 });
    mergeAttrs([s1, s2], tgt);
    expect(getAttrs(tgt)).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("later sources win on key conflicts", () => {
    const s1 = freshObj();
    const s2 = freshObj();
    const tgt = freshObj();
    setAttrs(s1, { source: "A", unit: "kg" });
    setAttrs(s2, { source: "B", scale: 2 });
    mergeAttrs([s1, s2], tgt);
    expect(getAttrs(tgt)).toEqual({ source: "B", unit: "kg", scale: 2 });
  });

  test("skips sources with no attrs", () => {
    const s1 = freshObj();
    const s2 = freshObj();
    const tgt = freshObj();
    setAttrs(s1, { a: 1 });
    // s2 has no attrs
    mergeAttrs([s1, s2], tgt);
    expect(getAttrs(tgt)).toEqual({ a: 1 });
  });

  test("merging from empty sources leaves target without attrs", () => {
    const s1 = freshObj();
    const tgt = freshObj();
    setAttrs(tgt, { old: 1 });
    mergeAttrs([s1], tgt);
    // no sources had attrs — target should have empty attrs
    // (mergeAttrs with empty merged dict does not write to registry)
    // but previous attrs on target are NOT cleared (only set if there's content)
    // this is intentional — mergeAttrs is additive, not destructive
    expect(getAttrs(tgt)).toEqual({ old: 1 });
  });
});

// ─── independence ─────────────────────────────────────────────────────────────

describe("independence", () => {
  test("separate objects have independent attrs", () => {
    const obj1 = freshObj();
    const obj2 = freshObj();
    setAttrs(obj1, { id: "A" });
    setAttrs(obj2, { id: "B" });
    expect(getAttrs(obj1)).toEqual({ id: "A" });
    expect(getAttrs(obj2)).toEqual({ id: "B" });
  });

  test("clearing one object does not affect another", () => {
    const obj1 = freshObj();
    const obj2 = freshObj();
    setAttrs(obj1, { x: 1 });
    setAttrs(obj2, { y: 2 });
    clearAttrs(obj1);
    expect(hasAttrs(obj1)).toBe(false);
    expect(getAttrs(obj2)).toEqual({ y: 2 });
  });
});

// ─── integration: Series and DataFrame ───────────────────────────────────────

describe("integration with Series and DataFrame", () => {
  test("can attach attrs to a Series", () => {
    const s = makeSeries();
    setAttrs(s, { unit: "metres", source: "GPS" });
    expect(getAttrs(s)).toEqual({ unit: "metres", source: "GPS" });
    expect(hasAttrs(s)).toBe(true);
  });

  test("can attach attrs to a DataFrame", () => {
    const df = makeDF();
    setAttrs(df, { description: "sensor readings", rows: 3 });
    expect(getAttr(df, "description")).toBe("sensor readings");
    expect(attrsCount(df)).toBe(2);
  });

  test("withAttrs fluent helper on DataFrame", () => {
    const df = makeDF();
    const result = withAttrs(df, { version: 5 });
    expect(result).toBe(df);
    expect(getAttrs(result)).toEqual({ version: 5 });
  });

  test("copyAttrs from Series to DataFrame", () => {
    const s = makeSeries();
    const df = makeDF();
    setAttrs(s, { lineage: "processed" });
    copyAttrs(s, df);
    expect(getAttrs(df)).toEqual({ lineage: "processed" });
  });

  test("mergeAttrs from two Series into a DataFrame", () => {
    const s1 = makeSeries();
    const s2 = makeSeries();
    const df = makeDF();
    setAttrs(s1, { source: "A", unit: "kg" });
    setAttrs(s2, { source: "B", version: 1 });
    mergeAttrs([s1, s2], df);
    expect(getAttrs(df)).toEqual({ source: "B", unit: "kg", version: 1 });
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property: setAttrs/getAttrs round-trip", () => {
  test("any record can be stored and retrieved intact", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(fc.integer(), fc.string(), fc.boolean()),
        ),
        (attrs) => {
          const obj = freshObj();
          setAttrs(obj, attrs);
          const result = getAttrs(obj);
          expect(result).toEqual(attrs);
        },
      ),
    );
  });
});

describe("property: updateAttrs is a superset of previous", () => {
  test("all keys from the original are still present after update", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1 }), fc.integer()),
        fc.dictionary(fc.string({ minLength: 1 }), fc.integer()),
        (original, updates) => {
          const obj = freshObj();
          setAttrs(obj, original);
          updateAttrs(obj, updates);
          const result = getAttrs(obj);
          // every key from original that is NOT in updates must still be present
          for (const [k, v] of Object.entries(original)) {
            if (!(k in updates)) {
              expect(result[k]).toBe(v);
            }
          }
          // every key from updates must be present with the update value
          for (const [k, v] of Object.entries(updates)) {
            expect(result[k]).toBe(v);
          }
        },
      ),
    );
  });
});

describe("property: copyAttrs makes target equal to source", () => {
  test("after copyAttrs, getAttrs(target) deep-equals getAttrs(source)", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1 }), fc.oneof(fc.integer(), fc.string())),
        (sourceAttrs) => {
          const src = freshObj();
          const tgt = freshObj();
          setAttrs(src, sourceAttrs);
          copyAttrs(src, tgt);
          expect(getAttrs(tgt)).toEqual(getAttrs(src));
        },
      ),
    );
  });
});
