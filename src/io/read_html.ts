/**
 * readHtml — parse HTML tables into DataFrames.
 *
 * Mirrors `pandas.read_html()`: scans an HTML string for `<table>` elements
 * and returns one `DataFrame` per table found.
 *
 * Implemented without any DOM/browser APIs so it works in Bun (Node-like
 * environment) as well as the browser.
 *
 * @example
 * ```ts
 * const html = `<table>
 *   <thead><tr><th>Name</th><th>Age</th></tr></thead>
 *   <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
 * </table>`;
 * const [df] = readHtml(html);
 * df.shape; // [1, 2]
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options accepted by {@link readHtml}. */
export interface ReadHtmlOptions {
  /**
   * 0-based index of the table to use as the column headers.
   * - `0` (default) — first row of the table becomes column headers.
   * - `null` — no header row; columns are named `0, 1, 2, …`.
   */
  header?: number | null;

  /**
   * Column to use as the row index.
   * May be an integer (column position) or a column name.
   * Defaults to a plain RangeIndex.
   */
  indexCol?: number | string | null;

  /**
   * Only return tables at these 0-based positions.
   * E.g. `match: [0, 2]` returns the 1st and 3rd tables.
   */
  match?: number[];

  /**
   * Values to treat as NaN/null (in addition to the empty string).
   * Defaults to `["", "NA", "NaN", "N/A", "null", "None", "nan"]`.
   */
  naValues?: string[];

  /**
   * When `true`, attempt to convert column values to numbers.
   * Defaults to `true`.
   */
  converters?: boolean;

  /**
   * When `true`, skip blank lines / empty rows in the table body.
   * Defaults to `true`.
   */
  skipBlankLines?: boolean;

  /**
   * 0-based row positions to skip in the table body (after the header).
   */
  skipRows?: number[];

  /**
   * Keep at most this many rows.
   */
  nrows?: number;

  /**
   * When `true`, strip leading/trailing whitespace from cell text.
   * Defaults to `true`.
   */
  thousands?: string | null;

  /**
   * Decimal separator character. Defaults to `"."`.
   */
  decimal?: string;
}

// ─── HTML mini-parser ─────────────────────────────────────────────────────────

/** Strip HTML tags and decode simple entities. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

/** Low-level: extract the content between tag pairs, case-insensitively. */
function extractBlocks(html: string, tag: string): string[] {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "gi");
  const close = new RegExp(`</${tag}>`, "gi");
  const results: string[] = [];

  let match: RegExpExecArray | null;
  // Reset lastIndex each call
  open.lastIndex = 0;

  while ((match = open.exec(html)) !== null) {
    const start = match.index + match[0].length;
    close.lastIndex = start;
    const end = close.exec(html);
    if (end) {
      results.push(html.slice(start, end.index));
    }
  }
  return results;
}

/** Extract all `<table>…</table>` blocks (nested tables are not unwrapped). */
function extractTables(html: string): string[] {
  const tables: { start: number; html: string }[] = [];
  const starts: number[] = [];

  const allTags = /<\/?table(?:\s[^>]*)?>/gi;
  let m: RegExpExecArray | null;
  while ((m = allTags.exec(html)) !== null) {
    const tag = m[0].toLowerCase();
    if (tag.startsWith("</")) {
      const start = starts.pop();
      if (start !== undefined) {
        tables.push({
          start,
          html: html.slice(start, m.index + m[0].length),
        });
      }
    } else {
      starts.push(m.index);
    }
  }
  return tables.sort((a, b) => a.start - b.start).map((t) => t.html);
}

/** Parse `<tr>` blocks out of a table section (`<thead>` or `<tbody>`). */
function parseRows(sectionHtml: string): string[][] {
  const rows: string[][] = [];
  for (const rowHtml of extractBlocks(sectionHtml, "tr")) {
    const cells: string[] = [];
    // Match both <td> and <th>
    const cellPattern = /<t[dh](?:\s[^>]*)?>([\s\S]*?)<\/t[dh]>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cellPattern.exec(rowHtml)) !== null) {
      cells.push(stripTags(cm[1] ?? "").trim());
    }
    rows.push(cells);
  }
  return rows;
}

/** Parse a single `<table>` HTML string into a 2-D array of cell strings. */
function parseTableHtml(tableHtml: string): string[][] {
  const allRows: string[][] = [];

  // thead first
  for (const thead of extractBlocks(tableHtml, "thead")) {
    for (const row of parseRows(thead)) {
      allRows.push(row);
    }
  }

  // then tbody (or bare rows directly under <table>)
  const tbodies = extractBlocks(tableHtml, "tbody");
  if (tbodies.length > 0) {
    for (const tbody of tbodies) {
      for (const row of parseRows(tbody)) {
        allRows.push(row);
      }
    }
  } else {
    // No <tbody>: rows directly in the table (excluding thead rows)
    // Strip thead/tfoot content before scanning for bare <tr>
    const stripped = tableHtml
      .replace(/<thead[\s\S]*?<\/thead>/gi, "")
      .replace(/<tfoot[\s\S]*?<\/tfoot>/gi, "");
    for (const row of parseRows(stripped)) {
      allRows.push(row);
    }
  }

  // tfoot at the end
  for (const tfoot of extractBlocks(tableHtml, "tfoot")) {
    for (const row of parseRows(tfoot)) {
      allRows.push(row);
    }
  }

  return allRows;
}

