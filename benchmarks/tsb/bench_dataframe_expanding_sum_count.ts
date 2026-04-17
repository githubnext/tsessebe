/**
 * Benchmark: DataFrameExpanding.sum() and .count() on 10k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_expanding_sum_count", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => (i % 100) * 1.5);
const b = Array.from({ length: ROWS }, (_, i) => (i % 50) * 2.0);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.expanding().sum();
  df.expanding().count();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.expanding().sum();
  df.expanding().count();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_expanding_sum_count",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
