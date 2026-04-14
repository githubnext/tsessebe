/**
 * Benchmark: series_cumsum — cumulative sum on 100k-element Series
 */
import { Series, cumsum } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Array.from({ length: ROWS }, (_, i) => i * 0.001);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  cumsum(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  cumsum(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_cumsum",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
