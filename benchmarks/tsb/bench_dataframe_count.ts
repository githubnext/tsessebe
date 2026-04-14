/**
 * Benchmark: DataFrame.count() on 100k-row DataFrame with some NAs.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 30;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => i % 3 === 0 ? null : i * 1.0),
  b: Array.from({ length: ROWS }, (_, i) => i % 5 === 0 ? null : i * 2.0),
  c: Array.from({ length: ROWS }, (_, i) => i * 3.0),
});

for (let i = 0; i < WARMUP; i++) df.count();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.count();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_count", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
