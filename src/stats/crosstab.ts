/**
 * crosstab — compute a cross-tabulation of two or more factors.
 *
 * Mirrors `pandas.crosstab(index, columns, values, rownames, colnames,
 * aggfunc, margins, margins_name, dropna, normalize)`.
 *
 * By default, counts the number of observations where the row factor equals
 * row `r` **and** the column factor equals column `c`.  When `values` and
 * `aggfunc` are provided, aggregates those values instead of counting.
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import { Index } from "../core/index.ts";
import { Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Aggregation function that reduces a non-empty array of numbers to a scalar. */
export type AggFunc = (values: readonly number[]) => number;

/** Normalize mode for {@link CrosstabOptions}. */
export type Normalize = boolean | "index" | "columns" | "all";

/** Options for {@link crosstab}. */
export interface CrosstabOptions {
  /**
   * Numeric values to aggregate.  When provided, `aggfunc` must also be
   * supplied.  Length must equal the length of `index`.
   */
  readonly values?: readonly Scalar[];
  /**
   * Function used to aggregate `values` within each cell.
   * Required when `values` is provided; ignored otherwise.
   *
   * @example `(vs) => vs.reduce((s, v) => s + v, 0) / vs.length` (mean)
   */
  readonly aggfunc?: AggFunc;
  /**
   * Name for the row-axis index in the resulting DataFrame.
   * @defaultValue `"row"`
   */
  readonly rowname?: string;
  /**
   * Name for the column-axis labels in the resulting DataFrame.
   * @defaultValue `"col"`
   */
  readonly colname?: string;
  /**
   * Whether to add row and column margin totals.
   * @defaultValue `false`
   */
  readonly margins?: boolean;
  /**
   * Label for the margins row/column.
   * @defaultValue `"All"`
   */
  readonly marginsName?: string;
  /**
   * If `true` (default), exclude missing values (null / undefined / NaN)
   * from both the row and column factors.
   * If `false`, treat missing values as a category (rendered as `"NaN"`).
   * @defaultValue `true`
   */
  readonly dropna?: boolean;
  /**
   * Normalize cell values to proportions:
   * - `false` (default) — raw counts / aggregated values
   * - `true` or `"all"` — divide each cell by the grand total
   * - `"index"` — divide each cell by its row total
   * - `"columns"` — divide each cell by its column total
   * @defaultValue `false`
   */
  readonly normalize?: Normalize;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value is missing (null / undefined / NaN). */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/**
 * Stable string key for any scalar, matching the `factorize` approach:
 * prefix with `typeof` to keep `null`, `undefined`, `NaN`, and the string
 * `"null"` apart.
 */
function scalarKey(v: Scalar): string {
  if (v === null) {
    return "object:null";
  }
  if (v === undefined) {
    return "undefined:undefined";
  }
  if (typeof v === "number" && Number.isNaN(v)) {
    return "number:NaN";
  }
  return `${typeof v}:${String(v)}`;
}

/** Render a scalar as a human-readable label string. Missing → `"NaN"`. */
function labelStr(v: Scalar): string {
  return isMissing(v) ? "NaN" : String(v);
}

/**
 * Collect unique values in first-seen order from `vals`.
 * Missing values are included only when `dropna` is `false`.
 */
function collectUniques(vals: readonly Scalar[], dropna: boolean): Scalar[] {
  const seen = new Set<string>();
  const out: Scalar[] = [];
  for (const v of vals) {
    if (dropna && isMissing(v)) {
      continue;
    }
    const key = scalarKey(v);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

// ─── core implementation ───────────────────────────────────────────────────────

/**
 * Build a cross-tabulation frequency table (or aggregation table) from two
 * equal-length arrays of factor values.
 *
 * @param index   - Row factor values.  Must have the same length as `columns`.
 * @param columns - Column factor values.
 * @param options - Additional options (aggregation, margins, normalization, …).
 * @returns A `DataFrame` whose rows represent `index` categories, whose
 *   column names represent `columns` categories, and whose cells contain
 *   counts or aggregated values.
 *
 * @example
 * ```ts
 * const idx = ["foo", "foo", "bar", "bar"];
 * const col = ["A", "B", "A", "B"];
 * const ct = crosstab(idx, col);
 * // DataFrame:
 * //       A  B
 * // bar   1  1
 * // foo   1  1
 * ```
 */
export function crosstab(
  index: readonly Scalar[] | Series<Scalar>,
  columns: readonly Scalar[] | Series<Scalar>,
  options: CrosstabOptions = {},
): DataFrame {
  const {
    values,
    aggfunc,
    rowname = "row",
    margins = false,
    marginsName = "All",
    dropna = true,
    normalize = false,
  } = options;

  // Flatten Series to plain arrays.
  const rowVals: readonly Scalar[] = index instanceof Series ? (index.values as Scalar[]) : index;
  const colVals: readonly Scalar[] =
    columns instanceof Series ? (columns.values as Scalar[]) : columns;

  if (rowVals.length !== colVals.length) {
    throw new RangeError(
      `crosstab: index and columns must have the same length (got ${rowVals.length} vs ${colVals.length})`,
    );
  }

  if (values !== undefined && aggfunc === undefined) {
    throw new TypeError("crosstab: `aggfunc` is required when `values` is provided");
  }

  const n = rowVals.length;

  // Collect unique row / column categories in first-seen order.
  const rowUniques = collectUniques(rowVals, dropna);
  const colUniques = collectUniques(colVals, dropna);

  // Build lookup maps: scalarKey → 0-based position.
  const rowPos = new Map<string, number>();
  for (let i = 0; i < rowUniques.length; i++) {
    rowPos.set(scalarKey(rowUniques[i] as Scalar), i);
  }
  const colPos = new Map<string, number>();
  for (let i = 0; i < colUniques.length; i++) {
    colPos.set(scalarKey(colUniques[i] as Scalar), i);
  }

  const nRows = rowUniques.length;
  const nCols = colUniques.length;

  // Initialize accumulator structures.
  // counts[r][c] = frequency of (rowUniques[r], colUniques[c]) pairs.
  const counts: number[][] = Array.from({ length: nRows }, () => new Array<number>(nCols).fill(0));
  // buckets[r][c] = collected numeric values for aggregation (when values+aggfunc provided).
  const buckets: Array<Array<number[] | undefined>> | null =
    values !== undefined
      ? Array.from({ length: nRows }, () =>
          Array.from<undefined, number[] | undefined>({ length: nCols }, () => undefined),
        )
      : null;

  // Populate accumulators.
  for (let i = 0; i < n; i++) {
    const rv = rowVals[i] as Scalar;
    const cv = colVals[i] as Scalar;
    if (dropna && (isMissing(rv) || isMissing(cv))) {
      continue;
    }
    const ri = rowPos.get(scalarKey(rv));
    const ci = colPos.get(scalarKey(cv));
    if (ri === undefined || ci === undefined) {
      continue;
    }

    if (buckets !== null && values !== undefined) {
      const sv = values[i] as Scalar;
      if (typeof sv === "number" && !Number.isNaN(sv)) {
        const cell = buckets[ri];
        if (cell !== undefined) {
          const existing = cell[ci];
          if (existing === undefined) {
            cell[ci] = [sv];
          } else {
            existing.push(sv);
          }
        }
      }
    } else {
      const row = counts[ri];
      if (row !== undefined) {
        row[ci] = (row[ci] ?? 0) + 1;
      }
    }
  }

  // Resolve cell values from counts or aggregated buckets.
  const cells: number[][] = Array.from({ length: nRows }, (_, ri) =>
    Array.from({ length: nCols }, (_, ci) => {
      if (buckets !== null && aggfunc !== undefined) {
        const arr = buckets[ri]?.[ci];
        return arr !== undefined && arr.length > 0 ? aggfunc(arr) : 0;
      }
      return counts[ri]?.[ci] ?? 0;
    }),
  );

  // Apply normalization before adding margins.
  if (normalize !== false) {
    const mode: "all" | "index" | "columns" = normalize === true ? "all" : normalize;
    if (mode === "all") {
      let grand = 0;
      for (const row of cells) {
        for (const v of row) {
          grand += v;
        }
      }
      if (grand !== 0) {
        for (const row of cells) {
          for (let c = 0; c < row.length; c++) {
            row[c] = (row[c] ?? 0) / grand;
          }
        }
      }
    } else if (mode === "index") {
      for (const row of cells) {
        const total = row.reduce((s, v) => s + v, 0);
        if (total !== 0) {
          for (let c = 0; c < row.length; c++) {
            row[c] = (row[c] ?? 0) / total;
          }
        }
      }
    } else {
      // "columns": divide by column totals
      for (let c = 0; c < nCols; c++) {
        let total = 0;
        for (const row of cells) {
          total += row[c] ?? 0;
        }
        if (total !== 0) {
          for (const row of cells) {
            row[c] = (row[c] ?? 0) / total;
          }
        }
      }
    }
  }

  // Build column data: column-label → array of row values.
  const colData: Record<string, Scalar[]> = {};
  for (let ci = 0; ci < nCols; ci++) {
    const name = labelStr(colUniques[ci] as Scalar);
    colData[name] = cells.map((row) => row[ci] ?? 0);
  }

  // Build row labels.
  const rowLabels: Label[] = rowUniques.map((v) => labelStr(v as Scalar) as Label);

  // Add margin totals when requested.
  let finalRowLabels = rowLabels;
  if (margins) {
    // Append column-total to each column array.
    for (let ci = 0; ci < nCols; ci++) {
      const name = labelStr(colUniques[ci] as Scalar);
      const col = colData[name];
      if (col !== undefined) {
        col.push(col.reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0));
      }
    }
    // Add an "All" column with row totals (and grand total in the last cell).
    const allCol: Scalar[] = cells.map((row) => row.reduce((s, v) => s + v, 0));
    allCol.push(allCol.reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0));
    colData[marginsName] = allCol;
    finalRowLabels = [...rowLabels, marginsName as Label];
  }

  // Build the DataFrame.
  const rowIndex = new Index<Label>(finalRowLabels, rowname);
  const colMap = new Map<string, Series<Scalar>>();
  for (const [name, data] of Object.entries(colData)) {
    colMap.set(name, new Series({ data, index: rowIndex as Index<Label> }));
  }
  return new DataFrame(colMap, rowIndex);
}

// ─── Series overload ──────────────────────────────────────────────────────────

/**
 * Cross-tabulate two `Series<Scalar>` objects, using their `.name` properties
 * as the default row / column axis names.
 *
 * @example
 * ```ts
 * const a = new Series({ data: ["foo", "foo", "bar"], name: "A" });
 * const b = new Series({ data: ["x", "y", "x"], name: "B" });
 * const ct = seriesCrosstab(a, b);
 * ```
 */
export function seriesCrosstab(
  index: Series<Scalar>,
  columns: Series<Scalar>,
  options: Omit<CrosstabOptions, "rowname" | "colname"> & {
    readonly rowname?: string;
    readonly colname?: string;
  } = {},
): DataFrame {
  const rowname = options.rowname ?? (typeof index.name === "string" ? index.name : "row");
  const colname = options.colname ?? (typeof columns.name === "string" ? columns.name : "col");
  return crosstab(index, columns, { ...options, rowname, colname });
}
