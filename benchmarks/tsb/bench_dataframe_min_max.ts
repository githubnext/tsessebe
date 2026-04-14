/**
 * Benchmark: DataFrame.min() and DataFrame.max() on 100k-row DataFrame.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => (i * 3.14) % 5000),
  b: Array.from({ length: ROWS }, (_, i) => (i * 2.71) % 8000),
  c: Array.from({ length: ROWS }, (_, i) => i * 1.0),
});

for (let i = 0; i < WARMUP; i++) { df.min(); df.max(); }

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.min();
  df.max();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_min_max", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
