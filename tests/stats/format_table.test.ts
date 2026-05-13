/**
 * Tests for format_table — toMarkdown / toLaTeX
 */
import { describe, expect, it } from "bun:test";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import {
  seriesToLaTeX,
  seriesToMarkdown,
  toLaTeX,
  toMarkdown,
} from "../../src/stats/format_table.ts";

// ─── toMarkdown ───────────────────────────────────────────────────────────────

describe("toMarkdown", () => {
  it("basic DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const md = toMarkdown(df);
    const lines = md.split("\n");
    // header + separator + 2 data rows
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("a");
    expect(lines[0]).toContain("b");
    // separator row
    expect(lines[1]).toMatch(/\|[-| ]+\|/);
    // data rows contain values
    expect(lines[2]).toContain("1");
    expect(lines[2]).toContain("x");
    expect(lines[3]).toContain("2");
    expect(lines[3]).toContain("y");
  });

  it("includes index column by default", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] });
    const md = toMarkdown(df);
    const lines = md.split("\n");
    // header should have empty index cell
    expect(lines[0]).toMatch(/^\| +\|/);
    expect(lines[2]).toContain("0");
    expect(lines[3]).toContain("1");
  });

  it("index: false omits index column", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] });
    const md = toMarkdown(df, { index: false });
    const lines = md.split("\n");
    // no empty leading cell
    expect(lines[0]).toMatch(/^\| v/);
    expect(lines[2]).not.toContain("0 |");
  });

  it("colAlign: left", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const md = toMarkdown(df, { colAlign: "left" });
    expect(md).toContain(":---");
  });

  it("colAlign: right", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const md = toMarkdown(df, { colAlign: "right" });
    expect(md).toContain("---:");
  });

  it("colAlign: center", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const md = toMarkdown(df, { colAlign: "center" });
    expect(md).toContain(":---:");
  });

  it("floatFormat rounds numbers", () => {
    const df = DataFrame.fromColumns({ v: [1.23456] });
    const md = toMarkdown(df, { floatFormat: 2 });
    expect(md).toContain("1.23");
    expect(md).not.toContain("1.23456");
  });

  it("null/undefined/NaN cells render as empty/NaN", () => {
    const df = DataFrame.fromColumns({
      a: [null, Number.NaN, undefined] as (null | number | undefined)[],
    });
    const md = toMarkdown(df);
    expect(md).toContain("NaN");
  });

  it("empty DataFrame (no rows)", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const md = toMarkdown(df);
    const lines = md.split("\n");
    // header + separator only
    expect(lines).toHaveLength(2);
  });

  it("single column, single row", () => {
    const df = DataFrame.fromColumns({ x: [42] });
    const md = toMarkdown(df);
    expect(md).toContain("42");
    expect(md.split("\n")).toHaveLength(3);
  });
});

// ─── seriesToMarkdown ─────────────────────────────────────────────────────────

describe("seriesToMarkdown", () => {
  it("basic Series", () => {
    const s = new Series({ data: [1, 2, 3], name: "val" });
    const md = seriesToMarkdown(s);
    const lines = md.split("\n");
    expect(lines).toHaveLength(5); // header + sep + 3 rows
    expect(lines[0]).toContain("val");
    expect(lines[2]).toContain("1");
  });

  it("uses series name as column header", () => {
    const s = new Series({ data: [10], name: "score" });
    const md = seriesToMarkdown(s);
    expect(md).toContain("score");
  });

  it("unnamed series uses '0' as column name", () => {
    const s = new Series({ data: [1, 2] });
    const md = seriesToMarkdown(s);
    expect(md.split("\n")[0]).toContain("0");
  });

  it("index: false", () => {
    const s = new Series({ data: [5, 6], name: "n" });
    const md = seriesToMarkdown(s, { index: false });
    const lines = md.split("\n");
    expect(lines[0]).toMatch(/^\| n/);
  });
});

// ─── toLaTeX ──────────────────────────────────────────────────────────────────

