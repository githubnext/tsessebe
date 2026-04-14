/**
 * Benchmark: series_fillna — fill NaN/null values in a 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Create series with every 5th value as null
const data: (number | null)[] = Array.from({ length: ROWS }, (_, i) =>
  i % 5 === 0 ? null : i * 1.1,
);
const s = new Series({ data });

for (let i = 0; i < WARMUP; i++) {
  s.fillna(0.0);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.fillna(0.0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_fillna",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
