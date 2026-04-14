/**
 * Benchmark: rolling count with window=100 on 100k-element Series (with NaNs)
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => i % 10 === 0 ? NaN : i);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.rolling(100).count();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.rolling(100).count();
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "rolling_count", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
