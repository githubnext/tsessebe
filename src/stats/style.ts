/**
 * style — pandas-compatible DataFrame Styler API.
 *
 * Provides a fluent `Styler` class that mirrors `pandas.io.formats.style.Styler`,
 * accessed via `df.style` in pandas or `dataFrameStyle(df)` here.
 *
 * Supported methods:
 * - {@link Styler.format}             — format cell values (function or format string)
 * - {@link Styler.formatIndex}        — format index labels
 * - {@link Styler.apply}              — apply column/row-wise CSS styling function
 * - {@link Styler.applymap}           — apply element-wise CSS styling function (alias: map)
 * - {@link Styler.map}                — pandas 2.1+ alias for applymap
 * - {@link Styler.highlightMax}       — highlight maximum values
 * - {@link Styler.highlightMin}       — highlight minimum values
 * - {@link Styler.highlightNull}      — highlight null/undefined values
 * - {@link Styler.highlightBetween}   — highlight values in a range
 * - {@link Styler.backgroundGradient} — apply background color gradient
 * - {@link Styler.textGradient}       — apply text color gradient
 * - {@link Styler.barChart}           — inline bar chart via CSS
 * - {@link Styler.setCaption}         — set table caption
 * - {@link Styler.setProperties}      — set CSS properties for a subset of cells
 * - {@link Styler.setTableStyles}     — set table-level CSS styles
 * - {@link Styler.setTableAttributes} — set HTML table attributes
 * - {@link Styler.hide}               — hide index or specific columns
 * - {@link Styler.setPrecision}       — default decimal precision
 * - {@link Styler.setNaRep}           — representation for missing values
 * - {@link Styler.toHtml}             — render as HTML string
 * - {@link Styler.render}             — alias for toHtml
 * - {@link Styler.toLatex}            — render as LaTeX string
 * - {@link Styler.exportStyles}       — export accumulated styles
 * - {@link Styler.clearStyles}        — clear all accumulated styles
 * - {@link dataFrameStyle}            — factory function
 *
 * @module
 */

import type { DataFrame } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** CSS property map for a single element. */
export type CellProps = Record<string, string>;

/** A table-level style entry (selector + properties). */
export interface TableStyle {
  /** CSS selector, e.g. `"table"`, `"th"`, `"tr:nth-child(even)"`. */
  selector: string;
  /** CSS properties as an object or key-value pairs array. */
  props: CellProps | readonly [string, string][];
}

/** Per-exported-style record from {@link Styler.exportStyles}. */
export interface StyleRecord {
  /** Row index (0-based) in the DataFrame. */
  row: number;
  /** Column index (0-based) in the DataFrame. */
  col: number;
  /** CSS property string, e.g. `"background-color: yellow;"`. */
  css: string;
}

/** Value formatter: a function or a template string with `{v}` placeholder. */
export type ValueFormatter = ((value: Scalar) => string) | string | null;

/** Subset selector for columns — column names or their integer positions. */
export type ColSubset = readonly string[] | readonly number[] | null | undefined;

/** Axis-wise style function: receives an array of scalar values, returns CSS strings. */
export type AxisStyleFn = (values: readonly Scalar[]) => readonly string[];

/** Element-wise style function: receives a single scalar value, returns a CSS string. */
export type ElementStyleFn = (value: Scalar) => string;

/** Options for {@link Styler.highlightMax} / {@link Styler.highlightMin}. */
export interface HighlightOptions {
  /** CSS color for the highlighted cells. Default `"yellow"`. */
  color?: string;
  /** Subset of columns to consider (null = all). */
  subset?: ColSubset;
  /** `0` = per-column, `1` = per-row, `null` = table-wide. Default `0`. */
  axis?: 0 | 1 | null;
}

/** Options for {@link Styler.highlightBetween}. */
export interface HighlightBetweenOptions {
  /** Left (lower) bound. Default `null` (no lower bound). */
  left?: number | null;
  /** Right (upper) bound. Default `null` (no upper bound). */
  right?: number | null;
  /** Whether bounds are inclusive. Default `[true, true]`. */
  inclusive?: "both" | "neither" | "left" | "right";
  /** CSS color. Default `"yellow"`. */
  color?: string;
  /** Subset of columns. */
  subset?: ColSubset;
  /** Axis. Default `0`. */
  axis?: 0 | 1 | null;
}

/** Options for {@link Styler.backgroundGradient}. */
export interface GradientOptions {
  /**
   * Named colormap: `"RdYlGn"`, `"Blues"`, `"Greens"`, `"Reds"`, `"Oranges"`,
   * `"PuBu"`, `"YlOrRd"`, or any CSS color pair `"from:to"`.
   * Default `"RdYlGn"`.
   */
  cmap?: string;
  /** Low fraction to clip (0–1). Default `0`. */
  low?: number;
  /** High fraction to clip (0–1). Default `1`. */
  high?: number;
  /** Axis. `0` = per-column, `1` = per-row, `null` = table-wide. Default `0`. */
  axis?: 0 | 1 | null;
  /** Subset of columns. */
  subset?: ColSubset;
  /** Text contrast mode: automatically choose dark/light text. Default `false`. */
  textColor?: boolean;
  /** Center the colormap at this value. */
  vmin?: number | null;
  /** Maximum value for colormap normalization. */
  vmax?: number | null;
}

