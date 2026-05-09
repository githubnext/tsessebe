import { describe, expect, test } from "bun:test";
import { hashArray } from "../../src/index.ts";

describe("hashArray", () => {
  test("returns array of same length", () => {
    const h = hashArray([1, 2, 3]);
    expect(h).toHaveLength(3);
  });

  test("equal values produce equal hashes", () => {
    const h = hashArray(["a", "b", "a"]);
    expect(h[0]).toBe(h[2]);
  });

  test("different values produce different hashes (spot check)", () => {
    const h = hashArray([1, 2, 3]);
    expect(h[0]).not.toBe(h[1]);
    expect(h[1]).not.toBe(h[2]);
  });

  test("null and undefined have distinct hashes from numbers", () => {
    const h = hashArray([null, undefined, 0]);
    expect(h[2]).not.toBe(h[0]);
  });

  test("NaN has its own hash", () => {
    const h = hashArray([Number.NaN, 0, 1]);
    expect(h[0]).not.toBe(h[1]);
    expect(h[0]).not.toBe(h[2]);
  });

  test("empty array", () => {
    expect(hashArray([])).toEqual([]);
  });

  test("boolean values", () => {
    const h = hashArray([true, false, true]);
    expect(h[0]).toBe(h[2]);
    expect(h[0]).not.toBe(h[1]);
  });

  test("deterministic across calls", () => {
    const h1 = hashArray([1, "hello", null]);
    const h2 = hashArray([1, "hello", null]);
    expect(h1).toEqual(h2);
  });

  test("all results are finite numbers", () => {
    const arr = [1, "x", null, true, 0];
    const h = hashArray(arr);
    expect(h.every((v) => typeof v === "number" && Number.isFinite(v))).toBe(true);
  });

  test("strings produce equal hashes for equal strings", () => {
    const h = hashArray(["hello", "world", "hello"]);
    expect(h[0]).toBe(h[2]);
    expect(h[0]).not.toBe(h[1]);
  });
});
