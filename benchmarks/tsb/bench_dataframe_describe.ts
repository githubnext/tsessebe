/**
 * Benchmark: DataFrame.describe() on 100k-row DataFrame (separate from describe.ts function).
 * Uses df.describe() method directly.
 */
import { DataFrame } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const df = DataFrame.fromColumns({
  a: Array.from({ length: ROWS }, (_, i) => (i * 1.23) % 9000),
  b: Array.from({ length: ROWS }, (_, i) => (i * 4.56) % 7000),
  c: Array.from({ length: ROWS }, (_, i) => i * 0.5),
});

for (let i = 0; i < WARMUP; i++) df.describe();

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  df.describe();
  times.push(performance.now() - t0);
}
const total = times.reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ function: "dataframe_describe", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
