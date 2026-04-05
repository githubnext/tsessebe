/**
 * Tests for Flags.
 */
import { describe, expect, it } from "bun:test";
import {
  DuplicateLabelError,
  Flags,
  getDuplicateLabels,
  labelsAreUnique,
} from "../../src/index.ts";

describe("Flags constructor", () => {
  it("defaults allows_duplicate_labels to true", () => {
    const flags = new Flags();
    expect(flags.allows_duplicate_labels).toBe(true);
  });

  it("accepts allows_duplicate_labels: false", () => {
    const flags = new Flags({ allows_duplicate_labels: false });
    expect(flags.allows_duplicate_labels).toBe(false);
  });
});

describe("Flags.set", () => {
  it("updates allows_duplicate_labels", () => {
    const flags = new Flags();
    flags.set({ allows_duplicate_labels: false });
    expect(flags.allows_duplicate_labels).toBe(false);
  });

  it("returns this for chaining", () => {
    const flags = new Flags();
    expect(flags.set({})).toBe(flags);
  });
});

describe("Flags.copy", () => {
  it("returns a new Flags with same value", () => {
    const flags = new Flags({ allows_duplicate_labels: false });
    const copy = flags.copy();
    expect(copy.allows_duplicate_labels).toBe(false);
    expect(copy).not.toBe(flags);
  });
});

describe("Flags.toObject", () => {
  it("returns plain object", () => {
    const flags = new Flags({ allows_duplicate_labels: true });
    expect(flags.toObject()).toEqual({ allows_duplicate_labels: true });
  });
});

describe("Flags.toString", () => {
  it("includes the flag value", () => {
    expect(new Flags({ allows_duplicate_labels: false }).toString()).toContain("false");
  });
});

describe("Flags.checkLabels / validate", () => {
  it("does not throw for unique labels when disallowing duplicates", () => {
    const flags = new Flags({ allows_duplicate_labels: false });
    expect(() => Flags.checkLabels(["a", "b", "c"], flags)).not.toThrow();
  });

  it("throws DuplicateLabelError for duplicates when disallowing", () => {
    const flags = new Flags({ allows_duplicate_labels: false });
    expect(() => Flags.checkLabels(["a", "b", "a"], flags)).toThrow(DuplicateLabelError);
  });

  it("does not throw for duplicates when allowed", () => {
    const flags = new Flags({ allows_duplicate_labels: true });
    expect(() => Flags.checkLabels(["a", "a"], flags)).not.toThrow();
  });

  it("validate instance method throws DuplicateLabelError", () => {
    const flags = new Flags({ allows_duplicate_labels: false });
    expect(() => flags.validate(["x", "x"])).toThrow(DuplicateLabelError);
  });
});

describe("DuplicateLabelError", () => {
  it("message contains duplicate label", () => {
    const err = new DuplicateLabelError(["a", "b", "a"]);
    expect(err.message).toContain("a");
  });

  it("name is DuplicateLabelError", () => {
    const err = new DuplicateLabelError(["x", "x"]);
    expect(err.name).toBe("DuplicateLabelError");
  });
});

describe("labelsAreUnique", () => {
  it("returns true for unique labels", () => {
    expect(labelsAreUnique(["a", "b", "c"])).toBe(true);
  });

  it("returns false for duplicate labels", () => {
    expect(labelsAreUnique(["a", "b", "a"])).toBe(false);
  });

  it("empty array is unique", () => {
    expect(labelsAreUnique([])).toBe(true);
  });
});

describe("getDuplicateLabels", () => {
  it("returns empty array when no duplicates", () => {
    expect(getDuplicateLabels(["a", "b", "c"])).toEqual([]);
  });

  it("returns duplicate labels in first-occurrence order", () => {
    const dupes = getDuplicateLabels(["a", "b", "a", "c", "b"]);
    expect(dupes).toEqual(["a", "b"]);
  });
});
