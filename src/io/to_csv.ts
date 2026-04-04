/**
 * to_csv — Serialize a DataFrame or Series to a CSV string.
 *
 * Mirrors a subset of `pandas.DataFrame.to_csv`.
 */

import type { DataFrame } from "../core/index.ts";
import type { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── options ─────────────────────────────────────────────────────────────────

/** Options for {@link toCsv} and {@link seriesToCsv}. */
export interface ToCsvOptions {
  /**
   * Field separator (default `","`).
   */
  readonly sep?: string;
  /**
   * Whether to write the header row (default `true`).
   */
  readonly header?: boolean;
  /**
   * Whether to write the row index (default `true`).
   */
  readonly index?: boolean;
  /**
   * String representation of missing values (default `""`).
   */
  readonly naRep?: string;
  /**
   * Column names to write (subset of DataFrame columns).
   * Default: all columns.
   */
  readonly columns?: readonly string[];
  /**
   * Line terminator (default `"\n"`).
   */
  readonly lineterminator?: string;
  /**
   * Always quote fields (default `false`).
   */
  readonly quoting?: "minimal" | "all" | "none";
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function scalarToString(v: Scalar, naRep: string): string {
  if (v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
    return naRep;
  }
  return String(v);
}

/** Quote a field if it contains the separator, a double-quote, or a newline. */
function quoteField(
  s: string,
  sep: string,
  quoting: "minimal" | "all" | "none",
): string {
  if (quoting === "none") {
    return s;
  }
  if (quoting === "all" || s.includes(sep) || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildRow(
  cells: readonly string[],
  sep: string,
  quoting: "minimal" | "all" | "none",
): string {
  return cells.map((c) => quoteField(c, sep, quoting)).join(sep);
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Serialize a {@link DataFrame} to a CSV string.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
 * toCsv(df);
 * // ",a,b\n0,1,3\n1,2,4\n"
 * ```
 */
export function toCsv(df: DataFrame, options?: ToCsvOptions): string {
  const sep = options?.sep ?? ",";
  const writeHeader = options?.header !== false;
  const writeIndex = options?.index !== false;
  const naRep = options?.naRep ?? "";
  const quoting = options?.quoting ?? "minimal";
  const lineterminator = options?.lineterminator ?? "\n";

  const colNames =
    options?.columns !== undefined
      ? options.columns.filter((c) => df.columns.contains(c))
      : [...df.columns.values];

  const lines: string[] = [];

  if (writeHeader) {
    const headerCells: string[] = [];
    if (writeIndex) {
      headerCells.push(quoteField("", sep, quoting));
    }
    for (const col of colNames) {
      headerCells.push(quoteField(col, sep, quoting));
    }
    lines.push(headerCells.join(sep));
  }

  const indexValues = df.index.values;
  for (let i = 0; i < df.shape[0]; i++) {
    const cells: string[] = [];
    if (writeIndex) {
      const idxVal: Scalar = indexValues[i] ?? null;
      cells.push(quoteField(scalarToString(idxVal, naRep), sep, quoting));
    }
    for (const col of colNames) {
      const series = df.get(col);
      const v: Scalar = series !== undefined ? (series.values[i] ?? null) : null;
      cells.push(quoteField(scalarToString(v, naRep), sep, quoting));
    }
    lines.push(buildRow(cells, sep, quoting));
  }

  return lines.join(lineterminator) + lineterminator;
}

/**
 * Serialize a {@link Series} to a CSV string.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
 * seriesToCsv(s);
 * // ",0\na,1\nb,2\nc,3\n"
 * ```
 */
export function seriesToCsv(series: Series<Scalar>, options?: ToCsvOptions): string {
  const sep = options?.sep ?? ",";
  const writeHeader = options?.header !== false;
  const writeIndex = options?.index !== false;
  const naRep = options?.naRep ?? "";
  const quoting = options?.quoting ?? "minimal";
  const lineterminator = options?.lineterminator ?? "\n";
  const name = series.name ?? "0";

  const lines: string[] = [];

  if (writeHeader) {
    const headerCells: string[] = [];
    if (writeIndex) {
      headerCells.push(quoteField("", sep, quoting));
    }
    headerCells.push(quoteField(String(name), sep, quoting));
    lines.push(headerCells.join(sep));
  }

  const indexValues = series.index.values;
  for (let i = 0; i < series.size; i++) {
    const cells: string[] = [];
    if (writeIndex) {
      const idxVal: Scalar = indexValues[i] ?? null;
      cells.push(quoteField(scalarToString(idxVal, naRep), sep, quoting));
    }
    const v = series.values[i] ?? null;
    cells.push(quoteField(scalarToString(v, naRep), sep, quoting));
    lines.push(buildRow(cells, sep, quoting));
  }

  return lines.join(lineterminator) + lineterminator;
}
