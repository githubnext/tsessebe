/**
 * Advanced Styler — bar charts, heatmaps, and rich formatting.
 *
 * Extends the base `Styler` with pandas-advanced rendering methods:
 * inline bar charts in cells, per-column/row color heatmaps, text
 * gradient formatting, and threshold-based conditional formatting.
 *
 * Mirrors `pandas.io.formats.style.Styler` advanced API.
 *
 * @example
 * ```ts
 * import { advancedStyler } from "tsb";
 *
 * const html = advancedStyler(df)
 *   .bar({ color: "#5fba7d", vmin: 0, vmax: 100 })
 *   .heatmap()
 *   .render();
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import type { DataFrame } from "./frame.ts";
import { Styler } from "./style.ts";

// ─── types ────────────────────────────────────────────────────────────────────

/** Options for inline bar chart rendering. */
export interface BarOptions {
  /** Bar fill color (CSS color string). Default `"#d65f5f"`. */
  readonly color?: string;
  /** Minimum value for bar scale. Auto-detected if omitted. */
  readonly vmin?: number;
  /** Maximum value for bar scale. Auto-detected if omitted. */
  readonly vmax?: number;
  /** Axis: 0 = per-row, 1 = per-column (default: 1). */
  readonly axis?: 0 | 1;
  /** Bar width as fraction of cell width (default 0.6). */
  readonly width?: number;
}

/** Options for heatmap rendering. */
export interface HeatmapOptions {
  /** Low-end CSS color (default `"#fff7fb"`). */
  readonly cmap_low?: string;
  /** High-end CSS color (default `"#023858"`). */
  readonly cmap_high?: string;
  /** Axis: 0 = per-row normalisation, 1 = per-column (default: 0). */
  readonly axis?: 0 | 1;
  /** Minimum value override. */
  readonly vmin?: number;
  /** Maximum value override. */
  readonly vmax?: number;
}

/** Options for text-gradient formatting. */
export interface TextGradientOptions {
  /** Low-end CSS color. Default `"#f7fbff"`. */
  readonly cmap_low?: string;
  /** High-end CSS color. Default `"#08306b"`. */
  readonly cmap_high?: string;
  /** Axis: 0 = per-row, 1 = per-column (default: 0). */
  readonly axis?: 0 | 1;
}

/** Options for threshold-based conditional formatting. */
export interface ThresholdOptions {
  /** Values strictly greater than this receive `cssAbove`. */
  readonly threshold: number;
  /** CSS applied to cells above the threshold. Default `"color: green"`. */
  readonly cssAbove?: string;
  /** CSS applied to cells at or below the threshold. Default `"color: red"`. */
  readonly cssBelow?: string;
}

// ─── color helpers ────────────────────────────────────────────────────────────

const HEX_STRIP = /^#/;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(HEX_STRIP, "");
  const n = Number.parseInt(h.padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number): string => clampByte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lerpColor(lo: string, hi: string, t: number): string {
  const [lr, lg, lb] = hexToRgb(lo);
  const [hr, hg, hb] = hexToRgb(hi);
  return rgbToHex(lr + (hr - lr) * t, lg + (hg - lg) * t, lb + (hb - lb) * t);
}

// ─── numeric helpers ──────────────────────────────────────────────────────────

function scalarToNumber(v: Scalar): number {
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "boolean") {
    return v ? 1 : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

function colFiniteValues(df: DataFrame, colName: string): number[] {
  return df
    .col(colName)
    .values.map(scalarToNumber)
    .filter((v) => Number.isFinite(v));
}

function rowFiniteValues(df: DataFrame, rowIdx: number, colNames: readonly string[]): number[] {
  const vals: number[] = [];
  for (const name of colNames) {
    const v = scalarToNumber(df.col(name).iloc(rowIdx));
    if (Number.isFinite(v)) {
      vals.push(v);
    }
  }
  return vals;
}

function getRange(
  vals: readonly number[],
  vminOpt?: number,
  vmaxOpt?: number,
): { lo: number; hi: number } {
  const lo = vminOpt ?? (vals.length > 0 ? Math.min(...vals) : 0);
  const hi = vmaxOpt ?? (vals.length > 0 ? Math.max(...vals) : 1);
  return { lo, hi };
}

function normalise(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) {
    return 0;
  }
  if (hi === lo) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
}

// ─── CSS builders ─────────────────────────────────────────────────────────────

function barCss(color: string, pct: number): string {
  const p = Math.min(100, Math.max(0, pct)).toFixed(1);
  return `background: linear-gradient(90deg, ${color} ${p}%, transparent ${p}%)`;
}

// ─── AdvancedStyler ───────────────────────────────────────────────────────────

/**
 * `AdvancedStyler` extends `Styler` with inline bar charts, heatmaps,
 * text gradients, and threshold-based conditional formatting.
 */
