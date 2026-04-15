/**
 * Benchmark: pivot_table — pivot aggregation on 100k-row DataFrame
 */
import { DataFrame, pivotTable } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const rows = Array.from({ length: ROWS }, (_, i) => `row_${i % 100}`);
const cols = Array.from({ length: ROWS }, (_, i) => `col_${i % 50}`);
const vals = Array.from({ length: ROWS }, (_, i) => i * 0.1);
const df = DataFrame.fromColumns({ row: rows, col: cols, value: vals });

for (let i = 0; i < WARMUP; i++) {
  pivotTable(df, { values: "value", index: "row", columns: "col", aggfunc: "mean" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pivotTable(df, { values: "value", index: "row", columns: "col", aggfunc: "mean" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pivot_table",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
