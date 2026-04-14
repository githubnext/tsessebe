/**
 * Benchmark: series clip (lower=-1, upper=1) on 100k-element Series
 */
import { Series, clip } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => Math.sin(i * 0.01) * 2);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  clip(s, { lower: -1, upper: 1 });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  clip(s, { lower: -1, upper: 1 });
}
const total = performance.now() - start;

console.log(JSON.stringify({ function: "series_clip", mean_ms: total / ITERATIONS, iterations: ITERATIONS, total_ms: total }));
