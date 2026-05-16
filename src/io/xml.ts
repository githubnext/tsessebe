/**
 * readXml / toXml — XML I/O for DataFrame.
 *
 * Mirrors `pandas.read_xml()` and `DataFrame.to_xml()`:
 * - `readXml(text, options?)` — parse an XML string into a DataFrame
 * - `toXml(df, options?)` — serialize a DataFrame to an XML string
 *
 * Implemented without any external dependencies — uses a hand-rolled
 * zero-dependency XML tokenizer that handles:
 * - Attributes on row elements
 * - Text-content child elements as columns
 * - xmlns namespace prefixes (stripped for column names)
 * - CDATA sections
 * - XML comments (skipped)
 * - Entity references (&amp; &lt; &gt; &apos; &quot; &#N; &#xN;)
 * - nrows, usecols, xpath-like row selection (element name filter)
 * - naValues, converters (auto-numeric coercion)
 * - indexCol
 *
 * @module
 */

import { DataFrame } from "../core/frame.ts";
import { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import type { Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options for {@link readXml}. */
export interface ReadXmlOptions {
  /**
   * Local-name of the element to treat as a row.  Defaults to the first
   * repeating child element name found inside the document root.
   */
  readonly rowTag?: string;

  /**
   * Column name or 0-based column index to use as the row index.
   * Defaults to a plain RangeIndex.
   */
  readonly indexCol?: string | number | null;

  /**
   * Only include these column names (subset).  `null` = all columns.
   */
  readonly usecols?: readonly string[] | null;

  /**
   * Extra strings to treat as NaN in addition to the built-in defaults
   * (`""`, `"NA"`, `"NaN"`, `"N/A"`, `"null"`, `"None"`, `"nan"`).
   */
  readonly naValues?: readonly string[];

  /**
   * Whether to try to coerce column values to numbers.  Defaults to `true`.
   */
  readonly converters?: boolean;

  /**
   * Maximum number of rows to read.  Defaults to unlimited.
   */
  readonly nrows?: number;

  /**
   * Whether to read element attributes as columns.  Defaults to `true`.
   */
  readonly attribs?: boolean;

  /**
   * Whether to read child element text content as columns.  Defaults to `true`.
   */
  readonly elems?: boolean;
}

/** Options for {@link toXml}. */
export interface ToXmlOptions {
  /**
   * Name of the document root element.  Defaults to `"data"`.
   */
  readonly rootName?: string;

  /**
   * Name of each row element.  Defaults to `"row"`.
   */
  readonly rowName?: string;

  /**
   * Emit column values as XML attributes instead of child elements.
   * Defaults to `false`.
   */
  readonly attribs?: boolean;

  /**
   * Whether to include the `<?xml version="1.0"?>` declaration.
   * Defaults to `true`.
   */
  readonly xmlDeclaration?: boolean;

  /**
   * Map of prefix → namespace URI to declare on the root element.
   * E.g. `{ xsi: "http://www.w3.org/2001/XMLSchema-instance" }`.
   */
  readonly namespaces?: Readonly<Record<string, string>>;

  /**
   * Indentation string (spaces or `"\t"`).  Defaults to `"  "` (2 spaces).
   * Set to `""` or `null` to disable indentation.
   */
  readonly indent?: string | null;

  /**
   * Names of columns whose values should be wrapped in a CDATA section.
   */
  readonly cdataCols?: readonly string[];
}

// ─── default NA strings ───────────────────────────────────────────────────────

const DEFAULT_NA: readonly string[] = ["", "NA", "NaN", "N/A", "null", "None", "nan"];

// ─── entity decoding ──────────────────────────────────────────────────────────

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  apos: "'",
  quot: '"',
  nbsp: "\u00a0",
};

function decodeEntities(s: string): string {
  return s.replace(/&([^;]+);/g, (_, ref: string) => {
    if (ref.startsWith("#x") || ref.startsWith("#X")) {
      const cp = Number.parseInt(ref.slice(2), 16);
      return Number.isNaN(cp) ? `&${ref};` : String.fromCodePoint(cp);
    }
    if (ref.startsWith("#")) {
      const cp = Number.parseInt(ref.slice(1), 10);
      return Number.isNaN(cp) ? `&${ref};` : String.fromCodePoint(cp);
    }
    return NAMED_ENTITIES[ref] ?? `&${ref};`;
  });
}

// ─── entity encoding ──────────────────────────────────────────────────────────

function encodeEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── local name (strip namespace prefix) ──────────────────────────────────────

function localName(qname: string): string {
  const colon = qname.indexOf(":");
  return colon === -1 ? qname : qname.slice(colon + 1);
}

// ─── minimal XML tokenizer ────────────────────────────────────────────────────

type Token =
  | { kind: "open"; name: string; attrs: Record<string, string>; selfClose: boolean }
  | { kind: "close"; name: string }
  | { kind: "text"; text: string }
  | { kind: "pi" }
  | { kind: "comment" }
  | { kind: "doctype" };

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const len = xml.length;

  while (pos < len) {
    if (xml[pos] !== "<") {
      // text node
      const end = xml.indexOf("<", pos);
      const raw = end === -1 ? xml.slice(pos) : xml.slice(pos, end);
      tokens.push({ kind: "text", text: decodeEntities(raw) });
      pos = end === -1 ? len : end;
      continue;
    }
    // starts with <
    if (xml.startsWith("<!--", pos)) {
      const end = xml.indexOf("-->", pos + 4);
      tokens.push({ kind: "comment" });
      pos = end === -1 ? len : end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", pos)) {
      const end = xml.indexOf("]]>", pos + 9);
      const text = end === -1 ? xml.slice(pos + 9) : xml.slice(pos + 9, end);
      tokens.push({ kind: "text", text });
      pos = end === -1 ? len : end + 3;
      continue;
    }
    if (xml.startsWith("<?", pos)) {
      const end = xml.indexOf("?>", pos + 2);
      tokens.push({ kind: "pi" });
      pos = end === -1 ? len : end + 2;
      continue;
    }
    if (xml.startsWith("<!", pos)) {
      const end = xml.indexOf(">", pos + 2);
      tokens.push({ kind: "doctype" });
      pos = end === -1 ? len : end + 1;
      continue;
    }
    if (xml[pos + 1] === "/") {
      // closing tag
      const end = xml.indexOf(">", pos + 2);
      const raw = end === -1 ? xml.slice(pos + 2) : xml.slice(pos + 2, end);
      tokens.push({ kind: "close", name: raw.trim() });
      pos = end === -1 ? len : end + 1;
      continue;
    }
    // opening tag
    const end = xml.indexOf(">", pos + 1);
    if (end === -1) { pos = len; continue; }
    const inner = xml.slice(pos + 1, end);
    const selfClose = inner.endsWith("/");
    const tagContent = selfClose ? inner.slice(0, -1) : inner;
    // parse tag name and attributes
    const match = /^([^\s/]+)([\s\S]*)$/.exec(tagContent.trim());
    if (!match) { pos = end + 1; continue; }
    const [, rawName = "", attrStr = ""] = match;
    const attrs: Record<string, string> = {};
    // parse attributes: name="value" or name='value'
    const attrRe = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(attrStr)) !== null) {
      const [, attrName = "", dq = "", sq = ""] = am;
      attrs[localName(attrName)] = decodeEntities(dq || sq);
    }
    tokens.push({ kind: "open", name: rawName.trim(), attrs, selfClose });
    pos = end + 1;
  }
  return tokens;
}

