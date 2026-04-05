/**
 * Tests for AdvancedStyler — bar charts, heatmaps, text gradients, threshold.
 */

import { describe, expect, it } from "bun:test";
import { DataFrame, advancedStyler } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNumericDf(): DataFrame {
  return DataFrame.fromColumns({
    a: [10, 20, 30],
    b: [100, 50, 25],
  });
}

// ─── bar ─────────────────────────────────────────────────────────────────────

describe("AdvancedStyler.bar", () => {
  it("renders without error", () => {
    const html = advancedStyler(makeNumericDf()).bar().render();
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("contains linear-gradient CSS", () => {
    const html = advancedStyler(makeNumericDf()).bar({ color: "#5fba7d" }).render();
    expect(html).toContain("linear-gradient");
  });

  it("bar() is chainable", () => {
    const s = advancedStyler(makeNumericDf()).bar().set_caption("My Table");
    const html = s.render();
    expect(html).toContain("My Table");
  });

  it("per-row axis (axis=0)", () => {
    const html = advancedStyler(makeNumericDf()).bar({ axis: 0 }).render();
    expect(html).toContain("linear-gradient");
  });

  it("custom vmin/vmax", () => {
    const html = advancedStyler(makeNumericDf()).bar({ vmin: 0, vmax: 100 }).render();
    expect(html).toContain("linear-gradient");
  });
});

// ─── heatmap ─────────────────────────────────────────────────────────────────

describe("AdvancedStyler.heatmap", () => {
  it("renders without error", () => {
    const html = advancedStyler(makeNumericDf()).heatmap().render();
    expect(typeof html).toBe("string");
  });

  it("contains background-color CSS", () => {
    const html = advancedStyler(makeNumericDf()).heatmap().render();
    expect(html).toContain("background-color");
  });

  it("per-column normalisation (axis=1)", () => {
    const html = advancedStyler(makeNumericDf()).heatmap({ axis: 1 }).render();
    expect(html).toContain("background-color");
  });

  it("custom colormap", () => {
    const html = advancedStyler(makeNumericDf())
      .heatmap({ cmap_low: "#ff0000", cmap_high: "#0000ff" })
      .render();
    expect(html).toContain("background-color");
  });

  it("heatmap on DataFrame with single column", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const html = advancedStyler(df).heatmap().render();
    expect(html).toContain("background-color");
  });
});

// ─── textGradient ─────────────────────────────────────────────────────────────

describe("AdvancedStyler.textGradient", () => {
  it("renders without error", () => {
    const html = advancedStyler(makeNumericDf()).textGradient().render();
    expect(typeof html).toBe("string");
  });

  it("contains color CSS", () => {
    const html = advancedStyler(makeNumericDf()).textGradient().render();
    expect(html).toContain("color:");
  });

  it("per-column axis works", () => {
    const html = advancedStyler(makeNumericDf()).textGradient({ axis: 1 }).render();
    expect(html).toContain("color:");
  });
});

// ─── threshold ───────────────────────────────────────────────────────────────

describe("AdvancedStyler.threshold", () => {
  it("renders without error", () => {
    const html = advancedStyler(makeNumericDf()).threshold({ threshold: 15 }).render();
    expect(typeof html).toBe("string");
  });

  it("applies green above threshold", () => {
    const html = advancedStyler(makeNumericDf())
      .threshold({ threshold: 15, cssAbove: "color: green", cssBelow: "color: red" })
      .render();
    expect(html).toContain("color: green");
    expect(html).toContain("color: red");
  });

  it("chaining: bar + threshold", () => {
    const html = advancedStyler(makeNumericDf()).bar().threshold({ threshold: 20 }).render();
    expect(html.length).toBeGreaterThan(0);
  });

  it("non-numeric cells are skipped", () => {
    const df = DataFrame.fromColumns({ label: ["a", "b", "c"], val: [10, 20, 30] });
    const html = advancedStyler(df).threshold({ threshold: 15 }).render();
    expect(typeof html).toBe("string");
  });
});
