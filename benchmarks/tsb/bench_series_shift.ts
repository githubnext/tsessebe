/**
 * Benchmark: series_shift — shift values by 1 position in a 100k-element Series
 */
import { Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 5;
const ITERATIONS = 20;

const data = Float64Array.from({ length: ROWS }, (_, i) => i * 1.0);
const s = new Series(data);

for (let i = 0; i < WARMUP; i++) {
  s.shift(1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  s.shift(1);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "series_shift",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
