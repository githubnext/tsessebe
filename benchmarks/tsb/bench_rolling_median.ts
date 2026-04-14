/**
 * Benchmark: rolling median with window=100 on 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.1));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.rolling(100).median();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.rolling(100).median();
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "rolling_median", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
