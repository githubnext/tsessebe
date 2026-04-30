/**
 * Benchmark: truncateSeries on 100k-element Series
 */
import { Series, truncateSeries } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 0.5);
const s = new Series({ data, index: Array.from({ length: ROWS }, (_, i) => i) });

for (let i = 0; i < WARMUP; i++) {
  truncateSeries(s, 10_000, 90_000);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  truncateSeries(s, 10_000, 90_000);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "truncate",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