/** Options for {@link Styler.barChart}. */
export interface BarOptions {
  /** Bar color (single color or `[negative, positive]`). Default `"#d65f5f"`. */
  color?: string | [string, string];
  /** Width of the bar cell in percent. Default `100`. */
  width?: number;
  /** Align bar: `"left"` | `"zero"` | `"mid"`. Default `"left"`. */
  align?: "left" | "zero" | "mid";
  /** Subset of columns. */
  subset?: ColSubset;
  /** Axis. Default `0`. */
  axis?: 0 | 1 | null;
  /** VMin for normalization. */
  vmin?: number | null;
  /** VMax for normalization. */
  vmax?: number | null;
}

// ─── internal types ───────────────────────────────────────────────────────────

/** Internal per-cell CSS accumulator. */
type CssGrid = string[][];

/** A resolved axis-style application. */
interface StyleApplication {
  fn: AxisStyleFn;
  axis: 0 | 1;
  colIndices: readonly number[];
}

/** An element-wise style application. */
interface MapApplication {
  fn: ElementStyleFn;
  colIndices: readonly number[];
}

/**
 * Table-wide style function: receives a 2-D array of values
 * `[row][colIndex]` and returns a 2-D array of CSS strings.
 */
type TableWideStyleFn = (
  values: ReadonlyArray<readonly Scalar[]>,
  colIndices: readonly number[],
) => ReadonlyArray<readonly string[]>;

/** A table-wide style application. */
interface TableWideApplication {
  fn: TableWideStyleFn;
  colIndices: readonly number[];
}

// ─── color helpers ────────────────────────────────────────────────────────────

/** Parse a hex color string to [r, g, b] (0–255). */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Convert [r, g, b] (0–255) to a CSS hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Linearly interpolate two hex colors at fraction t ∈ [0, 1]. */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Named colormaps: array of [position, hexColor] stops. */
const COLORMAPS: Readonly<Record<string, readonly [number, string][]>> = {
  RdYlGn: [
    [0.0, "#d73027"],
    [0.5, "#ffffbf"],
    [1.0, "#1a9850"],
  ],
  Blues: [
    [0.0, "#f7fbff"],
    [1.0, "#08306b"],
  ],
  Greens: [
    [0.0, "#f7fcf5"],
    [1.0, "#00441b"],
  ],
  Reds: [
    [0.0, "#fff5f0"],
    [1.0, "#67000d"],
  ],
  Oranges: [
    [0.0, "#fff5eb"],
    [1.0, "#7f2704"],
  ],
  PuBu: [
    [0.0, "#fff7fb"],
    [1.0, "#023858"],
  ],
  YlOrRd: [
    [0.0, "#ffffcc"],
    [0.5, "#fd8d3c"],
    [1.0, "#800026"],
  ],
  Purples: [
    [0.0, "#fcfbfd"],
    [1.0, "#3f007d"],
  ],
  coolwarm: [
    [0.0, "#3b4cc0"],
    [0.5, "#f7f7f7"],
    [1.0, "#b40426"],
  ],
};

/** Map a normalized value t ∈ [0, 1] through a named colormap. */
function colormapColor(t: number, cmap: string): string {
  // Support "colorA:colorB" shorthand
  if (cmap.includes(":")) {
    const parts = cmap.split(":");
    return lerpColor(parts[0] ?? "#ffffff", parts[1] ?? "#000000", t);
  }
  const stops = COLORMAPS[cmap] ?? COLORMAPS.Blues!;
  // Find surrounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i]!;
    const [p1, c1] = stops[i + 1]!;
    if (t <= p1) {
      const local = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return lerpColor(c0, c1, local);
    }
  }
  return stops.at(-1)![1];
}

/** Relative luminance for WCAG contrast check. */
function luminance(hex: string): number {
  const toLinear = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [rv, gv, bv] = hexToRgb(hex);
  return 0.2126 * toLinear(rv) + 0.7152 * toLinear(gv) + 0.0722 * toLinear(bv);
}

/** Choose `"black"` or `"white"` for readable text on a background color. */
function contrastText(bgHex: string): string {
  const lum = luminance(bgHex);
  return lum > 0.179 ? "black" : "white";
}

// ─── utilities ────────────────────────────────────────────────────────────────

/** Convert a scalar to a display string. */
function scalarToString(value: Scalar, naRep: string, precision: number): string {
  if (value === null || value === undefined) {
    return naRep;
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return naRep;
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? "inf" : "-inf";
    }
    // Only format with precision if not an integer
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(precision);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && "totalMs" in value) {
    return `${value.totalMs}ms`;
  }
  return String(value);
}

