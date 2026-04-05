/**
 * Tests for to_markdown, to_html, to_latex I/O functions.
 */
import { describe, expect, it } from "bun:test";
import {
  DataFrame,
  Series,
  seriesToHtml,
  seriesToLatex,
  seriesToMarkdown,
  toHtml,
  toLatex,
  toMarkdown,
} from "../../src/index.ts";

// ─── top-level regex constants ────────────────────────────────────────────────

const SEPARATOR_RE = /\|[\s\-:]+\|/;
const FIRST_TH_RE = /<th>(.*?)<\/th>/;
const TABULAR_R_RE = /\\begin\{tabular\}\{r\}/;
const TABULAR_L_RE = /\\begin\{tabular\}\{l\}/;

// ─── shared fixture ───────────────────────────────────────────────────────────

function makeDF(): DataFrame {
  return DataFrame.fromRecords([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ]);
}

// ─── toMarkdown ───────────────────────────────────────────────────────────────

describe("toMarkdown", () => {
  it("contains pipe characters", () => {
    const md = toMarkdown(makeDF());
    expect(md).toContain("|");
  });

  it("contains column headers", () => {
    const md = toMarkdown(makeDF());
    expect(md).toContain("name");
    expect(md).toContain("age");
  });

  it("contains data values", () => {
    const md = toMarkdown(makeDF());
    expect(md).toContain("Alice");
    expect(md).toContain("30");
  });

  it("contains separator row with dashes", () => {
    const md = toMarkdown(makeDF());
    expect(md).toMatch(SEPARATOR_RE);
  });

  it("omits index when index: false", () => {
    const md = toMarkdown(makeDF(), { index: false });
    // first cell after first | should be the column header, not an empty index header
    const firstLine = md.split("\n")[0] ?? "";
    expect(firstLine.startsWith("| name")).toBe(true);
  });

  it("applies floatPrecision", () => {
    const df = DataFrame.fromRecords([{ x: 1.23456 }]);
    const md = toMarkdown(df, { floatPrecision: 2 });
    expect(md).toContain("1.23");
    expect(md).not.toContain("1.23456");
  });

  it("uses naRep for missing values", () => {
    const df = DataFrame.fromRecords([{ x: null as unknown as number }]);
    const md = toMarkdown(df, { naRep: "N/A" });
    expect(md).toContain("N/A");
  });

  it("returns a multi-line string", () => {
    const md = toMarkdown(makeDF());
    expect(md.split("\n").length).toBeGreaterThanOrEqual(4);
  });
});

describe("seriesToMarkdown", () => {
  it("contains series name as header", () => {
    const s = new Series({ data: [1, 2, 3], name: "score" });
    const md = seriesToMarkdown(s);
    expect(md).toContain("score");
  });

  it("contains data values", () => {
    const s = new Series({ data: [10, 20, 30], name: "v" });
    const md = seriesToMarkdown(s);
    expect(md).toContain("10");
    expect(md).toContain("20");
  });
});

// ─── toHtml ───────────────────────────────────────────────────────────────────

