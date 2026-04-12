/**
 * Benchmark: value_counts on a 100k-element Series with 100 distinct values
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Array.from({ length: ROWS }, (_, i) => `cat_${i % 100}`);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.value_counts();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.value_counts();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_value_counts",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
