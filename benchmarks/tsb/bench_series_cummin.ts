/**
 * Benchmark: series cummin on 100k-element Series
 */
import { Series, cummin } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  cummin(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cummin(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_cummin", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