describe("toLaTeX", () => {
  it("basic DataFrame produces tabular environment", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const tex = toLaTeX(df);
    expect(tex).toContain("\\begin{tabular}");
    expect(tex).toContain("\\end{tabular}");
    expect(tex).toContain("\\toprule");
    expect(tex).toContain("\\midrule");
    expect(tex).toContain("\\bottomrule");
  });

  it("header row includes column names", () => {
    const df = DataFrame.fromColumns({ alpha: [1], beta: [2] });
    const tex = toLaTeX(df);
    expect(tex).toContain("alpha");
    expect(tex).toContain("beta");
  });

  it("data rows contain values", () => {
    const df = DataFrame.fromColumns({ v: [42, 99] });
    const tex = toLaTeX(df);
    expect(tex).toContain("42");
    expect(tex).toContain("99");
  });

  it("index: false omits index", () => {
    const df = DataFrame.fromColumns({ v: [1, 2] });
    const tex = toLaTeX(df, { index: false });
    // No " & " before the value in data rows
    const lines = tex.split("\n").filter((l) => l.endsWith("\\\\"));
    // header line
    expect(lines[0]).toBe("v \\\\");
  });

  it("custom colFormat", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const tex = toLaTeX(df, { colFormat: "lr" });
    expect(tex).toContain("{lr}");
  });

  it("booktabs: false uses hline", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const tex = toLaTeX(df, { booktabs: false });
    expect(tex).toContain("\\hline");
    expect(tex).not.toContain("\\toprule");
  });

  it("longtable: true uses longtable env", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const tex = toLaTeX(df, { longtable: true });
    expect(tex).toContain("\\begin{longtable}");
    expect(tex).toContain("\\end{longtable}");
  });

  it("tableEnv: true wraps in table environment", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const tex = toLaTeX(df, { tableEnv: true });
    expect(tex).toContain("\\begin{table}");
    expect(tex).toContain("\\end{table}");
  });

  it("caption and label", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const tex = toLaTeX(df, { tableEnv: true, caption: "My Table", label: "tab:my" });
    expect(tex).toContain("\\caption{My Table}");
    expect(tex).toContain("\\label{tab:my}");
  });

  it("floatFormat rounds numbers", () => {
    const df = DataFrame.fromColumns({ v: [3.14159] });
    const tex = toLaTeX(df, { floatFormat: 2 });
    expect(tex).toContain("3.14");
    expect(tex).not.toContain("3.14159");
  });

  it("escapes special LaTeX characters", () => {
    const df = DataFrame.fromColumns({ "a&b": [1] });
    const tex = toLaTeX(df);
    expect(tex).toContain("a\\&b");
  });

  it("escapes special LaTeX chars in values", () => {
    const df = DataFrame.fromColumns({ v: ["x_y"] });
    const tex = toLaTeX(df);
    expect(tex).toContain("x\\_y");
  });

  it("empty DataFrame produces only header", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const tex = toLaTeX(df);
    expect(tex).toContain("\\begin{tabular}");
    expect(tex).toContain("\\bottomrule");
  });
});

// ─── seriesToLaTeX ────────────────────────────────────────────────────────────

describe("seriesToLaTeX", () => {
  it("basic series", () => {
    const s = new Series({ data: [1, 2, 3], name: "x" });
    const tex = seriesToLaTeX(s);
    expect(tex).toContain("\\begin{tabular}");
    expect(tex).toContain("x");
    expect(tex).toContain("1");
    expect(tex).toContain("2");
  });

  it("index: false", () => {
    const s = new Series({ data: [5], name: "v" });
    const tex = seriesToLaTeX(s, { index: false });
    const lines = tex.split("\n").filter((l) => l.endsWith("\\\\"));
    expect(lines[0]).toBe("v \\\\");
  });

  it("floatFormat", () => {
    const s = new Series({ data: [1.111], name: "n" });
    const tex = seriesToLaTeX(s, { floatFormat: 1 });
    expect(tex).toContain("1.1");
  });
});
