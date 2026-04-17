/**
 * Benchmark: DataFrame.median() — column-wise median on 100k-row DataFrame.
 * Outputs JSON: {"function": "dataframe_median_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame } from "../../src/index.ts";

const SIZE = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

const df = new DataFrame({
  a: Array.from({ length: SIZE }, (_, i) => i * 1.1),
  b: Array.from({ length: SIZE }, (_, i) => i * 2.2),
  c: Array.from({ length: SIZE }, (_, i) => i * 3.3),
});

for (let i = 0; i < WARMUP; i++) df.median();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.median();
  times.push(performance.now() - t0);
}

const total = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "dataframe_median_method",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
