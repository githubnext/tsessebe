/**
 * format_ops — number-formatting helpers for Series and DataFrame.
 *
 * Mirrors several pandas formatting utilities including `Series.map`,
 * `DataFrame.style`, and the `format_` methods.
 *
 * Exported functions:
 * - {@link formatFloat}           — fixed decimal places
 * - {@link formatPercent}         — percentage string
 * - {@link formatScientific}      — scientific notation (e.g. `1.23e+4`)
 * - {@link formatEngineering}     — engineering notation (exponent multiple of 3)
 * - {@link formatThousands}       — thousands-separated string
 * - {@link formatCurrency}        — currency string
 * - {@link formatCompact}         — compact notation (K, M, B, T)
 * - {@link makeFloatFormatter}    — factory returning a float formatter
 * - {@link makePercentFormatter}  — factory returning a percent formatter
 * - {@link makeCurrencyFormatter} — factory returning a currency formatter
 * - {@link applySeriesFormatter}  — apply a formatter to every value in a Series
 * - {@link applyDataFrameFormatter} — apply per-column formatters to a DataFrame
 * - {@link seriesToString}        — render a Series as a human-readable string
 * - {@link dataFrameToString}     — render a DataFrame as a human-readable string
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── scalar formatting ────────────────────────────────────────────────────────

/**
 * Format a number with a fixed number of decimal places.
 *
 * @param value    The number to format (non-finite values render as their string).
 * @param decimals Number of decimal places. Default: `2`.
 */
export function formatFloat(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toFixed(decimals);
}

/**
 * Format a number as a percentage string.
 *
 * The value is multiplied by 100 before formatting.
 * e.g. `formatPercent(0.1234, 1)` → `"12.3%"`.
 *
 * @param value    The proportion to format (0 → `"0.00%"`, 1 → `"100.00%"`).
 * @param decimals Number of decimal places. Default: `2`.
 */
export function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number in scientific notation.
 *
 * e.g. `formatScientific(12345.678, 3)` → `"1.235e+4"`.
 *
 * @param value    The number to format.
 * @param decimals Significant figures after the decimal point. Default: `3`.
 */
export function formatScientific(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toExponential(decimals);
}

/**
 * Format a number in engineering notation (exponent always a multiple of 3).
 *
 * e.g. `formatEngineering(12345.678, 3)` → `"12.346e+3"`.
 *
 * @param value    The number to format.
 * @param decimals Decimal places in the mantissa. Default: `3`.
 */
export function formatEngineering(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (value === 0) {
    return `0.${"0".repeat(decimals)}e+0`;
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log10(abs));
  const engExp = Math.floor(exp / 3) * 3;
  const mantissa = abs / 10 ** engExp;
  const expSign = engExp >= 0 ? "+" : "-";
  return `${sign}${mantissa.toFixed(decimals)}e${expSign}${Math.abs(engExp)}`;
}

/**
 * Format a number with a thousands separator.
 *
 * e.g. `formatThousands(1234567.89, 2)` → `"1,234,567.89"`.
 *
 * @param value     The number to format.
 * @param decimals  Decimal places. Default: `2`.
 * @param separator Thousands separator. Default: `","`.
 */
export function formatThousands(value: number, decimals = 2, separator = ","): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const fixed = value.toFixed(decimals);
  const [intPart, fracPart] = fixed.split(".");
  const intStr = intPart ?? "";
  const isNeg = intStr.startsWith("-");
  const digits = isNeg ? intStr.slice(1) : intStr;
  const withSep = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const sign = isNeg ? "-" : "";
  return fracPart !== undefined ? `${sign}${withSep}.${fracPart}` : `${sign}${withSep}`;
}

/**
 * Format a number as a currency string.
 *
 * e.g. `formatCurrency(1234.5, "$", 2)` → `"$1,234.50"`.
 *
 * @param value    The number to format.
 * @param symbol   Currency symbol. Default: `"$"`.
 * @param decimals Decimal places. Default: `2`.
 */
