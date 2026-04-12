/**
 * to_from_dict — DataFrame ↔ dictionary conversions with orient support.
 *
 * Mirrors `pandas.DataFrame.to_dict(orient=...)` and
 * `pandas.DataFrame.from_dict(data, orient=...)`.
 *
 * Supported `orient` values for {@link toDictOriented}:
 * - `"dict"` / `"columns"` — `{col: {rowLabel: value}}`
 * - `"list"`               — `{col: [values]}`
 * - `"series"`             — `{col: Series<Scalar>}`
 * - `"split"`              — `{index, columns, data}`
 * - `"tight"`              — like `"split"` plus `index_names` and `column_names`
 * - `"records"`            — `[{col: value, ...}, ...]`
 * - `"index"`              — `{rowLabel: {col: value}}`
 *
 * Supported `orient` values for {@link fromDictOriented}:
 * - `"columns"` — `{col: [values]}` (default)
 * - `"index"`   — `{rowLabel: {col: value}}`
 * - `"split"`   — `{index?, columns, data}`
 * - `"tight"`   — `{index?, columns, data, index_names?, column_names?}`
 *
 * @module
 */

import type { Label, Scalar } from "../types.ts";
import { Index } from "./base-index.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/** Orient values supported by {@link toDictOriented}. */
export type ToDictOrient = "dict" | "columns" | "list" | "series" | "split" | "tight" | "records" | "index";

/** Orient values supported by {@link fromDictOriented}. */
export type FromDictOrient = "columns" | "index" | "split" | "tight";

/** Result shape for `orient = "split"`. */
export interface DictSplit {
  readonly index: Label[];
  readonly columns: string[];
  readonly data: Scalar[][];
}

/** Result shape for `orient = "tight"`. */
export interface DictTight extends DictSplit {
  readonly index_names: (string | null)[];
  readonly column_names: (string | null)[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a row label to a string key. */
function labelKey(label: Label): string {
  if (label === null || label === undefined) {
    return "null";
  }
  return String(label);
}

/** True when an array of labels is the default 0…n-1 RangeIndex. */
function isDefaultRange(labels: readonly Label[]): boolean {
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== i) {
      return false;
    }
  }
  return true;
}

// ─── toDictOriented ───────────────────────────────────────────────────────────

/**
 * Convert a DataFrame to a dictionary using the given `orient`.
 *
 * Mirrors `pandas.DataFrame.to_dict(orient, ...)`.
 *
 * @param df     Source DataFrame.
 * @param orient Output structure. Defaults to `"dict"`.
 */
export function toDictOriented(df: DataFrame, orient: "dict" | "columns"): Record<string, Record<string, Scalar>>;
export function toDictOriented(df: DataFrame, orient: "list"): Record<string, Scalar[]>;
export function toDictOriented(df: DataFrame, orient: "series"): Record<string, Series<Scalar>>;
export function toDictOriented(df: DataFrame, orient: "split"): DictSplit;
export function toDictOriented(df: DataFrame, orient: "tight"): DictTight;
export function toDictOriented(df: DataFrame, orient: "records"): Record<string, Scalar>[];
export function toDictOriented(df: DataFrame, orient: "index"): Record<string, Record<string, Scalar>>;
export function toDictOriented(
  df: DataFrame,
  orient: ToDictOrient = "dict",
): Record<string, unknown> | unknown[] {
  const colNames = [...df.columns.values];
  const rowLabels = [...(df.index.values as Label[])];
  const nRows = df.index.size;

  switch (orient) {
    case "dict":
    case "columns": {
      const result: Record<string, Record<string, Scalar>> = {};
      for (const col of colNames) {
        const series = df.col(col);
        const colObj: Record<string, Scalar> = {};
        for (let i = 0; i < nRows; i++) {
          const lbl = rowLabels[i];
          const key = labelKey(lbl !== undefined ? lbl : null);
          colObj[key] = (series.values[i] ?? null) as Scalar;
        }
        result[col] = colObj;
      }
      return result;
    }

    case "list": {
      const result: Record<string, Scalar[]> = {};
      for (const col of colNames) {
        result[col] = [...(df.col(col).values as readonly Scalar[])];
      }
      return result;
    }

    case "series": {
      const result: Record<string, Series<Scalar>> = {};
      for (const col of colNames) {
        result[col] = df.col(col);
      }
      return result;
    }

    case "split": {
      const data: Scalar[][] = [];
      for (let i = 0; i < nRows; i++) {
        const row: Scalar[] = colNames.map((col) => (df.col(col).values[i] ?? null) as Scalar);
        data.push(row);
      }
      return { index: rowLabels, columns: colNames, data } satisfies DictSplit;
    }

    case "tight": {
      const data: Scalar[][] = [];
      for (let i = 0; i < nRows; i++) {
        const row: Scalar[] = colNames.map((col) => (df.col(col).values[i] ?? null) as Scalar);
        data.push(row);
      }
      return {
        index: rowLabels,
        columns: colNames,
        data,
        index_names: [null],
        column_names: [null],
      } satisfies DictTight;
    }

    case "records": {
      return df.toRecords();
    }

    case "index": {
      const result: Record<string, Record<string, Scalar>> = {};
      for (let i = 0; i < nRows; i++) {
        const lbl = rowLabels[i];
        const key = labelKey(lbl !== undefined ? lbl : null);
        const rowObj: Record<string, Scalar> = {};
        for (const col of colNames) {
          rowObj[col] = (df.col(col).values[i] ?? null) as Scalar;
        }
        result[key] = rowObj;
      }
      return result;
    }

    default: {
      const exhaustive: never = orient;
      throw new RangeError(`Unknown orient: ${String(exhaustive)}`);
    }
  }
}