// ─── value coercion ───────────────────────────────────────────────────────────

const DEFAULT_NA = new Set(["", "NA", "NaN", "N/A", "null", "None", "nan"]);

function coerceValue(
  raw: string,
  naValues: Set<string>,
  tryNumber: boolean,
  thousands: string | null,
  decimal: string,
): Scalar {
  if (naValues.has(raw)) return null;
  if (!tryNumber) return raw;

  // Remove thousands separator
  let s = thousands ? raw.split(thousands).join("") : raw;
  // Replace decimal separator
  if (decimal !== ".") s = s.replace(decimal, ".");

  const n = Number(s);
  if (!Number.isNaN(n) && s.trim() !== "") return n;
  return raw;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Parse HTML tables from an HTML string and return one {@link DataFrame} per
 * table found.
 *
 * Mirrors `pandas.read_html()`.
 *
 * @param html - Raw HTML string.
 * @param opts - Parsing options.
 * @returns Array of DataFrames, one per `<table>` element found (in document order).
 *
 * @example
 * ```ts
 * const html = `<table>
 *   <tr><th>x</th><th>y</th></tr>
 *   <tr><td>1</td><td>4</td></tr>
 *   <tr><td>2</td><td>5</td></tr>
 * </table>`;
 * const [df] = readHtml(html);
 * df.columns; // ["x", "y"]
 * df.shape;   // [2, 2]
 * ```
 */
export function readHtml(html: string, opts: ReadHtmlOptions = {}): DataFrame[] {
  const {
    header = 0,
    indexCol = null,
    match,
    naValues: naValuesInput,
    converters = true,
    skipBlankLines = true,
    skipRows,
    nrows,
    thousands = null,
    decimal = ".",
  } = opts;

  const naSet = naValuesInput ? new Set(naValuesInput) : DEFAULT_NA;
  const tables = extractTables(html);
  const result: DataFrame[] = [];

  for (let ti = 0; ti < tables.length; ti++) {
    if (match !== undefined && !match.includes(ti)) continue;

    const rawRows = parseTableHtml(tables[ti] ?? "");

    // Determine columns
    let columns: string[];
    let dataStartRow: number;

    if (header === null || header === undefined) {
      // No header: name columns 0, 1, 2, …
      const ncols = rawRows.length > 0 ? (rawRows[0]?.length ?? 0) : 0;
      columns = Array.from({ length: ncols }, (_, i) => String(i));
      dataStartRow = 0;
    } else {
      const headerRow = rawRows[header] ?? [];
      // Deduplicate column names
      const seen = new Map<string, number>();
      columns = headerRow.map((name) => {
        const existing = seen.get(name);
        if (existing !== undefined) {
          const newName = `${name}.${existing}`;
          seen.set(name, existing + 1);
          return newName;
        }
        seen.set(name, 1);
        return name;
      });
      dataStartRow = header + 1;
    }

    // Gather data rows
    let bodyRows = rawRows.slice(dataStartRow);

    // Apply skipRows
    if (skipRows && skipRows.length > 0) {
      const skipSet = new Set(skipRows);
      bodyRows = bodyRows.filter((_, i) => !skipSet.has(i));
    }

    // Skip blank lines
    if (skipBlankLines) {
      bodyRows = bodyRows.filter((row) => row.some((c) => c.trim() !== ""));
    }

    // Limit rows
    if (nrows !== undefined) {
      bodyRows = bodyRows.slice(0, nrows);
    }

    const ncols = columns.length;

    // Build column arrays
    const colArrays: Scalar[][] = Array.from({ length: ncols }, () => []);

    for (const row of bodyRows) {
      for (let ci = 0; ci < ncols; ci++) {
        const raw = row[ci] ?? "";
        colArrays[ci]!.push(coerceValue(raw, naSet, converters, thousands, decimal));
      }
    }

    // Build record object
    const colObj: Record<string, Scalar[]> = {};
    for (let ci = 0; ci < ncols; ci++) {
      colObj[columns[ci]!] = colArrays[ci]!;
    }

    const df = DataFrame.fromColumns(colObj);

    // Apply indexCol
    if (indexCol !== null && indexCol !== undefined) {
      const colName =
        typeof indexCol === "number" ? (columns[indexCol] ?? String(indexCol)) : String(indexCol);
      // Set the named column as index (drop it from columns)
      const idxSeries = df.col(colName);
      const remaining: Record<string, Scalar[]> = {};
      for (const c of df.columns) {
        if (c !== colName) {
          remaining[c] = df.col(c).toArray();
        }
      }
      const dfWithIdx = DataFrame.fromColumns(remaining, {
        index: idxSeries.toArray() as import("../types.ts").Label[],
      });
      result.push(dfWithIdx);
      continue;
    }

    result.push(df);
  }

  return result;
}
