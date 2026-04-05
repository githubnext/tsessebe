/**
 * to_html — render a DataFrame or Series as an HTML table.
 *
 * Mirrors `pandas.DataFrame.to_html()`: produces a complete `<table>` element
 * with a `<thead>` header row and `<tbody>` data rows, suitable for embedding
 * in web pages or Jupyter-style reports.
 *
 * @example
 * ```ts
 * import { DataFrame, toHtml } from "tsb";
 *
 * const df = DataFrame.fromRecords([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob",   age: 25 },
 * ]);
 *
 * console.log(toHtml(df));
 * // <table>
 * //   <thead><tr><th></th><th>name</th><th>age</th></tr></thead>
 * //   <tbody>
 * //     <tr><th>0</th><td>Alice</td><td>30</td></tr>
 * //     <tr><th>1</th><td>Bob</td><td>25</td></tr>
 * //   </tbody>
 * // </table>
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Options for `toHtml()` and `seriesToHtml()`. */
export interface ToHtmlOptions {
  /**
   * Include the row index as a `<th>` column.
   * @default true
   */
  readonly index?: boolean;
  /**
   * CSS class(es) to add to the `<table>` element.
   * @default undefined
   */
  readonly classes?: string | readonly string[];
  /**
   * Limit the output to the first `maxRows` data rows plus an ellipsis row.
   * @default undefined (all rows)
   */
  readonly maxRows?: number;
  /**
   * String to display for missing values (null, undefined, NaN).
   * @default ""
   */
  readonly naRep?: string;
  /**
   * Number of decimal places for floating-point numbers.
   * @default undefined (no rounding)
   */
  readonly floatPrecision?: number;
  /**
   * Render as a full HTML document (`<!DOCTYPE html>…`) instead of a fragment.
   * @default false
   */
  readonly fullDocument?: boolean;
  /**
   * The table border attribute value (e.g. "1" for a visible border).
   * @default undefined
   */
  readonly border?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Escape HTML special characters in a cell value. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format a scalar for HTML output. */
function formatScalar(v: Scalar, opts: ToHtmlOptions): string {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return escapeHtml(opts.naRep ?? "");
  }
  if (typeof v === "number" && opts.floatPrecision !== undefined && !Number.isInteger(v)) {
    return escapeHtml(v.toFixed(opts.floatPrecision));
  }
  return escapeHtml(String(v));
}

/** Build the class attribute string, if any. */
function classAttr(classes: string | readonly string[] | undefined): string {
  if (classes === undefined) {
    return "";
  }
  const cls = Array.isArray(classes) ? (classes as string[]).join(" ") : (classes as string);
  if (cls.length === 0) {
    return "";
  }
  return ` class="${escapeHtml(cls)}"`;
}

/** Build the border attribute string, if any. */
function borderAttr(border: string | undefined): string {
  if (border === undefined) {
    return "";
  }
  return ` border="${escapeHtml(border)}"`;
}

// ─── rendering ────────────────────────────────────────────────────────────────

interface RenderSpec {
  headers: string[];
  indexValues: string[];
  rows: string[][];
  opts: ToHtmlOptions;
  includeIndex: boolean;
}

/** Render a RenderSpec into an HTML table string. */
function renderHtmlTable(spec: RenderSpec): string {
  const { headers, indexValues, rows, opts, includeIndex } = spec;
  const maxRows = opts.maxRows;
  const clsAttr = classAttr(opts.classes);
  const brdAttr = borderAttr(opts.border);

  const lines: string[] = [];
  lines.push(`<table${clsAttr}${brdAttr}>`);

  // thead
  lines.push("  <thead>");
  const thCells: string[] = [];
  if (includeIndex) {
    thCells.push("<th></th>");
  }
  for (const h of headers) {
    thCells.push(`<th>${escapeHtml(h)}</th>`);
  }
  lines.push(`    <tr>${thCells.join("")}</tr>`);
  lines.push("  </thead>");

  // tbody
  lines.push("  <tbody>");

  const totalRows = rows.length;
  const renderCount = maxRows !== undefined ? Math.min(maxRows, totalRows) : totalRows;

  for (let r = 0; r < renderCount; r++) {
    const tdCells: string[] = [];
    if (includeIndex) {
      tdCells.push(`<th>${indexValues[r] ?? ""}</th>`);
    }
    for (const cell of rows[r] ?? []) {
      tdCells.push(`<td>${cell}</td>`);
    }
    lines.push(`    <tr>${tdCells.join("")}</tr>`);
  }

  // ellipsis row when truncated
  if (maxRows !== undefined && renderCount < totalRows) {
    const ellipsisCols = headers.length + (includeIndex ? 1 : 0);
    lines.push(`    <tr><td colspan="${ellipsisCols}">...</td></tr>`);
  }

  lines.push("  </tbody>");
  lines.push("</table>");

  const tableHtml = lines.join("\n");

  if (opts.fullDocument === true) {
    return wrapDocument(tableHtml);
  }
  return tableHtml;
}

/** Wrap a table fragment in a minimal HTML document. */
function wrapDocument(tableHtml: string): string {
  return [
    "<!DOCTYPE html>",
    "<html>",
    '<head><meta charset="utf-8"/></head>',
    "<body>",
    tableHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Render a `DataFrame` as an HTML table string.
 *
 * @param df      - Source DataFrame.
 * @param options - Formatting options.
 * @returns An HTML `<table>` element string.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
 * console.log(toHtml(df));
 * ```
 */
export function toHtml(df: DataFrame, options?: ToHtmlOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;

  const headers = df.columns.values.map(String);
  const indexValues: string[] = [];
  for (let i = 0; i < df.index.size; i++) {
    indexValues.push(escapeHtml(String(df.index.values[i])));
  }

  const rows: string[][] = [];
  for (let r = 0; r < df.index.size; r++) {
    const row: string[] = [];
    for (const colName of df.columns.values) {
      const col = df.col(colName);
      row.push(formatScalar(col.iloc(r), opts));
    }
    rows.push(row);
  }

  return renderHtmlTable({ headers, indexValues, rows, opts, includeIndex });
}

/**
 * Render a `Series` as an HTML table (two columns: index | values).
 *
 * @param series  - Source Series.
 * @param options - Formatting options.
 * @returns An HTML `<table>` element string.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], name: "score" });
 * console.log(seriesToHtml(s));
 * ```
 */
export function seriesToHtml(series: Series, options?: ToHtmlOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;
  const valueHeader = series.name ?? "0";

  const headers = [String(valueHeader)];
  const indexValues: string[] = [];
  for (let i = 0; i < series.index.size; i++) {
    indexValues.push(escapeHtml(String(series.index.values[i])));
  }

  const rows: string[][] = [];
  for (let r = 0; r < series.size; r++) {
    rows.push([formatScalar(series.iloc(r), opts)]);
  }

  return renderHtmlTable({ headers, indexValues, rows, opts, includeIndex });
}