// ─── readXml ──────────────────────────────────────────────────────────────────

/**
 * Parse an XML string into a DataFrame.
 *
 * @example
 * ```ts
 * const xml = `<data>
 *   <row id="1"><name>Alice</name><age>30</age></row>
 *   <row id="2"><name>Bob</name><age>25</age></row>
 * </data>`;
 * const df = readXml(xml);
 * df.columns.toArray(); // ["id", "name", "age"]
 * df.shape;             // [2, 3]
 * ```
 */
export function readXml(text: string, options: ReadXmlOptions = {}): DataFrame {
  const {
    rowTag,
    indexCol = null,
    usecols = null,
    naValues: extraNa = [],
    converters = true,
    nrows,
    attribs = true,
    elems = true,
  } = options;

  const naSet = new Set([...DEFAULT_NA, ...extraNa]);

  const tokens = tokenize(text);
  const rows: Array<Record<string, string | null>> = [];

  // Discover rowTag from first repeating child of root if not specified
  let resolvedRowTag = rowTag;
  if (!resolvedRowTag) {
    const childCounts: Map<string, number> = new Map();
    let depth = 0;
    for (const tok of tokens) {
      if (tok.kind === "open") {
        depth++;
        if (depth === 2) {
          const n = localName(tok.name);
          childCounts.set(n, (childCounts.get(n) ?? 0) + 1);
        }
        if (tok.selfClose && depth === 2) depth--;
      } else if (tok.kind === "close") {
        depth--;
      }
    }
    // pick the element with the highest count (most repeated child of root)
    let best = "";
    let bestCount = 0;
    for (const [name, count] of childCounts) {
      if (count > bestCount) { bestCount = count; best = name; }
    }
    resolvedRowTag = best || "row";
  }

  // Parse rows
  let depth = 0;
  let inRow = false;
  let currentRow: Record<string, string | null> = {};
  let currentElem = "";
  let currentText = "";
  let rowCount = 0;

  for (const tok of tokens) {
    if (tok.kind === "open") {
      depth++;
      if (!inRow && depth >= 2 && localName(tok.name) === resolvedRowTag) {
        inRow = true;
        currentRow = {};
        if (attribs) {
          for (const [k, v] of Object.entries(tok.attrs)) {
            currentRow[k] = v;
          }
        }
        if (tok.selfClose) {
          inRow = false;
          rows.push({ ...currentRow });
          rowCount++;
          if (nrows !== undefined && rowCount >= nrows) break;
        }
      } else if (inRow && elems) {
        currentElem = localName(tok.name);
        currentText = "";
        // self-closing child elem → null
        if (tok.selfClose) {
          currentRow[currentElem] = null;
          currentElem = "";
        }
      }
      if (tok.selfClose) depth--;
    } else if (tok.kind === "text") {
      if (inRow && currentElem) {
        currentText += tok.text;
      }
    } else if (tok.kind === "close") {
      const cln = localName(tok.name);
      if (inRow && elems && currentElem && cln === currentElem) {
        currentRow[currentElem] = currentText;
        currentElem = "";
        currentText = "";
      } else if (inRow && cln === resolvedRowTag) {
        inRow = false;
        rows.push({ ...currentRow });
        rowCount++;
        if (nrows !== undefined && rowCount >= nrows) break;
      }
      depth--;
    }
  }

  if (rows.length === 0) {
    return DataFrame.fromColumns({});
  }

  // Collect all column names in order of first appearance
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) colSet.add(k);
  }
  let cols = [...colSet];
  if (usecols) cols = cols.filter((c) => usecols.includes(c));

  // Build column arrays
  const colData: Record<string, Scalar[]> = {};
  for (const col of cols) {
    colData[col] = rows.map((row) => {
      const raw = row[col] ?? null;
      if (raw === null || naSet.has(raw)) return null;
      if (converters) {
        const n = Number(raw);
        if (!Number.isNaN(n) && raw.trim() !== "") return n;
      }
      return raw;
    });
  }

  // Determine index
  let idxCol: string | null = null;
  if (typeof indexCol === "string") {
    idxCol = indexCol;
  } else if (typeof indexCol === "number" && indexCol < cols.length) {
    idxCol = cols[indexCol] ?? null;
  }

  if (idxCol !== null && cols.includes(idxCol)) {
    const idxData = colData[idxCol] ?? [];
    const dataColNames = cols.filter((c) => c !== idxCol);
    const dataColData: Record<string, Scalar[]> = {};
    for (const c of dataColNames) {
      dataColData[c] = colData[c] ?? [];
    }
    const idx = new Index(idxData);
    return DataFrame.fromColumns(dataColData, { index: idx });
  }

  return DataFrame.fromColumns(colData);
}

