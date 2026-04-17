/**
 * Benchmark: DataFrameExpanding.std() and .var() on 10k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_expanding_std_var", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 3;
const ITERATIONS = 10;

const a = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 100);
const b = Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.01) * 50);
const df = DataFrame.fromColumns({ a, b });

for (let i = 0; i < WARMUP; i++) {
  df.expanding().std();
  df.expanding().var();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.expanding().std();
  df.expanding().var();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_expanding_std_var",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
