/**
 * Benchmark: seriesWhere (keep values > 0) on 100k-element Series
 */
import { Series, seriesWhere } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);
const cond = Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) > 0);

for (let i = 0; i < WARMUP; i++) {
  seriesWhere(s, cond);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  seriesWhere(s, cond);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_where", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
