/**
 * Benchmark: series cummax on 100k-element Series
 */
import { Series, cummax } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  cummax(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cummax(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_cummax", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
