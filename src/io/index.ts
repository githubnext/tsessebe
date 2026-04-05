/**
 * I/O utilities barrel — re-exports all I/O functions.
 */

export { readCsv } from "./read_csv.ts";
export type { ReadCsvOptions } from "./read_csv.ts";

export { readJson } from "./read_json.ts";
export type { ReadJsonOptions, JsonOrient } from "./read_json.ts";

export { toCsv, seriesToCsv } from "./to_csv.ts";
export type { ToCsvOptions } from "./to_csv.ts";

export { toJson, seriesToJson } from "./to_json.ts";
export type { ToJsonOptions, ToJsonOrient } from "./to_json.ts";

export { readParquet } from "./read_parquet.ts";
export type { ReadParquetOptions } from "./read_parquet.ts";

export { readExcel } from "./read_excel.ts";
export type { ReadExcelOptions } from "./read_excel.ts";

// ─── to_parquet ───────────────────────────────────────────────────────────────
export { toParquet, parquetSchema } from "./to_parquet.ts";
export type { ToParquetOptions, ParquetColumnSchema, ParquetMetadata } from "./to_parquet.ts";

// ─── to_excel ─────────────────────────────────────────────────────────────────
export { toExcel, seriesToExcel } from "./to_excel.ts";
export type { ToExcelOptions } from "./to_excel.ts";

// ─── to_markdown ──────────────────────────────────────────────────────────────
export { toMarkdown, seriesToMarkdown } from "./to_markdown.ts";
export type { ToMarkdownOptions, MarkdownAlign } from "./to_markdown.ts";

// ─── to_html ──────────────────────────────────────────────────────────────────
export { toHtml, seriesToHtml } from "./to_html.ts";
export type { ToHtmlOptions } from "./to_html.ts";

// ─── to_latex ─────────────────────────────────────────────────────────────────
export { toLatex, seriesToLatex } from "./to_latex.ts";
export type { ToLatexOptions, LatexColumnAlign } from "./to_latex.ts";

// ─── to_string ────────────────────────────────────────────────────────────────
export { dataFrameToString, seriesToString } from "./to_string.ts";
export type { ToStringOptions } from "./to_string.ts";

// ─── read_fwf ─────────────────────────────────────────────────────────────────
export { readFwf } from "./read_fwf.ts";
export type { ReadFwfOptions, ColSpec } from "./read_fwf.ts";

// ─── read_html ────────────────────────────────────────────────────────────────
export { readHtml } from "./read_html.ts";
export type { ReadHtmlOptions } from "./read_html.ts";

// ─── read_xml ─────────────────────────────────────────────────────────────────
export { readXml } from "./read_xml.ts";
export type { ReadXmlOptions } from "./read_xml.ts";

// ─── sql ──────────────────────────────────────────────────────────────────────
export { readSql, toSql } from "./sql.ts";
export type { SqlConnection, ReadSqlOptions, ToSqlOptions } from "./sql.ts";

// ─── read_orc ─────────────────────────────────────────────────────────────────
export { readOrc } from "./read_orc.ts";
export type { OrcDecoder, ReadOrcOptions } from "./read_orc.ts";

// ─── read_feather ─────────────────────────────────────────────────────────────
export { readFeather, toFeather } from "./read_feather.ts";
export type { ArrowDecoder, ArrowEncoder, ReadFeatherOptions, ToFeatherOptions } from "./read_feather.ts";
