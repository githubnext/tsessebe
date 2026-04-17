/**
 * Benchmark: DataFrameExpanding.median() and .apply(fn) on 10k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_expanding_median_apply", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 2;
const ITERATIONS = 5;

const a = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.05) * 100);
const b = Array.from({ length: ROWS }, (_, i) => Math.cos(i * 0.05) * 80);
const df = DataFrame.fromColumns({ a, b });

const sumFn = (vals: readonly number[]) => vals.reduce((acc, v) => acc + v, 0);

for (let i = 0; i < WARMUP; i++) {
  df.expanding().median();
  df.expanding().apply(sumFn);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  df.expanding().median();
  df.expanding().apply(sumFn);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "dataframe_expanding_median_apply",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
