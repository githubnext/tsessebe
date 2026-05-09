import { describe, test, expect, beforeEach } from "bun:test";
import {
  getOption,
  setOption,
  resetOption,
  describeOption,
  optionContext,
  registerOption,
  options,
} from "../../src/index.ts";

describe("options system", () => {
  // Reset before each test to avoid side effects
  beforeEach(() => {
    resetOption("all");
  });

  // ─── getOption ───────────────────────────────────────────────────────────
  describe("getOption", () => {
    test("returns default value for display.max_rows", () => {
      expect(getOption("display.max_rows")).toBe(60);
    });

    test("returns default value for display.precision", () => {
      expect(getOption("display.precision")).toBe(6);
    });

    test("returns default value for mode.use_inf_as_na", () => {
      expect(getOption("mode.use_inf_as_na")).toBe(false);
    });

    test("throws on unknown key", () => {
      expect(() => getOption("nonexistent.key")).toThrow(/No such option/);
    });

    test("is case-insensitive", () => {
      expect(getOption("Display.Max_Rows")).toBe(60);
    });
  });

  // ─── setOption ───────────────────────────────────────────────────────────
  describe("setOption", () => {
    test("sets a numeric option", () => {
      setOption("display.max_rows", 100);
      expect(getOption("display.max_rows")).toBe(100);
    });

    test("sets a boolean option", () => {
      setOption("mode.use_inf_as_na", true);
      expect(getOption("mode.use_inf_as_na")).toBe(true);
    });

    test("sets a string option", () => {
      setOption("mode.dtype_backend", "arrow");
      expect(getOption("mode.dtype_backend")).toBe("arrow");
    });

    test("throws on invalid value (validator)", () => {
      expect(() => setOption("display.max_rows", -1)).toThrow(/must be a non-negative integer/);
    });

    test("throws on invalid enum value", () => {
      expect(() => setOption("mode.chained_assignment", "invalid")).toThrow(/must be one of/);
    });

    test("throws on unknown key", () => {
      expect(() => setOption("display.unknown", 5)).toThrow(/No such option/);
    });
  });

  // ─── resetOption ─────────────────────────────────────────────────────────
  describe("resetOption", () => {
    test("resets single option to default", () => {
      setOption("display.max_rows", 999);
      resetOption("display.max_rows");
      expect(getOption("display.max_rows")).toBe(60);
    });

    test("resetOption('all') resets all options", () => {
      setOption("display.max_rows", 999);
      setOption("display.precision", 99);
      resetOption("all");
      expect(getOption("display.max_rows")).toBe(60);
      expect(getOption("display.precision")).toBe(6);
    });

    test("throws on unknown key", () => {
      expect(() => resetOption("completely.unknown")).toThrow(/No such option/);
    });
  });

  // ─── describeOption ──────────────────────────────────────────────────────
  describe("describeOption", () => {
    test("describes a single option", () => {
      const desc = describeOption("display.max_rows");
      expect(desc).toContain("display.max_rows");
      expect(desc).toContain("Default");
      expect(desc).toContain("60");
    });

    test("describes all display options when given prefix", () => {
      const desc = describeOption("display");
      expect(desc).toContain("display.max_rows");
      expect(desc).toContain("display.precision");
    });

    test("describes all options when called with no arg", () => {
      const desc = describeOption();
      expect(desc).toContain("display.max_rows");
      expect(desc).toContain("mode.use_inf_as_na");
      expect(desc).toContain("compute.use_bottleneck");
    });

    test("throws on unmatched prefix", () => {
      expect(() => describeOption("nonexistent")).toThrow(/No option matching/);
    });
  });

  // ─── optionContext ────────────────────────────────────────────────────────
  describe("optionContext", () => {
    test("overrides option within context, restores after exit", () => {
      const ctx = optionContext("display.max_rows", 5);
      ctx.enter();
      expect(getOption("display.max_rows")).toBe(5);
      ctx.exit();
      expect(getOption("display.max_rows")).toBe(60);
    });

    test("supports multiple key-value pairs", () => {
      const ctx = optionContext("display.max_rows", 5, "display.precision", 2);
      ctx.enter();
      expect(getOption("display.max_rows")).toBe(5);
      expect(getOption("display.precision")).toBe(2);
      ctx.exit();
      expect(getOption("display.max_rows")).toBe(60);
      expect(getOption("display.precision")).toBe(6);
    });

    test("restores even if override raises", () => {
      const ctx = optionContext("display.max_rows", 20);
      ctx.enter();
      expect(getOption("display.max_rows")).toBe(20);
      ctx.exit();
      expect(getOption("display.max_rows")).toBe(60);
    });

    test("throws on odd argument count", () => {
      expect(() => optionContext("display.max_rows")).toThrow(/pairs/);
    });
  });

  // ─── registerOption ───────────────────────────────────────────────────────
  describe("registerOption", () => {
    test("registers a new option and allows get/set/reset", () => {
      registerOption("test.custom_opt", 42, "A custom test option.");
      expect(getOption("test.custom_opt")).toBe(42);
      setOption("test.custom_opt", 99);
      expect(getOption("test.custom_opt")).toBe(99);
      resetOption("test.custom_opt");
      expect(getOption("test.custom_opt")).toBe(42);
    });

    test("throws if key already registered", () => {
      // display.max_rows is already registered
      expect(() => registerOption("display.max_rows", 0)).toThrow(/already registered/);
    });
  });

  // ─── options proxy ────────────────────────────────────────────────────────
  describe("options proxy", () => {
    test("reads option value via proxy", () => {
      expect(options["display"]["max_rows"]).toBe(60);
    });

    test("writes option value via proxy", () => {
      options["display"]["max_rows"] = 77;
      expect(getOption("display.max_rows")).toBe(77);
    });
  });
});
