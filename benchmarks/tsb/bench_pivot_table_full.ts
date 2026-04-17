/**
 * Benchmark: pivotTableFull — extended pivot table with margins on 50k-row DataFrame.
 * Outputs JSON: {"function": "pivot_table_full", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, pivotTableFull } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

const regions = ["North", "South", "East", "West"];
const products = ["A", "B", "C", "D", "E"];

const region = Array.from({ length: ROWS }, (_, i) => regions[i % regions.length]);
const product = Array.from({ length: ROWS }, (_, i) => products[i % products.length]);
const sales = Array.from({ length: ROWS }, (_, i) => (i % 1000) * 1.5 + 10);

const df = DataFrame.fromColumns({ region, product, sales });

for (let i = 0; i < WARMUP; i++) {
  pivotTableFull(df, { values: "sales", index: "region", columns: "product", aggfunc: "mean", margins: true });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pivotTableFull(df, { values: "sales", index: "region", columns: "product", aggfunc: "mean", margins: true });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pivot_table_full",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