// ─── toXml ────────────────────────────────────────────────────────────────────

/**
 * Serialize a DataFrame to an XML string.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({ name: ["Alice", "Bob"], age: [30, 25] });
 * console.log(toXml(df));
 * // <?xml version="1.0" encoding="utf-8"?>
 * // <data>
 * //   <row><name>Alice</name><age>30</age></row>
 * //   <row><name>Bob</name><age>25</age></row>
 * // </data>
 * ```
 */
export function toXml(df: DataFrame, options: ToXmlOptions = {}): string {
  const {
    rootName = "data",
    rowName = "row",
    attribs = false,
    xmlDeclaration = true,
    namespaces = {},
    indent = "  ",
    cdataCols = [],
  } = options;

  const ind = indent ?? "";
  const nl = ind ? "\n" : "";

  const lines: string[] = [];

  if (xmlDeclaration) {
    lines.push('<?xml version="1.0" encoding="utf-8"?>');
  }

  // Root element opening with optional namespace declarations
  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => ` xmlns:${prefix}="${encodeEntities(uri)}"`)
    .join("");
  lines.push(`<${rootName}${nsAttrs}>`);

  const columns = df.columns.toArray();
  const nRows = df.shape[0];

  for (let i = 0; i < nRows; i++) {
    const rowValues: string[] = [];
    for (const col of columns) {
      const series = df.col(col);
      const val = series.iloc(i);
      rowValues.push(val === null || val === undefined ? "" : String(val));
    }

    if (attribs) {
      // emit as attributes on the row element
      const attrStr = columns
        .map((c, j) => `${c}="${encodeEntities(rowValues[j] ?? "")}"`)
        .join(" ");
      lines.push(`${ind}<${rowName} ${attrStr}/>`);
    } else {
      // emit as child elements
      const childLines: string[] = [];
      for (let j = 0; j < columns.length; j++) {
        const col = columns[j] ?? "";
        const raw = rowValues[j] ?? "";
        const isCdata = cdataCols.includes(col);
        const content = isCdata ? `<![CDATA[${raw}]]>` : encodeEntities(raw);
        childLines.push(`${ind}${ind}<${col}>${content}</${col}>`);
      }
      if (childLines.length === 0) {
        lines.push(`${ind}<${rowName}/>`);
      } else {
        lines.push(`${ind}<${rowName}>${nl}${childLines.join(nl)}${nl}${ind}</${rowName}>`);
      }
    }
  }

  lines.push(`</${rootName}>`);
  return lines.join(nl) + nl;
}
