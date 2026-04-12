/**
 * Benchmark: Series sort (argsort on 100k-element numeric Series)
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 10;

const data = Float64Array.from({ length: ROWS }, () => Math.random() * 1000);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.sort_values();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.sort_values();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_sort",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
