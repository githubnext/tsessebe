/**
 * Styler — CSS-based styling for DataFrames.
 *
 * Mirrors `pandas.io.formats.style.Styler`: applies element-wise,
 * column-wise, and row-wise CSS rules and renders an HTML table.
 *
 * @example
 * ```ts
 * const styled = new Styler(df)
 *   .highlight_max({ color: "yellow" })
 *   .set_caption("My Table");
 * const html = styled.render();
 * ```
 */

import type { Scalar } from "../types.ts";
import type { DataFrame } from "./frame.ts";

// ─── cell key ─────────────────────────────────────────────────────────────────

interface CellKey {
  row: number;
  col: number;
}

// ─── style rule ───────────────────────────────────────────────────────────────

/** A CSS declaration string, e.g. `"background-color: yellow"`. */
type CssDecl = string;

/** A function mapping a scalar value to a CSS declaration or empty string. */
export type StylerFunc = (value: Scalar) => CssDecl;

/** Options for highlight_max / highlight_min. */
export interface HighlightOptions {
  /** CSS color string. */
  readonly color?: string;
  /** 0 = rows, 1 = columns (default: 0). */
  readonly axis?: 0 | 1;
}

/** Options for background_gradient. */
export interface GradientOptions {
  /** Low-end hex color (default: `"#ffffff"`). */
  readonly low?: string;
  /** High-end hex color (default: `"#4575b4"`). */
  readonly high?: string;
  /** 0 = rows, 1 = columns (default: 0). */
  readonly axis?: 0 | 1;
}

// ─── hex helpers ──────────────────────────────────────────────────────────────

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