export function formatCurrency(value: number, symbol = "$", decimals = 2): string {
  if (!Number.isFinite(value)) {
    return `${symbol}${String(value)}`;
  }
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${formatThousands(abs, decimals)}`;
}

/**
 * Format a number in compact notation using SI-style suffixes.
 *
 * Thresholds: T ≥ 1e12, B ≥ 1e9, M ≥ 1e6, K ≥ 1e3.
 * Values below 1000 are formatted with `decimals` decimal places.
 *
 * e.g. `formatCompact(1_234_567, 2)` → `"1.23M"`.
 *
 * @param value    The number to format.
 * @param decimals Decimal places in the mantissa. Default: `2`.
 */
export function formatCompact(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toFixed(decimals)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(decimals)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(decimals)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(decimals)}K`;
  }
  return `${sign}${abs.toFixed(decimals)}`;
}

// ─── formatter factories ──────────────────────────────────────────────────────

/** A function that converts a {@link Scalar} value to a string. */
export type Formatter = (value: Scalar) => string;

/**
 * Create a float formatter with the given number of decimal places.
 *
 * @param decimals Number of decimal places. Default: `2`.
 */
export function makeFloatFormatter(decimals = 2): Formatter {
  return (value: Scalar): string => {
    if (typeof value !== "number") {
      return String(value ?? "");
    }
    return formatFloat(value, decimals);
  };
}

/**
 * Create a percent formatter with the given number of decimal places.
 *
 * @param decimals Number of decimal places. Default: `2`.
 */
export function makePercentFormatter(decimals = 2): Formatter {
  return (value: Scalar): string => {
    if (typeof value !== "number") {
      return String(value ?? "");
    }
    return formatPercent(value, decimals);
  };
}

/**
 * Create a currency formatter with the given symbol and decimal places.
 *
 * @param symbol   Currency symbol. Default: `"$"`.
 * @param decimals Decimal places. Default: `2`.
 */
export function makeCurrencyFormatter(symbol = "$", decimals = 2): Formatter {
  return (value: Scalar): string => {
    if (typeof value !== "number") {
      return String(value ?? "");
    }
    return formatCurrency(value, symbol, decimals);
  };
}

// ─── apply to Series / DataFrame ─────────────────────────────────────────────

/**
 * Apply a formatter to every element of a Series, returning a `Series<string>`.
 *
 * Non-numeric formatters receive the raw {@link Scalar} value; numeric-only
 * formatters (e.g. from {@link makeFloatFormatter}) receive the value unchanged
 * and should guard against non-numeric types themselves.
 *
 * @param series    The source Series.
 * @param formatter A {@link Formatter} to apply to each value.
 */
export function applySeriesFormatter(series: Series<Scalar>, formatter: Formatter): Series<string> {
  const formatted: string[] = [];
  for (let i = 0; i < series.size; i++) {
    formatted.push(formatter(series.values[i] as Scalar));
  }
  return new Series<string>({ data: formatted, index: series.index, name: series.name });
}

/**
 * Apply per-column formatters to a DataFrame, returning a
 * `Record<string, string[]>` where each key is a column name and the value is
 * the formatted column data.
 *
 * Columns without a matching formatter are rendered via `String(value)`.
 *
 * @param df         The source DataFrame.
 * @param formatters Map of column name → {@link Formatter}.
 */
export function applyDataFrameFormatter(
  df: DataFrame,
  formatters: Readonly<Record<string, Formatter>>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const colName of df.columns.values) {
    const fmt: Formatter = formatters[colName] ?? ((v: Scalar) => String(v ?? ""));
    const col = df.col(colName);
    const formatted: string[] = [];
    for (let i = 0; i < col.size; i++) {
      formatted.push(fmt(col.values[i] as Scalar));
    }
    result[colName] = formatted;
  }
  return result;
}

// ─── to-string rendering ──────────────────────────────────────────────────────

/** Options for {@link seriesToString}. */
export interface SeriesToStringOptions {
  /**
   * Maximum number of rows to display.
   * Default: `60`.
   */
  readonly maxRows?: number;
  /**
   * Formatter to apply to each value.
   * Default: `String`.
   */
  readonly formatter?: Formatter;
  /**
   * Series name to display in the header.
   * Default: the series' own name, or `null` for no header.
   */
  readonly name?: string | null;
}

/**
 * Render a Series as a human-readable multi-line string.
 *
 * The output mirrors `repr(series)` in pandas:
 * ```
 * 0    1.00
 * 1    2.00
 * 2    3.00
 * Name: x, dtype: float64
 * ```
 *
 * @param series  The Series to render.
 * @param options Optional rendering options.
 */
