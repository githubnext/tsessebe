/**
 * format_table — `DataFrame.to_markdown()` and `DataFrame.to_latex()` table
 * formatters, mirroring `pandas.DataFrame.to_markdown()` and
 * `pandas.DataFrame.to_latex()`.
 *
 * @example
 * ```ts
 * import { DataFrame } from "tsb";
 * import { toMarkdown, toLaTeX } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 *
 * toMarkdown(df);
 * // |   | a | b |
 * // |---|---|---|
 * // | 0 | 1 | x |
 * // | 1 | 2 | y |
 *
 * toLaTeX(df);
 * // \begin{tabular}{lll}
 * // \toprule
 * //  & a & b \\
 * // \midrule
 * // 0 & 1 & x \\
 * // 1 & 2 & y \\
 * // \bottomrule
 * // \end{tabular}
 * ```
 *
 * @module
 */

import type { DataFrame } from "../core/frame.ts";
import type { Series } from "../core/series.ts";
import type { Label, Scalar } from "../types.ts";

// ─── shared helpers ───────────────────────────────────────────────────────────

/** Stringify a scalar value for table output. */
function cellStr(val: Scalar): string {
  if (val === null || val === undefined) {
    return "";
  }
  if (typeof val === "number" && Number.isNaN(val)) {
    return "NaN";
  }
  return String(val);
}

/** Stringify a Label (index/column label) for table output. */
function labelStr(lbl: Label): string {
  if (lbl === null || lbl === undefined) {
    return "";
  }
  return String(lbl);
}

// ═════════════════════════════════════════════════════════════════════════════
// MARKDOWN
// ═════════════════════════════════════════════════════════════════════════════

/** Options for {@link toMarkdown}. */
export interface ToMarkdownOptions {
  /**
   * Alignment for all data columns.  Applies to data cells only; the index
   * column alignment is always `"left"`.
   *
   * - `"left"` — `|:---|`
   * - `"center"` — `|:---:|`
   * - `"right"` — `|---:|`
   * - `"none"` (default) — `|---|`
   *
   * @default "none"
   */
  colAlign?: "left" | "center" | "right" | "none";
  /** If `false`, omit the row index column. @default true */
  index?: boolean;
  /** Number of decimal places for numeric values. @default undefined (no rounding) */
  floatFormat?: number;
}

/**
 * Render a `DataFrame` as a GitHub-Flavoured Markdown table string.
 *
 * Mirrors `pandas.DataFrame.to_markdown()`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
 * console.log(toMarkdown(df));
 * // |   | a | b |
 * // |---|---|---|
 * // | 0 | 1 | x |
 * // | 1 | 2 | y |
 * // | 2 | 3 | z |
 * ```
 */
export function toMarkdown(df: DataFrame, options: ToMarkdownOptions = {}): string {
  const { colAlign = "none", index = true, floatFormat } = options;

  const rowLabels = df.index.values.map(labelStr);
  const colLabels = df.columns.values.map(labelStr);

  // Helper to format a scalar value
  const fmt = (v: Scalar): string => {
    if (floatFormat !== undefined && typeof v === "number" && Number.isFinite(v)) {
      return v.toFixed(floatFormat);
    }
    return cellStr(v);
  };

  // Collect all cell strings so we can compute column widths
  const headers: string[] = index ? ["", ...colLabels] : [...colLabels];
  const rows: string[][] = [];

  for (let r = 0; r < df.shape[0]; r++) {
    const row: string[] = [];
    if (index) {
      row.push(rowLabels[r] ?? "");
    }
    for (const colLabel of colLabels) {
      const s = df.col(colLabel as string);
      row.push(fmt(s.iat(r)));
    }
    rows.push(row);
  }

  // Compute per-column max widths
  const nCols = headers.length;
  const widths: number[] = headers.map((h) => Math.max(h.length, 3));
  for (const row of rows) {
    for (let c = 0; c < nCols; c++) {
      const cell = row[c] ?? "";
      if (cell.length > widths[c]!) {
        widths[c] = cell.length;
      }
    }
  }

  // Build separator row
  const separators: string[] = widths.map((w, ci) => {
    const isIndexCol = index && ci === 0;
    const align = isIndexCol ? "none" : colAlign;
    if (align === "left") {
      return `:${"-".repeat(Math.max(w - 1, 3))}`;
    }
    if (align === "right") {
      return `${"-".repeat(Math.max(w - 1, 3))}:`;
    }
    if (align === "center") {
      return `:${"-".repeat(Math.max(w - 2, 3))}:`;
    }
    return "-".repeat(w);
  });

  // Build lines
  const padCell = (cell: string, width: number): string => {
    return cell.padEnd(width, " ");
  };

  const headerLine = `| ${headers.map((h, i) => padCell(h, widths[i]!)).join(" | ")} |`;
  const sepLine = `| ${separators.join(" | ")} |`;
  const dataLines = rows.map(
    (row) => `| ${row.map((c, i) => padCell(c, widths[i]!)).join(" | ")} |`,
  );

  return [headerLine, sepLine, ...dataLines].join("\n");
}

