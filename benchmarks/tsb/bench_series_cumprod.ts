/**
 * Benchmark: series cumprod on 10k-element Series
 */
import { Series, cumprod } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Float64Array.from({ length: ROWS }, (_, i) => 1 + (i % 1000) * 0.0001);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  cumprod(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cumprod(s);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_cumprod", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
