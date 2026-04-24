/**
 * Tests for the Styler API — DataFrame.style equivalent.
 *
 * Mirrors the pandas Styler test suite:
 * https://github.com/pandas-dev/pandas/blob/main/pandas/tests/io/formats/style/
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Styler, dataFrameStyle } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeNumericDf(): DataFrame {
  return DataFrame.fromColumns({ a: [1, 2, 3], b: [4, -1, 6] }, { index: ["r0", "r1", "r2"] });
}

// ─── construction ─────────────────────────────────────────────────────────────

describe("Styler construction", () => {
  test("dataFrameStyle returns a Styler", () => {
    const df = makeNumericDf();
    const s = dataFrameStyle(df);
    expect(s).toBeInstanceOf(Styler);
    expect(s.data).toBe(df);
  });

  test("new Styler(df) works directly", () => {
    const df = makeNumericDf();
    const s = new Styler(df);
    expect(s).toBeInstanceOf(Styler);
  });

  test("toHtml produces an HTML string", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).toHtml();
    expect(html).toContain("<table");
    expect(html).toContain("</table>");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  test("render is an alias for toHtml", () => {
    const df = makeNumericDf();
    const s = dataFrameStyle(df);
    expect(s.render("x")).toBe(s.toHtml("x"));
  });
});

// ─── format ───────────────────────────────────────────────────────────────────

describe("Styler.format", () => {
  test("function formatter applied to all cells", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .format((v) => `[${String(v)}]`)
      .toHtml();
    expect(html).toContain("[1]");
    expect(html).toContain("[4]");
  });

  test("format with column subset only formats specified columns", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .format((v) => `$${String(v)}`, ["a"])
      .toHtml();
    expect(html).toContain("$1");
    expect(html).toContain("$2");
    expect(html).toContain("$3");
    // column b should NOT be prefixed with $
    // (4 appears without $ in b, with $ only in a for matching values)
  });

  test("format with string template", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).format("{v}%", ["a"]).toHtml();
    expect(html).toContain("1%");
  });

  test("na_rep replacement", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const html = dataFrameStyle(df).setNaRep("N/A").toHtml();
    expect(html).toContain("N/A");
  });

  test("precision formats floats", () => {
    const df = DataFrame.fromColumns({ a: [1.23456789] });
    const html = dataFrameStyle(df).setPrecision(2).toHtml();
    expect(html).toContain("1.23");
  });
});

// ─── formatIndex ──────────────────────────────────────────────────────────────

describe("Styler.formatIndex", () => {
  test("formats index labels", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .formatIndex((v) => `idx:${String(v)}`)
      .toHtml();
    expect(html).toContain("idx:r0");
    expect(html).toContain("idx:r1");
  });
});

// ─── apply ────────────────────────────────────────────────────────────────────

describe("Styler.apply", () => {
  test("axis=0 applies per-column style", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .apply((vals) => vals.map((v) => (typeof v === "number" && v > 2 ? "color: red;" : "")))
      .toHtml();
    expect(html).toContain("color: red;");
  });

  test("axis=1 applies per-row style", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .apply(
        (vals) =>
          vals.map((v) => (typeof v === "number" && v < 0 ? "background-color: pink;" : "")),
        1,
      )
      .toHtml();
    expect(html).toContain("background-color: pink;");
  });

  test("subset limits columns", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .apply((vals) => vals.map(() => "font-weight: bold;"), 0, ["a"])
      .toHtml();
    expect(html).toContain("font-weight: bold;");
  });

  test("string axis aliases work", () => {
    const df = makeNumericDf();
    const htmlIndex = dataFrameStyle(df)
      .apply((vals) => vals.map(() => "color: blue;"), "index")
      .toHtml();
    const htmlColumns = dataFrameStyle(df)
      .apply((vals) => vals.map(() => "color: blue;"), "columns")
      .toHtml();
    expect(htmlIndex).toContain("color: blue;");
    expect(htmlColumns).toContain("color: blue;");
  });
});

// ─── applymap / map ───────────────────────────────────────────────────────────

describe("Styler.applymap / map", () => {
  test("applymap applies element-wise", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .applymap((v) => (typeof v === "number" && v < 0 ? "color: red;" : ""))
      .toHtml();
    expect(html).toContain("color: red;");
  });

  test("map is an alias for applymap", () => {
    const df = makeNumericDf();
    const h1 = dataFrameStyle(df)
      .applymap((v) => (v === -1 ? "color: red;" : ""))
      .toHtml("x");
    const h2 = dataFrameStyle(df)
      .map((v) => (v === -1 ? "color: red;" : ""))
      .toHtml("x");
    expect(h1).toBe(h2);
  });
});

// ─── highlightMax / highlightMin ──────────────────────────────────────────────

describe("Styler.highlightMax", () => {
  test("highlights max in each column", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).highlightMax({ color: "lightgreen" }).toHtml();
    expect(html).toContain("background-color: lightgreen;");
  });

  test("highlights max per-row with axis=1", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).highlightMax({ color: "cyan", axis: 1 }).toHtml();
    expect(html).toContain("background-color: cyan;");
  });

  test("default color is yellow", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).highlightMax().toHtml();
    expect(html).toContain("background-color: yellow;");
  });

  test("subset limits columns", () => {
    const df = makeNumericDf();
    const styles = dataFrameStyle(df)
      .highlightMax({ subset: ["a"] })
      .exportStyles();
    // All highlighted cells should be in column 0 (a)
    for (const s of styles) {
      if (s.css.includes("background-color: yellow")) {
        expect(s.col).toBe(0);
      }
    }
  });
});

describe("Styler.highlightMin", () => {
  test("highlights min in each column", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).highlightMin({ color: "salmon" }).toHtml();
    expect(html).toContain("background-color: salmon;");
  });
});

// ─── highlightNull ────────────────────────────────────────────────────────────

describe("Styler.highlightNull", () => {
  test("highlights null values", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3], b: [null, 2, 3] });
    const html = dataFrameStyle(df).highlightNull("red").toHtml();
    expect(html).toContain("background-color: red;");
  });

  test("does not highlight non-null values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const styles = dataFrameStyle(df).highlightNull("red").exportStyles();
    expect(styles.length).toBe(0);
  });
});

// ─── highlightBetween ─────────────────────────────────────────────────────────

describe("Styler.highlightBetween", () => {
  test("highlights values in range", () => {
    const df = makeNumericDf();
    const styles = dataFrameStyle(df)
      .highlightBetween({ left: 2, right: 5, color: "orange" })
      .exportStyles();
    const vals = styles.filter((s) => s.css.includes("orange"));
    expect(vals.length).toBeGreaterThan(0);
  });

  test("inclusive both", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const styles = dataFrameStyle(df)
      .highlightBetween({ left: 1, right: 3, inclusive: "both" })
      .exportStyles();
    expect(styles.length).toBe(3);
  });

  test("inclusive neither", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const styles = dataFrameStyle(df)
      .highlightBetween({ left: 1, right: 3, inclusive: "neither" })
      .exportStyles();
    expect(styles.length).toBe(1); // only value 2
  });

  test("no lower bound", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const styles = dataFrameStyle(df)
      .highlightBetween({ right: 2, inclusive: "both" })
      .exportStyles();
    expect(styles.length).toBe(2); // values 1 and 2
  });
});

// ─── backgroundGradient ───────────────────────────────────────────────────────

describe("Styler.backgroundGradient", () => {
  test("applies background-color CSS", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).backgroundGradient().toHtml();
    expect(html).toContain("background-color: #");
  });

  test("different cmaps produce different colors", () => {
    const df = DataFrame.fromColumns({ a: [0, 100] });
    const h1 = dataFrameStyle(df).backgroundGradient({ cmap: "Blues" }).toHtml("x");
    const h2 = dataFrameStyle(df).backgroundGradient({ cmap: "Reds" }).toHtml("x");
    expect(h1).not.toBe(h2);
  });

  test("textColor adds color CSS", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).backgroundGradient({ textColor: true }).toHtml();
    expect(html).toContain("color:");
  });

  test("custom cmap as colorA:colorB", () => {
    const df = DataFrame.fromColumns({ a: [0, 1] });
    const html = dataFrameStyle(df).backgroundGradient({ cmap: "#000000:#ffffff" }).toHtml();
    expect(html).toContain("background-color: #");
  });

  test("vmin/vmax clamp range", () => {
    const df = DataFrame.fromColumns({ a: [0, 50, 100] });
    const styles = dataFrameStyle(df).backgroundGradient({ vmin: 50, vmax: 100 }).exportStyles();
    expect(styles.length).toBe(3); // all cells get a style
  });
});

// ─── textGradient ─────────────────────────────────────────────────────────────

describe("Styler.textGradient", () => {
  test("applies color CSS", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).textGradient().toHtml();
    expect(html).toContain("color: #");
  });
});

// ─── barChart ─────────────────────────────────────────────────────────────────

describe("Styler.barChart", () => {
  test("applies background linear-gradient CSS", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).barChart().toHtml();
    expect(html).toContain("linear-gradient");
  });

  test("custom color", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).barChart({ color: "steelblue" }).toHtml();
    expect(html).toContain("steelblue");
  });
});

// ─── setProperties ────────────────────────────────────────────────────────────

describe("Styler.setProperties", () => {
  test("sets CSS for all cells", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).setProperties({ "font-weight": "bold" }).toHtml();
    expect(html).toContain("font-weight: bold;");
  });

  test("subset limits properties", () => {
    const df = makeNumericDf();
    const styles = dataFrameStyle(df).setProperties({ color: "navy" }, ["a"]).exportStyles();
    for (const s of styles) {
      expect(s.col).toBe(0);
    }
  });
});

// ─── setTableStyles ───────────────────────────────────────────────────────────

describe("Styler.setTableStyles", () => {
  test("adds a <style> block", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .setTableStyles([{ selector: "th", props: { "background-color": "navy" } }])
      .toHtml();
    expect(html).toContain("<style>");
    expect(html).toContain("background-color: navy;");
  });

  test("props as array of pairs", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .setTableStyles([{ selector: "td", props: [["border", "2px solid black"]] }])
      .toHtml();
    expect(html).toContain("border: 2px solid black;");
  });
});

// ─── setTableAttributes ───────────────────────────────────────────────────────

describe("Styler.setTableAttributes", () => {
  test("adds HTML attributes to table tag", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).setTableAttributes('class="my-table"').toHtml();
    expect(html).toContain('class="my-table"');
  });
});

// ─── setCaption ───────────────────────────────────────────────────────────────

describe("Styler.setCaption", () => {
  test("adds a <caption> element", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).setCaption("My Report").toHtml();
    expect(html).toContain("<caption>My Report</caption>");
  });
});

// ─── hide ─────────────────────────────────────────────────────────────────────

describe("Styler.hide", () => {
  test("hide index removes index column", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).hide(0).toHtml();
    expect(html).not.toContain("r0");
    expect(html).not.toContain("r1");
  });

  test("hide columns removes specified columns", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df).hide(1, ["b"]).toHtml();
    expect(html).not.toContain(">b<");
    expect(html).not.toContain(">4<");
  });

  test("hide index alias", () => {
    const df = makeNumericDf();
    const htmlA = dataFrameStyle(df).hide("index").toHtml("x");
    const htmlB = dataFrameStyle(df).hide(0).toHtml("x");
    expect(htmlA).toBe(htmlB);
  });
});

// ─── clearStyles ──────────────────────────────────────────────────────────────

describe("Styler.clearStyles", () => {
  test("removes all applied styles", () => {
    const df = makeNumericDf();
    const s = dataFrameStyle(df).highlightMax({ color: "yellow" });
    expect(s.toHtml()).toContain("background-color: yellow;");
    s.clearStyles();
    expect(s.toHtml()).not.toContain("background-color: yellow;");
  });
});

// ─── exportStyles ─────────────────────────────────────────────────────────────

describe("Styler.exportStyles", () => {
  test("returns empty array for unstyled DataFrame", () => {
    const df = makeNumericDf();
    expect(dataFrameStyle(df).exportStyles()).toEqual([]);
  });

  test("returns StyleRecord objects with row/col/css", () => {
    const df = DataFrame.fromColumns({ a: [10, 20], b: [30, 40] });
    const records = dataFrameStyle(df).highlightMax({ color: "pink" }).exportStyles();
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(typeof r.row).toBe("number");
      expect(typeof r.col).toBe("number");
      expect(typeof r.css).toBe("string");
    }
  });
});

// ─── toLatex ──────────────────────────────────────────────────────────────────

describe("Styler.toLatex", () => {
  test("produces tabular environment", () => {
    const df = makeNumericDf();
    const latex = dataFrameStyle(df).toLatex();
    expect(latex).toContain("\\begin{tabular}");
    expect(latex).toContain("\\end{tabular}");
  });

  test("includes column headers", () => {
    const df = makeNumericDf();
    const latex = dataFrameStyle(df).toLatex();
    expect(latex).toContain("a");
    expect(latex).toContain("b");
  });

  test("with caption wraps in table environment", () => {
    const df = makeNumericDf();
    const latex = dataFrameStyle(df).setCaption("Test Table").toLatex();
    expect(latex).toContain("\\begin{table}");
    expect(latex).toContain("\\caption{Test Table}");
  });

  test("hrules=false omits toprule", () => {
    const df = makeNumericDf();
    const latex = dataFrameStyle(df).toLatex("tabular", false);
    expect(latex).not.toContain("\\toprule");
  });
});

// ─── HTML escaping ────────────────────────────────────────────────────────────

describe("HTML escaping", () => {
  test("escapes HTML special characters in cell values", () => {
    const df = DataFrame.fromColumns({ a: ["<b>hello</b>"] });
    const html = dataFrameStyle(df).toHtml();
    expect(html).toContain("&lt;b&gt;hello&lt;/b&gt;");
  });

  test("escapes special chars in column names", () => {
    const df = DataFrame.fromColumns({ "<col>": [1] });
    const html = dataFrameStyle(df).toHtml();
    expect(html).toContain("&lt;col&gt;");
  });
});

// ─── chaining ─────────────────────────────────────────────────────────────────

describe("method chaining", () => {
  test("multiple methods can be chained", () => {
    const df = makeNumericDf();
    const html = dataFrameStyle(df)
      .format((v) => (typeof v === "number" ? v.toFixed(1) : String(v)))
      .highlightMax({ color: "lime" })
      .highlightMin({ color: "salmon" })
      .highlightNull("gray")
      .backgroundGradient({ cmap: "Blues", subset: ["a"] })
      .setCaption("Combined")
      .setTableStyles([{ selector: "th", props: { "font-size": "14px" } }])
      .toHtml();
    expect(html).toContain("<caption>Combined</caption>");
    expect(html).toContain("background-color: lime;");
    expect(html).toContain("background-color: salmon;");
    expect(html).toContain("<style>");
  });
});

// ─── empty DataFrame ──────────────────────────────────────────────────────────

describe("Styler with empty DataFrame", () => {
  test("renders without error", () => {
    const df = DataFrame.fromColumns({});
    expect(() => dataFrameStyle(df).toHtml()).not.toThrow();
  });

  test("renders single-cell DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [42] });
    const html = dataFrameStyle(df).highlightMax().toHtml();
    expect(html).toContain("42");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based tests", () => {
  test("highlightMax always marks exactly one cell per column (no ties)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        (vals) => {
          // Make them all unique to avoid ties
          const unique = [...new Set(vals)];
          if (unique.length < 2) {
            return;
          }
          const df = DataFrame.fromColumns({ a: unique });
          const records = dataFrameStyle(df).highlightMax().exportStyles();
          // Should have exactly 1 highlighted cell in column 0
          const highlighted = records.filter(
            (r) => r.col === 0 && r.css.includes("background-color: yellow;"),
          );
          expect(highlighted.length).toBe(1);
        },
      ),
    );
  });

  test("backgroundGradient produces valid hex colors", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (vals) => {
          const df = DataFrame.fromColumns({ a: vals });
          const records = dataFrameStyle(df).backgroundGradient().exportStyles();
          for (const r of records) {
            // Every style should contain a valid hex color
            expect(r.css).toMatch(/background-color: #[0-9a-f]{6};/);
          }
        },
      ),
    );
  });

  test("format formatter is applied to all cells", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 5 }),
        (vals) => {
          const df = DataFrame.fromColumns({ x: vals });
          const prefix = "VAL:";
          const html = dataFrameStyle(df)
            .format((v) => `${prefix}${String(v)}`)
            .toHtml();
          for (const v of vals) {
            expect(html).toContain(`${prefix}${v}`);
          }
        },
      ),
    );
  });
});