/** Apply a ValueFormatter to a scalar. */
function applyFormatter(
  value: Scalar,
  formatter: ValueFormatter,
  naRep: string,
  precision: number,
): string {
  if (formatter === null) {
    return scalarToString(value, naRep, precision);
  }
  if (typeof formatter === "function") {
    return formatter(value);
  }
  // Template string with {v} or Python-style {:.2f} (simplified)
  const display = scalarToString(value, naRep, precision);
  return formatter.replace(/\{[^}]*\}/g, display);
}

/** Escape HTML special characters. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Normalise a CSS properties object or array to a CSS string. */
function propsToString(props: CellProps | readonly [string, string][]): string {
  if (Array.isArray(props)) {
    return (props as readonly [string, string][]).map(([k, v]) => `${k}: ${v};`).join(" ");
  }
  return Object.entries(props as CellProps)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

/** Merge two CSS strings (semicolon-separated). */
function mergeCss(a: string, b: string): string {
  const trimA = a.trim().replace(/;$/, "");
  const trimB = b.trim().replace(/;$/, "");
  if (!trimA) {
    return trimB;
  }
  if (!trimB) {
    return trimA;
  }
  return `${trimA}; ${trimB}`;
}

/** Resolve column indices from a ColSubset given all column names. */
function resolveColIndices(colNames: readonly string[], subset: ColSubset): readonly number[] {
  if (!subset || subset.length === 0) {
    return Array.from({ length: colNames.length }, (_, i) => i);
  }
  const result: number[] = [];
  for (const s of subset) {
    if (typeof s === "number") {
      if (s >= 0 && s < colNames.length) {
        result.push(s);
      }
    } else {
      const idx = colNames.indexOf(s);
      if (idx >= 0) {
        result.push(idx);
      }
    }
  }
  return result;
}

/** Extract numeric values from a scalar array (nulls excluded). */
function numericValues(vals: readonly Scalar[]): number[] {
  return vals.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
}

/** Normalize values into [0, 1], returning NaN for non-numeric or constant arrays. */
function normalizeRange(
  vals: readonly Scalar[],
  vmin: number | null | undefined,
  vmax: number | null | undefined,
): number[] {
  const nums = vals.map((v) => (typeof v === "number" && !Number.isNaN(v) ? v : Number.NaN));
  const finite = nums.filter((v) => Number.isFinite(v));
  const lo = vmin ?? (finite.length > 0 ? Math.min(...finite) : 0);
  const hi = vmax ?? (finite.length > 0 ? Math.max(...finite) : 1);
  if (hi === lo) {
    return nums.map((v) => (Number.isFinite(v) ? 0.5 : Number.NaN));
  }
  return nums.map((v) => (Number.isFinite(v) ? (v - lo) / (hi - lo) : Number.NaN));
}

// ─── Styler ───────────────────────────────────────────────────────────────────

/**
 * `Styler` — fluent styling for a DataFrame.
 *
 * Mirrors `pandas.io.formats.style.Styler`.  All mutating methods return
 * `this`, enabling method chaining:
 *
 * ```ts
 * const html = dataFrameStyle(df)
 *   .highlightMax({ color: "lightgreen" })
 *   .format((v) => (typeof v === "number" ? v.toFixed(2) : String(v)))
 *   .setCaption("My Table")
 *   .toHtml();
 * ```
 */
export class Styler {
  private readonly _df: DataFrame;
  private _precision: number;
  private _naRep: string;
  private _caption: string | null;
  private _hideIndex: boolean;
  private _hiddenCols: Set<number>;
  private _tableStyles: TableStyle[];
  private _tableAttributes: string;
  private _formatters: Map<number, ValueFormatter>;
  private _indexFormatter: ValueFormatter | null;
  private _styleApplications: StyleApplication[];
  private _mapApplications: MapApplication[];
  private _tableWideApplications: TableWideApplication[];

  /** The DataFrame being styled. */
  get data(): DataFrame {
    return this._df;
  }

  constructor(df: DataFrame) {
    this._df = df;
    this._precision = 6;
    this._naRep = "";
    this._caption = null;
    this._hideIndex = false;
    this._hiddenCols = new Set();
    this._tableStyles = [];
    this._tableAttributes = "";
    this._formatters = new Map();
    this._indexFormatter = null;
    this._styleApplications = [];
    this._mapApplications = [];
    this._tableWideApplications = [];
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private get _colNames(): readonly string[] {
    return this._df.columns.values as readonly string[];
  }

  /** Apply a function over columns (axis=0) or rows (axis=1). */
  private _applyAxis(
    fn: AxisStyleFn,
    axis: 0 | 1,
    colIndices: readonly number[],
    css: CssGrid,
  ): void {
    const [nrows, ncols] = this._df.shape;
    const colNames = this._colNames;
    if (axis === 0) {
      for (const ci of colIndices) {
        if (ci >= ncols) {
          continue;
        }
        const colName = colNames[ci];
        if (colName === undefined) {
          continue;
        }
        const col = this._df.col(colName);
        const vals: Scalar[] = Array.from({ length: nrows }, (_, ri) => col.values[ri] ?? null);
        const styles = fn(vals);
        for (let ri = 0; ri < nrows; ri++) {
          css[ri]![ci] = mergeCss(css[ri]?.[ci]!, styles[ri] ?? "");
        }
      }
    } else {
      for (let ri = 0; ri < nrows; ri++) {
        const rowVals: Scalar[] = colIndices.map((ci) => {
          const cn = colNames[ci];
          return cn !== undefined ? (this._df.col(cn).values[ri] ?? null) : null;
        });
        const styles = fn(rowVals);
        for (let k = 0; k < styles.length; k++) {
          const ci = colIndices[k];
          const s = styles[k];
          if (ci !== undefined && ci < ncols && s) {
            css[ri]![ci] = mergeCss(css[ri]?.[ci]!, s);
          }
        }
      }
    }
  }

  /** Apply an element-wise function. */
  private _applyMap(fn: ElementStyleFn, colIndices: readonly number[], css: CssGrid): void {
    const [nrows, ncols] = this._df.shape;
    const colNames = this._colNames;
    for (const ci of colIndices) {
      if (ci >= ncols) {
        continue;
      }
      const colName = colNames[ci];
      if (colName === undefined) {
        continue;
      }
      const col = this._df.col(colName);
      for (let ri = 0; ri < nrows; ri++) {
        const val = col.values[ri] ?? null;
        const s = fn(val);
        if (s) {
          css[ri]![ci] = mergeCss(css[ri]?.[ci]!, s);
        }
      }
    }
  }

  /** Build the CSS grid by replaying all recorded applications. */
  private _buildCss(): CssGrid {
    const [nrows, ncols] = this._df.shape;
    const colNames = this._colNames;
    const css: CssGrid = Array.from({ length: nrows }, () =>
      Array.from({ length: ncols }, () => ""),
    );
    for (const app of this._styleApplications) {
      this._applyAxis(app.fn, app.axis, app.colIndices, css);
    }
    for (const app of this._mapApplications) {
      this._applyMap(app.fn, app.colIndices, css);
    }
    // Table-wide applications
    for (const app of this._tableWideApplications) {
      // Build 2D values array [row][colPosition] for the selected columns
      const rowsData: Array<readonly Scalar[]> = Array.from({ length: nrows }, (_, ri) =>
        app.colIndices.map((ci) => {
          const cn = colNames[ci];
          return cn !== undefined ? (this._df.col(cn).values[ri] ?? null) : null;
        }),
      );
      const styleGrid = app.fn(rowsData, app.colIndices);
      for (let ri = 0; ri < nrows; ri++) {
        const styleRow = styleGrid[ri];
        if (!styleRow) {
          continue;
        }
        app.colIndices.forEach((ci, k) => {
          const s = styleRow[k] ?? "";
          if (s) {
            css[ri]![ci] = mergeCss(css[ri]?.[ci]!, s);
          }
        });
      }
    }
    return css;
  }

  // ── public API ───────────────────────────────────────────────────────────────

  /**
   * Set the default precision for floating-point display.
   *
   * @param precision — number of decimal places (default 6).
   */
  setPrecision(precision: number): this {
    this._precision = precision;
    return this;
  }

  /**
   * Set the representation for missing (null/undefined/NaN) values.
   *
   * @param naRep — string to show in place of nulls (default `""`).
   */
  setNaRep(naRep: string): this {
    this._naRep = naRep;
    return this;
  }

  /**
   * Format cell values.
   *
   * @param formatter — a function, format-string (with `{v}` placeholder), or `null` for default.
   * @param subset — columns to format (null = all).
   * @param naRep — override NA representation for this formatter.
   *
   * @example
   * ```ts
   * style.format((v) => (typeof v === "number" ? `$${v.toFixed(2)}` : String(v)));
   * style.format("{v}%", ["pct_col"]);
   * ```
   */
  format(formatter: ValueFormatter, subset: ColSubset = null, naRep?: string): this {
    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);
    const effectiveNa = naRep ?? this._naRep;
    const effectiveFmt: ValueFormatter =
      formatter === null
        ? null
        : typeof formatter === "function"
          ? formatter
          : (v: Scalar) => applyFormatter(v, formatter, effectiveNa, this._precision);
    for (const ci of colIndices) {
      this._formatters.set(ci, effectiveFmt);
    }
    return this;
  }

  /**
   * Format index labels.
   *
   * @param formatter — function or format string.
   */
  formatIndex(formatter: ValueFormatter): this {
    this._indexFormatter = formatter;
    return this;
  }

  /**
   * Apply a column-wise (axis=0) or row-wise (axis=1) CSS styling function.
   *
   * The function receives an array of scalar values and must return an array of
   * CSS strings of the same length.
   *
   * @example
   * ```ts
   * // Highlight the max in each column
   * style.apply((vals) => {
   *   const max = Math.max(...vals.filter((v): v is number => typeof v === "number"));
   *   return vals.map((v) => (v === max ? "background-color: yellow;" : ""));
   * });
   * ```
   */
  apply(fn: AxisStyleFn, axis: 0 | 1 | "index" | "columns" = 0, subset: ColSubset = null): this {
    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);
    const resolvedAxis: 0 | 1 = axis === 0 || axis === "index" ? 0 : 1;
    this._styleApplications.push({ fn, axis: resolvedAxis, colIndices });
    return this;
  }

  /**
   * Apply an element-wise CSS styling function.
   *
   * @example
   * ```ts
   * style.applymap((v) => (typeof v === "number" && v < 0 ? "color: red;" : ""));
   * ```
   */
  applymap(fn: ElementStyleFn, subset: ColSubset = null): this {
    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);
    this._mapApplications.push({ fn, colIndices });
    return this;
  }

  /**
   * Alias for {@link Styler.applymap} (pandas ≥ 2.1 renamed `applymap` → `map`).
   */
  map(fn: ElementStyleFn, subset: ColSubset = null): this {
    return this.applymap(fn, subset);
  }

  /**
   * Highlight the maximum value in each column (axis=0), each row (axis=1),
   * or across the entire table (axis=null).
   */
  highlightMax(options: HighlightOptions = {}): this {
    const { color = "yellow", subset = null, axis = 0 } = options;
    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);

    const highlightFn: AxisStyleFn = (vals) => {
      const nums = numericValues(vals);
      if (nums.length === 0) {
        return vals.map(() => "");
      }
      const max = Math.max(...nums);
      return vals.map((v) => (v === max ? `background-color: ${color};` : ""));
    };

    if (axis === null) {
      // Table-wide: find max across all specified columns
      const tableWideFn: TableWideStyleFn = (rowsData) => {
        // Collect all numeric values across the whole selection
        const allNums: number[] = [];
        for (const row of rowsData) {
          for (const v of row) {
            if (typeof v === "number" && !Number.isNaN(v)) {
              allNums.push(v);
            }
          }
        }
        if (allNums.length === 0) {
          return rowsData.map((row) => row.map(() => ""));
        }
        const max = Math.max(...allNums);
        return rowsData.map((row) =>
          row.map((v) => (v === max ? `background-color: ${color};` : "")),
        );
      };
      this._tableWideApplications.push({ fn: tableWideFn, colIndices });
    } else {
      this._styleApplications.push({
        fn: highlightFn,
        axis: axis as 0 | 1,
        colIndices,
      });
    }
    return this;
  }

  /**
   * Highlight the minimum value in each column (axis=0), row (axis=1), or table (null).
   */
  highlightMin(options: HighlightOptions = {}): this {
    const { color = "yellow", subset = null, axis = 0 } = options;
    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);

    const highlightFn: AxisStyleFn = (vals) => {
      const nums = numericValues(vals);
      if (nums.length === 0) {
        return vals.map(() => "");
      }
      const min = Math.min(...nums);
      return vals.map((v) => (v === min ? `background-color: ${color};` : ""));
    };

    if (axis === null) {
      const tableWideFn: TableWideStyleFn = (rowsData) => {
        const allNums: number[] = [];
        for (const row of rowsData) {
          for (const v of row) {
            if (typeof v === "number" && !Number.isNaN(v)) {
              allNums.push(v);
            }
          }
        }
        if (allNums.length === 0) {
          return rowsData.map((row) => row.map(() => ""));
        }
        const min = Math.min(...allNums);
        return rowsData.map((row) =>
          row.map((v) => (v === min ? `background-color: ${color};` : "")),
        );
      };
      this._tableWideApplications.push({ fn: tableWideFn, colIndices });
    } else {
      this._styleApplications.push({
        fn: highlightFn,
        axis: (axis ?? 0) as 0 | 1,
        colIndices,
      });
    }
    return this;
  }

  /**
   * Highlight null/undefined/NaN values.
   */
  highlightNull(nullColor = "red", subset: ColSubset = null): this {
    return this.applymap((v) => {
      const isNull = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
      return isNull ? `background-color: ${nullColor};` : "";
    }, subset);
  }

  /**
   * Highlight values within a numeric range [left, right].
   */
  highlightBetween(options: HighlightBetweenOptions = {}): this {
    const {
      left = null,
      right = null,
      inclusive = "both",
      color = "yellow",
      subset = null,
    } = options;

    return this.applymap((v) => {
      if (typeof v !== "number" || Number.isNaN(v)) {
        return "";
      }
      let ok = true;
      if (left !== null) {
        ok = ok && (inclusive === "both" || inclusive === "left" ? v >= left : v > left);
      }
      if (right !== null) {
        ok = ok && (inclusive === "both" || inclusive === "right" ? v <= right : v < right);
      }
      return ok ? `background-color: ${color};` : "";
    }, subset);
  }

  /**
   * Apply a background color gradient across values.
   *
   * @param options — gradient configuration (cmap, low, high, axis, subset, vmin, vmax, textColor).
   */
  backgroundGradient(options: GradientOptions = {}): this {
    const {
      cmap = "Blues",
      low = 0,
      high = 1,
      axis = 0,
      subset = null,
      textColor = false,
      vmin = null,
      vmax = null,
    } = options;

    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);

    const gradientFn: AxisStyleFn = (vals) => {
      const normalized = normalizeRange(vals, vmin, vmax);
      return normalized.map((t) => {
        if (Number.isNaN(t)) {
          return "";
        }
        // Clip to [low, high] then renormalize
        const clipped = low + (high - low) * Math.max(0, Math.min(1, t));
        const bg = colormapColor(clipped, cmap);
        let style = `background-color: ${bg};`;
        if (textColor) {
          style += ` color: ${contrastText(bg)};`;
        }
        return style;
      });
    };

    this._styleApplications.push({
      fn: gradientFn,
      axis: (axis ?? 0) as 0 | 1,
      colIndices,
    });
    return this;
  }

  /**
   * Apply a text color gradient (same as backgroundGradient but sets `color:` instead).
   */
  textGradient(options: GradientOptions = {}): this {
    const {
      cmap = "RdYlGn",
      low = 0,
      high = 1,
      axis = 0,
      subset = null,
      vmin = null,
      vmax = null,
    } = options;

    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);

    const gradientFn: AxisStyleFn = (vals) => {
      const normalized = normalizeRange(vals, vmin, vmax);
      return normalized.map((t) => {
        if (Number.isNaN(t)) {
          return "";
        }
        const clipped = low + (high - low) * Math.max(0, Math.min(1, t));
        return `color: ${colormapColor(clipped, cmap)};`;
      });
    };

    this._styleApplications.push({
      fn: gradientFn,
      axis: (axis ?? 0) as 0 | 1,
      colIndices,
    });
    return this;
  }

  /**
   * Render inline bar charts using CSS linear-gradients.
   *
   * @param options — bar configuration (color, width, align, subset, vmin, vmax).
   */
  barChart(options: BarOptions = {}): this {
    const {
      color = "#d65f5f",
      width = 100,
      align = "left",
      subset = null,
      axis = 0,
      vmin = null,
      vmax = null,
    } = options;

    const colNames = this._colNames;
    const colIndices = resolveColIndices(colNames, subset);

    const positiveColor = Array.isArray(color) ? (color[1] ?? "#d65f5f") : color;
    const negativeColor = Array.isArray(color) ? (color[0] ?? "#5f82d6") : "#5f82d6";

    const barFn: AxisStyleFn = (vals) => {
      const normalized = normalizeRange(vals, vmin, vmax);
      return normalized.map((t) => {
        if (Number.isNaN(t)) {
          return "";
        }
        const pct = Math.max(0, Math.min(1, t)) * width;
        const c = t >= 0.5 ? positiveColor : negativeColor;
        if (align === "left") {
          return `background: linear-gradient(90deg, ${c} ${pct.toFixed(1)}%, transparent ${pct.toFixed(1)}%); width: ${width}%;`;
        }
        if (align === "mid") {
          const mid = width / 2;
          if (t >= 0.5) {
            const w2 = (t - 0.5) * 2 * mid;
            const stop1 = mid.toFixed(1);
            const stop2 = (mid + w2).toFixed(1);
            return `background: linear-gradient(90deg, transparent ${stop1}%, ${positiveColor} ${stop1}%, ${positiveColor} ${stop2}%, transparent ${stop2}%);`;
          }
          const w2 = (0.5 - t) * 2 * mid;
          const start = mid - w2;
          return `background: linear-gradient(90deg, transparent ${start.toFixed(1)}%, ${negativeColor} ${start.toFixed(1)}%, ${negativeColor} ${mid.toFixed(1)}%, transparent ${mid.toFixed(1)}%);`;
        }
        // align === "zero"
        const midPct = 50;
        if (t >= 0.5) {
          const w2 = (t - 0.5) * 2 * (width / 2);
          const stop2 = (midPct + w2).toFixed(1);
          return `background: linear-gradient(90deg, transparent ${midPct}%, ${positiveColor} ${midPct}%, ${positiveColor} ${stop2}%, transparent ${stop2}%);`;
        }
        const w2 = (0.5 - t) * 2 * (width / 2);
        const stop1 = (midPct - w2).toFixed(1);
        return `background: linear-gradient(90deg, transparent ${stop1}%, ${negativeColor} ${stop1}%, ${negativeColor} ${midPct}%, transparent ${midPct}%);`;
      });
    };

    this._styleApplications.push({
      fn: barFn,
      axis: (axis ?? 0) as 0 | 1,
      colIndices,
    });
    return this;
  }

  /**
   * Set CSS properties for all cells (or a subset of columns).
   *
   * @example
   * ```ts
   * style.setProperties({ "font-weight": "bold", color: "navy" }, ["important_col"]);
   * ```
   */
  setProperties(props: CellProps, subset: ColSubset = null): this {
    const css = Object.entries(props)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    return this.applymap(() => css, subset);
  }

  /**
   * Set table-level CSS styles (selectors applied via a `<style>` block).
   *
   * @example
   * ```ts
   * style.setTableStyles([
   *   { selector: "th", props: { "background-color": "#4a90d9", color: "white" } },
   *   { selector: "tr:hover td", props: { "background-color": "#f0f0f0" } },
   * ]);
   * ```
   */
  setTableStyles(styles: TableStyle[]): this {
    this._tableStyles.push(...styles);
    return this;
  }

  /**
   * Set HTML attributes on the `<table>` element.
   *
   * @example
   * ```ts
   * style.setTableAttributes('class="my-table" id="sales-report"');
   * ```
   */
  setTableAttributes(attrs: string): this {
    this._tableAttributes = attrs;
    return this;
  }

  /**
   * Set a caption for the table.
   */
  setCaption(caption: string): this {
    this._caption = caption;
    return this;
  }

  /**
   * Hide the index column or specific data columns.
   *
   * @param axis — `0` or `"index"` to hide row labels; `1` or `"columns"` to hide columns.
   * @param subset — specific columns to hide (only for axis=1).
   */
  hide(axis: 0 | 1 | "index" | "columns" = 0, subset: ColSubset = null): this {
    const resolved = axis === 0 || axis === "index" ? 0 : 1;
    if (resolved === 0) {
      this._hideIndex = true;
    } else {
      const colIndices = resolveColIndices(this._colNames, subset);
      for (const ci of colIndices) {
        this._hiddenCols.add(ci);
      }
    }
    return this;
  }

  /**
   * Clear all accumulated styles (formatters, style applications, table styles).
   * Does not reset caption, hide state, precision, or na_rep.
   */
  clearStyles(): this {
    this._styleApplications = [];
    this._mapApplications = [];
    this._tableWideApplications = [];
    this._formatters.clear();
    this._indexFormatter = null;
    this._tableStyles = [];
    return this;
  }

  /**
   * Export the accumulated per-cell styles as a flat array of {@link StyleRecord}.
   */
  exportStyles(): StyleRecord[] {
    const css = this._buildCss();
    const records: StyleRecord[] = [];
    for (let ri = 0; ri < css.length; ri++) {
      const row = css[ri]!;
      for (let ci = 0; ci < row.length; ci++) {
        const s = row[ci]!;
        if (s) {
          records.push({ row: ri, col: ci, css: s });
        }
      }
    }
    return records;
  }

  // ── rendering ────────────────────────────────────────────────────────────────

  /**
   * Render the styled DataFrame as an HTML string.
   *
   * @param uuid — unique ID prefix for CSS classes (auto-generated if omitted).
   */
  toHtml(uuid?: string): string {
    const id = uuid ?? `tsb-${Math.random().toString(36).slice(2, 8)}`;
    const [nrows, ncols] = this._df.shape;
    const colNames = this._colNames;
    const indexVals = this._df.index.values as readonly Label[];

    // Build CSS grid
    const css = this._buildCss();

    // Resolve visible columns
    const visibleCols: number[] = [];
    for (let ci = 0; ci < ncols; ci++) {
      if (!this._hiddenCols.has(ci)) {
        visibleCols.push(ci);
      }
    }

    const lines: string[] = [];

    // <style> block
    const styleLines: string[] = [];
    if (this._tableStyles.length > 0) {
      for (const ts of this._tableStyles) {
        const propStr = propsToString(ts.props);
        styleLines.push(`#${id} ${ts.selector} { ${propStr} }`);
      }
    }
    if (styleLines.length > 0) {
      lines.push(`<style>${styleLines.join(" ")}</style>`);
    }

    // <table>
    const tableAttrs = this._tableAttributes ? ` ${this._tableAttributes}` : "";
    lines.push(`<table id="${id}"${tableAttrs} style="border-collapse: collapse;">`);

    // Caption
    if (this._caption !== null) {
      lines.push(`  <caption>${escapeHtml(this._caption)}</caption>`);
    }

    // Header row
    lines.push("  <thead>");
    lines.push("    <tr>");
    if (!this._hideIndex) {
      lines.push(`      <th style="border: 1px solid #ddd; padding: 4px;"></th>`);
    }
    for (const ci of visibleCols) {
      const colName = colNames[ci] ?? "";
      lines.push(
        `      <th style="border: 1px solid #ddd; padding: 4px;">${escapeHtml(String(colName))}</th>`,
      );
    }
    lines.push("    </tr>");
    lines.push("  </thead>");

    // Body
    lines.push("  <tbody>");
    for (let ri = 0; ri < nrows; ri++) {
      lines.push("    <tr>");

      // Index cell
      if (!this._hideIndex) {
        const idxLabel = indexVals[ri] ?? ri;
        let idxStr: string;
        if (this._indexFormatter !== null) {
          idxStr = applyFormatter(
            idxLabel as Scalar,
            this._indexFormatter,
            this._naRep,
            this._precision,
          );
        } else {
          idxStr = String(idxLabel);
        }
        lines.push(
          `      <th style="border: 1px solid #ddd; padding: 4px; text-align: right;">${escapeHtml(idxStr)}</th>`,
        );
      }

      // Data cells
      for (const ci of visibleCols) {
        const colName = colNames[ci];
        const val: Scalar =
          colName !== undefined ? (this._df.col(colName).values[ri] ?? null) : null;

        const formatter = this._formatters.get(ci) ?? null;
        const displayed = applyFormatter(val, formatter, this._naRep, this._precision);

        const cellCss = css[ri]?.[ci] ?? "";
        const baseStyle = "border: 1px solid #ddd; padding: 4px;";
        const style = cellCss ? `${baseStyle} ${cellCss}` : baseStyle;

        lines.push(`      <td style="${escapeHtml(style)}">${escapeHtml(displayed)}</td>`);
      }

      lines.push("    </tr>");
    }
    lines.push("  </tbody>");
    lines.push("</table>");

    return lines.join("\n");
  }

  /**
   * Alias for {@link Styler.toHtml} (matches pandas `.render()` / `.to_html()`).
   */
  render(uuid?: string): string {
    return this.toHtml(uuid);
  }

  /**
   * Render the styled DataFrame as a LaTeX string.
   *
   * Produces a basic LaTeX `tabular` environment; styling is not applied
   * (CSS has no direct LaTeX equivalent).
   *
   * @param environment — LaTeX table environment (default `"tabular"`).
   * @param hrules — whether to add horizontal rules (default `true`).
   */
  toLatex(environment = "tabular", hrules = true): string {
    const [nrows, ncols] = this._df.shape;
    const colNames = this._colNames;
    const indexVals = this._df.index.values as readonly Label[];

    const visibleCols: number[] = [];
    for (let ci = 0; ci < ncols; ci++) {
      if (!this._hiddenCols.has(ci)) {
        visibleCols.push(ci);
      }
    }

    const colSpec = (this._hideIndex ? "" : "l|") + visibleCols.map(() => "r").join("");
    const lines: string[] = [];

    if (this._caption !== null) {
      lines.push("\\begin{table}");
      lines.push(`  \\caption{${this._caption}}`);
    }

    lines.push(`\\begin{${environment}}{${colSpec}}`);
    if (hrules) {
      lines.push("\\toprule");
    }

    // Header
    const headers: string[] = [];
    if (!this._hideIndex) {
      headers.push("{}");
    }
    for (const ci of visibleCols) {
      headers.push(String(colNames[ci] ?? "").replace(/_/g, "\\_"));
    }
    lines.push(`${headers.join(" & ")} \\\\`);
    if (hrules) {
      lines.push("\\midrule");
    }

    // Rows
    for (let ri = 0; ri < nrows; ri++) {
      const cells: string[] = [];
      if (!this._hideIndex) {
        cells.push(String(indexVals[ri] ?? ri).replace(/_/g, "\\_"));
      }
      for (const ci of visibleCols) {
        const colName = colNames[ci];
        const val: Scalar =
          colName !== undefined ? (this._df.col(colName).values[ri] ?? null) : null;
        const formatter = this._formatters.get(ci) ?? null;
        const displayed = applyFormatter(val, formatter, this._naRep, this._precision);
        cells.push(displayed.replace(/_/g, "\\_").replace(/&/g, "\\&").replace(/%/g, "\\%"));
      }
      lines.push(`${cells.join(" & ")} \\\\`);
    }

    if (hrules) {
      lines.push("\\bottomrule");
    }
    lines.push(`\\end{${environment}}`);

    if (this._caption !== null) {
      lines.push("\\end{table}");
    }

    return lines.join("\n");
  }

  /** String representation (renders as HTML). */
  toString(): string {
    return this.toHtml();
  }
}

// ─── factory ──────────────────────────────────────────────────────────────────

/**
 * Create a {@link Styler} for the given DataFrame.
 *
 * Equivalent to `df.style` in pandas.
 *
 * @example
 * ```ts
 * import { DataFrame, dataFrameStyle } from "tsb";
 *
 * const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, -1, 6] });
 * const html = dataFrameStyle(df)
 *   .highlightMax({ color: "lightgreen" })
 *   .highlightMin({ color: "salmon" })
 *   .setCaption("Sample Table")
 *   .toHtml();
 * ```
 */
export function dataFrameStyle(df: DataFrame): Styler {
  return new Styler(df);
}
