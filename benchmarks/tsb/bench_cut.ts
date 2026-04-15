/**
 * Benchmark: cut (bin into 10 bins) on 100k-element Series
 */
import { Series, cut } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => (i % 10000) * 0.01);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  cut(s, 10);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cut(s, 10);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "cut", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