export function seriesToString(series: Series<Scalar>, options: SeriesToStringOptions = {}): string {
  const maxRows = options.maxRows ?? 60;
  const fmt: Formatter = options.formatter ?? ((v: Scalar) => String(v ?? "NaN"));
  const displayName = options.name !== undefined ? options.name : series.name;

  const n = series.size;
  const truncated = n > maxRows;
  const displayCount = truncated ? maxRows : n;

  // Compute label column width
  let labelWidth = 0;
  for (let i = 0; i < displayCount; i++) {
    const label = String(series.index.at(i) ?? "");
    if (label.length > labelWidth) {
      labelWidth = label.length;
    }
  }

  const lines: string[] = [];
  for (let i = 0; i < displayCount; i++) {
    const label = String(series.index.at(i) ?? "").padEnd(labelWidth);
    const val = fmt(series.values[i] as Scalar);
    lines.push(`${label}    ${val}`);
  }

  if (truncated) {
    lines.push(`...`);
  }

  const footer: string[] = [];
  if (displayName !== null && displayName !== undefined) {
    footer.push(`Name: ${displayName}`);
  }
  footer.push(`dtype: ${series.dtype.name}`);

  if (footer.length > 0) {
    lines.push(footer.join(", "));
  }

  return lines.join("\n");
}

/** Options for {@link dataFrameToString}. */
export interface DataFrameToStringOptions {
  /**
   * Maximum number of rows to display.
   * Default: `60`.
   */
  readonly maxRows?: number;
  /**
   * Maximum number of columns to display.
   * Default: `20`.
   */
  readonly maxCols?: number;
  /**
   * Per-column formatters.
   * Default: `String` for all columns.
   */
  readonly formatters?: Readonly<Record<string, Formatter>>;
}

/**
 * Render a DataFrame as a human-readable multi-line string (like pandas `repr`).
 *
 * @param df      The DataFrame to render.
 * @param options Optional rendering options.
 */
export function dataFrameToString(df: DataFrame, options: DataFrameToStringOptions = {}): string {
  const maxRows = options.maxRows ?? 60;
  const maxCols = options.maxCols ?? 20;
  const formatters = options.formatters ?? {};

  const [nRows, nCols] = df.shape;
  const truncRows = nRows > maxRows;
  const truncCols = nCols > maxCols;
  const displayRows = truncRows ? maxRows : nRows;

  // Pick columns to display
  const allCols = [...df.columns.values];
  const displayCols = truncCols ? allCols.slice(0, maxCols) : allCols;

  // Gather formatted cells
  const cells: string[][] = [];
  for (const colName of displayCols) {
    const fmt: Formatter = formatters[colName] ?? ((v: Scalar) => String(v ?? ""));
    const col = df.col(colName);
    const colCells: string[] = [];
    for (let i = 0; i < displayRows; i++) {
      colCells.push(fmt(col.values[i] as Scalar));
    }
    cells.push(colCells);
  }

  // Compute column widths (max of header or any cell)
  const colWidths: number[] = displayCols.map((name, ci) => {
    let w = name.length;
    const colCells = cells[ci];
    if (colCells !== undefined) {
      for (const cell of colCells) {
        if (cell.length > w) {
          w = cell.length;
        }
      }
    }
    return w;
  });

  // Compute index label width
  let idxWidth = 0;
  for (let i = 0; i < displayRows; i++) {
    const label = String(df.index.at(i) ?? "");
    if (label.length > idxWidth) {
      idxWidth = label.length;
    }
  }

  // Build header row
  const headerParts = displayCols.map((name, ci) => name.padStart(colWidths[ci] ?? name.length));
  const header = `${"".padEnd(idxWidth)}  ${headerParts.join("  ")}`;

  const lines: string[] = [header];

  for (let i = 0; i < displayRows; i++) {
    const label = String(df.index.at(i) ?? "").padEnd(idxWidth);
    const rowParts = displayCols.map((_, ci) => {
      const cell = cells[ci]?.[i] ?? "";
      return cell.padStart(colWidths[ci] ?? cell.length);
    });
    lines.push(`${label}  ${rowParts.join("  ")}`);
  }

  if (truncRows) {
    lines.push("...");
  }
  if (truncCols) {
    lines.push(`[${nRows} rows × ${nCols} columns]`);
  }

  return lines.join("\n");
}
