/**
 * to_markdown — render a DataFrame or Series as a Markdown table.
 *
 * Mirrors `pandas.DataFrame.to_markdown()`: produces a GitHub-Flavored
 * Markdown pipe table that can be embedded in documentation, README files,
 * or chat systems that render Markdown.
 *
 * @example
 * ```ts
 * import { DataFrame, toMarkdown } from "tsb";
 *
 * const df = DataFrame.fromRecords([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob",   age: 25 },
 * ]);
 *
 * console.log(toMarkdown(df));
 * // | index | name  | age |
 * // |------:|:------|----:|
 * // |     0 | Alice |  30 |
 * // |     1 | Bob   |  25 |
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Alignment for a single column in the rendered Markdown table. */
export type MarkdownAlign = "left" | "right" | "center";

/** Options for `toMarkdown()` and `seriesToMarkdown()`. */
export interface ToMarkdownOptions {
  /**
   * Include the row index as the first column.
   * @default true
   */
  readonly index?: boolean;
  /**
   * Default column alignment.
   * Numeric columns default to `"right"`, others to `"left"`.
   * Set to override all columns with a fixed alignment.
   */
  readonly align?: MarkdownAlign;
  /**
   * Number of decimal places for floating-point numbers.
   * @default undefined (no rounding)
   */
  readonly floatPrecision?: number;
  /**
   * String to display for missing values (null, undefined, NaN).
   * @default ""
   */
  readonly naRep?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const TOP_REGEX = /^-?\d/;

/** True when the scalar should be treated as a number. */
function isNumericScalar(v: Scalar): boolean {
  return typeof v === "number" || typeof v === "bigint";
}

/** Format a single scalar value. */
function formatScalar(v: Scalar, opts: ToMarkdownOptions): string {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return opts.naRep ?? "";
  }
  if (typeof v === "number" && opts.floatPrecision !== undefined && !Number.isInteger(v)) {
    return v.toFixed(opts.floatPrecision);
  }
  return String(v);
}

/** Determine alignment from the column values (all numeric → right, else left). */
function columnAlign(values: readonly Scalar[], override?: MarkdownAlign): MarkdownAlign {
  if (override !== undefined) {
    return override;
  }
  const hasNonNull = values.some((v) => v !== null && v !== undefined);
  if (!hasNonNull) {
    return "left";
  }
  const allNumeric = values.every((v) => v === null || v === undefined || isNumericScalar(v));
  return allNumeric ? "right" : "left";
}

/** Build the separator line for a column given its width and alignment. */
function separatorCell(width: number, align: MarkdownAlign): string {
  const dashes = (n: number): string => "-".repeat(Math.max(1, n));
  if (align === "center") {
    return `:${dashes(width - 2)}:`;
  }
  if (align === "right") {
    return `${dashes(width - 1)}:`;
  }
  return `:${dashes(width - 1)}`;
}

/** Pad a string to `width` characters according to `align`. */
function padCell(s: string, width: number, align: MarkdownAlign): string {
  const pad = width - s.length;
  if (pad <= 0) {
    return s;
  }
  if (align === "right") {
    return " ".repeat(pad) + s;
  }
  if (align === "center") {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return " ".repeat(left) + s + " ".repeat(right);
  }
  return s + " ".repeat(pad);
}

/** True if the string looks like it starts with a digit or minus digit. */
function looksNumeric(s: string): boolean {
  return TOP_REGEX.test(s);
}

/** Wrap a cell value with surrounding spaces for pipe table formatting. */
function wrapCell(s: string, width: number, align: MarkdownAlign): string {
  return ` ${padCell(s, width, align)} `;
}

// ─── core renderer ────────────────────────────────────────────────────────────

interface ColumnSpec {
  header: string;
  cells: string[];
  align: MarkdownAlign;
}

/** Build ColumnSpec for a data column. */
function buildColumnSpec(
  header: string,
  rawValues: readonly Scalar[],
  opts: ToMarkdownOptions,
): ColumnSpec {
  const cells = rawValues.map((v) => formatScalar(v, opts));
  const align = columnAlign(rawValues, opts.align);
  return { header, cells, align };
}

/** Render an array of ColumnSpecs into a Markdown table string. */
function renderTable(specs: ColumnSpec[]): string {
  if (specs.length === 0) {
    return "";
  }

  const nRows = specs[0]?.cells.length ?? 0;

  // compute column widths
  const widths = specs.map((spec) => {
    const maxCell = spec.cells.reduce((m, c) => Math.max(m, c.length), 0);
    // separator min width: align chars take 1 extra char
    const minSep = 3;
    return Math.max(spec.header.length, maxCell, minSep);
  });

  const lines: string[] = [];

  // header row
  const headerCells = specs.map((spec, i) => wrapCell(spec.header, widths[i] ?? 0, "left"));
  lines.push(`|${headerCells.join("|")}|`);

  // separator row
  const sepCells = specs.map((spec, i) => ` ${separatorCell(widths[i] ?? 0, spec.align)} `);
  lines.push(`|${sepCells.join("|")}|`);

  // data rows
  for (let r = 0; r < nRows; r++) {
    const rowCells = specs.map((spec, i) => {
      const cell = spec.cells[r] ?? "";
      const align = looksNumeric(cell) ? spec.align : spec.align;
      return wrapCell(cell, widths[i] ?? 0, align);
    });
    lines.push(`|${rowCells.join("|")}|`);
  }

  return lines.join("\n");
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Render a `DataFrame` as a Markdown pipe table.
 *
 * @param df      - Source DataFrame.
 * @param options - Formatting options.
 * @returns A GFM-compatible Markdown table string.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
 * console.log(toMarkdown(df));
 * ```
 */
export function toMarkdown(df: DataFrame, options?: ToMarkdownOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;

  const specs: ColumnSpec[] = [];

  // index column
  if (includeIndex) {
    const indexVals: Scalar[] = [];
    for (let i = 0; i < df.index.size; i++) {
      indexVals.push(df.index.values[i] as Scalar);
    }
    specs.push(buildColumnSpec("", indexVals, opts));
  }

  // data columns
  for (const colName of df.columns.values) {
    const col = df.col(colName);
    const colVals: Scalar[] = [];
    for (let i = 0; i < col.size; i++) {
      colVals.push(col.iloc(i));
    }
    specs.push(buildColumnSpec(String(colName), colVals, opts));
  }

  return renderTable(specs);
}

/**
 * Render a `Series` as a two-column Markdown table (index | values).
 *
 * @param series  - Source Series.
 * @param options - Formatting options.
 * @returns A GFM-compatible Markdown table string.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30], name: "score" });
 * console.log(seriesToMarkdown(s));
 * ```
 */
export function seriesToMarkdown(series: Series, options?: ToMarkdownOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;
  const valueHeader = series.name ?? "0";

  const specs: ColumnSpec[] = [];

  if (includeIndex) {
    const indexVals: Scalar[] = [];
    for (let i = 0; i < series.index.size; i++) {
      indexVals.push(series.index.values[i] as Scalar);
    }
    specs.push(buildColumnSpec("", indexVals, opts));
  }

  const dataVals: Scalar[] = [];
  for (let i = 0; i < series.size; i++) {
    dataVals.push(series.iloc(i));
  }
  specs.push(buildColumnSpec(String(valueHeader), dataVals, opts));

  return renderTable(specs);
}