describe("toHtml", () => {
  it("starts with <table>", () => {
    const html = toHtml(makeDF());
    expect(html).toContain("<table>");
  });

  it("contains thead and tbody", () => {
    const html = toHtml(makeDF());
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
  });

  it("contains column headers in th elements", () => {
    const html = toHtml(makeDF());
    expect(html).toContain("<th>name</th>");
    expect(html).toContain("<th>age</th>");
  });

  it("contains data in td elements", () => {
    const html = toHtml(makeDF());
    expect(html).toContain("<td>Alice</td>");
    expect(html).toContain("<td>30</td>");
  });

  it("adds class attribute when classes option set", () => {
    const html = toHtml(makeDF(), { classes: "my-table" });
    expect(html).toContain('class="my-table"');
  });

  it("adds border attribute when border option set", () => {
    const html = toHtml(makeDF(), { border: "1" });
    expect(html).toContain('border="1"');
  });

  it("truncates rows when maxRows is set", () => {
    const df = DataFrame.fromRecords([{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 5 }]);
    const html = toHtml(df, { maxRows: 2 });
    expect(html).toContain("...");
    // should not contain row 5's value in a data row (only 2 real rows rendered)
    const matches = (html.match(/<td>(\d+)<\/td>/g) ?? []).length;
    expect(matches).toBeLessThanOrEqual(2);
  });

  it("escapes HTML special characters", () => {
    const df = DataFrame.fromRecords([{ x: "<script>" }]);
    const html = toHtml(df);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("wraps in full document when fullDocument: true", () => {
    const html = toHtml(makeDF(), { fullDocument: true });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("omits index column when index: false", () => {
    const html = toHtml(makeDF(), { index: false });
    // The first <th> should not be empty (the index placeholder)
    const firstTh = html.match(FIRST_TH_RE)?.[1];
    expect(firstTh).not.toBe("");
  });
});

describe("seriesToHtml", () => {
  it("produces valid HTML table", () => {
    const s = new Series({ data: [1, 2, 3], name: "score" });
    const html = seriesToHtml(s);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>score</th>");
  });
});

// ─── toLatex ─────────────────────────────────────────────────────────────────

describe("toLatex", () => {
  it("contains \\begin{tabular}", () => {
    const tex = toLatex(makeDF());
    expect(tex).toContain("\\begin{tabular}");
  });

  it("contains \\end{tabular}", () => {
    const tex = toLatex(makeDF());
    expect(tex).toContain("\\end{tabular}");
  });

  it("contains \\toprule and \\bottomrule", () => {
    const tex = toLatex(makeDF());
    expect(tex).toContain("\\toprule");
    expect(tex).toContain("\\bottomrule");
  });

  it("contains column headers", () => {
    const tex = toLatex(makeDF());
    expect(tex).toContain("name");
    expect(tex).toContain("age");
  });

  it("contains data values", () => {
    const tex = toLatex(makeDF());
    expect(tex).toContain("Alice");
    expect(tex).toContain("30");
  });

  it("uses longtable when longtable: true", () => {
    const tex = toLatex(makeDF(), { longtable: true });
    expect(tex).toContain("\\begin{longtable}");
  });

  it("includes caption when specified", () => {
    const tex = toLatex(makeDF(), { longtable: true, caption: "My Table" });
    expect(tex).toContain("\\caption{My Table}");
  });

  it("includes label when specified", () => {
    const tex = toLatex(makeDF(), { longtable: true, label: "tab:mydata" });
    expect(tex).toContain("\\label{tab:mydata}");
  });

  it("escapes LaTeX special characters", () => {
    const df = DataFrame.fromRecords([{ x: "a & b" }]);
    const tex = toLatex(df);
    expect(tex).toContain("\\&");
    expect(tex).not.toContain("a & b");
  });

  it("uses r alignment for numeric columns", () => {
    const df = DataFrame.fromRecords([{ n: 42 }]);
    const tex = toLatex(df, { index: false });
    // column spec should be r for numeric
    expect(tex).toMatch(TABULAR_R_RE);
  });

  it("uses l alignment for string columns", () => {
    const df = DataFrame.fromRecords([{ s: "hello" }]);
    const tex = toLatex(df, { index: false });
    expect(tex).toMatch(TABULAR_L_RE);
  });
});

describe("seriesToLatex", () => {
  it("contains tabular environment", () => {
    const s = new Series({ data: [1.5, 2.5], name: "x" });
    const tex = seriesToLatex(s);
    expect(tex).toContain("\\begin{tabular}");
    expect(tex).toContain("x");
  });

  it("applies floatPrecision", () => {
    const s = new Series({ data: [1.2345], name: "v" });
    const tex = seriesToLatex(s, { floatPrecision: 2 });
    expect(tex).toContain("1.23");
  });
});
