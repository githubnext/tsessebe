/**
 * to_latex — render a DataFrame or Series as a LaTeX tabular environment.
 *
 * Mirrors `pandas.DataFrame.to_latex()`: produces a `tabular` (or `longtable`)
 * environment suitable for inclusion in LaTeX documents via `\input{}`.
 *
 * @example
 * ```ts
 * import { DataFrame, toLatex } from "tsb";
 *
 * const df = DataFrame.fromRecords([
 *   { name: "Alice", age: 30 },
 *   { name: "Bob",   age: 25 },
 * ]);
 *
 * console.log(toLatex(df));
 * // \begin{tabular}{lrl}
 * // \toprule
 * //  & name & age \\
 * // \midrule
 * // 0 & Alice & 30 \\
 * // 1 & Bob & 25 \\
 * // \bottomrule
 * // \end{tabular}
 * ```
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ──────────────────────────────────────────────────────────────────

/** Column alignment specifiers for LaTeX tabular environments. */
export type LatexColumnAlign = "l" | "r" | "c";

/** Options for `toLatex()` and `seriesToLatex()`. */
export interface ToLatexOptions {
  /**
   * Include the row index as the first column.
   * @default true
   */
  readonly index?: boolean;
  /**
   * Default column alignment: `"l"` left, `"r"` right, `"c"` center.
   * Numeric columns default to `"r"`, others to `"l"`.
   */
  readonly columnAlignment?: LatexColumnAlign;
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
   * Use a `longtable` environment instead of `tabular` (for multi-page tables).
   * @default false
   */
  readonly longtable?: boolean;
  /**
   * Add `\caption{...}` above the `\toprule`.
   * Only used when `longtable` is `true` or when wrapped in `table`.
   */
  readonly caption?: string;
  /**
   * Add `\label{...}` for cross-referencing.
   */
  readonly label?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Escape LaTeX special characters. */
function escapeTex(s: string): string {
  return (
    s
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\$/g, "\\$")
      .replace(/%/g, "\\%")
      .replace(/&/g, "\\&")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/\^/g, "\\^{}")
      // biome-ignore lint/nursery/noSecrets: LaTeX escape sequence, not a secret
      .replace(/~/g, "\\textasciitilde{}")
  );
}

/** Format a scalar for LaTeX output. */
function formatScalar(v: Scalar, opts: ToLatexOptions): string {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return escapeTex(opts.naRep ?? "");
  }
  if (typeof v === "number" && opts.floatPrecision !== undefined && !Number.isInteger(v)) {
    return v.toFixed(opts.floatPrecision);
  }
  return escapeTex(String(v));
}

/** Determine column alignment for a set of values. */
function colAlign(values: readonly Scalar[], override?: LatexColumnAlign): LatexColumnAlign {
  if (override !== undefined) {
    return override;
  }
  const allNumeric = values.every(
    (v) => v === null || v === undefined || typeof v === "number" || typeof v === "bigint",
  );
  return allNumeric ? "r" : "l";
}

// ─── core renderer ────────────────────────────────────────────────────────────

interface LatexSpec {
  colAligns: LatexColumnAlign[];
  headers: string[];
  indexValues: string[];
  rows: string[][];
  includeIndex: boolean;
  opts: ToLatexOptions;
}

/** Build the begin lines for a tabular/longtable environment. */
function buildBeginLines(envName: string, colSpec: string, opts: ToLatexOptions): string[] {
  const lines: string[] = [`\\begin{${envName}}{${colSpec}}`];
  if (opts.longtable === true) {
    if (opts.caption !== undefined) {
      lines.push(`\\caption{${escapeTex(opts.caption)}}`);
    }
    if (opts.label !== undefined) {
      lines.push(`\\label{${escapeTex(opts.label)}}`);
    }
  }
  return lines;
}

/** Build a single data row for a LaTeX table. */
function buildDataRow(
  r: number,
  rows: readonly (readonly string[])[],
  indexValues: readonly string[],
  includeIndex: boolean,
): string {
  const cells: string[] = [];
  if (includeIndex) {
    cells.push(indexValues[r] ?? "");
  }
  for (const cell of rows[r] ?? []) {
    cells.push(cell);
  }
  return `${cells.join(" & ")} \\\\`;
}

/** Render a LatexSpec to a tabular/longtable string. */
function renderLatex(spec: LatexSpec): string {
  const { colAligns, headers, indexValues, rows, includeIndex, opts } = spec;
  const envName = opts.longtable === true ? "longtable" : "tabular";

  // column spec
  const allAligns: LatexColumnAlign[] = includeIndex ? ["l", ...colAligns] : colAligns;
  const colSpec = allAligns.join("");

  const lines: string[] = [...buildBeginLines(envName, colSpec, opts)];

  lines.push("\\toprule");

  // header row
  const headerCells: string[] = [];
  if (includeIndex) {
    headerCells.push(" ");
  }
  for (const h of headers) {
    headerCells.push(escapeTex(h));
  }
  lines.push(`${headerCells.join(" & ")} \\\\`);
  lines.push("\\midrule");

  // data rows
  for (let r = 0; r < rows.length; r++) {
    lines.push(buildDataRow(r, rows, indexValues, includeIndex));
  }

  lines.push("\\bottomrule");
  lines.push(`\\end{${envName}}`);

  return lines.join("\n");
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Render a `DataFrame` as a LaTeX tabular environment.
 *
 * @param df      - Source DataFrame.
 * @param options - Formatting options.
 * @returns A LaTeX string containing a `tabular` (or `longtable`) environment.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromRecords([{ x: 1, y: 2 }]);
 * console.log(toLatex(df));
 * ```
 */
export function toLatex(df: DataFrame, options?: ToLatexOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;

  const colNames = df.columns.values.map(String);
  const headers = colNames;

  const indexValues: string[] = [];
  for (let i = 0; i < df.index.size; i++) {
    indexValues.push(escapeTex(String(df.index.values[i])));
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

  // compute column alignment from data
  const colAligns: LatexColumnAlign[] = colNames.map((name) => {
    const col = df.col(name);
    const vals: Scalar[] = [];
    for (let i = 0; i < col.size; i++) {
      vals.push(col.iloc(i));
    }
    return colAlign(vals, opts.columnAlignment);
  });

  return renderLatex({ colAligns, headers, indexValues, rows, includeIndex, opts });
}

/**
 * Render a `Series` as a LaTeX tabular (two columns: index | values).
 *
 * @param series  - Source Series.
 * @param options - Formatting options.
 * @returns A LaTeX `tabular` environment string.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1.5, 2.5], name: "x" });
 * console.log(seriesToLatex(s));
 * ```
 */
export function seriesToLatex(series: Series, options?: ToLatexOptions): string {
  const opts = options ?? {};
  const includeIndex = opts.index !== false;
  const valueHeader = series.name ?? "0";

  const headers = [String(valueHeader)];
  const indexValues: string[] = [];
  for (let i = 0; i < series.index.size; i++) {
    indexValues.push(escapeTex(String(series.index.values[i])));
  }

  const dataVals: Scalar[] = [];
  for (let i = 0; i < series.size; i++) {
    dataVals.push(series.iloc(i));
  }

  const rows: string[][] = dataVals.map((v) => [formatScalar(v, opts)]);
  const colAligns: LatexColumnAlign[] = [colAlign(dataVals, opts.columnAlignment)];

  return renderLatex({ colAligns, headers, indexValues, rows, includeIndex, opts });
}