// ─── fromDictOriented ─────────────────────────────────────────────────────────

/** Input type for `orient = "split"` / `"tight"`. */
export interface SplitInput {
  readonly index?: readonly Label[];
  readonly columns: readonly string[];
  readonly data: readonly (readonly Scalar[])[];
}

/**
 * Construct a DataFrame from a dictionary using the given `orient`.
 *
 * Mirrors `pandas.DataFrame.from_dict(data, orient=...)`.
 *
 * @param data   Input dictionary (shape depends on `orient`).
 * @param orient How `data` is structured. Defaults to `"columns"`.
 */
export function fromDictOriented(
  data: Readonly<Record<string, readonly Scalar[]>>,
  orient?: "columns",
): DataFrame;
export function fromDictOriented(
  data: Readonly<Record<string, Readonly<Record<string, Scalar>>>>,
  orient: "index",
): DataFrame;
export function fromDictOriented(data: SplitInput, orient: "split" | "tight"): DataFrame;
export function fromDictOriented(
  data: unknown,
  orient: FromDictOrient = "columns",
): DataFrame {
  switch (orient) {
    case "columns": {
      const colsData = data as Record<string, readonly Scalar[]>;
      return DataFrame.fromColumns(colsData as Record<string, readonly Scalar[]>);
    }

    case "index": {
      const indexData = data as Record<string, Record<string, Scalar>>;
      const rowLabels = Object.keys(indexData);
      // Collect all column names in insertion order
      const colSet = new Map<string, null>();
      for (const rowLabel of rowLabels) {
        const rowObj = indexData[rowLabel];
        if (rowObj !== undefined) {
          for (const col of Object.keys(rowObj)) {
            colSet.set(col, null);
          }
        }
      }
      const colNames = [...colSet.keys()];
      const colArrays: Record<string, Scalar[]> = {};
      for (const col of colNames) {
        colArrays[col] = [];
      }
      for (const rowLabel of rowLabels) {
        const rowObj = indexData[rowLabel] ?? {};
        for (const col of colNames) {
          const arr = colArrays[col];
          if (arr !== undefined) {
            arr.push(rowObj[col] ?? null);
          }
        }
      }
      const idx = new Index<Label>(rowLabels as Label[]);
      return DataFrame.fromColumns(colArrays as Record<string, readonly Scalar[]>, { index: idx });
    }

    case "split":
    case "tight": {
      return buildFromSplit(data as SplitInput);
    }

    default: {
      const exhaustive: never = orient;
      throw new RangeError(`Unknown orient: ${String(exhaustive)}`);
    }
  }
}

// ─── internal helpers ──────────────────────────────────────────────────────────

/** Build a DataFrame from a split/tight structure. */
function buildFromSplit(input: SplitInput): DataFrame {
  const { columns, data } = input;
  const colArrays: Record<string, Scalar[]> = {};
  for (const col of columns) {
    colArrays[col] = [];
  }
  for (const row of data) {
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      const arr = colArrays[col];
      if (col !== undefined && arr !== undefined) {
        arr.push(row[j] ?? null);
      }
    }
  }

  // Determine the row index
  if (input.index !== undefined && !isDefaultRange(input.index)) {
    const idx = new Index<Label>(input.index as Label[]);
    return DataFrame.fromColumns(colArrays as Record<string, readonly Scalar[]>, { index: idx });
  }

  return DataFrame.fromColumns(colArrays as Record<string, readonly Scalar[]>);
}