export class AdvancedStyler extends Styler {
  // ─── private style helpers ────────────────────────────────────────────────

  private _applyByCol(
    buildCss: (v: number, lo: number, hi: number) => string,
    vminOpt?: number,
    vmaxOpt?: number,
  ): void {
    const df = this._df;
    const colNames = df.columns.values;
    const nrows = df.shape[0];
    for (let ci = 0; ci < colNames.length; ci++) {
      const name = colNames[ci];
      if (name === undefined) {
        continue;
      }
      const { lo, hi } = getRange(colFiniteValues(df, name), vminOpt, vmaxOpt);
      for (let ri = 0; ri < nrows; ri++) {
        this._addStyle(
          { row: ri, col: ci },
          buildCss(scalarToNumber(df.col(name).iloc(ri)), lo, hi),
        );
      }
    }
  }

  private _applyByRow(
    buildCss: (v: number, lo: number, hi: number) => string,
    vminOpt?: number,
    vmaxOpt?: number,
  ): void {
    const df = this._df;
    const colNames = df.columns.values;
    const nrows = df.shape[0];
    for (let ri = 0; ri < nrows; ri++) {
      const { lo, hi } = getRange(rowFiniteValues(df, ri, colNames), vminOpt, vmaxOpt);
      for (let ci = 0; ci < colNames.length; ci++) {
        const name = colNames[ci];
        if (name === undefined) {
          continue;
        }
        this._addStyle(
          { row: ri, col: ci },
          buildCss(scalarToNumber(df.col(name).iloc(ri)), lo, hi),
        );
      }
    }
  }

  /**
   * Apply inline bar-chart styling to numeric cells.
   *
   * @param options - Bar options.
   * @returns `this` for chaining.
   */
  bar(options?: BarOptions): this {
    const color = options?.color ?? "#d65f5f";
    const width = options?.width ?? 0.6;
    const build = (v: number, lo: number, hi: number): string =>
      barCss(color, normalise(v, lo, hi) * width * 100);
    if ((options?.axis ?? 1) === 1) {
      this._applyByCol(build, options?.vmin, options?.vmax);
    } else {
      this._applyByRow(build, options?.vmin, options?.vmax);
    }
    return this;
  }

  /**
   * Apply heatmap background colors to numeric cells.
   *
   * @param options - Heatmap options.
   * @returns `this` for chaining.
   */
  heatmap(options?: HeatmapOptions): this {
    const lo_color = options?.cmap_low ?? "#fff7fb";
    const hi_color = options?.cmap_high ?? "#023858";
    const build = (v: number, lo: number, hi: number): string =>
      `background-color: ${lerpColor(lo_color, hi_color, normalise(v, lo, hi))}`;
    if ((options?.axis ?? 0) === 1) {
      this._applyByCol(build, options?.vmin, options?.vmax);
    } else {
      this._applyByRow(build, options?.vmin, options?.vmax);
    }
    return this;
  }

  /**
   * Apply text-color gradient to numeric cells.
   *
   * @param options - Text gradient options.
   * @returns `this` for chaining.
   */
  textGradient(options?: TextGradientOptions): this {
    const lo_color = options?.cmap_low ?? "#f7fbff";
    const hi_color = options?.cmap_high ?? "#08306b";
    const build = (v: number, lo: number, hi: number): string =>
      `color: ${lerpColor(lo_color, hi_color, normalise(v, lo, hi))}`;
    if ((options?.axis ?? 0) === 1) {
      this._applyByCol(build);
    } else {
      this._applyByRow(build);
    }
    return this;
  }

  /**
   * Highlight cells above/below a numeric threshold.
   *
   * @param options - Threshold and CSS strings.
   * @returns `this` for chaining.
   */
  threshold(options: ThresholdOptions): this {
    const cssAbove = options.cssAbove ?? "color: green";
    const cssBelow = options.cssBelow ?? "color: red";
    const df = this._df;
    const colNames = df.columns.values;
    const nrows = df.shape[0];
    for (let ri = 0; ri < nrows; ri++) {
      for (let ci = 0; ci < colNames.length; ci++) {
        const name = colNames[ci];
        if (name === undefined) {
          continue;
        }
        const v = scalarToNumber(df.col(name).iloc(ri));
        if (Number.isFinite(v)) {
          this._addStyle({ row: ri, col: ci }, v > options.threshold ? cssAbove : cssBelow);
        }
      }
    }
    return this;
  }
}

// ─── factory ─────────────────────────────────────────────────────────────────

/**
 * Create an `AdvancedStyler` wrapping the given DataFrame.
 *
 * @param df - The DataFrame to style.
 * @returns A new `AdvancedStyler` instance.
 */
export function advancedStyler(df: DataFrame): AdvancedStyler {
  return new AdvancedStyler(df);
}