const HEX_STRIP_RE = /^#/;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(HEX_STRIP_RE, "");
  const int = Number.parseInt(h.padEnd(6, "0").slice(0, 6), 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => clampByte(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(low: string, high: string, t: number): string {
  const [lr, lg, lb] = hexToRgb(low);
  const [hr, hg, hb] = hexToRgb(high);
  return rgbToHex(lr + (hr - lr) * t, lg + (hg - lg) * t, lb + (hb - lb) * t);
}

// ─── Styler ───────────────────────────────────────────────────────────────────

/**
 * A Styler attaches CSS formatting rules to a DataFrame and renders it as HTML.
 *
 * All methods return `this` for chaining.
 */
export class Styler {
  /** @protected */ protected readonly _df: DataFrame;
  /** Sparse map: "row,col" → array of CSS declarations. */
  /** @protected */ protected readonly _styles: Map<string, CssDecl[]>;
  private _caption: string | null;
  private _tableStyles: CssDecl[];

  constructor(df: DataFrame) {
    this._df = df;
    this._styles = new Map();
    this._caption = null;
    this._tableStyles = [];
  }

  // ─── caption ────────────────────────────────────────────────────────────────

  /**
   * Set a caption string displayed above the HTML table.
   */
  set_caption(caption: string): this {
    this._caption = caption;
    return this;
  }

  // ─── table-level CSS ────────────────────────────────────────────────────────

  /**
   * Apply CSS declarations to the entire table element.
   */
  set_table_styles(styles: CssDecl[]): this {
    this._tableStyles = [...styles];
    return this;
  }

  // ─── element-wise styling ────────────────────────────────────────────────────

  /**
   * Apply a CSS-returning function to every element.
   *
   * @param func - Receives each scalar and returns a CSS declaration.
   */
  applymap(func: StylerFunc): this {
    const cols = this._df.columns.values;
    const nrows = this._df.shape[0];
    for (let r = 0; r < nrows; r++) {
      for (let ci = 0; ci < cols.length; ci++) {
        const colName = cols[ci];
        if (colName === undefined) {
          continue;
        }
        const val = this._df.col(colName).iloc(r);
        const decl = func(val);
        if (decl.length > 0) {
          this._addStyle({ row: r, col: ci }, decl);
        }
      }
    }
    return this;
  }

  // ─── highlight max / min ─────────────────────────────────────────────────────

  /**
   * Highlight the maximum value(s) along an axis.
   */
  highlight_max(opts: HighlightOptions = {}): this {
    const color = opts.color ?? "yellow";
    const axis = opts.axis ?? 0;
    return this._highlightExtreme("max", color, axis);
  }

  /**
   * Highlight the minimum value(s) along an axis.
   */
  highlight_min(opts: HighlightOptions = {}): this {
    const color = opts.color ?? "yellow";
    const axis = opts.axis ?? 0;
    return this._highlightExtreme("min", color, axis);
  }

  private _highlightExtreme(kind: "max" | "min", color: string, axis: 0 | 1): this {
    const decl = `background-color: ${color}`;
    if (axis === 1) {
      this._highlightExtremeByCol(kind, decl);
    } else {
      this._highlightExtremeByRow(kind, decl);
    }
    return this;
  }

  private _highlightExtremeByCol(kind: "max" | "min", decl: string): void {
    const cols = this._df.columns.values;
    const nrows = this._df.shape[0];
    for (let ci = 0; ci < cols.length; ci++) {
      const colName = cols[ci];
      if (colName === undefined) {
        continue;
      }
      const vals = this._numericColumn(colName);
      const extreme = kind === "max" ? Math.max(...vals) : Math.min(...vals);
      for (let r = 0; r < nrows; r++) {
        const v = this._df.col(colName).iloc(r);
        if (typeof v === "number" && v === extreme) {
          this._addStyle({ row: r, col: ci }, decl);
        }
      }
    }
  }

  private _highlightExtremeByRow(kind: "max" | "min", decl: string): void {
    const cols = this._df.columns.values;
    const nrows = this._df.shape[0];
    for (let r = 0; r < nrows; r++) {
      const rowVals = this._numericRow(r);
      const extreme = kind === "max" ? Math.max(...rowVals) : Math.min(...rowVals);
      for (let ci = 0; ci < cols.length; ci++) {
        const colName = cols[ci];
        if (colName === undefined) {
          continue;
        }
        const v = this._df.col(colName).iloc(r);
        if (typeof v === "number" && v === extreme) {
          this._addStyle({ row: r, col: ci }, decl);
        }
      }
    }
  }

  // ─── background gradient ─────────────────────────────────────────────────────

  /**
   * Apply a color gradient based on numeric values along an axis.
   */
  background_gradient(opts: GradientOptions = {}): this {
    const low = opts.low ?? "#ffffff";
    const high = opts.high ?? "#4575b4";
    const axis = opts.axis ?? 0;
    if (axis === 1) {
      this._gradientByCol(low, high);
    } else {
      this._gradientByRow(low, high);
    }
    return this;
  }

  private _gradientByCol(low: string, high: string): void {
    const cols = this._df.columns.values;
    const nrows = this._df.shape[0];
    for (let ci = 0; ci < cols.length; ci++) {
      const colName = cols[ci];
      if (colName === undefined) {
        continue;
      }
      const vals = this._numericColumn(colName);
      const mn = Math.min(...vals);
      const mx = Math.max(...vals);
      const range = mx - mn;
      for (let r = 0; r < nrows; r++) {
        const v = this._df.col(colName).iloc(r);
        if (typeof v === "number" && Number.isFinite(v)) {
          const t = range === 0 ? 0.5 : (v - mn) / range;
          this._addStyle(
            { row: r, col: ci },
            `background-color: ${interpolateColor(low, high, t)}`,
          );
        }
      }
    }
  }

  private _gradientByRow(low: string, high: string): void {
    const cols = this._df.columns.values;
    const nrows = this._df.shape[0];
    for (let r = 0; r < nrows; r++) {
      const rowVals = this._numericRow(r);
      const mn = Math.min(...rowVals);
      const mx = Math.max(...rowVals);
      const range = mx - mn;
      for (let ci = 0; ci < cols.length; ci++) {
        const colName = cols[ci];
        if (colName === undefined) {
          continue;
        }
        const v = this._df.col(colName).iloc(r);
        if (typeof v === "number" && Number.isFinite(v)) {
          const t = range === 0 ? 0.5 : (v - mn) / range;
          this._addStyle(
            { row: r, col: ci },
            `background-color: ${interpolateColor(low, high, t)}`,
          );
        }
      }
    }
  }

  // ─── null highlight ───────────────────────────────────────────────────────────

  /**
   * Highlight cells that contain null / NaN / undefined.
   */
  highlight_null(color = "red"): this {
    return this.applymap((v) => {
      const isNull = v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
      return isNull ? `background-color: ${color}` : "";
    });
  }

  // ─── render ───────────────────────────────────────────────────────────────────

  /**
   * Render the styled DataFrame as an HTML string.
   */
  render(): string {
    const parts: string[] = [];
    const tableStyle =
      this._tableStyles.length > 0 ? ` style="${this._tableStyles.join("; ")}"` : "";
    parts.push(`<table${tableStyle}>`);

    if (this._caption !== null) {
      parts.push(`  <caption>${escapeHtml(this._caption)}</caption>`);
    }

    // header row
    parts.push("  <thead><tr><th></th>");
    for (const col of this._df.columns.values) {
      parts.push(`<th>${escapeHtml(String(col))}</th>`);
    }
    parts.push("  </tr></thead>");

    // body rows
    parts.push("  <tbody>");
    const nrows = this._df.shape[0];
    const cols = this._df.columns.values;
    for (let r = 0; r < nrows; r++) {
      const rowLabel = this._df.index.values[r];
      parts.push(`    <tr><th>${escapeHtml(String(rowLabel))}</th>`);
      for (let ci = 0; ci < cols.length; ci++) {
        const colName = cols[ci];
        if (colName === undefined) {
          continue;
        }
        const v = this._df.col(colName).iloc(r);
        const styleDecls = this._styles.get(`${r},${ci}`);
        const styleAttr =
          styleDecls !== undefined && styleDecls.length > 0
            ? ` style="${styleDecls.join("; ")}"`
            : "";
        parts.push(`<td${styleAttr}>${escapeHtml(String(v ?? ""))}</td>`);
      }
      parts.push("    </tr>");
    }
    parts.push("  </tbody></table>");
    return parts.join("\n");
  }

  // ─── private helpers ──────────────────────────────────────────────────────────

  /** @protected */ protected _addStyle(cell: CellKey, decl: CssDecl): void {
    const key = `${cell.row},${cell.col}`;
    const existing = this._styles.get(key);
    if (existing !== undefined) {
      existing.push(decl);
    } else {
      this._styles.set(key, [decl]);
    }
  }

  private _numericColumn(colName: string): number[] {
    const out: number[] = [];
    const s = this._df.col(colName);
    for (const v of s.values) {
      if (typeof v === "number" && Number.isFinite(v)) {
        out.push(v);
      }
    }
    return out;
  }

  private _numericRow(r: number): number[] {
    const out: number[] = [];
    for (const colName of this._df.columns.values) {
      const v = this._df.col(colName).iloc(r);
      if (typeof v === "number" && Number.isFinite(v)) {
        out.push(v);
      }
    }
    return out;
  }
}

// ─── HTML escape ──────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── factory helper ───────────────────────────────────────────────────────────

/**
 * Create a `Styler` for the given DataFrame.
 *
 * Equivalent to `new Styler(df)`.
 */
export function styleDataFrame(df: DataFrame): Styler {
  return new Styler(df);
}