/**
 * Render a `Series` as a Markdown table string.
 *
 * @example
 * ```ts
 * const s = new Series([10, 20, 30], { name: "val" });
 * console.log(seriesToMarkdown(s));
 * // |   | val |
 * // |---|-----|
 * // | 0 | 10  |
 * // | 1 | 20  |
 * // | 2 | 30  |
 * ```
 */
export function seriesToMarkdown(s: Series<Scalar>, options: ToMarkdownOptions = {}): string {
  const { colAlign = "none", index = true, floatFormat } = options;

  const colName = s.name !== undefined && s.name !== null ? String(s.name) : "0";
  const rowLabels = s.index.values.map(labelStr);
  const values = s.values;

  const fmt = (v: Scalar): string => {
    if (floatFormat !== undefined && typeof v === "number" && Number.isFinite(v)) {
      return v.toFixed(floatFormat);
    }
    return cellStr(v);
  };

  const headers: string[] = index ? ["", colName] : [colName];
  const rows: string[][] = values.map((v, i) => {
    const row: string[] = [];
    if (index) {
      row.push(rowLabels[i] ?? "");
    }
    row.push(fmt(v));
    return row;
  });

  const nCols = headers.length;
  const widths: number[] = headers.map((h) => Math.max(h.length, 3));
  for (const row of rows) {
    for (let c = 0; c < nCols; c++) {
      const cell = row[c] ?? "";
      if (cell.length > widths[c]!) {
        widths[c] = cell.length;
      }
    }
  }

  const separators: string[] = widths.map((w, ci) => {
    const isIndexCol = index && ci === 0;
    const align = isIndexCol ? "none" : colAlign;
    if (align === "left") return `:${"-".repeat(Math.max(w - 1, 3))}`;
    if (align === "right") return `${"-".repeat(Math.max(w - 1, 3))}:`;
    if (align === "center") return `:${"-".repeat(Math.max(w - 2, 3))}:`;
    return "-".repeat(w);
  });

  const padCell = (cell: string, width: number): string => cell.padEnd(width, " ");
  const headerLine = `| ${headers.map((h, i) => padCell(h, widths[i]!)).join(" | ")} |`;
  const sepLine = `| ${separators.join(" | ")} |`;
  const dataLines = rows.map(
    (row) => `| ${row.map((c, i) => padCell(c, widths[i]!)).join(" | ")} |`,
  );

  return [headerLine, sepLine, ...dataLines].join("\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// LATEX
// ═════════════════════════════════════════════════════════════════════════════

/** Options for {@link toLaTeX}. */
export interface ToLaTeXOptions {
  /** Column format string, e.g. `"lrr"` or `"l|r|r"`. Defaults to `"l"` repeated for each column. */
  colFormat?: string;
  /** If `false`, omit the row index column. @default true */
  index?: boolean;
  /** Caption string placed in `\caption{}`. @default undefined */
  caption?: string;
  /** Label string placed in `\label{}`. @default undefined */
  label?: string;
  /** If `true`, wrap in `\begin{table}...\end{table}` environment. @default false */
  tableEnv?: boolean;
  /** Number of decimal places for numeric values. @default undefined */
  floatFormat?: number;
  /** If `true`, use `longtable` instead of `tabular`. @default false */
  longtable?: boolean;
  /** If `false`, omit the booktabs `\toprule/\midrule/\bottomrule`. @default true */
  booktabs?: boolean;
}

/** Escape special LaTeX characters in a string. */
function latexEscape(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Render a `DataFrame` as a LaTeX `tabular` (or `longtable`) environment string.
 *
 * Mirrors `pandas.DataFrame.to_latex()`.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
 * console.log(toLaTeX(df));
 * // \begin{tabular}{lll}
 * // \toprule
 * //  & a & b \\
 * // \midrule
 * // 0 & 1 & x \\
 * // 1 & 2 & y \\
 * // \bottomrule
 * // \end{tabular}
 * ```
 */
export function toLaTeX(df: DataFrame, options: ToLaTeXOptions = {}): string {
  const {
    index = true,
    caption,
    label,
    tableEnv = false,
    floatFormat,
    longtable = false,
    booktabs = true,
  } = options;

  const colLabels = df.columns.values.map(labelStr);
  const rowLabels = df.index.values.map(labelStr);

  const nDataCols = colLabels.length;
  const nCols = index ? nDataCols + 1 : nDataCols;

  // Build column format string
  const colFormat = options.colFormat ?? "l".repeat(nCols);

  // Helper: format a cell value
  const fmt = (v: Scalar): string => {
    if (floatFormat !== undefined && typeof v === "number" && Number.isFinite(v)) {
      return latexEscape(v.toFixed(floatFormat));
    }
    return latexEscape(cellStr(v));
  };

  const lines: string[] = [];
  const envName = longtable ? "longtable" : "tabular";

  if (tableEnv) {
    lines.push("\\begin{table}");
    if (caption !== undefined) {
      lines.push(`\\caption{${latexEscape(caption)}}`);
    }
    if (label !== undefined) {
      lines.push(`\\label{${latexEscape(label)}}`);
    }
    lines.push("\\centering");
  }

  lines.push(`\\begin{${envName}}{${colFormat}}`);

  if (booktabs) {
    lines.push("\\toprule");
  } else {
    lines.push("\\hline");
  }

  // Header row
  const headerCells: string[] = [];
  if (index) {
    headerCells.push("");
  }
  for (const c of colLabels) {
    headerCells.push(latexEscape(c));
  }
  lines.push(`${headerCells.join(" & ")} \\\\`);

  if (booktabs) {
    lines.push("\\midrule");
  } else {
    lines.push("\\hline");
  }

  // Data rows
  for (let r = 0; r < df.shape[0]; r++) {
    const cells: string[] = [];
    if (index) {
      cells.push(latexEscape(rowLabels[r] ?? ""));
    }
    for (const colLabel of colLabels) {
      const s = df.col(colLabel as string);
      cells.push(fmt(s.iat(r)));
    }
    lines.push(`${cells.join(" & ")} \\\\`);
  }

  if (booktabs) {
    lines.push("\\bottomrule");
  } else {
    lines.push("\\hline");
  }

  lines.push(`\\end{${envName}}`);

  if (tableEnv) {
    lines.push("\\end{table}");
  }

  return lines.join("\n");
}

/**
 * Render a `Series` as a LaTeX table string.
 *
 * @example
 * ```ts
 * const s = new Series([1, 2, 3], { name: "x" });
 * console.log(seriesToLaTeX(s));
 * ```
 */
export function seriesToLaTeX(s: Series<Scalar>, options: ToLaTeXOptions = {}): string {
  const {
    index = true,
    caption,
    label,
    tableEnv = false,
    floatFormat,
    longtable = false,
    booktabs = true,
  } = options;

  const colName = s.name !== undefined && s.name !== null ? String(s.name) : "0";
  const rowLabels = s.index.values.map(labelStr);
  const values = s.values;

  const nCols = index ? 2 : 1;
  const colFormat = options.colFormat ?? "l".repeat(nCols);

  const fmt = (v: Scalar): string => {
    if (floatFormat !== undefined && typeof v === "number" && Number.isFinite(v)) {
      return latexEscape(v.toFixed(floatFormat));
    }
    return latexEscape(cellStr(v));
  };

  const lines: string[] = [];
  const envName = longtable ? "longtable" : "tabular";

  if (tableEnv) {
    lines.push("\\begin{table}");
    if (caption !== undefined) {
      lines.push(`\\caption{${latexEscape(caption)}}`);
    }
    if (label !== undefined) {
      lines.push(`\\label{${latexEscape(label)}}`);
    }
    lines.push("\\centering");
  }

  lines.push(`\\begin{${envName}}{${colFormat}}`);
  if (booktabs) {
    lines.push("\\toprule");
  } else {
    lines.push("\\hline");
  }

  // Header
  const hdr = index ? ` & ${latexEscape(colName)} \\\\` : `${latexEscape(colName)} \\\\`;
  lines.push(hdr);

  if (booktabs) {
    lines.push("\\midrule");
  } else {
    lines.push("\\hline");
  }

  for (let r = 0; r < values.length; r++) {
    const rowLabel = index ? `${latexEscape(rowLabels[r] ?? "")} & ` : "";
    lines.push(`${rowLabel}${fmt(values[r]!)} \\\\`);
  }

  if (booktabs) {
    lines.push("\\bottomrule");
  } else {
    lines.push("\\hline");
  }

  lines.push(`\\end{${envName}}`);

  if (tableEnv) {
    lines.push("\\end{table}");
  }

  return lines.join("\n");
}
