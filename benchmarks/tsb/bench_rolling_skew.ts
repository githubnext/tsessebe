/**
 * Benchmark: rolling skew with window=100 on 100k-element Series
 */
import { Series, rollingSkew } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01));
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  rollingSkew(s, 100);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  rollingSkew(s, 100);
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "rolling_skew", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
