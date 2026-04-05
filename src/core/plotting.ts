/**
 * plotting — declarative plot specification API.
 *
 * Mirrors pandas' `DataFrame.plot` and `Series.plot` surface.
 * Returns lightweight `PlotSpec` objects describing the desired chart.
 * Actual rendering is delegated to an injectable renderer set via
 * `setPlotRenderer`.
 *
 * @example
 * ```ts
 * import { setPlotRenderer, linePlot } from "tsb";
 * setPlotRenderer((spec) => console.log(spec));
 * const spec = linePlot(mySeries, { title: "My Series" });
 * ```
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import type { DataFrame } from "./frame.ts";
import type { Series } from "./series.ts";

// ─── plot kinds ───────────────────────────────────────────────────────────────

/** All supported plot kinds, mirroring pandas' `kind` parameter. */
export type PlotKind =
  | "line"
  | "bar"
  | "barh"
  | "hist"
  | "box"
  | "kde"
  | "density"
  | "area"
  | "pie"
  | "scatter"
  | "hexbin";

// ─── options ──────────────────────────────────────────────────────────────────

/** Shared options for all plot types. */
export interface PlotOptions {
  /** Plot title. */
  title?: string;
  /** x-axis label. */
  xlabel?: string;
  /** y-axis label. */
  ylabel?: string;
  /** Figure width in pixels. */
  figwidth?: number;
  /** Figure height in pixels. */
  figheight?: number;
  /** Whether to show the legend (default: true). */
  legend?: boolean;
  /** CSS color or array of colors for the plotted series. */
  color?: string | readonly string[];
}

/** Options specific to histogram plots. */
export interface HistOptions extends PlotOptions {
  /** Number of histogram bins (default: 10). */
  bins?: number;
}

/** Options specific to scatter plots. */
export interface ScatterOptions extends PlotOptions {
  /** Column name to use for bubble size. */
  s?: string;
  /** Column name to use for point color. */
  c?: string;
}

// ─── plot spec ────────────────────────────────────────────────────────────────

/** One data series within a `PlotSpec`. */
export interface PlotSeriesEntry {
  /** Series name (column name or Series.name). */
  name: string;
  /** Data values for this series. */
  values: readonly Scalar[];
}

/**
 * Self-contained description of a plot.
 * The renderer is responsible for turning this into actual visuals.
 */
export interface PlotSpec {
  /** Type of chart. */
  kind: PlotKind;
  /** x-axis labels / category values. */
  xData: readonly Scalar[];
  /** One entry per column (or one for a plain Series). */
  series: readonly PlotSeriesEntry[];
  /** Resolved options. */
  options: Readonly<PlotOptions | HistOptions | ScatterOptions>;
}

// ─── renderer registry ────────────────────────────────────────────────────────

/** Signature of a plot renderer. */
export type PlotRenderer = (spec: PlotSpec) => void;

let _renderer: PlotRenderer | null = null;

/**
 * Register a plot renderer.
 *
 * The renderer is called each time a plot function is invoked.
 * Pass `null` to clear the current renderer.
 *
 * @param renderer - A function that accepts a `PlotSpec` and renders it.
 *
 * @example
 * ```ts
 * import { setPlotRenderer } from "tsb";
 * setPlotRenderer((spec) => {
 *   console.log("Plot:", spec.kind, spec.series.length, "series");
 * });
 * ```
 */
export function setPlotRenderer(renderer: PlotRenderer | null): void {
  _renderer = renderer;
}

/** Emit a spec to the registered renderer (no-op if none set). */
function emit(spec: PlotSpec): PlotSpec {
  _renderer?.(spec);
  return spec;
}

// ─── Series helpers ───────────────────────────────────────────────────────────

/** Extract x-axis labels from a Series' index. */
function seriesX(s: Series): readonly Scalar[] {
  return s.index.values as readonly Scalar[];
}

/** Build a single PlotSeriesEntry from a Series. */
function oneSeries(s: Series): readonly PlotSeriesEntry[] {
  return [{ name: s.name ?? "values", values: s.values as readonly Scalar[] }];
}

// ─── DataFrame helpers ────────────────────────────────────────────────────────

/** Extract x-axis labels from a DataFrame's index. */
function dfX(df: DataFrame): readonly Scalar[] {
  return df.index.values as readonly Scalar[];
}

/** Build PlotSeriesEntry array from all DataFrame columns. */
function dfAllSeries(df: DataFrame): readonly PlotSeriesEntry[] {
  return df.columns.values.map((col) => {
    const name = String(col);
    const colSeries = df.col(name);
    return { name, values: (colSeries?.values ?? []) as readonly Scalar[] };
  });
}

// ─── Series plot functions ────────────────────────────────────────────────────

/**
 * Create a line plot spec from a Series.
 *
 * @example
 * ```ts
 * import { linePlot } from "tsb";
 * const spec = linePlot(series, { title: "Daily Prices" });
 * ```
 */
export function linePlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "line", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a bar chart spec from a Series. */
export function barPlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "bar", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a horizontal bar chart spec from a Series. */
export function barhPlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "barh", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create an area chart spec from a Series. */
export function areaPlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "area", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a histogram spec from a Series. */
export function histPlot(s: Series, options: HistOptions = {}): PlotSpec {
  return emit({ kind: "hist", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a KDE (kernel density estimate) plot spec from a Series. */
export function kdePlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "kde", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a box plot spec from a Series. */
export function boxPlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "box", xData: seriesX(s), series: oneSeries(s), options });
}

/** Create a pie chart spec from a Series. */
export function piePlot(s: Series, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "pie", xData: seriesX(s), series: oneSeries(s), options });
}

// ─── DataFrame plot functions ─────────────────────────────────────────────────

/** Create a line plot spec from a DataFrame (one line per column). */
export function dfLinePlot(df: DataFrame, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "line", xData: dfX(df), series: dfAllSeries(df), options });
}

/** Create a bar chart spec from a DataFrame (grouped bars per column). */
export function dfBarPlot(df: DataFrame, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "bar", xData: dfX(df), series: dfAllSeries(df), options });
}

/** Create an area chart spec from a DataFrame. */
export function dfAreaPlot(df: DataFrame, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "area", xData: dfX(df), series: dfAllSeries(df), options });
}

/** Create a box plot spec from a DataFrame (one box per column). */
export function dfBoxPlot(df: DataFrame, options: PlotOptions = {}): PlotSpec {
  return emit({ kind: "box", xData: dfX(df), series: dfAllSeries(df), options });
}

/** Create a scatter plot spec from a DataFrame. */
export function dfScatterPlot(df: DataFrame, options: ScatterOptions = {}): PlotSpec {
  return emit({ kind: "scatter", xData: dfX(df), series: dfAllSeries(df), options });
}

/** Create a histogram spec from a DataFrame (one histogram per column). */
export function dfHistPlot(df: DataFrame, options: HistOptions = {}): PlotSpec {
  return emit({ kind: "hist", xData: dfX(df), series: dfAllSeries(df), options });
}
